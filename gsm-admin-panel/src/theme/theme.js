// ============================================================
//  theme.js – tryb jasny / ciemny / automatyczny (jak w systemie)
//
//  Preferencja w localStorage (per urządzenie). „auto” = brak atrybutu
//  data-theme na <html>, wtedy decyduje @media (prefers-color-scheme)
//  w tokens.css. Wywołanie applyTheme() w main.jsx przed renderem
//  zapobiega mignięciu jasnego ekranu przy starcie.
// ============================================================

const KEY = 'fx-theme';
export const THEMES = ['auto', 'light', 'dark'];
export const THEME_LABELS = { auto: 'Motyw: jak w systemie', light: 'Motyw: jasny', dark: 'Motyw: ciemny' };
export const THEME_ICONS = { auto: '🌓', light: '☀️', dark: '🌙' };

export function getThemePref() {
  try {
    const v = localStorage.getItem(KEY);
    return THEMES.includes(v) ? v : 'auto';
  } catch {
    return 'auto';
  }
}

const isDark = (pref) => pref === 'dark'
  || (pref === 'auto' && typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches);

export function applyTheme(pref = getThemePref()) {
  const root = document.documentElement;
  if (pref === 'auto') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', pref);
  // Kolor paska przeglądarki / statusu PWA
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', isDark(pref) ? '#0F1320' : '#11172B');
}

export function setThemePref(pref) {
  try { localStorage.setItem(KEY, pref); } catch { /* tryb prywatny – motyw tylko na tę sesję */ }
  applyTheme(pref);
}

export const nextTheme = (pref) => THEMES[(THEMES.indexOf(pref) + 1) % THEMES.length];
