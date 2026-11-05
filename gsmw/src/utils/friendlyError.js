// Zamienia błędy Firebase / sieci na komunikaty zrozumiałe dla klienta.
// Szczegóły techniczne zostają w konsoli, klient widzi co ma zrobić.
import SHOP from '../shop';

export default function friendlyError(err, fallback = 'Coś poszło nie tak. Spróbuj ponownie za chwilę.') {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return 'Brak połączenia z internetem. Sprawdź połączenie i spróbuj ponownie.';
  }
  const code = String(err?.code || '').replace(/^functions\//, '');
  const msg = String(err?.message || '');
  if (code === 'resource-exhausted') return msg || 'Wysłano zbyt wiele zgłoszeń. Spróbuj później albo zadzwoń.';
  if (code === 'invalid-argument' || code === 'failed-precondition') return msg || 'Sprawdź poprawność danych w formularzu.';
  if (code === 'unavailable' || code === 'deadline-exceeded' || /network|fetch|Failed to fetch/i.test(msg)) {
    return 'Nie udało się połączyć z serwisem. Sprawdź internet i spróbuj ponownie.';
  }
  if (code === 'internal' || code === 'unknown' || code === 'unauthenticated' || /Cloud Function|Firebase|Anonymous/i.test(msg)) {
    return `Usługa jest chwilowo niedostępna. Spróbuj za chwilę albo zadzwoń: ${SHOP.phone}.`;
  }
  return msg && msg.length < 220 ? msg : fallback;
}

// Polski numer komórkowy: 9 cyfr (opcjonalnie z +48 / 48 na początku)
export function isValidPlPhone(value) {
  const digits = String(value || '').replace(/\D/g, '');
  const local = digits.length === 11 && digits.startsWith('48') ? digits.slice(2) : digits;
  return /^\d{9}$/.test(local);
}
