// ============================================================
//  reviewSms.js – automatyczna prośba o opinię po naprawie
//
//  Codziennie o 11:00 (Europa/Warszawa) szuka zleceń ODEBRANYCH
//  3–6 dni temu, którym jeszcze nie wysłano prośby, i wysyła SMS
//  przez bramkę SMS Gateway for Android (telefon z Twoją kartą SIM).
//
//  Tryby (parametr REVIEW_SMS_MODE):
//    off  – nic nie robi
//    dry  – tylko zapisuje w logach, do kogo BY wysłał (domyślny)
//    live – naprawdę wysyła
//
//  Pomijane: zlecenia z noReviewSms === true, z już wysłaną prośbą
//  (reviewRequestSentAt), bez poprawnego numeru, jedna wiadomość
//  na numer telefonu na jedno uruchomienie.
// ============================================================

const admin = require("firebase-admin");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { onCall, onRequest, HttpsError } = require("firebase-functions/v2/https");
const crypto = require("crypto");
const { defineSecret, defineString } = require("firebase-functions/params");
const { FieldValue } = require("firebase-admin/firestore");

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

const SMSGATE_USER = defineSecret("SMSGATE_USER");
const SMSGATE_PASS = defineSecret("SMSGATE_PASS");
const REVIEW_URL = defineString("REVIEW_URL");
const REVIEW_SMS_MODE = defineString("REVIEW_SMS_MODE", { default: "dry" });

const DAY_MS = 24 * 60 * 60 * 1000;
const MIN_DAYS_AFTER_ISSUE = 3;
const MAX_DAYS_AFTER_ISSUE = 6; // okno 3–6 dni = 3 próby, a stare zlecenia nigdy nie dostaną SMS-a
const SMSGATE_API = "https://api.sms-gate.app/3rdparty/v1";
const SMSGATE_URL = `${SMSGATE_API}/messages`;
const PROJECT_ID = process.env.GCLOUD_PROJECT || process.env.GCP_PROJECT || "gsmserviceapp-ff8f6";
const INBOUND_URL = `https://us-central1-${PROJECT_ID}.cloudfunctions.net/smsInboundWebhook`;
const WEBHOOK_ID = "fonexpert-inbound";
// Odpowiedź klienta oznaczająca rezygnację z SMS-ów (prośby o opinię)
const STOP_RE = /^\s*(stop|stop sms|wypisz|rezygnuj[eę]?|nie wysy[lł]a[jc])\b/i;

// Do formatu +48XXXXXXXXX; null jeśli numer wygląda niepoprawnie
function toE164PL(raw = "") {
  let d = String(raw).replace(/\D/g, "");
  if (d.startsWith("0048")) d = d.slice(4);
  else if (d.startsWith("48") && d.length === 11) d = d.slice(2);
  return d.length === 9 ? `+48${d}` : null;
}

const firstOf = (obj, keys) => {
  for (const k of keys) if (obj?.[k]) return obj[k];
  return "";
};

async function getCustomerPhone(repair) {
  const direct = firstOf(repair, ["phone", "phoneNumber", "customerPhone", "clientPhone", "tel", "mobile"]);
  if (toE164PL(direct)) return direct;
  if (!repair.customerId) return "";
  const userDoc = await db.collection("users").doc(repair.customerId).get();
  return userDoc.exists
    ? firstOf(userDoc.data(), ["phone", "phoneNumber", "customerPhone", "tel", "mobile"])
    : "";
}

// Bez polskich znaków: zostaje w alfabecie GSM (160 znaków na SMS, nie 70)
const buildText = (url) =>
  `Dzien dobry, tu Fonexpert Plonsk. Dziekujemy za zaufanie! Jesli naprawa sie udala, bedziemy wdzieczni za krotka opinie: ${url}`;

async function sendViaGateway(user, pass, phone, text) {
  const res = await fetch(SMSGATE_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Basic " + Buffer.from(`${user}:${pass}`).toString("base64"),
    },
    body: JSON.stringify({ textMessage: { text }, phoneNumbers: [phone] }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`SMS gateway HTTP ${res.status}: ${body.slice(0, 200)}`);
  }
}

const basicAuth = (user, pass) => "Basic " + Buffer.from(`${user}:${pass}`).toString("base64");

async function gatewayRequest(user, pass, path, options = {}) {
  const res = await fetch(`${SMSGATE_API}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", Authorization: basicAuth(user, pass), ...(options.headers || {}) },
  });
  const text = await res.text().catch(() => "");
  if (!res.ok) throw new Error(`SMS gateway HTTP ${res.status}: ${text.slice(0, 200)}`);
  try { return text ? JSON.parse(text) : null; } catch { return null; }
}

async function isOptedOut(phone) {
  if (!phone) return false;
  const snap = await db.collection("smsOptOut").doc(phone).get();
  return snap.exists;
}

// Wpis do historii SMS dokumentu (zlecenie / rezerwacja). Błąd zapisu historii
// nie może zepsuć wysyłki – SMS już poszedł, więc tylko logujemy problem.
async function logSms(collection, docId, entry) {
  if (!docId || typeof docId !== "string" || docId.length > 128) return;
  try {
    await db.collection(collection).doc(docId).update({
      smsLog: FieldValue.arrayUnion({ at: new Date().toISOString(), ...entry }),
    });
  } catch (err) {
    console.warn(`smsLog: nie zapisano historii dla ${collection}/${docId}:`, err.message);
  }
}

exports.sendReviewRequests = onSchedule(
  {
    schedule: "0 11 * * *",
    timeZone: "Europe/Warsaw",
    region: "us-central1",
    secrets: [SMSGATE_USER, SMSGATE_PASS],
  },
  async () => {
    const mode = String(REVIEW_SMS_MODE.value() || "dry").toLowerCase();
    if (mode === "off") {
      console.log("reviewSms: tryb off – pomijam.");
      return;
    }

    const url = String(REVIEW_URL.value() || "").trim();
    if (!/^https?:\/\//.test(url)) {
      console.error("reviewSms: brak poprawnego REVIEW_URL – przerywam.");
      return;
    }

    const now = Date.now();
    const newest = new Date(now - MIN_DAYS_AFTER_ISSUE * DAY_MS).toISOString();
    const oldest = new Date(now - MAX_DAYS_AFTER_ISSUE * DAY_MS).toISOString();

    // Zapytanie po jednym polu (bez dodatkowego indeksu); resztę filtrujemy w kodzie
    const snap = await db.collection("repairs").where("issuedAt", ">=", oldest).get();

    const text = buildText(url);
    const seenPhones = new Set();
    let sent = 0;
    let wouldSend = 0;
    let skipped = 0;
    let failed = 0;

    for (const doc of snap.docs) {
      const r = doc.data() || {};

      if (
        r.status !== "Odebrane" ||
        !r.issuedAt ||
        r.issuedAt > newest ||
        r.reviewRequestSentAt ||
        r.noReviewSms === true
      ) {
        skipped++;
        continue;
      }

      const phone = toE164PL(await getCustomerPhone(r));
      if (!phone || seenPhones.has(phone)) {
        skipped++;
        continue;
      }
      seenPhones.add(phone);
      if (await isOptedOut(phone)) {
        skipped++;
        continue;
      }

      if (mode !== "live") {
        wouldSend++;
        console.log(`reviewSms [dry]: wysłałbym do ${phone.slice(0, 6)}***, zlecenie ${r.displayNumber || doc.id}`);
        continue;
      }

      try {
        await sendViaGateway(SMSGATE_USER.value(), SMSGATE_PASS.value(), phone, text);
        const sentAt = new Date().toISOString();
        await doc.ref.update({
          reviewRequestSentAt: sentAt,
          smsLog: FieldValue.arrayUnion({ at: sentAt, kind: "review", text, phone, by: "automat" }),
        });
        sent++;
      } catch (err) {
        failed++;
        console.error(`reviewSms: błąd dla zlecenia ${r.displayNumber || doc.id}:`, err.message);
      }
    }

    console.log(`reviewSms [${mode}]: wysłano ${sent}, do wysłania(dry) ${wouldSend}, pominięto ${skipped}, błędy ${failed}`);
  }
);


// ------------------------------------------------------------
//  Ręczna wysyłka SMS z panelu (przycisk "Wyślij z bramki").
//  Tylko dla personelu (admin / worker).
// ------------------------------------------------------------
exports.sendSmsToCustomer = onCall(
  { region: "us-central1", secrets: [SMSGATE_USER, SMSGATE_PASS] },
  async (request) => {
    const role = request.auth?.token?.role;
    if (!request.auth || (role !== "admin" && role !== "worker")) {
      throw new HttpsError("permission-denied", "Tylko personel może wysyłać SMS-y.");
    }

    const { phone, text, repairId, bookingId, buybackId, kind } = request.data || {};
    const to = toE164PL(phone);
    const body = String(text || "").trim();

    if (!to) throw new HttpsError("invalid-argument", "Niepoprawny numer telefonu.");
    if (!body || body.length > 1000) {
      throw new HttpsError("invalid-argument", "Treść SMS jest pusta lub za długa (max 1000 znaków).");
    }

    try {
      await sendViaGateway(SMSGATE_USER.value(), SMSGATE_PASS.value(), to, body);
    } catch (err) {
      console.error("sendSmsToCustomer:", err.message);
      throw new HttpsError("unavailable", "Bramka SMS nie przyjęła wiadomości. Sprawdź, czy telefon z bramką ma internet.");
    }

    const entry = {
      kind: String(kind || "manual").slice(0, 40),
      text: body,
      phone: to,
      by: request.auth.token.name || request.auth.token.email || "personel",
    };
    if (repairId) await logSms("repairs", repairId, entry);
    if (bookingId) await logSms("bookingRequests", bookingId, entry);
    if (buybackId && role === "admin") await logSms("buybackRequests", buybackId, entry);
    return { ok: true };
  }
);


// ------------------------------------------------------------
//  Status bramki (panel admina): kiedy telefon z bramką był ostatnio
//  online i ile wiadomości czeka / się nie udało w ostatniej dobie.
// ------------------------------------------------------------
exports.smsGatewayStatus = onCall(
  { region: "us-central1", secrets: [SMSGATE_USER, SMSGATE_PASS] },
  async (request) => {
    const role = request.auth?.token?.role;
    if (role !== "admin" && role !== "worker") throw new HttpsError("permission-denied", "Tylko personel.");
    const user = SMSGATE_USER.value();
    const pass = SMSGATE_PASS.value();
    const result = { checkedAt: new Date().toISOString(), devices: [], pending: null, failed: null, error: null };
    try {
      const devices = await gatewayRequest(user, pass, "/devices");
      result.devices = (Array.isArray(devices) ? devices : []).map((d) => ({
        name: d.name || "Telefon", lastSeen: d.lastSeen || d.updatedAt || null,
      }));
    } catch (err) {
      result.error = "Nie udało się połączyć z bramką SMS (sprawdź login/hasło w sekretach).";
      console.warn("smsGatewayStatus devices:", err.message);
      return result;
    }
    try {
      const from = new Date(Date.now() - DAY_MS).toISOString();
      const msgs = await gatewayRequest(user, pass, `/messages?from=${encodeURIComponent(from)}&limit=200`);
      const list = Array.isArray(msgs) ? msgs : [];
      result.pending = list.filter((m) => ["Pending", "Processed"].includes(m.state)).length;
      result.failed = list.filter((m) => m.state === "Failed").length;
    } catch (err) {
      console.warn("smsGatewayStatus messages:", err.message); // starsze wersje API – status bez liczników
    }
    const inbound = await db.collection("meta").doc("smsWebhook").get();
    result.inboundConnected = inbound.exists && !!inbound.data().registeredAt;
    return result;
  }
);

// ------------------------------------------------------------
//  Rejestracja odbioru SMS (admin, jednorazowo): bramka będzie wysyłać
//  przychodzące SMS-y do smsInboundWebhook. Klucz w URL chroni endpoint;
//  trzymamy go w meta/smsWebhook (niedostępne z aplikacji – reguły).
// ------------------------------------------------------------
exports.registerSmsInbound = onCall(
  { region: "us-central1", secrets: [SMSGATE_USER, SMSGATE_PASS] },
  async (request) => {
    if (request.auth?.token?.role !== "admin") throw new HttpsError("permission-denied", "Tylko admin.");
    const key = crypto.randomBytes(24).toString("hex");
    try {
      await gatewayRequest(SMSGATE_USER.value(), SMSGATE_PASS.value(), "/webhooks", {
        method: "POST",
        body: JSON.stringify({ id: WEBHOOK_ID, url: `${INBOUND_URL}?key=${key}`, event: "sms:received" }),
      });
    } catch (err) {
      console.error("registerSmsInbound:", err.message);
      throw new HttpsError("unavailable", "Bramka SMS nie przyjęła rejestracji. Sprawdź, czy telefon z bramką jest online.");
    }
    await db.collection("meta").doc("smsWebhook").set({ key, registeredAt: new Date().toISOString(), url: INBOUND_URL });
    return { ok: true };
  }
);

// ------------------------------------------------------------
//  Odbiór SMS-ów od klientów (webhook bramki, zdarzenie sms:received).
//  Każda odpowiedź trafia do smsInbox (panel admina, push), a „STOP”
//  dopisuje numer do smsOptOut – wtedy nie wysyłamy próśb o opinię.
// ------------------------------------------------------------
exports.smsInboundWebhook = onRequest({ region: "us-central1" }, async (req, res) => {
  if (req.method !== "POST") { res.status(405).send("Method not allowed"); return; }
  const cfg = await db.collection("meta").doc("smsWebhook").get();
  const key = String(req.query.key || "");
  if (!cfg.exists || !key || key.length !== String(cfg.data().key || "").length
      || !crypto.timingSafeEqual(Buffer.from(key), Buffer.from(String(cfg.data().key)))) {
    res.status(403).send("Forbidden");
    return;
  }
  const body = req.body || {};
  if (body.event !== "sms:received") { res.status(200).send("ignored"); return; }
  const p = body.payload || {};
  const phone = toE164PL(p.phoneNumber || p.sender || "") || String(p.phoneNumber || "").slice(0, 20);
  const text = String(p.message || p.text || "").slice(0, 1000);
  const receivedAt = p.receivedAt || new Date().toISOString();
  if (!phone || !text) { res.status(200).send("empty"); return; }

  const isStop = STOP_RE.test(text);
  await db.collection("smsInbox").add({ phone, text, receivedAt, isStop, read: false, createdAt: new Date().toISOString() });
  if (isStop) {
    await db.collection("smsOptOut").doc(phone).set({ phone, at: new Date().toISOString(), text });
  }
  res.status(200).send("ok");
});
