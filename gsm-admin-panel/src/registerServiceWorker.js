// ============================================================
//  registerServiceWorker.js – rejestracja service workera PWA
//
//  Wcześniej robił to automatycznie vite-plugin-pwa (wstrzyknięty
//  registerSW.js). Teraz rejestrujemy go tutaj, dokładnie tak samo
//  (ten sam /sw.js, ten sam scope, po zdarzeniu "load"), ale TYLKO
//  w przeglądarce / PWA.
//
//  W aplikacji Android (Capacitor) pliki panelu są spakowane w APK
//  i serwowane lokalnie – service worker niczego nie daje, a jego cache
//  mógłby serwować starą wersję panelu po aktualizacji aplikacji.
// ============================================================

import { isNativeApp } from './utils/platform';

export function registerServiceWorker() {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;

  if (isNativeApp()) {
    // Sprzątanie na wypadek, gdyby SW został kiedyś zarejestrowany w WebView
    navigator.serviceWorker.getRegistrations()
      .then((registrations) => registrations.forEach((r) => r.unregister()))
      .catch(() => {});
    return;
  }

  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js', { scope: '/' });
  });
}
