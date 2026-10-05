// ============================================================
//  photoUpload.js – upload zdjęć specyficzny dla przeglądarki
//
//  W przeciwieństwie do apki mobilnej (gdzie ImagePicker zwraca lokalny
//  URI typu file://..., wymagający fetch()+blob() przed wgraniem), input
//  type="file" w przeglądarce daje obiekt File, który JEST JUŻ Blob-em –
//  można go wgrać do Storage bezpośrednio, bez konwersji.
//
//  Te funkcje zapisują pliki w TYCH SAMYCH ścieżkach Storage co apka
//  mobilna (repairs/{repairId}/..., trade/{phoneId}/...), więc zdjęcie
//  wgrane tutaj jest widoczne w apce mobilnej i odwrotnie.
// ============================================================

import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from './firebaseConfig';
import { isOnlineNow, PHOTO_OFFLINE_MESSAGE } from '../network/networkStatus';
import { devWarn } from '../utils/devLog';

// Kompresuje i skaluje zdjęcie w przeglądarce PRZED wgraniem do Storage,
// używając natywnego Canvas API (brak potrzeby dodatkowej biblioteki).
// Ta sama logika i te same docelowe wymiary co w apce mobilnej
// (Full HD / 1920px szerokości, kompresja JPEG) – dla konsekwencji rozmiaru
// plików niezależnie skąd zostały wgrane.
const compressImageFile = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = (e) => {
    const img = new Image();
    img.onload = () => {
      const maxWidth = 1920;
      const scale = Math.min(1, maxWidth / img.width);
      const canvas = document.createElement('canvas');
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;

      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error('Kompresja zdjęcia nie powiodła się'))),
        'image/jpeg',
        0.7
      );
    };
    img.onerror = () => reject(new Error('Nie udało się odczytać pliku jako obrazu (nieobsługiwany format?)'));
    img.src = e.target.result;
  };
  reader.onerror = () => reject(new Error('Nie udało się odczytać pliku z dysku'));
  reader.readAsDataURL(file);
});

// Wspólna ścieżka uploadu dla KAŻDEGO źródła zdjęcia: pliku z <input
// type="file"> (przeglądarka/PWA) i zdjęcia z natywnego aparatu (Capacitor,
// zamieniane wcześniej na File w utils/nativeCamera.js). Kompresja → Storage
// → URL; do Firestore trafia wyłącznie zwrócony URL, nigdy sam obraz.
//
// Bez sieci upload w ogóle nie startuje (czytelny komunikat zamiast
// kilkuminutowego „Wgrywam…”). Kolejki offline celowo nie ma – w przyszłości
// można ją dodać właśnie tutaj, w jednym miejscu.
export const uploadImageToStorage = async (folderPath, file) => {
  if (!isOnlineNow()) throw new Error(PHOTO_OFFLINE_MESSAGE);
  const compressedBlob = await compressImageFile(file);
  const fileName = `${Date.now()}_${Math.random().toString(36).slice(2)}.jpg`;
  const storageRef = ref(storage, `${folderPath}/${fileName}`);
  try {
    await uploadBytes(storageRef, compressedBlob, { contentType: 'image/jpeg' });
    return await getDownloadURL(storageRef);
  } catch (err) {
    // Połączenie zerwane w trakcie wysyłania → zrozumiały komunikat zamiast kodu Firebase
    if (!isOnlineNow() || err?.code === 'storage/retry-limit-exceeded') {
      throw new Error(PHOTO_OFFLINE_MESSAGE);
    }
    throw err;
  }
};

export const uploadRepairPhotoWeb = (repairId, file) =>
  uploadImageToStorage(`repairs/${repairId}`, file);

export const uploadTradePhotoWeb = (phoneId, file) =>
  uploadImageToStorage(`trade/${phoneId}`, file);

export const deletePhotoByUrlWeb = async (url) => {
  try {
    const storageRef = ref(storage, url);
    await deleteObject(storageRef);
  } catch (error) {
    devWarn('Nie udało się usunąć zdjęcia ze Storage:', error);
  }
};
