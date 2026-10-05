// ============================================================
//  devLog.js – logi techniczne bez wycieku danych w produkcji
//
//  Development (npm run dev): pełny obiekt błędu w konsoli – jak dotąd.
//  Produkcja (PWA i aplikacja): tylko etykieta + kod/nazwa błędu, bez
//  całych obiektów Firebase/Capacitor (mogą zawierać ścieżki dokumentów,
//  dane z zapytań, odpowiedzi serwera). Tokenów i danych klientów nie
//  logujemy nigdzie.
// ============================================================

const DEV = import.meta.env.DEV;

const summarize = (err) => {
  if (!err) return '';
  if (typeof err === 'string') return err.slice(0, 120);
  return String(err.code || err.name || 'Error');
};

export const devWarn = (label, err) => {
  if (DEV) console.warn(label, err);
  else console.warn(label, summarize(err));
};

export const devError = (label, err) => {
  if (DEV) console.error(label, err);
  else console.error(label, summarize(err));
};
