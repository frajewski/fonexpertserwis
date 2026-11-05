// ============================================================
//  backup.js – kopia zapasowa bazy (Firestore → JSON w Storage)
//
//  Co tydzień (niedziela 3:00 czasu polskiego) i na żądanie admina
//  (przycisk w Ustawieniach) zapisuje wszystkie kolekcje główne do
//  Storage: backups/firestore-RRRR-MM-DD-HHMM.json. Trzymamy 12
//  ostatnich kopii. Pomijamy dane pochodne / techniczne:
//  b2bCatalog (odtwarzany z phones) i users/{uid}/devices (tokeny push).
//  Odczyt kopii: tylko admin (storage.rules).
// ============================================================
const admin = require("firebase-admin");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { onCall, HttpsError } = require("firebase-functions/v2/https");

if (!admin.apps.length) admin.initializeApp();
const db = admin.firestore();

const KEEP = 12;
const SKIP = new Set(["b2bCatalog"]);

function plain(v) {
  if (v === null || v === undefined) return v;
  if (v instanceof admin.firestore.Timestamp) return v.toDate().toISOString();
  if (v instanceof admin.firestore.DocumentReference) return v.path;
  if (v instanceof admin.firestore.GeoPoint) return { lat: v.latitude, lng: v.longitude };
  if (Buffer.isBuffer(v)) return v.toString("base64");
  if (Array.isArray(v)) return v.map(plain);
  if (typeof v === "object") return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, plain(x)]));
  return v;
}

async function runBackup(trigger) {
  const cols = await db.listCollections();
  const data = {};
  const counts = {};
  for (const col of cols) {
    if (SKIP.has(col.id)) continue;
    const snap = await col.get();
    data[col.id] = Object.fromEntries(snap.docs.map((d) => [d.id, plain(d.data())]));
    counts[col.id] = snap.size;
  }
  const now = new Date();
  const stamp = now.toISOString().slice(0, 16).replace("T", "-").replace(":", "");
  const path = `backups/firestore-${stamp}.json`;
  const body = JSON.stringify({ createdAt: now.toISOString(), trigger, project: process.env.GCLOUD_PROJECT, counts, data });
  const bucket = admin.storage().bucket();
  await bucket.file(path).save(body, { contentType: "application/json", resumable: false, metadata: { cacheControl: "private, max-age=0" } });

  // Sprzątanie: zostaw KEEP najnowszych
  const [files] = await bucket.getFiles({ prefix: "backups/firestore-" });
  const sorted = files.map((f) => f.name).sort().reverse();
  await Promise.all(sorted.slice(KEEP).map((name) => bucket.file(name).delete().catch(() => {})));

  console.log("backup zapisany", { path, counts, bytes: body.length });
  return { path, counts, bytes: body.length };
}

exports.weeklyBackup = onSchedule(
  { schedule: "0 3 * * 0", timeZone: "Europe/Warsaw", region: "us-central1", memory: "512MiB", timeoutSeconds: 300 },
  async () => { await runBackup("schedule"); }
);

exports.runBackupNow = onCall({ region: "us-central1", memory: "512MiB", timeoutSeconds: 300 }, async (request) => {
  if (request.auth?.token?.role !== "admin") throw new HttpsError("permission-denied", "Tylko admin.");
  try {
    return await runBackup("manual");
  } catch (err) {
    console.error("runBackupNow:", err);
    throw new HttpsError("internal", "Nie udało się zrobić kopii bazy.");
  }
});
