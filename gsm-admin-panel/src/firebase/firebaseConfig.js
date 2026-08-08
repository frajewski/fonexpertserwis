// ============================================================
//  firebaseConfig.js – inicjalizacja Firebase dla panelu admina
//  Ten sam projekt Firebase co apka mobilna (gsmserviceapp-ff8f6) –
//  PRAWDZIWE logowanie (email+hasło), te same konta, ta sama baza danych.
// ============================================================

import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getFunctions } from 'firebase/functions';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey:            "AIzaSyDtDMY65scKHqjWDHXa_FbcgTT55nmXOFA",
  authDomain:        "gsmserviceapp-ff8f6.firebaseapp.com",
  projectId:         "gsmserviceapp-ff8f6",
  storageBucket:     "gsmserviceapp-ff8f6.firebasestorage.app",
  messagingSenderId: "870825632751",
  appId:             "1:870825632751:android:6438990ae94e9511498c1a",
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const functions = getFunctions(app);
export const storage = getStorage(app);
