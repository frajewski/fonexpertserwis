// ============================================================
//  firestoreDb.js – Firestore jako trwała baza danych (WSPÓŁDZIELONE)
//  @gsm/shared-core – ten plik jest IDENTYCZNY dla apki mobilnej i panelu
//  webowego. Eksportuje FABRYKĘ (createFirestoreDb), nie gotowe funkcje –
//  to jest zmiana względem poprzedniej wersji, gdzie firestoreDb.js
//  importował bezpośrednio `db` z firebaseConfig.js. Tutaj `db` jest
//  WSTRZYKIWANE jako argument, bo każda platforma inicjalizuje Firebase
//  inaczej (apka mobilna: initializeAuth + AsyncStorage; panel webowy:
//  zwykłe getAuth()) – to jedyny sposób, żeby ta sama logika działała
//  na obu platformach bez duplikacji.
//
//  WAŻNE OGRANICZENIE: funkcje dotykające zdjęć (upload/kompresja) NIE są
//  tutaj – są platformowo-specyficzne (expo-image-manipulator na mobile,
//  Canvas API na webie) i żyją osobno w każdym projekcie
//  (new/src/firebase/photoStorage.js, gsm-admin-panel/src/firebase/photoUpload.js).
//
//  Użycie:
//    import { createFirestoreDb } from '@gsm/shared-core/firestoreDb';
//    const firestoreDb = createFirestoreDb(db);
//    const repair = await firestoreDb.getRepairById('xyz');
// ============================================================

import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  setDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  runTransaction,
  serverTimestamp,
  limit as firestoreLimit,
  startAfter,
} from 'firebase/firestore';
import { STATUS } from '../constants/statuses.js';
import { BOOKING_STATUS } from '../constants/bookingStatuses.js';

const WEB_PANEL_URL = 'https://gsm-serwis-klient.web.app';
const RECENT_DAYS = 30;

const generateTrackingToken = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 14)}`;

export function createFirestoreDb(db) {
  // ---------- USERS ----------

  const getUserById = async (id) => {
    const snap = await getDoc(doc(db, 'users', id));
    return snap.exists() ? { id: snap.id, ...snap.data() } : null;
  };

  const findWalkInByEmail = async (email) => {
    if (!email) return null;
    const normalized = email.trim().toLowerCase();
    const snap = await getDocs(
      query(
        collection(db, 'users'),
        where('emailLower', '==', normalized),
        where('isWalkIn', '==', true)
      )
    );
    return snap.empty ? null : { id: snap.docs[0].id, ...snap.docs[0].data() };
  };

  const adminAlreadyExists = async () => {
    const snap = await getDocs(query(collection(db, 'users'), where('role', '==', 'admin')));
    return !snap.empty;
  };

  const addUser = async (userData) => {
    const docRef = await addDoc(collection(db, 'users'), {
      ...userData,
      emailLower: (userData.email || '').toLowerCase(),
    });
    return { id: docRef.id, ...userData };
  };

  const getCustomers = async () => {
    const snap = await getDocs(query(collection(db, 'users'), where('role', '==', 'customer')));
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  };

  const getWorkers = async () => {
    const snap = await getDocs(query(collection(db, 'users'), where('role', '==', 'worker')));
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  };

  const getAllUsers = async () => {
    const snap = await getDocs(collection(db, 'users'));
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  };

  const subscribeToUsers = (callback) =>
    onSnapshot(collection(db, 'users'), (snap) => {
      callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });

  const updateUserRole = async (userId, newRole) => {
    await updateDoc(doc(db, 'users', userId), { role: newRole });
    return getUserById(userId);
  };

  // Usuwa dokument klienta z bazy (tylko Admin – reguły Firestore to wymuszają
  // niezależnie od tego). Nie kasuje historii zleceń tego klienta (repairs
  // zostają, ale customerId wskazuje na już nieistniejący dokument) – to
  // świadoma decyzja, żeby nie tracić historii napraw/rozliczeń firmy.
  const deleteUser = async (userId) => {
    await deleteDoc(doc(db, 'users', userId));
    return true;
  };

  const addWalkInCustomer = async ({ name, phone, email }) => {
    const data = {
      role: 'customer',
      name,
      phone: phone || '',
      email: email || '',
      emailLower: (email || '').trim().toLowerCase(),
      password: null,
      approved: true,
      isWalkIn: true,
    };
    const docRef = await addDoc(collection(db, 'users'), data);
    return { id: docRef.id, ...data };
  };

  const mergeWalkInIntoFirebaseAccount = async (walkInProfile, firebaseUid, intendedRole = null) => {
    const oldId = walkInProfile.id;

    const fixCollection = async (colName) => {
      const snap = await getDocs(query(collection(db, colName), where('customerId', '==', oldId)));
      await Promise.all(
        snap.docs.map((d) => updateDoc(doc(db, colName, d.id), { customerId: firebaseUid }))
      );
    };

    await Promise.all([
      fixCollection('repairs'),
      fixCollection('bookingRequests'),
      fixCollection('phones'),
    ]);

    await deleteDoc(doc(db, 'users', oldId));

    const mergedProfile = {
      ...walkInProfile,
      id: firebaseUid,
      role: intendedRole || walkInProfile.role,
      isWalkIn: false,
      password: null,
    };

    await setDoc(doc(db, 'users', firebaseUid), mergedProfile);
    return mergedProfile;
  };

  // ---------- REPAIRS ----------

  const getRepairById = async (id) => {
    const snap = await getDoc(doc(db, 'repairs', id));
    return snap.exists() ? { id: snap.id, ...snap.data() } : null;
  };

  const getRepairsByCustomer = async (customerId) => {
    const snap = await getDocs(
      query(collection(db, 'repairs'), where('customerId', '==', customerId), orderBy('createdAt', 'desc'))
    );
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  };

  const nextDisplayNumber = async () => {
    const year = new Date().getFullYear();
    const counterRef = doc(db, 'counters', String(year));
    return runTransaction(db, async (tx) => {
      const snap = await tx.get(counterRef);
      const next = (snap.exists() ? snap.data().count : 0) + 1;
      tx.set(counterRef, { count: next }, { merge: true });
      return `${next}/${year}`;
    });
  };

  const addRepair = async (repairData, changedBy = null) => {
    const displayNumber = await nextDisplayNumber();
    const nowIso = new Date().toISOString();
    const trackingToken = generateTrackingToken();
    const trackingUrl = `${WEB_PANEL_URL}/?token=${trackingToken}`;

    const docRef = await addDoc(collection(db, 'repairs'), {
      ...repairData,
      displayNumber,
      trackingToken,
      trackingUrl,
      // Zwykłe tworzenie nie przekazuje createdAt – wtedy "teraz". Formularz
      // nowego zlecenia może przekazać własną datę przyjęcia (np. wpisując
      // zaległe zlecenie z zeszłego tygodnia).
      createdAt: repairData.createdAt || nowIso,
      statusUpdatedAt: nowIso,
      createdAtServer: serverTimestamp(),
      history: [{ date: nowIso, status: repairData.status || STATUS.ACCEPTED, changedBy: changedBy || 'System' }],
    });

    return { id: docRef.id, ...repairData, displayNumber, trackingToken, trackingUrl, createdAt: nowIso };
  };

  const updateRepair = async (id, changes, changedBy = null) => {
    const current = await getRepairById(id);
    if (!current) return null;

    const finalChanges = { ...changes };
    if (changes.status && changes.status !== current.status) {
      finalChanges.history = [
        ...(current.history || []),
        { date: new Date().toISOString(), status: changes.status, changedBy: changedBy || 'System' },
      ];
    }

    await updateDoc(doc(db, 'repairs', id), finalChanges);
    return { ...current, ...finalChanges };
  };

  const deleteRepair = async (id) => {
    await deleteDoc(doc(db, 'repairs', id));
    return true;
  };

  const subscribeToRepairs = (currentUser, callback) => {
    if (!currentUser) {
      callback([]);
      return () => {};
    }

    const isStaff = currentUser.role === 'admin' || currentUser.role === 'worker';
    const cutoffIso = new Date(Date.now() - RECENT_DAYS * 24 * 60 * 60 * 1000).toISOString();

    const q = isStaff
      ? query(collection(db, 'repairs'), where('createdAt', '>=', cutoffIso), orderBy('createdAt', 'desc'))
      : query(collection(db, 'repairs'), where('customerId', '==', currentUser.id), orderBy('createdAt', 'desc'));

    return onSnapshot(q, (snap) => {
      callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
  };

  const getRepairsHistoryPage = async (pageSize = 50, startAfterDoc = null) => {
    const cutoffIso = new Date(Date.now() - RECENT_DAYS * 24 * 60 * 60 * 1000).toISOString();

    let q = query(
      collection(db, 'repairs'),
      where('createdAt', '<', cutoffIso),
      orderBy('createdAt', 'desc'),
      firestoreLimit(pageSize)
    );

    if (startAfterDoc) {
      q = query(
        collection(db, 'repairs'),
        where('createdAt', '<', cutoffIso),
        orderBy('createdAt', 'desc'),
        startAfter(startAfterDoc),
        firestoreLimit(pageSize)
      );
    }

    const snap = await getDocs(q);
    return {
      repairs: snap.docs.map((d) => ({ id: d.id, ...d.data() })),
      lastDoc: snap.docs[snap.docs.length - 1] || null,
      hasMore: snap.docs.length === pageSize,
    };
  };

  // ---------- PHONES ----------

  const getPhoneById = async (id) => {
    const snap = await getDoc(doc(db, 'phones', id));
    return snap.exists() ? { id: snap.id, ...snap.data() } : null;
  };

  const addPhone = async (data) => {
    const nowIso = new Date().toISOString();
    const docRef = await addDoc(collection(db, 'phones'), {
      ...data,
      // Zwykłe dodawanie z formularza nie przekazuje boughtAt/soldAt – wtedy
      // domyślnie "teraz"/"jeszcze nie sprzedany". Import z arkusza przekazuje
      // rzeczywiste historyczne daty, które chcemy zachować, nie nadpisywać.
      boughtAt: data.boughtAt || nowIso,
      soldAt: data.soldAt || null,
      sellPrice: data.sellPrice || 0,
      linkedRepairId: data.linkedRepairId || null,
    });
    return { id: docRef.id, ...data, boughtAt: data.boughtAt || nowIso };
  };

  const updatePhone = async (id, changes) => {
    const finalChanges = { ...changes };
    if (changes.status === 'Sprzedany') {
      const current = await getPhoneById(id);
      if (current && !current.soldAt) finalChanges.soldAt = new Date().toISOString();
    }
    await updateDoc(doc(db, 'phones', id), finalChanges);
    return getPhoneById(id);
  };

  const deletePhone = async (id) => {
    await deleteDoc(doc(db, 'phones', id));
    return true;
  };

  const subscribeToPhones = (callback) => {
    const q = query(collection(db, 'phones'), orderBy('boughtAt', 'desc'));
    return onSnapshot(q, (snap) => {
      callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
  };

  // ---------- MAGAZYN CZĘŚCI ZAMIENNYCH ----------
  // Osobna ewidencja od Skupu telefonów – to generyczne części (wyświetlacze,
  // baterie, złącza), nie konkretne telefony. quantity = ile sztuk na stanie,
  // minQuantity = próg, poniżej którego pokazuje się ostrzeżenie "kończy się".

  const getParts = async () => {
    const snap = await getDocs(query(collection(db, 'parts'), orderBy('name')));
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  };

  const addPart = async (data) => {
    const docRef = await addDoc(collection(db, 'parts'), {
      name: data.name || '',
      quantity: data.quantity || 0,
      minQuantity: data.minQuantity || 0,
      unitCost: data.unitCost || 0,
      notes: data.notes || '',
      createdAt: new Date().toISOString(),
    });
    return { id: docRef.id, ...data };
  };

  const updatePart = async (id, changes) => {
    await updateDoc(doc(db, 'parts', id), changes);
    return true;
  };

  // Szybka zmiana ilości o +1/-1 (albo dowolny delta) – np. przyciski w UI,
  // bez potrzeby przepisywania całej reszty pola za każdym razem.
  const adjustPartQuantity = async (id, delta) => {
    const snap = await getDoc(doc(db, 'parts', id));
    if (!snap.exists()) return null;
    const current = snap.data().quantity || 0;
    const newQuantity = Math.max(0, current + delta);
    await updateDoc(doc(db, 'parts', id), { quantity: newQuantity });
    return newQuantity;
  };

  const deletePart = async (id) => {
    await deleteDoc(doc(db, 'parts', id));
    return true;
  };

  const subscribeToParts = (callback) => {
    const q = query(collection(db, 'parts'), orderBy('name'));
    return onSnapshot(q, (snap) => {
      callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
  };

  // ---------- KOSZTY UTRZYMANIA FIRMY ----------
  // Wydatki stałe/okresowe (księgowość, ZUS, VAT, PIT, reklama, materiały
  // eksploatacyjne itd.) – żeby zysk miesięczny w Statystykach dało się
  // pokazać jako prawdziwy zysk NETTO, nie tylko przychód z napraw+skupu.
  // Każdy wydatek ma "month" (YYYY-MM) – do którego miesiąca się liczy,
  // niezależnie kiedy faktycznie został wpisany do systemu.

  const getExpenses = async () => {
    const snap = await getDocs(query(collection(db, 'expenses'), orderBy('month', 'desc')));
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  };

  const addExpense = async (data) => {
    const docRef = await addDoc(collection(db, 'expenses'), {
      category: data.category || 'other',
      name: data.name || '',
      amount: data.amount || 0,
      month: data.month || new Date().toISOString().slice(0, 7),
      notes: data.notes || '',
      createdAt: new Date().toISOString(),
    });
    return { id: docRef.id, ...data };
  };

  const updateExpense = async (id, changes) => {
    await updateDoc(doc(db, 'expenses', id), changes);
    return true;
  };

  const deleteExpense = async (id) => {
    await deleteDoc(doc(db, 'expenses', id));
    return true;
  };

  const subscribeToExpenses = (callback) => {
    const q = query(collection(db, 'expenses'), orderBy('month', 'desc'));
    return onSnapshot(q, (snap) => {
      callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
  };

  // ---------- ZADANIA (todo) ----------
  // Prosta wspólna lista zadań dla całego zespołu (Admin + Pracownik) –
  // "zrób X dzisiaj/jutro", nie osobne listy per-osoba.

  const getTasks = async () => {
    const snap = await getDocs(query(collection(db, 'tasks'), orderBy('dueDate')));
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  };

  const addTask = async (data) => {
    const docRef = await addDoc(collection(db, 'tasks'), {
      text: data.text || '',
      dueDate: data.dueDate || new Date().toISOString().slice(0, 10),
      done: false,
      doneAt: null,
      createdAt: new Date().toISOString(),
    });
    return { id: docRef.id, ...data };
  };

  const updateTask = async (id, changes) => {
    await updateDoc(doc(db, 'tasks', id), changes);
    return true;
  };

  const toggleTaskDone = async (id, done) => {
    await updateDoc(doc(db, 'tasks', id), { done, doneAt: done ? new Date().toISOString() : null });
    return true;
  };

  const deleteTask = async (id) => {
    await deleteDoc(doc(db, 'tasks', id));
    return true;
  };

  const subscribeToTasks = (callback) => {
    const q = query(collection(db, 'tasks'), orderBy('dueDate'));
    return onSnapshot(q, (snap) => {
      callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
  };

  // ---------- BOOKING REQUESTS ----------

  const getBookingById = async (id) => {
    const snap = await getDoc(doc(db, 'bookingRequests', id));
    return snap.exists() ? { id: snap.id, ...snap.data() } : null;
  };

  const getBookingsByCustomer = async (customerId) => {
    const snap = await getDocs(
      query(collection(db, 'bookingRequests'), where('customerId', '==', customerId), orderBy('createdAt', 'desc'))
    );
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  };

  const addBookingRequest = async (data) => {
    const nowIso = new Date().toISOString();
    const docRef = await addDoc(collection(db, 'bookingRequests'), {
      ...data,
      status: BOOKING_STATUS.PENDING,
      adminNote: null,
      proposedDate: null,
      estimatedPrice: 0,
      assignedWorkerId: null,
      linkedRepairId: null,
      createdAt: nowIso,
    });
    return { id: docRef.id, ...data, createdAt: nowIso };
  };

  const updateBookingRequest = async (id, changes) => {
    await updateDoc(doc(db, 'bookingRequests', id), changes);
    return getBookingById(id);
  };

  const subscribeToBookings = (currentUser, callback) => {
    if (!currentUser) {
      callback([]);
      return () => {};
    }

    const isStaff = currentUser.role === 'admin' || currentUser.role === 'worker';
    const q = isStaff
      ? query(collection(db, 'bookingRequests'), orderBy('createdAt', 'desc'))
      : query(collection(db, 'bookingRequests'), where('customerId', '==', currentUser.id), orderBy('createdAt', 'desc'));

    return onSnapshot(q, (snap) => {
      callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
  };

  return {
    // users
    getUserById, findWalkInByEmail, adminAlreadyExists, addUser, getCustomers, getWorkers,
    getAllUsers, subscribeToUsers, updateUserRole, deleteUser, addWalkInCustomer, mergeWalkInIntoFirebaseAccount,
    // repairs
    getRepairById, getRepairsByCustomer, addRepair, updateRepair, deleteRepair,
    subscribeToRepairs, getRepairsHistoryPage,
    // phones
    getPhoneById, addPhone, updatePhone, deletePhone, subscribeToPhones,
    getParts, addPart, updatePart, adjustPartQuantity, deletePart, subscribeToParts,
    // koszty firmy
    getExpenses, addExpense, updateExpense, deleteExpense, subscribeToExpenses,
    // zadania
    getTasks, addTask, updateTask, toggleTaskDone, deleteTask, subscribeToTasks,
    // bookings
    getBookingById, getBookingsByCustomer, addBookingRequest, updateBookingRequest, subscribeToBookings,
  };
}
