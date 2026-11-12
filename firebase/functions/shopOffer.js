// ============================================================
//  shopOffer.js – oferta telefonów na sprzedaż na stronie klienta
//
//  Telefon z phones/{id} (webListed == true, cena na stronie > 0,
//  nie sprzedany i nie u komisanta) jest przepisywany do
//  shopOffer/{id} – WYŁĄCZNIE z pól na białej liście (toOfferItem).
//  Cena zakupu, marża, IMEI, dane sprzedającego i notatki NIE trafiają.
//  Sprzedaż / odznaczenie / usunięcie telefonu = znika ze strony.
//
//  Zdjęcie: własne zdjęcie egzemplarza (phones.photo), a gdy go nie ma –
//  zdjęcie poglądowe z biblioteki modelPhotos (panel → Skup → Zdjęcia
//  modeli): najpierw model + kolor, potem sam model.
// ============================================================

const admin = require("firebase-admin");
const { onDocumentWritten } = require("firebase-functions/v2/firestore");

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();
const FieldValue = admin.firestore.FieldValue;

// Klucz biblioteki zdjęć – MUSI być identyczny jak modelPhotoKey()
// w gsm-admin-panel/src/firebase/modelPhotos.js
const norm = (s) => String(s || "")
  .toLowerCase()
  .replace(/ł/g, "l")
  .normalize("NFD")
  .replace(/[̀-ͯ]/g, "")
  .replace(/[^a-z0-9]+/g, "-")
  .replace(/^-+|-+$/g, "");
const modelPhotoKey = (brand, model, color) =>
  [norm(brand), norm(model), norm(color)].filter(Boolean).join("__");

const isListable = (p) =>
  !!p && p.webListed === true && p.status !== "Sprzedany" && p.status !== "U komisanta" && Number(p.webPrice) > 0;

const clampPct = (v) => {
  const n = Math.round(Number(v));
  return Number.isFinite(n) && n > 0 && n <= 100 ? n : null;
};

async function stockPhotoFor(p) {
  const keys = [];
  if (p.color) keys.push(modelPhotoKey(p.brand, p.model, p.color));
  keys.push(modelPhotoKey(p.brand, p.model));
  for (const k of keys) {
    const snap = await db.collection("modelPhotos").doc(k).get();
    if (snap.exists && snap.data().url) return snap.data().url;
  }
  return null;
}

// BIAŁA LISTA pól widocznych publicznie
async function toOfferItem(p) {
  const stock = p.photo ? null : await stockPhotoFor(p);
  return {
    brand: String(p.brand || ""),
    model: String(p.model || ""),
    storage: String(p.storage || ""),
    color: String(p.color || ""),
    condition: p.condition === "new" ? "new" : "used",
    grade: String(p.grade || ""),
    batteryHealth: clampPct(p.batteryHealth),
    note: String(p.webNote || "").slice(0, 80),
    photo: p.photo || stock || null,
    photoIsStock: !p.photo && !!stock,
    price: Number(p.webPrice),
    listedAt: p.webListedAt || null,
    updatedAt: FieldValue.serverTimestamp(),
  };
}

async function syncOne(id, data) {
  const ref = db.collection("shopOffer").doc(id);
  if (isListable(data)) {
    await ref.set(await toOfferItem(data));
  } else {
    await ref.delete();
  }
}

exports.syncShopOffer = onDocumentWritten(
  { document: "phones/{phoneId}", region: "us-central1" },
  async (event) => {
    const after = event.data.after.exists ? event.data.after.data() : null;
    await syncOne(event.params.phoneId, after);
  }
);

// Dodanie / zmiana / usunięcie zdjęcia w bibliotece → odśwież zdjęcia
// wystawionych telefonów tego modelu
exports.syncShopOfferPhotos = onDocumentWritten(
  { document: "modelPhotos/{key}", region: "us-central1" },
  async (event) => {
    const doc = (event.data.after.exists ? event.data.after.data() : event.data.before.data()) || {};
    const modelKey = modelPhotoKey(doc.brand, doc.model);
    const snap = await db.collection("phones").where("webListed", "==", true).get();
    const matching = snap.docs.filter((d) => {
      const p = d.data();
      return !p.photo && modelPhotoKey(p.brand, p.model) === modelKey;
    });
    await Promise.all(matching.map((d) => syncOne(d.id, d.data())));
  }
);
