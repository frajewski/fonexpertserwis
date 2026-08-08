// ============================================================
//  useStore.js – instancja sklepu Zustand DLA PANELU ADMINA
//
//  Cała logika żyje we współdzielonym pakiecie @gsm/shared-core – ten plik
//  tylko WSTRZYKUJE konkretne instancje Firebase (db, auth, app)
//  zainicjalizowane zwykłym sposobem dla web (getAuth, nie initializeAuth
//  z AsyncStorage jak w apce mobilnej). Identyczny wzorzec w apce mobilnej
//  (new/src/store/useStore.js), różni się tylko firebaseConfig.
// ============================================================

import { getFunctions, httpsCallable } from 'firebase/functions';
import { createUseStore } from '@gsm/shared-core/useStore';
import { app, auth, db } from '../firebase/firebaseConfig';

const useStore = createUseStore({ db, auth, app, getFunctions, httpsCallable });

export default useStore;
