// ============================================================
//  splash.js – chowanie natywnego ekranu startowego
//
//  Splash (granat + znak F) jest widoczny od uruchomienia do chwili, gdy
//  panel sprawdzi sesję (App.jsx → hideSplash()). Bez sztucznego czekania;
//  capacitor.config.ts ma tylko górny limit 3 s na wypadek błędu JS.
// ============================================================

import { Capacitor } from '@capacitor/core';
import { SplashScreen } from '@capacitor/splash-screen';

let hidden = false;

export function hideSplash() {
  if (hidden || !Capacitor.isNativePlatform()) return;
  hidden = true;
  SplashScreen.hide().catch(() => {});
}
