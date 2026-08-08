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
    img.onerror = reject;
    img.src = e.target.result;
  };
  reader.onerror = reject;
  reader.readAsDataURL(file);
});

export const uploadRepairPhotoWeb = async (repairId, file) => {
  const compressedBlob = await compressImageFile(file);
  const fileName = `${Date.now()}_${Math.random().toString(36).slice(2)}.jpg`;
  const storageRef = ref(storage, `repairs/${repairId}/${fileName}`);
  await uploadBytes(storageRef, compressedBlob);
  return getDownloadURL(storageRef);
};

export const uploadTradePhotoWeb = async (phoneId, file) => {
  const compressedBlob = await compressImageFile(file);
  const fileName = `${Date.now()}_${Math.random().toString(36).slice(2)}.jpg`;
  const storageRef = ref(storage, `trade/${phoneId}/${fileName}`);
  await uploadBytes(storageRef, compressedBlob);
  return getDownloadURL(storageRef);
};

export const deletePhotoByUrlWeb = async (url) => {
  try {
    const storageRef = ref(storage, url);
    await deleteObject(storageRef);
  } catch (error) {
    console.warn('Nie udało się usunąć zdjęcia ze Storage:', error.message);
  }
};
