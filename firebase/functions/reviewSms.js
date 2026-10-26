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
const { onCall, HttpsError } = require("firebase-functions/v2/https");
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
const SMSGATE_URL = "https://api.sms-gate.app/3rdparty/v1/messages";

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

    const { phone, text, repairId, bookingId, kind } = request.data || {};
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
    return { ok: true };
  }
);
