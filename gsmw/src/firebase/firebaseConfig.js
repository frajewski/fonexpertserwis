// ============================================================
//  firebaseConfig.js – inicjalizacja Firebase dla panelu webowego klienta
//  Ten sam projekt Firebase co apka mobilna (gsmserviceapp-ff8f6) –
//  współdzielona baza danych (Firestore), ale panel webowy NIE loguje
//  klienta prawdziwym kontem. Loguje się anonimowo (signInAnonymously),
//  tylko żeby wywołania Cloud Functions miały jakiś request.auth – cała
//  faktyczna logika dostępu i weryfikacji odbywa się w functions/index.js
//  (lookupRepair, acceptEstimateWeb, itd.), nie w regułach Firestore.
// ============================================================

import { initializeApp } from 'firebase/app';
import { getFunctions } from 'firebase/functions';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';

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
export const functions = getFunctions(app);

// Zapewnia, że istnieje aktywna (anonimowa) sesja Auth, zanim panel webowy
// wywoła jakąkolwiek Cloud Function – onCall wymaga request.auth != null
// (sprawdzane w każdej funkcji jako pierwszy warunek). Bezpieczne wywołać
// wielokrotnie: jeśli sesja już istnieje, signInAnonymously() jej nie nadpisuje.
let authReadyPromise = null;
export const ensureAnonymousAuth = () => {
  if (authReadyPromise) return authReadyPromise;

  authReadyPromise = new Promise((resolve, reject) => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      unsubscribe();
      if (user) {
        resolve(user);
      } else {
        signInAnonymously(auth).then((cred) => resolve(cred.user)).catch(reject);
      }
    });
  });

  return authReadyPromise;
};
