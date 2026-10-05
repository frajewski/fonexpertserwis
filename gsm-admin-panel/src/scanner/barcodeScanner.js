// ============================================================
//  barcodeScanner.js – JEDNO miejsce konfiguracji skanera kodów
//
//  Plugin: @capacitor/barcode-scanner (oficjalny, Ionic). Otwiera własny,
//  pełnoekranowy ekran aparatu z instrukcją i przyciskiem anulowania.
//  Ekran jest osobną aktywnością (Android) / kontrolerem (iOS) – po
//  sukcesie, anulowaniu albo błędzie zamyka się i zwalnia aparat sam,
//  więc nie koliduje z Capacitor Camera (zdjęcia).
//
//  Tylko aplikacja natywna. W przeglądarce/PWA przyciski „Skanuj” są
//  ukryte (zostaje ręczne wpisywanie) – plugin ładujemy dynamicznie,
//  żeby jego część webowa (html5-qrcode) nie trafiała do startu PWA.
// ============================================================

import { Capacitor } from '@capacitor/core';
import { devError } from '../utils/devLog';

// Kody błędów pluginu (identyczne na Androidzie i iOS)
const ERR_CANCELLED = 'OS-PLUG-BARC-0006';
const ERR_CAMERA_DENIED = 'OS-PLUG-BARC-0007';

// Wartości enumu CapacitorBarcodeScannerTypeHint
const HINT = { QR_CODE: 0, CODE_128: 5, ALL: 17 };

// Co skanujemy → jakie formaty i jaka podpowiedź na ekranie
const PURPOSES = {
  // Etykiety IMEI na pudełkach / pod baterią / ekran *#06# – Code 128
  imei: { hint: HINT.CODE_128, instructions: 'Zeskanuj kod kreskowy IMEI' },
  // QR z potwierdzenia przyjęcia
  repair: { hint: HINT.QR_CODE, instructions: 'Zeskanuj kod QR z potwierdzenia przyjęcia' },
  // Wyszukiwanie na liście: IMEI albo QR zlecenia
  any: { hint: HINT.ALL, instructions: 'Zeskanuj IMEI albo kod QR zlecenia' },
};

export const CAMERA_DENIED_MESSAGE =
  'Brak dostępu do aparatu. Możesz wpisać numer ręcznie albo włączyć aparat w ustawieniach telefonu (Aplikacje → FonExpert Serwis → Uprawnienia).';

export const isScannerAvailable = () =>
  Capacitor.isNativePlatform() && Capacitor.isPluginAvailable('CapacitorBarcodeScanner');

let scanning = false; // blokada podwójnego uruchomienia (np. szybkie dwa kliknięcia)

/**
 * Otwiera skaner. Zwraca odczytany tekst ('' gdy kod był pusty) albo null, gdy użytkownik anulował.
 * Każdy inny problem → Error z polskim komunikatem.
 * @param {'imei'|'repair'|'any'} purpose
 */
export async function scanCode(purpose = 'any') {
  if (!isScannerAvailable()) throw new Error('Skaner jest dostępny tylko w aplikacji mobilnej.');
  if (scanning) return null;
  const cfg = PURPOSES[purpose] || PURPOSES.any;

  scanning = true;
  try {
    const { CapacitorBarcodeScanner } = await import('@capacitor/barcode-scanner');
    const result = await CapacitorBarcodeScanner.scanBarcode({
      hint: cfg.hint,
      scanInstructions: cfg.instructions,
      scanButton: false,          // skanuje automatycznie, bez dodatkowego przycisku
      cameraDirection: 1,         // tylny aparat
      scanOrientation: 3,         // adaptacyjnie (pion/poziom)
      android: { scanningLibrary: 'mlkit' }, // ML Kit – dobrze czyta kody 1D z etykiet
      cancelButtonAccessibilityLabel: 'Anuluj skanowanie',
    });
    // Pusty odczyt to NIE anulowanie – zwracamy '' i walidacja pokaże komunikat
    return String(result?.ScanResult ?? '').trim();
  } catch (err) {
    const code = err?.code;
    const msg = String(err?.message || '');
    if (code === ERR_CANCELLED || /cancel/i.test(msg)) return null;
    if (code === ERR_CAMERA_DENIED || /camera access|permission/i.test(msg)) throw new Error(CAMERA_DENIED_MESSAGE);
    devError('[scanner]', err);
    throw new Error('Nie udało się uruchomić skanera. Spróbuj ponownie albo wpisz numer ręcznie.');
  } finally {
    scanning = false;
  }
}
