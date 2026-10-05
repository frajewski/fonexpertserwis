// ============================================================
//  statusBar.js – kolor ikon paska statusu i paska nawigacji (Android)
//
//  Aplikacja rysuje się pod paskami systemowymi (edge-to-edge; Android 15+
//  wymusza to i nie pozwala ustawić koloru tła paska). Zamiast stałych
//  wartości sprawdzamy, CO faktycznie jest pod paskiem:
//    • granatowy górny pasek panelu / menu / przyciemnienie modala → jasne ikony
//    • jasne tło strony (logowanie, „Wczytywanie…”, widok tabletu/poziomy) → ciemne ikony
//  Tak samo dla dolnego paska nawigacji. Działa też przy ewentualnym
//  ciemnym motywie w przyszłości – liczy się realny kolor na ekranie.
//
//  Odświeżane: zmiana trasy, obrót/zmiana rozmiaru, otwarcie/zamknięcie
//  menu lub modala (MutationObserver), powrót aplikacji z tła.
//  W przeglądarce/PWA: nic nie robi.
// ============================================================

import { Capacitor, SystemBars, SystemBarsStyle, SystemBarType } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';

const available = () => Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';

const parseColor = (str) => {
  const m = String(str).match(/rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:\s*[,/]\s*([\d.]+%?))?\s*\)/);
  if (!m) return null;
  let a = m[4] === undefined ? 1 : parseFloat(m[4]);
  if (String(m[4]).endsWith('%')) a /= 100;
  return { r: +m[1], g: +m[2], b: +m[3], a };
};

/** Kolor tła elementu (pierwszy kolor gradientu traktujemy jako kryjący). */
const backgroundOf = (el) => {
  const cs = getComputedStyle(el);
  if (cs.visibility === 'hidden' || parseFloat(cs.opacity) === 0) return null;
  const img = cs.backgroundImage;
  if (img && img !== 'none' && img.includes('gradient')) {
    const c = parseColor(img);
    if (c) return { ...c, a: 1 };
  }
  const c = parseColor(cs.backgroundColor);
  return c && c.a > 0 ? c : null;
};

/** Rzeczywisty kolor w punkcie: składamy warstwy od góry, aż będą kryjące. */
export const colorAtPoint = (x, y) => {
  const layers = document.elementsFromPoint ? document.elementsFromPoint(x, y) : [];
  let out = { r: 0, g: 0, b: 0 };
  let remaining = 1; // ile „przezroczystości” zostało do wypełnienia
  for (const el of layers) {
    const c = backgroundOf(el);
    if (!c) continue;
    const w = remaining * c.a;
    out = { r: out.r + c.r * w, g: out.g + c.g * w, b: out.b + c.b * w };
    remaining -= w;
    if (remaining < 0.02) break;
  }
  if (remaining > 0) {
    // reszta: tło dokumentu (białe, jeśli nic nie ustawiono)
    const base = backgroundOf(document.body) || backgroundOf(document.documentElement) || { r: 255, g: 255, b: 255 };
    out = { r: out.r + base.r * remaining, g: out.g + base.g * remaining, b: out.b + base.b * remaining };
  }
  return out;
};

const luminance = ({ r, g, b }) => {
  const ch = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
  return 0.2126 * ch(r) + 0.7152 * ch(g) + 0.0722 * ch(b);
};

/** 'LIGHT' = jasne tło → ciemne ikony; 'DARK' = ciemne tło → jasne ikony. */
export const styleForColor = (c) => (luminance(c) > 0.4 ? 'LIGHT' : 'DARK');

const insetPx = (name) => {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name);
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : 0;
};

let lastTop = null;
let lastBottom = null;

export function detectBarStyles() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  const top = Math.max(1, insetPx('--safe-area-inset-top') / 2);
  const bottom = h - Math.max(1, insetPx('--safe-area-inset-bottom') / 2);
  // środek paska (ikony są po obu stronach – środek reprezentuje tło najlepiej)
  return {
    top: styleForColor(colorAtPoint(w / 2, top)),
    bottom: styleForColor(colorAtPoint(w / 2, Math.min(h - 1, bottom))),
  };
}

async function apply() {
  if (!available()) return;
  const { top, bottom } = detectBarStyles();
  try {
    if (top !== lastTop) {
      lastTop = top;
      await StatusBar.setStyle({ style: top === 'LIGHT' ? Style.Light : Style.Dark });
    }
    if (bottom !== lastBottom) {
      lastBottom = bottom;
      await SystemBars.setStyle({
        style: bottom === 'LIGHT' ? SystemBarsStyle.Light : SystemBarsStyle.Dark,
        bar: SystemBarType.NavigationBar,
      });
    }
  } catch {
    // starszy WebView / brak pluginu – zostaje kolor systemowy
    lastTop = null;
    lastBottom = null;
  }
}

let timer = null;
let lateTimer = null;
/** Odświeżenie „za chwilę” (zbiera wiele zmian w jedną; drugi raz po animacjach 0,2 s). */
export function scheduleBarStyleUpdate() {
  if (!available()) return;
  clearTimeout(timer);
  clearTimeout(lateTimer);
  timer = setTimeout(apply, 60);
  lateTimer = setTimeout(apply, 320);
}

let observer = null;
export function startBarStyleWatcher() {
  if (!available() || observer) return () => {};
  observer = new MutationObserver(scheduleBarStyleUpdate);
  // Tylko struktura i klasy – nie każdy znak wpisany w formularzu
  observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
  window.addEventListener('resize', scheduleBarStyleUpdate);
  scheduleBarStyleUpdate();
  return () => {
    observer?.disconnect();
    observer = null;
    window.removeEventListener('resize', scheduleBarStyleUpdate);
  };
}
