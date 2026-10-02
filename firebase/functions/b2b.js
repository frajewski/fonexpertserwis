// ============================================================
//  b2b.js – katalog telefonów dla klienta B2B (link tylko do odczytu)
//
//  Telefon z phones/{id} (b2bListed == true, cena B2B > 0, nie sprzedany)
//  jest przepisywany do b2bCatalog/{token}/items/{id} – WYŁĄCZNIE
//  z pól na białej liście (toCatalogItem). Cena zakupu, marża, IMEI,
//  dane sprzedającego i notatki tam nie trafiają.
//  Token siedzi w ścieżce, więc bez linku nie da się nic wylistować.
// ============================================================

const admin = require("firebase-admin");
const crypto = require("crypto");
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { onDocumentWritten } = require("firebase-functions/v2/firestore");

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();
const FieldValue = admin.firestore.FieldValue;

const configRef = () => db.collection("b2bConfig").doc("settings");
const itemsRef = (token) => db.collection("b2bCatalog").doc(token).collection("items");

const isListable = (p) =>
  !!p && p.b2bListed === true && p.status !== "Sprzedany" && Number(p.b2bPrice) > 0;

// BIAŁA LISTA pól widocznych dla klienta B2B
const toCatalogItem = (p) => ({
  brand: p.brand || "",
  model: p.model || "",
  storage: p.storage || "",
  color: p.color || "",
  grade: p.grade || "",
  condition: p.condition || "used",
  hasIcloudLock: !!p.hasIcloudLock,
  hasCarrierLock: !!p.hasCarrierLock,
  photo: p.photo || null,
  price: Number(p.b2bPrice),
  updatedAt: FieldValue.serverTimestamp(),
});

async function getToken() {
  const snap = await configRef().get();
  return snap.exists ? snap.data().token || null : null;
}

async function rebuildCatalog(token) {
  const snap = await db.collection("phones").where("b2bListed", "==", true).get();
  const docs = snap.docs.filter((d) => isListable(d.data()));
  for (let i = 0; i < docs.length; i += 400) {
    const batch = db.batch();
    docs.slice(i, i + 400).forEach((d) => {
      batch.set(itemsRef(token).doc(d.id), toCatalogItem(d.data()));
    });
    await batch.commit();
  }
}

async function requireAdmin(request) {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Brak sesji użytkownika.");
  }
  const callerDoc = await db.collection("users").doc(request.auth.uid).get();
  if ((callerDoc.data() || {}).role !== "admin") {
    throw new HttpsError("permission-denied", "Tylko admin.");
  }
}

// Synchronizacja: każda zmiana telefonu odświeża jego wpis w katalogu
exports.syncB2bCatalog = onDocumentWritten(
  { document: "phones/{phoneId}", region: "us-central1" },
  async (event) => {
    const token = await getToken();
    if (!token) return;

    const ref = itemsRef(token).doc(event.params.phoneId);
    const after = event.data.after.exists ? event.data.after.data() : null;

    if (isListable(after)) {
      await ref.set(toCatalogItem(after));
    } else {
      await ref.delete();
    }
  }
);

// Zwraca token linku; przy pierwszym wywołaniu tworzy go i buduje katalog
exports.getB2bLink = onCall({ region: "us-central1" }, async (request) => {
  await requireAdmin(request);
  let token = await getToken();
  if (!token) {
    token = crypto.randomBytes(16).toString("hex");
    await configRef().set({ token, createdAt: FieldValue.serverTimestamp() });
    await rebuildCatalog(token);
  }
  return { token };
});

// Unieważnia stary link, tworzy nowy
exports.regenerateB2bLink = onCall({ region: "us-central1" }, async (request) => {
  await requireAdmin(request);
  const oldToken = await getToken();
  const token = crypto.randomBytes(16).toString("hex");
  await configRef().set({ token, rotatedAt: FieldValue.serverTimestamp() });
  await rebuildCatalog(token);
  if (oldToken) {
    await db.recursiveDelete(itemsRef(oldToken));
  }
  return { token };
});
