// ============================================================
//  useSettings.js – ustawienia serwisu (Zustand + Firestore)
//
//  WERSJA SYNCHRONIZOWANA: ustawienia żyją w dokumencie meta/settings
//  w Firestore, nie tylko lokalnie na urządzeniu. To naprawia problem,
//  w którym zmiana danych serwisu w apce mobilnej nie była widoczna
//  w panelu admina (i odwrotnie) – teraz obie platformy czytają/zapisują
//  do tego samego dokumentu.
//
//  Interfejs zostaje identyczny (useSettings(), updateSettings()) – żadny
//  komponent korzystający z tego store nie wymaga zmian.
// ============================================================

import { create } from 'zustand';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';

const SETTINGS_DOC = doc(db, 'meta', 'settings');

const DEFAULTS = {
  shopName:    'Fonexpert',
  shopAddress: 'ul. Przykładowa 1, Płońsk',
  shopPhone:   '+48 500 100 200',
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
  // ustawienia z Firestore i nasłuchuje zmian na żywo (np. admin zmienił
  // adres serwisu z panelu webowego, apka mobilna powinna to zobaczyć
  // bez restartu)
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
