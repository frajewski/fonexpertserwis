// ============================================================
//  firebaseConfig.js – inicjalizacja Firebase dla panelu admina
//  Ten sam projekt Firebase co apka mobilna (gsmserviceapp-ff8f6) –
//  PRAWDZIWE logowanie (email+hasło), te same konta, ta sama baza danych.
// ============================================================

import { initializeApp } from 'firebase/app';
import { getAuth, initializeAuth, indexedDBLocalPersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getFunctions } from 'firebase/functions';
import { getStorage } from 'firebase/storage';
import { isNativeApp } from '../utils/platform';

const firebaseConfig = {
  apiKey:            "AIzaSyDtDMY65scKHqjWDHXa_FbcgTT55nmXOFA",
  authDomain:        "gsmserviceapp-ff8f6.firebaseapp.com",
  projectId:         "gsmserviceapp-ff8f6",
  storageBucket:     "gsmserviceapp-ff8f6.firebasestorage.app",
  messagingSenderId: "870825632751",
  appId:             "1:870825632751:android:6438990ae94e9511498c1a",
};

export const app = initializeApp(firebaseConfig);
// W aplikacji natywnej (Capacitor) używamy initializeAuth z IndexedDB:
// zwykłe getAuth() potrafi się zawiesić w WKWebView na iOS (onAuthStateChanged
// nigdy nie odpowiada). Logowanie email+hasło działa identycznie.
// W przeglądarce/PWA bez zmian – getAuth().
export const auth = isNativeApp()
  ? initializeAuth(app, { persistence: indexedDBLocalPersistence })
  : getAuth(app);
export const db = getFirestore(app);
export const functions = getFunctions(app);
export const storage = getStorage(app);
// Domyślnie SDK ponawia upload przy zerwanym połączeniu aż do 10 minut –
// skracamy do 1 minuty, żeby utrata sieci kończyła się komunikatem,
// a nie wiecznym „Wgrywam…”.
storage.maxUploadRetryTime = 60 * 1000;
