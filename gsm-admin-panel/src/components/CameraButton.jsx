// ============================================================
//  CameraButton.jsx – przycisk „Zrób zdjęcie” (natywny aparat)
//
//  Renderuje się TYLKO w aplikacji natywnej (Capacitor). W przeglądarce/PWA
//  zwraca null, więc UI webowe zostaje bez zmian. Wygląd przejmuje z klasy
//  przekazanej przez stronę (te same style co istniejący przycisk dodawania).
// ============================================================

import { useState } from 'react';
import { isNativeCameraAvailable, takePhotoAsFile } from '../utils/nativeCamera';
import { isOnlineNow, PHOTO_OFFLINE_MESSAGE } from '../network/networkStatus';
import { triggerHaptic } from '../native/haptics';

// requireOnline – zdjęcie od razu idzie do Storage, więc bez sieci nie otwieramy aparatu
export default function CameraButton({ onPhoto, className, disabled, requireOnline = false, label = '📷 Zrób zdjęcie' }) {
  const [busy, setBusy] = useState(false);

  if (!isNativeCameraAvailable()) return null;

  const handleClick = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (busy || disabled) return;
    if (requireOnline && !isOnlineNow()) { triggerHaptic('warning'); alert(PHOTO_OFFLINE_MESSAGE); return; }
    setBusy(true);
    try {
      const file = await takePhotoAsFile();
      if (file) await onPhoto(file); // null = użytkownik anulował, nic nie robimy
    } catch (err) {
      triggerHaptic('error');
      alert(err?.message || 'Nie udało się zrobić zdjęcia.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <button type="button" className={className} onClick={handleClick} disabled={disabled || busy}>
      {busy ? 'Aparat…' : label}
    </button>
  );
}
