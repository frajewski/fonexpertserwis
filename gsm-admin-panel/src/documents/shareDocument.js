// ============================================================
//  shareDocument.js – udostępnianie plików i tekstu
//
//  Aplikacja natywna (Capacitor):
//    Blob → base64 → plik w katalogu CACHE aplikacji (Filesystem)
//    → file:// URI → Share.share({ files }) → systemowy Share Sheet.
//    Plugin Share sam zamienia file:// na content:// (FileProvider)
//    i nadaje typ MIME po rozszerzeniu (.pdf → application/pdf).
//    Folder cache/share jest czyszczony przed każdym udostępnieniem,
//    więc pliki nie zostają na stałe (Android i tak może czyścić cache).
//
//  Przeglądarka / PWA:
//    Web Share API z plikiem (jeśli przeglądarka je ma, np. Chrome na
//    Androidzie), w przeciwnym razie zwykłe pobranie pliku.
//
//  Wynik: 'shared' | 'cancelled' | 'downloaded'. Anulowanie NIE jest błędem.
// ============================================================

import { Capacitor } from '@capacitor/core';
import { Share } from '@capacitor/share';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { htmlToPdfBlob } from './htmlToPdf';
import { devError, devWarn } from '../utils/devLog';

const SHARE_DIR = 'share';

const canUseNativeShare = () =>
  Capacitor.isNativePlatform()
  && Capacitor.isPluginAvailable('Share')
  && Capacitor.isPluginAvailable('Filesystem');

const isCancel = (err) =>
  err?.name === 'AbortError' || /cancel/i.test(String(err?.message || err || ''));

/** Czytelna, bezpieczna nazwa pliku: bez polskich znaków i ukośników. */
export const safeFileName = (...parts) =>
  parts
    .filter(Boolean)
    .join('_')
    .replace(/ł/g, 'l').replace(/Ł/g, 'L')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Za-z0-9_-]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');

const blobToBase64 = (blob) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(String(reader.result).split(',')[1]);
  reader.onerror = () => reject(reader.error);
  reader.readAsDataURL(blob);
});

export const downloadBlob = (blob, fileName) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
};

/**
 * Udostępnia plik (Blob) przez systemowy Share Sheet.
 * @param {{ fileName: string, blob: Blob, mimeType: string, title?: string, text?: string }} opts
 */
export async function shareFile({ fileName, blob, mimeType, title, text }) {
  if (!blob || !blob.size) throw new Error('Brak pliku do udostępnienia.');
  const typedBlob = blob.type === mimeType ? blob : new Blob([blob], { type: mimeType });

  if (canUseNativeShare()) {
    let uri;
    try {
      const data = await blobToBase64(typedBlob);
      // Sprzątanie poprzednich plików tymczasowych (nie są potrzebne po udostępnieniu)
      await Filesystem.rmdir({ path: SHARE_DIR, directory: Directory.Cache, recursive: true }).catch(() => {});
      ({ uri } = await Filesystem.writeFile({
        path: `${SHARE_DIR}/${fileName}`,
        data,
        directory: Directory.Cache,
        recursive: true,
      }));
    } catch (err) {
      devError('[share] zapis pliku nie powiódł się', err);
      throw new Error('Nie udało się zapisać pliku tymczasowego na urządzeniu.');
    }

    try {
      await Share.share({ title, text, files: [uri], dialogTitle: title || 'Udostępnij' });
      return 'shared';
    } catch (err) {
      if (isCancel(err)) return 'cancelled';
      devError('[share] Share Sheet', err);
      throw new Error('Nie udało się otworzyć udostępniania. Spróbuj ponownie.');
    }
  }

  // ---- Web / PWA ----
  const file = new File([typedBlob], fileName, { type: mimeType });
  if (typeof navigator !== 'undefined' && navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title, text });
      return 'shared';
    } catch (err) {
      if (isCancel(err)) return 'cancelled';
      devWarn('[share] Web Share nie powiódł się – pobieram plik', err);
    }
  }
  downloadBlob(typedBlob, fileName);
  return 'downloaded';
}

/** Generuje PDF z istniejącego szablonu HTML (bez sieci też działa). */
export async function htmlDocumentToPdf(html) {
  try {
    const blob = await htmlToPdfBlob(html);
    if (!blob || !blob.size) throw new Error('pusty plik');
    return blob;
  } catch (err) {
    devError('[share] generowanie PDF', err);
    throw new Error('Nie udało się wygenerować PDF.');
  }
}

/** Skrót: szablon HTML → PDF → Share Sheet (albo pobranie w przeglądarce). */
export async function shareHtmlDocument({ html, fileName, title, text }) {
  const blob = await htmlDocumentToPdf(html);
  return shareFile({ fileName, blob, mimeType: 'application/pdf', title, text });
}

/** Skrót: szablon HTML → PDF → pobranie pliku (przeglądarka). */
export async function downloadHtmlDocument({ html, fileName }) {
  const blob = await htmlDocumentToPdf(html);
  downloadBlob(blob, fileName);
  return 'downloaded';
}

/** Czy da się udostępnić sam tekst (natywnie albo przez Web Share API). */
export const canShareText = () =>
  (Capacitor.isNativePlatform() && Capacitor.isPluginAvailable('Share'))
  || (typeof navigator !== 'undefined' && typeof navigator.share === 'function');

/** Udostępnia tekst (np. treść wiadomości z linkiem do śledzenia). */
export async function shareText({ title, text }) {
  try {
    if (Capacitor.isNativePlatform() && Capacitor.isPluginAvailable('Share')) {
      await Share.share({ title, text, dialogTitle: title || 'Udostępnij' });
    } else {
      await navigator.share({ title, text });
    }
    return 'shared';
  } catch (err) {
    if (isCancel(err)) return 'cancelled';
    devError('[share] tekst', err);
    throw new Error('Nie udało się udostępnić. Spróbuj ponownie.');
  }
}
