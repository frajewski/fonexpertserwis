// ============================================================
//  platform.js – rozpoznanie, czy panel działa jako aplikacja natywna
//  (Capacitor, Android) czy jako zwykła strona / PWA w przeglądarce.
//
//  Capacitor.isNativePlatform() zwraca false w przeglądarce i w PWA,
//  więc kod webowy zachowuje się dokładnie tak jak wcześniej.
// ============================================================

import { Capacitor } from '@capacitor/core';

export const isNativeApp = () => Capacitor.isNativePlatform();

// Drukowanie w panelu opiera się na window.open('') + document.write +
// window.print(). Android WebView nie otwiera nowych okien (zapis trafiłby
// do okna samej aplikacji i nadpisał panel), a window.print() nic nie robi.
// Do czasu wdrożenia natywnego drukowania blokujemy tę ścieżkę w aplikacji.
export const blockPrintInNativeApp = () => {
  if (!isNativeApp()) return false;
  alert('Drukowanie nie jest dostępne w aplikacji. Użyj „Udostępnij”, żeby wysłać lub zapisać PDF (np. na Dysku Google), albo drukuj z panelu w przeglądarce.');
  return true;
};
