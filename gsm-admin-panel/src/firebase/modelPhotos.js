// ============================================================
//  modelPhotos.js – biblioteka zdjęć poglądowych modeli
//  (oferta „Telefony na sprzedaż” na stronie klienta).
//  Firestore modelPhotos/{key}: { brand, model, color, url, storagePath }
//  Storage modelPhotos/<plik>. Dopasowanie robi Cloud Function
//  syncShopOffer (firebase/functions/shopOffer.js).
// ============================================================
import { collection, doc, onSnapshot, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from './firebaseConfig';
import { isOnlineNow, PHOTO_OFFLINE_MESSAGE } from '../network/networkStatus';

// MUSI być identyczne jak modelPhotoKey() w firebase/functions/shopOffer.js
const norm = (s) => String(s || '')
  .toLowerCase()
  .replace(/ł/g, 'l')
  .normalize('NFD')
  .replace(/[̀-ͯ]/g, '')
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '');
export const modelPhotoKey = (brand, model, color) =>
  [norm(brand), norm(model), norm(color)].filter(Boolean).join('__');

// Zdjęcia produktowe często mają przezroczyste tło (PNG) – zachowujemy je:
// WebP z kanałem alfa, a gdy przeglądarka nie umie (Safari) – PNG. Max 1000 px.
const prepareImage = (file) => new Promise((resolve, reject) => {
  const url = URL.createObjectURL(file);
  const img = new Image();
  img.onload = () => {
    const scale = Math.min(1, 1000 / Math.max(img.width, img.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(img.width * scale);
    canvas.height = Math.round(img.height * scale);
    canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
    URL.revokeObjectURL(url);
    canvas.toBlob((webp) => {
      if (webp && webp.type === 'image/webp') return resolve({ blob: webp, ext: 'webp', type: 'image/webp' });
      canvas.toBlob((png) => (png ? resolve({ blob: png, ext: 'png', type: 'image/png' }) : reject(new Error('Nie udało się przygotować zdjęcia'))), 'image/png');
    }, 'image/webp', 0.85);
  };
  img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Nie udało się odczytać pliku jako obrazu (nieobsługiwany format?)')); };
  img.src = url;
});

export const subscribeToModelPhotos = (cb, onError) =>
  onSnapshot(collection(db, 'modelPhotos'), (snap) => cb(snap.docs.map((d) => ({ key: d.id, ...d.data() }))), onError);

export async function saveModelPhoto({ brand, model, color }, file, previous) {
  if (!isOnlineNow()) throw new Error(PHOTO_OFFLINE_MESSAGE);
  const key = modelPhotoKey(brand, model, color);
  const { blob, ext, type } = await prepareImage(file);
  const storagePath = `modelPhotos/${key}_${Date.now()}.${ext}`;
  const sref = ref(storage, storagePath);
  await uploadBytes(sref, blob, { contentType: type, cacheControl: 'public, max-age=31536000' });
  const url = await getDownloadURL(sref);
  await setDoc(doc(db, 'modelPhotos', key), {
    brand: brand.trim(), model: model.trim(), color: (color || '').trim(), url, storagePath, updatedAt: serverTimestamp(),
  });
  if (previous?.storagePath && previous.storagePath !== storagePath) {
    try { await deleteObject(ref(storage, previous.storagePath)); } catch { /* stary plik już nie istnieje */ }
  }
  return key;
}

export async function deleteModelPhoto(entry) {
  await deleteDoc(doc(db, 'modelPhotos', entry.key));
  if (entry.storagePath) {
    try { await deleteObject(ref(storage, entry.storagePath)); } catch { /* brak pliku */ }
  }
}
