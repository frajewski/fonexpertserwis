// ============================================================
//  useSettings.js – ustawienia serwisu (Zustand + Firestore)
//
//  Ustawienia żyją w dokumencie meta/settings w Firestore, więc zmiana
//  na jednym urządzeniu (komputer, PWA, Android) jest od razu widoczna
//  na pozostałych. Interfejs: useSettings(), updateSettings().
// ============================================================

import { create } from 'zustand';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';

const SETTINGS_DOC = doc(db, 'meta', 'settings');

const DEFAULTS = {
  shopName:    'Fonexpert',
  shopAddress: 'ul. Żołnierzy Wyklętych 16 (Pasaż Kaufland), 09-100 Płońsk',
  shopPhone:   '739 696 665',
  showCompletionDate: true,
  showScreenLockPattern: true,
  qrContent: '',
  qrLabel:   '',
};

let unsubSettings = null;

const useSettings = create((set, get) => ({
  ...DEFAULTS,
  _loaded: false,

  // Wywołane raz przy starcie apki (patrz App.js) – wczytuje aktualne
  // ustawienia z Firestore i nasłuchuje zmian na żywo (zmiana na komputerze
  // jest widoczna w aplikacji na telefonie bez restartu)
  startSettingsListener: () => {
    if (unsubSettings) return; // już nasłuchuje, nie duplikuj

    unsubSettings = onSnapshot(SETTINGS_DOC, (snap) => {
      if (snap.exists()) {
        set({ ...DEFAULTS, ...snap.data(), _loaded: true });
      } else {
        // Dokument jeszcze nie istnieje (pierwsze uruchomienie systemu) –
        // zapisz wartości domyślne, żeby od teraz było co synchronizować
        setDoc(SETTINGS_DOC, DEFAULTS).catch(() => {});
        set({ ...DEFAULTS, _loaded: true });
      }
    });
  },

  stopSettingsListener: () => {
    unsubSettings?.();
    unsubSettings = null;
  },

  updateSettings: async (changes) => {
    set((state) => ({ ...state, ...changes }));
    await setDoc(SETTINGS_DOC, changes, { merge: true });
  },
}));

export default useSettings;
