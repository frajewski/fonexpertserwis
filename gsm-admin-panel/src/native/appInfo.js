// ============================================================
//  appInfo.js – dane do ekranu diagnostycznego (App Info + Device Info)
//
//  Aplikacja: @capacitor/app → nazwa, id pakietu, wersja, build (versionCode).
//  PWA: wersja z package.json i data builda (wstrzykiwane przez Vite).
//  Urządzenie: @capacitor/device getInfo() – tylko dane techniczne:
//  platforma, model, producent, system, wersja systemu, WebView, emulator.
//  NIE pobieramy nazwy urządzenia (bywa nią imię właściciela), identyfikatora
//  urządzenia, stanu baterii ani niczego o użytkowniku.
// ============================================================

import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { Device } from '@capacitor/device';

/* global __APP_VERSION__, __APP_BUILD_TIME__ */
export const WEB_VERSION = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '—';
export const WEB_BUILD_TIME = typeof __APP_BUILD_TIME__ !== 'undefined' ? __APP_BUILD_TIME__ : '';

const WEB_APP_NAME = 'FonExpert – Panel serwisowy';

export const isNative = () => Capacitor.isNativePlatform();

export async function getAppInfo() {
  if (isNative()) {
    try {
      const info = await App.getInfo(); // { name, id, version, build }
      return { name: info.name, id: info.id, version: info.version, build: info.build, webVersion: WEB_VERSION, webBuildTime: WEB_BUILD_TIME };
    } catch {
      /* spadamy do danych webowych */
    }
  }
  return {
    name: WEB_APP_NAME,
    id: typeof window !== 'undefined' ? window.location.host : '—',
    version: WEB_VERSION,
    build: WEB_BUILD_TIME || '—',
    webVersion: WEB_VERSION,
    webBuildTime: WEB_BUILD_TIME,
  };
}

const OS_LABELS = { android: 'Android', ios: 'iOS', windows: 'Windows', mac: 'macOS', unknown: 'Nieznany' };

export async function getDeviceInfo() {
  try {
    const d = await Device.getInfo();
    return {
      platform: Capacitor.getPlatform(),                    // 'android' | 'ios' | 'web'
      runtime: isNative() ? 'Aplikacja natywna (Capacitor)' : (window.matchMedia?.('(display-mode: standalone)').matches ? 'PWA (zainstalowana)' : 'Przeglądarka'),
      model: d.model || '—',
      manufacturer: d.manufacturer || '',
      os: OS_LABELS[d.operatingSystem] || d.operatingSystem || '—',
      osVersion: d.osVersion || '—',
      androidSdk: d.androidSDKVersion || null,
      webViewVersion: d.webViewVersion || '—',
      isVirtual: !!d.isVirtual,
    };
  } catch {
    return {
      platform: Capacitor.getPlatform(),
      runtime: isNative() ? 'Aplikacja natywna (Capacitor)' : 'Przeglądarka',
      model: '—', manufacturer: '', os: '—', osVersion: '—', androidSdk: null, webViewVersion: '—', isVirtual: false,
    };
  }
}
