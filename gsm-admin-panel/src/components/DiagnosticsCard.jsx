// ============================================================
//  DiagnosticsCard.jsx – „Informacje o aplikacji” (Moje konto)
//
//  Do debugowania i prezentacji: wersja, build, platforma, urządzenie,
//  system, sieć, stan powiadomień i dostępność funkcji natywnych.
//  Bez danych wrażliwych: żadnego tokenu FCM (nawet fragmentu), nazwy
//  urządzenia, identyfikatorów ani danych klientów. „Kopiuj” kopiuje
//  dokładnie to, co widać na ekranie.
// ============================================================

import { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { getAppInfo, getDeviceInfo } from '../native/appInfo';
import { triggerHaptic } from '../native/haptics';
import { useNetworkStatus, CONNECTION_TYPE_LABELS } from '../network/networkStatus';
import { usePushState } from '../push/pushState';
import { isNativeCameraAvailable } from '../utils/nativeCamera';
import { isScannerAvailable } from '../scanner/barcodeScanner';

const PERMISSION_LABELS = { granted: 'Przyznana', denied: 'Odmówiona', prompt: 'Jeszcze nie pytano', unsupported: 'Niedostępne (przeglądarka)', unknown: '—' };

export default function DiagnosticsCard() {
  const [app, setApp] = useState(null);
  const [device, setDevice] = useState(null);
  const [copied, setCopied] = useState(false);
  const network = useNetworkStatus();
  const push = usePushState();
  const native = Capacitor.isNativePlatform();

  useEffect(() => {
    let alive = true;
    Promise.all([getAppInfo(), getDeviceInfo()]).then(([a, d]) => {
      if (alive) { setApp(a); setDevice(d); }
    });
    return () => { alive = false; };
  }, []);

  if (!app || !device) {
    return (
      <div className="ac-card">
        <h2 className="ac-section-title">Informacje o aplikacji</h2>
        <p className="ac-push-hint">Wczytywanie…</p>
      </div>
    );
  }

  const deviceLabel = [native ? device.manufacturer : '', device.model].filter(Boolean).join(' ') + (device.isVirtual ? ' (emulator)' : '');
  const osLabel = `${device.os} ${device.osVersion}${device.androidSdk ? ` (API ${device.androidSdk})` : ''}`;

  const rows = [
    ['Aplikacja', app.name],
    ['Wersja', app.version],
    ['Build', native ? `${app.build}` : app.build],
    ['ID aplikacji', app.id],
    ...(native ? [['Panel (web) zbudowany', app.webBuildTime ? `${app.webVersion} · ${app.webBuildTime}` : app.webVersion]] : []),
    ['Platforma', `${device.platform} · ${device.runtime}`],
    ['Urządzenie', deviceLabel || '—'],
    ['System', osLabel],
    [native ? 'WebView' : 'Przeglądarka', device.webViewVersion],
    ['Sieć', network.isOnline ? `Online · ${CONNECTION_TYPE_LABELS[network.connectionType] || 'Nieznany'}` : 'Offline'],
    ['Zgoda na powiadomienia', PERMISSION_LABELS[push.permission] || push.permission],
    ['Push zarejestrowany', push.supported ? (push.registered ? 'Tak' : 'Nie') : 'Niedostępne (przeglądarka)'],
    ['Aparat', isNativeCameraAvailable() ? 'Tak (aparat telefonu)' : 'Przez przeglądarkę (wybór pliku)'],
    ['Skaner kodów', isScannerAvailable() ? 'Tak' : 'Tylko w aplikacji mobilnej'],
    ['Wibracje (haptyka)', native && Capacitor.isPluginAvailable('Haptics') ? 'Tak' : 'Nie (przeglądarka)'],
  ];

  const copy = async () => {
    const text = rows.map(([k, v]) => `${k}: ${v}`).join('\n');
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      alert(text); // brak dostępu do schowka – pokazujemy do ręcznego skopiowania
    }
  };

  return (
    <div className="ac-card">
      <h2 className="ac-section-title">Informacje o aplikacji</h2>
      {rows.map(([k, v]) => (
        <div className="ac-info-row" key={k}><span>{k}</span><span>{v}</span></div>
      ))}
      <button className="ac-submit ac-submit-secondary" type="button" onClick={copy} style={{ marginTop: 12, width: '100%' }}>
        {copied ? '✓ Skopiowano' : 'Kopiuj dane diagnostyczne'}
      </button>
      {native && (
        <button className="ac-submit ac-submit-secondary" type="button" onClick={() => triggerHaptic('success')} style={{ marginTop: 8, width: '100%' }}>
          Test wibracji
        </button>
      )}
    </div>
  );
}
