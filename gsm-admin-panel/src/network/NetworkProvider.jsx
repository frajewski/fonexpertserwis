// ============================================================
//  NetworkProvider.jsx – uruchamia monitoring sieci RAZ dla całej
//  aplikacji i wyświetla globalny, dyskretny komunikat o stanie sieci.
//
//  • offline  → „Brak połączenia z Internetem” (zostaje, dopóki brak sieci)
//  • powrót   → „Połączenie przywrócone” (znika po 3 s)
//
//  Komunikat nie blokuje interfejsu (pointer-events: none). Pokazujemy go
//  z opóźnieniem 1,5 s, żeby krótkie przełączenie Wi-Fi → LTE nie
//  powodowało migania paska.
// ============================================================

import { useEffect, useRef, useState } from 'react';
import { startNetworkMonitoring, useNetworkStatus } from './networkStatus';
import './NetworkBanner.css';

const OFFLINE_DELAY_MS = 1500;
const RESTORED_VISIBLE_MS = 3000;

function NetworkBanner() {
  const isOnline = useNetworkStatus((s) => s.isOnline);
  const [banner, setBanner] = useState(null); // null | 'offline' | 'restored'
  const offlineShownRef = useRef(false);

  useEffect(() => {
    let timer;
    if (!isOnline) {
      timer = setTimeout(() => {
        offlineShownRef.current = true;
        setBanner('offline');
      }, OFFLINE_DELAY_MS);
    } else if (offlineShownRef.current) {
      offlineShownRef.current = false;
      setBanner('restored');
      timer = setTimeout(() => setBanner(null), RESTORED_VISIBLE_MS);
    } else {
      setBanner(null);
    }
    return () => clearTimeout(timer);
  }, [isOnline]);

  if (!banner) return null;
  return (
    <div className={`net-banner net-banner-${banner}`} role="status" aria-live="polite">
      {banner === 'offline' ? '⚠️ Brak połączenia z Internetem' : '✓ Połączenie przywrócone'}
    </div>
  );
}

export default function NetworkProvider({ children }) {
  // Jedno miejsce zakładania listenerów; funkcja zwrócona przez
  // startNetworkMonitoring() usuwa je przy odmontowaniu.
  useEffect(() => startNetworkMonitoring(), []);

  return (
    <>
      {children}
      <NetworkBanner />
    </>
  );
}
