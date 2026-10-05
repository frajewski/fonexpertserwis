// ============================================================
//  NativeShell.jsx – zachowanie systemowe aplikacji Android
//  (renderuje się wewnątrz BrowserRouter, sam nic nie wyświetla)
//
//  • Przycisk Wstecz (sprzętowy / gest):
//      1) otwarte menu boczne albo okno (element z [data-back-close]) → zamknij je
//      2) ekran główny (Zlecenia, Pulpit, Logowanie) → standard Androida:
//         aplikacja idzie w tło (minimizeApp), stan i sesja zostają
//      3) jest historia routera → poprzedni widok (navigate(-1))
//      4) brak historii (np. start z powiadomienia prosto w zlecenie)
//         → ekran nadrzędny zamiast wyjścia z aplikacji
//    Wykorzystuje istniejący React Router – bez własnego routingu.
//  • Cykl życia (App): po powrocie z tła (resume) ostrożne odświeżenie
//    stanu sieci, zgody na powiadomienia i koloru paska statusu.
//    Bez reloadu, bez resetu formularzy, bez wylogowania – listenery
//    Firestore wznawiają się same.
//  • Pasek statusu: kolor ikon dopasowywany do ekranu (statusBar.js).
//  W przeglądarce/PWA nic z tego się nie uruchamia.
// ============================================================

import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { refreshNetworkStatus } from '../network/networkStatus';
import { refreshPushOnResume } from '../push/pushNotifications';
import { scheduleBarStyleUpdate, startBarStyleWatcher } from './statusBar';
import { devWarn } from '../utils/devLog';

// Ekrany „główne” – Wstecz na nich = wyjście do launchera (jak w innych aplikacjach)
export const ROOT_PATHS = new Set(['/', '/pulpit', '/logowanie']);

/** Gdzie wrócić, gdy nie ma historii (np. zimny start z powiadomienia). */
export const parentPath = (pathname) => {
  if (pathname.startsWith('/skup/')) return '/skup';
  if (pathname.startsWith('/klienci/')) return '/klienci';
  return '/';
};

/** Zamyka najwyżej położone menu/okno. true = coś zamknięto. */
export const closeTopOverlay = () => {
  const overlays = document.querySelectorAll('[data-back-close]');
  const top = overlays[overlays.length - 1];
  if (!top) return false;
  top.click(); // backdrop ma już onClick zamykający okno
  return true;
};

export function handleBackButton({ pathname, navigate }) {
  if (closeTopOverlay()) return 'overlay';
  if (ROOT_PATHS.has(pathname)) {
    App.minimizeApp().catch(() => App.exitApp());
    return 'minimize';
  }
  // React Router v6 zapisuje pozycję w historii w history.state.idx
  const idx = window.history.state?.idx;
  if (typeof idx === 'number' && idx > 0) {
    navigate(-1);
    return 'back';
  }
  navigate(parentPath(pathname), { replace: true });
  return 'parent';
}

export default function NativeShell() {
  const navigate = useNavigate();
  const location = useLocation();
  const pathRef = useRef(location.pathname);
  const navigateRef = useRef(navigate);
  navigateRef.current = navigate;

  useEffect(() => {
    pathRef.current = location.pathname;
    scheduleBarStyleUpdate();
  }, [location.pathname]);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return undefined;

    const stopBars = startBarStyleWatcher();
    const handles = [];
    let cancelled = false;
    // addListener jest asynchroniczne – jeśli efekt zdążył się już posprzątać
    // (React StrictMode / odmontowanie), zdejmujemy listener od razu, żeby
    // nigdy nie było dwóch obsług Wstecz (podwójne cofanie).
    const add = (event, fn) =>
      App.addListener(event, fn)
        .then((h) => { if (cancelled) h.remove(); else handles.push(h); })
        .catch((e) => devWarn(`[app] ${event}`, e));

    add('backButton', () => handleBackButton({ pathname: pathRef.current, navigate: navigateRef.current }));

    add('resume', () => {
      refreshNetworkStatus();
      refreshPushOnResume();
      scheduleBarStyleUpdate();
    });

    return () => {
      cancelled = true;
      stopBars();
      handles.forEach((h) => h.remove());
    };
  }, []);

  return null;
}
