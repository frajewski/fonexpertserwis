// ============================================================
//  nativeCamera.js – zdjęcie z natywnego aparatu (Capacitor Camera)
//
//  Działa TYLKO w aplikacji natywnej (Android/iOS). W przeglądarce/PWA
//  przycisk aparatu jest ukryty, a zdjęcia dodaje się jak dotąd przez
//  <input type="file"> (na telefonie i tak oferuje aparat).
//
//  Zwraca zwykły obiekt File – ten sam format co <input type="file"> –
//  więc dalej zdjęcie idzie dokładnie tą samą ścieżką uploadu
//  (firebase/photoUpload.js → kompresja → Firebase Storage).
// ============================================================

import { Capacitor } from '@capacitor/core';
import { Camera } from '@capacitor/camera';

// Kody błędów pluginu (README @capacitor/camera, sekcja "Errors")
const ERR_CAMERA_ACCESS = 'OS-PLUG-CAMR-0003';
const ERR_CANCELLED = 'OS-PLUG-CAMR-0006';
const ERR_NO_CAMERA = 'OS-PLUG-CAMR-0007';

export const isNativeCameraAvailable = () =>
  Capacitor.isNativePlatform() && Capacitor.isPluginAvailable('Camera');

const PERMISSION_DENIED_MESSAGE =
  'Brak dostępu do aparatu. Włącz go w ustawieniach telefonu: Aplikacje → FonExpert Serwis → Uprawnienia → Aparat.';

const ensureCameraPermission = async () => {
  let status = await Camera.checkPermissions();
  if (status.camera === 'granted' || status.camera === 'limited') return;
  if (status.camera === 'denied') throw new Error(PERMISSION_DENIED_MESSAGE);

  status = await Camera.requestPermissions({ permissions: ['camera'] });
  if (status.camera !== 'granted' && status.camera !== 'limited') {
    throw new Error(PERMISSION_DENIED_MESSAGE);
  }
};

/**
 * Otwiera natywny aparat. Zwraca File (JPEG) albo null, jeśli użytkownik
 * anulował. Każdy inny problem kończy się Error z polskim komunikatem.
 */
export const takePhotoAsFile = async () => {
  if (!isNativeCameraAvailable()) {
    throw new Error('Aparat jest dostępny tylko w aplikacji mobilnej.');
  }

  await ensureCameraPermission();

  let result;
  try {
    result = await Camera.takePhoto({
      // Wysoka jakość z aparatu – właściwa kompresja (max 1920 px szerokości,
      // JPEG 0.7) dzieje się później, tak samo jak dla plików z przeglądarki
      quality: 90,
      correctOrientation: true,
      saveToGallery: false,
      editable: 'no',
    });
  } catch (err) {
    const code = err?.code;
    const msg = String(err?.message || '').toLowerCase();
    if (code === ERR_CANCELLED || msg.includes('cancel')) return null;
    if (code === ERR_CAMERA_ACCESS) throw new Error(PERMISSION_DENIED_MESSAGE);
    if (code === ERR_NO_CAMERA) throw new Error('To urządzenie nie ma dostępnego aparatu.');
    throw new Error('Nie udało się zrobić zdjęcia' + (err?.message ? `: ${err.message}` : '.'));
  }

  if (!result?.webPath) throw new Error('Aparat nie zwrócił zdjęcia.');

  // webPath to lokalny adres serwowany przez Capacitor (ten sam origin co
  // aplikacja) – pobieramy go jako Blob i opakowujemy w File
  const response = await fetch(result.webPath);
  if (!response.ok) throw new Error('Nie udało się odczytać zdjęcia z aparatu.');
  const blob = await response.blob();
  return new File([blob], `aparat_${Date.now()}.jpg`, { type: blob.type || 'image/jpeg' });
};
