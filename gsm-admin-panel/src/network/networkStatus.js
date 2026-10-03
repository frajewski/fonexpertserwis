// ============================================================
//  networkStatus.js – globalny stan sieci (jedno źródło prawdy)
//
//  Stan trzymamy w małym store Zustand (ta sama biblioteka co reszta
//  panelu), dzięki czemu:
//    • komponenty czytają go hookiem:   useNetworkStatus((s) => s.isOnline)
//    • zwykły kod (upload, logowanie):  isOnlineNow()
//
//  Listenery zakłada TYLKO startNetworkMonitoring(), wywoływane raz
//  w <NetworkProvider> – żaden inny komponent nie nasłuchuje sam.
//
//  Źródło danych:
//    • aplikacja natywna (Capacitor) → plugin @capacitor/network
//      (Android: ConnectivityManager, iOS: NWPathMonitor)
//    • przeglądarka / PWA → navigator.onLine + zdarzenia online/offline
//
//  Główną informacją jest ZAWSZE `connected` / `navigator.onLine`.
//  Typ połączenia (wifi/cellular) jest tylko opisowy – zmiana Wi-Fi → LTE
//  nie oznacza utraty sieci.
// ============================================================

import { create } from 'zustand';
import { Capacitor } from '@capacitor/core';
import { Network } from '@capacitor/network';

const useNativePlugin = () =>
  Capacitor.isNativePlatform() && Capacitor.isPluginAvailable('Network');

const browserOnline = () =>
  typeof navigator === 'undefined' ? true : navigator.onLine !== false;

// W przeglądarce typ znamy tylko tam, gdzie jest Network Information API
// (głównie Chrome na Androidzie). Na komputerze zwykle 'unknown' – celowo
// NIE zgadujemy go z effectiveType ('4g' nie znaczy, że to Wi-Fi).
const browserConnectionType = () => {
  const c = typeof navigator !== 'undefined' ? navigator.connection : null;
  const type = c && c.type;
  if (type === 'wifi' || type === 'ethernet' || type === 'wimax') return 'wifi';
  if (type === 'cellular' || type === 'bluetooth') return 'cellular';
  return 'unknown';
};

export const useNetworkStatus = create(() => ({
  isOnline: browserOnline(),
  connectionType: browserOnline() ? browserConnectionType() : 'none', // 'wifi' | 'cellular' | 'none' | 'unknown'
  lastChangedAt: null,  // ISO data ostatniej zmiany (online/offline lub typu)
  source: 'web',        // 'native' (Capacitor Network) | 'web' (navigator.onLine)
}));

const applyStatus = (isOnline, connectionType) => {
  const prev = useNetworkStatus.getState();
  const type = isOnline ? (connectionType && connectionType !== 'none' ? connectionType : 'unknown') : 'none';
  if (prev.isOnline === isOnline && prev.connectionType === type) return;
  useNetworkStatus.setState({ isOnline, connectionType: type, lastChangedAt: new Date().toISOString() });
};

// ---------- Natywnie: plugin Capacitor Network ----------
const startNative = () => {
  let cancelled = false;
  let gotEvent = false;
  let handle = null;

  useNetworkStatus.setState({ source: 'native' });

  Network.getStatus()
    .then((s) => { if (!cancelled && !gotEvent) applyStatus(s.connected, s.connectionType); })
    .catch((err) => {
      console.warn('[network] getStatus nie powiódł się – używam navigator.onLine', err);
      if (!cancelled) applyStatus(browserOnline(), 'unknown');
    });

  Network.addListener('networkStatusChange', (s) => {
    gotEvent = true;
    applyStatus(s.connected, s.connectionType);
  })
    .then((h) => { if (cancelled) h.remove(); else handle = h; })
    .catch((err) => console.warn('[network] nie udało się dodać listenera', err));

  return () => {
    cancelled = true;
    if (handle) handle.remove();
  };
};

// ---------- Web / PWA: navigator.onLine + zdarzenia ----------
const startWeb = () => {
  useNetworkStatus.setState({ source: 'web' });
  const update = () => applyStatus(browserOnline(), browserConnectionType());
  update();

  const connection = navigator.connection;
  window.addEventListener('online', update);
  window.addEventListener('offline', update);
  if (connection && connection.addEventListener) connection.addEventListener('change', update);

  return () => {
    window.removeEventListener('online', update);
    window.removeEventListener('offline', update);
    if (connection && connection.removeEventListener) connection.removeEventListener('change', update);
  };
};

/** Zakłada listenery i zwraca funkcję sprzątającą (dla useEffect). */
export const startNetworkMonitoring = () => {
  try {
    return useNativePlugin() ? startNative() : startWeb();
  } catch (err) {
    console.warn('[network] monitoring niedostępny', err);
    return () => {};
  }
};

/** Aktualny stan – do użycia poza komponentami (upload, logowanie itp.). */
export const isOnlineNow = () => useNetworkStatus.getState().isOnline;

export const OFFLINE_MESSAGE = 'Brak połączenia z Internetem.';
export const PHOTO_OFFLINE_MESSAGE = 'Brak połączenia. Zdjęcie nie zostało wysłane.';

export const CONNECTION_TYPE_LABELS = {
  wifi: 'Wi-Fi',
  cellular: 'Sieć komórkowa',
  none: 'Brak',
  unknown: 'Nieznany',
};
