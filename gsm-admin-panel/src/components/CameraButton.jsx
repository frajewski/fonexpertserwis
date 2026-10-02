// ============================================================
//  CameraButton.jsx – przycisk „Zrób zdjęcie” (natywny aparat)
//
//  Renderuje się TYLKO w aplikacji natywnej (Capacitor). W przeglądarce/PWA
//  zwraca null, więc UI webowe zostaje bez zmian. Wygląd przejmuje z klasy
//  przekazanej przez stronę (te same style co istniejący przycisk dodawania).
// ============================================================

import { useState } from 'react';
import { isNativeCameraAvailable, takePhotoAsFile } from '../utils/nativeCamera';

export default function CameraButton({ onPhoto, className, disabled, label = '📷 Zrób zdjęcie' }) {
  const [busy, setBusy] = useState(false);

  if (!isNativeCameraAvailable()) return null;

  const handleClick = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (busy || disabled) return;
    setBusy(true);
    try {
      const file = await takePhotoAsFile();
      if (file) await onPhoto(file); // null = użytkownik anulował, nic nie robimy
    } catch (err) {
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
