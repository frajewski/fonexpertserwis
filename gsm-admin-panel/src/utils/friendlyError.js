// ============================================================
//  friendlyError.js – czytelne komunikaty zamiast surowych błędów
//
//  Zamienia np. „FirebaseError: Missing or insufficient permissions.”
//  albo „CapacitorException: …” na zdanie po polsku. Własne komunikaty
//  aplikacji (Error z polskim tekstem, np. „Brak połączenia. Zdjęcie nie
//  zostało wysłane.”) przechodzą bez zmian. Szczegóły techniczne zostają
//  w konsoli (devLog – w produkcji tylko kod błędu).
// ============================================================

import { isOnlineNow, OFFLINE_MESSAGE } from '../network/networkStatus';
import { devWarn } from './devLog';

// Kody Firestore / Functions („permission-denied”) i Auth/Storage („storage/unauthorized”)
const CODE_MESSAGES = {
  'permission-denied': 'Brak uprawnień do tej operacji.',
  'unauthenticated': 'Sesja wygasła. Zaloguj się ponownie.',
  'unavailable': 'Serwer jest chwilowo niedostępny. Spróbuj ponownie za chwilę.',
  'deadline-exceeded': 'Serwer nie odpowiedział na czas. Spróbuj ponownie.',
  'resource-exhausted': 'Przekroczono limit operacji. Spróbuj ponownie za chwilę.',
  'not-found': 'Nie znaleziono danych – mogły zostać usunięte.',
  'already-exists': 'Taki wpis już istnieje.',
  'failed-precondition': 'Operacja jest teraz niemożliwa (dane zmieniły się w międzyczasie). Odśwież i spróbuj ponownie.',
  'aborted': 'Operacja została przerwana. Spróbuj ponownie.',
  'cancelled': 'Operacja została anulowana.',
  'invalid-argument': 'Nieprawidłowe dane w formularzu.',
  'internal': 'Wystąpił błąd serwera. Spróbuj ponownie.',
  'unknown': 'Wystąpił nieoczekiwany błąd. Spróbuj ponownie.',
  'storage/unauthorized': 'Brak uprawnień do zapisu pliku.',
  'storage/canceled': 'Wysyłanie pliku zostało anulowane.',
  'storage/quota-exceeded': 'Brak miejsca na serwerze plików.',
  'storage/retry-limit-exceeded': 'Nie udało się wysłać pliku – słabe połączenie. Spróbuj ponownie.',
  'storage/object-not-found': 'Plik nie istnieje na serwerze.',
  'auth/network-request-failed': OFFLINE_MESSAGE,
  'auth/requires-recent-login': 'Ze względów bezpieczeństwa zaloguj się ponownie.',
  'auth/too-many-requests': 'Zbyt wiele prób. Spróbuj ponownie za kilka minut.',
};

const looksTechnical = (msg) =>
  /firebase|firestore|capacitor|exception|OS-PLUG|\bat\s+\S+\s*\(|^[A-Z]\w+Error\b|[a-z]+\/[a-z-]+\)?\.?$/i.test(msg) ||
  // angielski komunikat przeglądarki/SDK („Failed to fetch”, „Cannot read properties of undefined”…)
  (/^[\x20-\x7E]+$/.test(msg) && /\b(the|failed|failure|error|cannot|can't|invalid|undefined|null|network|permission|fetch|denied|timeout|unable)\b/i.test(msg));

/**
 * @param {unknown} err
 * @param {string} fallback – zdanie dla błędów bez znanego kodu (np. „Nie udało się zapisać zlecenia.”)
 * @returns {string}
 */
export function friendlyError(err, fallback = 'Wystąpił nieoczekiwany błąd. Spróbuj ponownie.') {
  if (!isOnlineNow()) return OFFLINE_MESSAGE;

  const rawCode = String(err?.code || '');
  const code = rawCode.replace(/^(firestore|functions)\//, '');
  if (CODE_MESSAGES[code]) {
    devWarn('[błąd]', err);
    return CODE_MESSAGES[code];
  }

  const msg = String(err?.message || (typeof err === 'string' ? err : '')).trim();
  // Nasz własny komunikat po polsku – zostawiamy
  if (msg && !rawCode && !looksTechnical(msg)) return msg;

  devWarn('[błąd]', err);
  return fallback;
}

/** „Nie udało się X” + powód, gdy znany (np. brak uprawnień), w jednym zdaniu. */
export function failMessage(action, err) {
  const reason = friendlyError(err, '');
  return reason ? `${action}: ${reason}` : `${action}. Spróbuj ponownie.`;
}
