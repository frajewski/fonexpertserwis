// ============================================================
//  push.js – powiadomienia push (Firebase Cloud Messaging)
//
//  Wysyłka WYŁĄCZNIE z backendu (Admin SDK). Aplikacja tylko rejestruje
//  urządzenie przez registerPushDevice(); nie zna żadnych kluczy FCM.
//
//  Urządzenia: users/{uid}/devices/{deviceId}
//    { token, platform, deviceName, appVersion, active, createdAt, updatedAt }
//  Jeden użytkownik = wiele urządzeń. Zapis tylko przez Cloud Functions.
//
//  Zdarzenia (MVP):
//    • nowe zlecenie                         → admini
//    • zlecenie „Gotowe do odbioru”          → personel
//    • decyzja klienta ws. kosztorysu        → personel
//    • nowe zgłoszenie klienta (rezerwacja)  → personel
//    • niski stan części (przekroczenie progu) → admini
//    • zadanie z polem assignedTo            → przypisany pracownik
//
//  Ochrona przed spamem: (1) push tylko przy konkretnej zmianie pola
//  (before → after), (2) pushEvents/{event.id} – ponowne dostarczenie
//  tego samego zdarzenia (retry Cloud Functions) nie wyśle drugi raz.
// ============================================================

const admin = require("firebase-admin");
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { onDocumentCreated, onDocumentUpdated } = require("firebase-functions/v2/firestore");
const { logger } = require("firebase-functions");

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();
const FieldValue = admin.firestore.FieldValue;

const REGION = "us-central1";
const CHANNEL_ID = "fonexpert_general";
const STAFF_ROLES = ["admin", "worker"];
const STATUS_READY = "Gotowe do odbioru";

// Błędy FCM oznaczające martwy token → urządzenie dezaktywujemy
const DEAD_TOKEN_ERRORS = new Set([
  "messaging/registration-token-not-registered",
  "messaging/invalid-registration-token",
]);

const devicesRef = (uid) => db.collection("users").doc(uid).collection("devices");
const short = (text, max = 60) => {
  const s = String(text || "").replace(/\s+/g, " ").trim();
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
};
const deviceLabel = (d) => short([d.brand, d.model].filter(Boolean).join(" ") || "Urządzenie", 40);

// ---------- odbiorcy ----------

async function getUserIdsByRoles(roles) {
  const snap = await db.collection("users").where("role", "in", roles).get();
  return snap.docs.map((d) => d.id);
}

async function getUserRole(uid) {
  const snap = await db.collection("users").doc(uid).get();
  return snap.exists ? snap.data().role : null;
}

// ---------- wysyłka ----------

/** Oznacza wszystkie urządzenia z danym tokenem jako nieaktywne. */
async function deactivateToken(token, reason) {
  const snap = await db.collectionGroup("devices").where("token", "==", token).get();
  if (snap.empty) return;
  const batch = db.batch();
  snap.docs.forEach((d) => batch.update(d.ref, {
    active: false,
    deactivatedReason: reason,
    updatedAt: FieldValue.serverTimestamp(),
  }));
  await batch.commit();
}

/**
 * Wysyła push do wszystkich AKTYWNYCH urządzeń podanych użytkowników.
 * Martwe tokeny są dezaktywowane; pojedynczy błąd nie przerywa wysyłki.
 * @param {string[]} userIds
 * @param {{title: string, body: string}} notification
 * @param {Record<string, string>} data – np. { type: 'service_order', orderId }
 */
async function sendPushToUsers(userIds, notification, data = {}) {
  const uniqueUsers = [...new Set(userIds.filter(Boolean))];
  if (uniqueUsers.length === 0) return { sent: 0, failed: 0 };

  const tokens = new Set();
  await Promise.all(uniqueUsers.map(async (uid) => {
    const snap = await devicesRef(uid).where("active", "==", true).get();
    snap.docs.forEach((d) => { if (d.data().token) tokens.add(d.data().token); });
  }));
  const tokenList = [...tokens];
  if (tokenList.length === 0) return { sent: 0, failed: 0 };

  // FCM: wszystkie wartości w `data` muszą być stringami
  const stringData = Object.fromEntries(
    Object.entries(data).filter(([, v]) => v != null).map(([k, v]) => [k, String(v)]),
  );

  let sent = 0;
  let failed = 0;
  for (let i = 0; i < tokenList.length; i += 500) {
    const chunk = tokenList.slice(i, i + 500);
    const res = await admin.messaging().sendEachForMulticast({
      tokens: chunk,
      notification,                 // system pokaże je sam, gdy aplikacja jest w tle / zamknięta
      data: stringData,             // routing po kliknięciu (typ + ID)
      android: {
        priority: "high",
        notification: { channelId: CHANNEL_ID },
      },
    });
    sent += res.successCount;
    failed += res.failureCount;
    await Promise.all(res.responses.map(async (r, idx) => {
      if (r.success) return;
      const code = r.error && r.error.code;
      if (DEAD_TOKEN_ERRORS.has(code)) {
        try {
          await deactivateToken(chunk[idx], code);
        } catch (e) {
          logger.warn("push: nie udało się dezaktywować tokenu", e);
        }
      } else {
        logger.warn("push: błąd wysyłki", code);
      }
    }));
  }
  logger.info("push wysłany", { type: data.type, users: uniqueUsers.length, sent, failed });
  return { sent, failed };
}

/** true = pierwsze przetworzenie tego zdarzenia; false = duplikat (retry). */
async function claimEvent(eventId) {
  try {
    await db.collection("pushEvents").doc(eventId).create({ at: FieldValue.serverTimestamp() });
    return true;
  } catch (e) {
    if (e.code === 6 || /already exists/i.test(e.message || "")) return false; // ALREADY_EXISTS
    throw e;
  }
}

async function notifyOnce(event, userIds, notification, data) {
  if (!(await claimEvent(event.id))) return;
  try {
    await sendPushToUsers(userIds, notification, data);
  } catch (e) {
    // Push nie może blokować zapisu danych ani powodować pętli retry
    logger.error("push: wysyłka nie powiodła się", e);
  }
}

// ---------- rejestracja urządzeń (wywoływane z aplikacji) ----------

async function requireStaff(request) {
  if (!request.auth) throw new HttpsError("unauthenticated", "Brak sesji użytkownika.");
  const role = await getUserRole(request.auth.uid);
  if (!STAFF_ROLES.includes(role)) throw new HttpsError("permission-denied", "Tylko personel.");
  return { uid: request.auth.uid, role };
}

const DEVICE_ID_RE = /^[A-Za-z0-9_-]{8,64}$/;
const PLATFORMS = ["android", "ios", "web"];

exports.registerPushDevice = onCall({ region: REGION }, async (request) => {
  const { uid } = await requireStaff(request);
  const { deviceId, token, platform, deviceName, appVersion } = request.data || {};
  if (!DEVICE_ID_RE.test(String(deviceId || ""))) throw new HttpsError("invalid-argument", "Nieprawidłowy deviceId.");
  if (typeof token !== "string" || token.length < 20 || token.length > 4096) throw new HttpsError("invalid-argument", "Nieprawidłowy token.");
  if (!PLATFORMS.includes(platform)) throw new HttpsError("invalid-argument", "Nieprawidłowa platforma.");

  // Ten sam token u innego konta (np. zmiana użytkownika na telefonie bez
  // poprawnego wylogowania) → tamto powiązanie wyłączamy, żeby push
  // poprzedniego konta nie trafiał do obecnego użytkownika.
  const sameToken = await db.collectionGroup("devices").where("token", "==", token).get();
  const batch = db.batch();
  sameToken.docs.forEach((d) => {
    const ownerUid = d.ref.parent.parent.id;
    if (ownerUid !== uid || d.id !== deviceId) {
      batch.update(d.ref, { active: false, deactivatedReason: "token-reassigned", updatedAt: FieldValue.serverTimestamp() });
    }
  });

  const ref = devicesRef(uid).doc(deviceId);
  const existing = await ref.get();
  batch.set(ref, {
    token,
    platform,
    deviceName: String(deviceName || "").slice(0, 80),
    appVersion: String(appVersion || "").slice(0, 40),
    active: true,
    deactivatedReason: FieldValue.delete(),
    updatedAt: FieldValue.serverTimestamp(),
    ...(existing.exists ? {} : { createdAt: FieldValue.serverTimestamp() }),
  }, { merge: true });
  await batch.commit();
  return { ok: true };
});

exports.unregisterPushDevice = onCall({ region: REGION }, async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Brak sesji użytkownika.");
  const { deviceId } = request.data || {};
  if (!DEVICE_ID_RE.test(String(deviceId || ""))) throw new HttpsError("invalid-argument", "Nieprawidłowy deviceId.");
  const ref = devicesRef(request.auth.uid).doc(deviceId);
  if ((await ref.get()).exists) {
    await ref.update({ active: false, deactivatedReason: "logout", updatedAt: FieldValue.serverTimestamp() });
  }
  return { ok: true };
});

// Test push – tylko admin i tylko na WŁASNE urządzenia (nie ma tu
// możliwości wskazania dowolnego odbiorcy ani treści).
exports.sendTestPush = onCall({ region: REGION }, async (request) => {
  const { uid, role } = await requireStaff(request);
  if (role !== "admin") throw new HttpsError("permission-denied", "Tylko admin.");
  const result = await sendPushToUsers(
    [uid],
    { title: "FonExpert — test powiadomień", body: "Powiadomienia działają na tym urządzeniu." },
    { type: "test" },
  );
  return result;
});

// ---------- zdarzenia biznesowe ----------

exports.pushOnRepairCreated = onDocumentCreated({ document: "repairs/{repairId}", region: REGION }, async (event) => {
  const r = event.data && event.data.data();
  if (!r) return;
  const admins = await getUserIdsByRoles(["admin"]);
  const desc = short(r.description, 50);
  await notifyOnce(event, admins,
    { title: `Nowe zlecenie #${r.displayNumber || ""}`.trim(), body: desc ? `${deviceLabel(r)} — ${desc}` : deviceLabel(r) },
    { type: "service_order", orderId: event.params.repairId });
});

exports.pushOnRepairUpdated = onDocumentUpdated({ document: "repairs/{repairId}", region: REGION }, async (event) => {
  const before = event.data.before.data() || {};
  const after = event.data.after.data() || {};
  const nr = after.displayNumber ? `#${after.displayNumber}` : "";
  const data = { type: "service_order", orderId: event.params.repairId };

  // Tylko istotne zmiany – zwykłe edycje dokumentu nie wysyłają nic
  if (before.status !== after.status && after.status === STATUS_READY) {
    const staff = await getUserIdsByRoles(STAFF_ROLES);
    await notifyOnce(event, staff,
      { title: `Zlecenie ${nr} gotowe do odbioru`.replace(/\s+/g, " "), body: deviceLabel(after) }, data);
    return;
  }
  if (before.estimateAccepted == null && (after.estimateAccepted === true || after.estimateAccepted === false)) {
    const staff = await getUserIdsByRoles(STAFF_ROLES);
    await notifyOnce(event, staff,
      { title: after.estimateAccepted ? `Klient zaakceptował kosztorys ${nr}` : `Klient odrzucił kosztorys ${nr}`, body: deviceLabel(after) }, data);
  }
});

exports.pushOnBookingCreated = onDocumentCreated({ document: "bookingRequests/{bookingId}", region: REGION }, async (event) => {
  const b = event.data && event.data.data();
  if (!b) return;
  const staff = await getUserIdsByRoles(STAFF_ROLES);
  await notifyOnce(event, staff,
    { title: "Nowe zgłoszenie klienta", body: deviceLabel(b) },
    { type: "booking", bookingId: event.params.bookingId });
});

exports.pushOnLowStock = onDocumentUpdated({ document: "parts/{partId}", region: REGION }, async (event) => {
  const before = event.data.before.data() || {};
  const after = event.data.after.data() || {};
  const min = Number(after.minQuantity || 0);
  const wasOk = Number(before.quantity || 0) > Number(before.minQuantity || 0);
  const isLow = Number(after.quantity || 0) <= min;
  if (!(wasOk && isLow)) return; // tylko w momencie przekroczenia progu
  const admins = await getUserIdsByRoles(["admin"]);
  await notifyOnce(event, admins,
    { title: "Niski stan magazynu", body: `${short(after.name, 50)} — zostało ${Number(after.quantity || 0)} szt.` },
    { type: "inventory", partId: event.params.partId });
});

// Zadania: push tylko gdy zadanie ma przypisanego pracownika (assignedTo = uid).
// Obecny formularz zadań go nie ustawia – funkcja jest gotowa na to pole.
async function pushTaskAssigned(event, task, assignedTo) {
  const role = await getUserRole(assignedTo);
  if (!STAFF_ROLES.includes(role)) return;
  await notifyOnce(event, [assignedTo],
    { title: "Nowe zadanie", body: short(task.text, 80) || "Masz nowe zadanie" },
    { type: "task", taskId: event.params.taskId });
}

exports.pushOnTaskCreated = onDocumentCreated({ document: "tasks/{taskId}", region: REGION }, async (event) => {
  const t = event.data && event.data.data();
  if (t && t.assignedTo) await pushTaskAssigned(event, t, t.assignedTo);
});

exports.pushOnTaskAssigned = onDocumentUpdated({ document: "tasks/{taskId}", region: REGION }, async (event) => {
  const before = event.data.before.data() || {};
  const after = event.data.after.data() || {};
  if (after.assignedTo && after.assignedTo !== before.assignedTo) await pushTaskAssigned(event, after, after.assignedTo);
});

// Helper dostępny dla innych modułów backendu (niewyliczalny, więc nie
// zostanie potraktowany jako osobna Cloud Function przy Object.assign w index.js)
Object.defineProperty(exports, "sendPushToUsers", { value: sendPushToUsers, enumerable: false });
