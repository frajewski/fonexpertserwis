// ============================================================
//  useStore.js – globalny stan aplikacji (Zustand) (WSPÓŁDZIELONE)
//  @gsm/shared-core
//
//  WERSJA FABRYKI: createUseStore(deps) przyjmuje obiekt zależności
//  platformowych i zwraca gotowy hook Zustand. Każda platforma (apka
//  mobilna, panel webowy) tworzy swoją instancję, wstrzykując własne
//  db/auth/app/Cloud Functions – logika WEWNĄTRZ jest identyczna,
//  różni się tylko TO, z czym się łączy.
//
//  Użycie (w konkretnym projekcie, nie w shared-core):
//    import { createUseStore } from '@gsm/shared-core/useStore';
//    const useStore = createUseStore({ db, auth, app, httpsCallable, getFunctions });
//    export default useStore;
// ============================================================

import { create } from 'zustand';
import { createFirestoreDb } from './firestoreDb.js';
import { createFirebaseAuthService } from './firebaseAuthService.js';
import { createUserProfileService } from './userProfileService.js';
import { ROLES } from '../constants/roles.js';
import { BOOKING_STATUS } from '../constants/bookingStatuses.js';
import STATUS from '../constants/statuses.js';

export function createUseStore({ db, auth, app, getFunctions, httpsCallable }) {
  const firestoreDb = createFirestoreDb(db);
  const { firebaseLogin, firebaseRegister, firebaseLogout, firebaseSendPasswordReset, firebaseResendVerification, firebaseChangePassword } = createFirebaseAuthService(auth);
  const { getProfileByUid, createLocalProfile } = createUserProfileService(db, firestoreDb);

  const {
    subscribeToUsers,
    updateUserRole: dbUpdateUserRole,
    deleteUser: dbDeleteUser,
    addWalkInCustomer: dbAddWalkInCustomer,
    mergeWalkInIntoFirebaseAccount: dbMergeWalkIn,
    addRepair: dbAddRepair,
    updateRepair: dbUpdateRepair,
    deleteRepair: dbDeleteRepair,
    subscribeToRepairs,
    addPhone: dbAddPhone,
    updatePhone: dbUpdatePhone,
    deletePhone: dbDeletePhone,
    subscribeToPhones,
    addPart: dbAddPart,
    updatePart: dbUpdatePart,
    adjustPartQuantity: dbAdjustPartQuantity,
    deletePart: dbDeletePart,
    subscribeToParts,
    addExpense: dbAddExpense,
    updateExpense: dbUpdateExpense,
    deleteExpense: dbDeleteExpense,
    subscribeToExpenses,
    addTask: dbAddTask,
    updateTask: dbUpdateTask,
    toggleTaskDone: dbToggleTaskDone,
    deleteTask: dbDeleteTask,
    subscribeToTasks,
    addBookingRequest: dbAddBooking,
    updateBookingRequest: dbUpdateBooking,
    subscribeToBookings,
    getRepairsHistoryPage,
  } = firestoreDb;

  const functions = getFunctions(app);
  const decideInitialRoleFn = httpsCallable(functions, 'decideInitialRole');
  const setUserRoleClaimFn = httpsCallable(functions, 'setUserRoleClaim');
  const syncOwnRoleClaimFn = httpsCallable(functions, 'syncOwnRoleClaim');

  const refreshToken = async () => {
    const user = auth.currentUser;
    if (user) await user.getIdToken(true);
  };

  let unsubUsers = null;
  let unsubRepairs = null;
  let unsubPhones = null;
  let unsubParts = null;
  let unsubExpenses = null;
  let unsubTasks = null;
  let unsubBookings = null;

  return create((set, get) => ({
    // ── AUTENTYKACJA ───────────────────────────────

    currentUser: null,
    authLoading: false,
    _registering: false,

    login: async (email, password) => {
      set({ authLoading: true });

      const result = await firebaseLogin(email, password);
      if (!result.success) {
        set({ authLoading: false });
        return { success: false, error: result.error };
      }

      let profile = await getProfileByUid(result.user.uid);

      if (profile) {
        await syncOwnRoleClaimFn();
        await refreshToken();
        profile = await getProfileByUid(result.user.uid);
      } else {
        const { data } = await decideInitialRoleFn();
        await refreshToken();
        profile = await createLocalProfile({
          uid: result.user.uid,
          name: result.user.displayName || email.split('@')[0],
          email: result.user.email,
          role: data.role,
        });
      }

      set({ currentUser: { ...profile, emailVerified: result.user.emailVerified }, authLoading: false });
      get().startListening();
      return { success: true, user: profile };
    },

    logout: async () => {
      get().stopListening();
      await firebaseLogout();
      set({ currentUser: null, repairs: [], phones: [], parts: [], expenses: [], tasks: [], bookings: [], users: [] });
    },

    sendPasswordReset: async (email) => firebaseSendPasswordReset(email),

    resendVerification: async () => firebaseResendVerification(),

    changePassword: async (currentPassword, newPassword) => firebaseChangePassword(currentPassword, newPassword),

    register: async (userData) => {
      set({ authLoading: true, _registering: true });

      const result = await firebaseRegister(userData.email, userData.password, userData.name);
      if (!result.success) {
        set({ authLoading: false, _registering: false });
        return { success: false, error: result.error };
      }

      const { data } = await decideInitialRoleFn();
      await refreshToken();

      const profile = await createLocalProfile({
        uid: result.user.uid,
        name: userData.name,
        email: userData.email,
        phone: userData.phone || '',
        role: data.role,
      });

      set({ currentUser: { ...profile, emailVerified: result.user.emailVerified }, authLoading: false, _registering: false });
      get().startListening();

      return { success: true, user: profile, becameAdmin: data.role === ROLES.ADMIN };
    },

    restoreSession: async (firebaseUser) => {
      if (get()._registering) return;

      if (!firebaseUser) {
        set({ currentUser: null });
        return;
      }

      let profile = await getProfileByUid(firebaseUser.uid);

      if (profile) {
        await syncOwnRoleClaimFn();
        await refreshToken();
        profile = await getProfileByUid(firebaseUser.uid);
      }

      if (!profile) {
        const { data } = await decideInitialRoleFn();
        await refreshToken();
        profile = await createLocalProfile({
          uid: firebaseUser.uid,
          name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Użytkownik',
          email: firebaseUser.email,
          role: data.role,
        });
      }

      set({ currentUser: { ...profile, emailVerified: firebaseUser.emailVerified } });
      get().startListening();
    },

    // ── REAL-TIME LISTENERY ───────────────────────────────────

    startListening: () => {
      const user = get().currentUser;
      get().stopListening();

      const isStaff = user?.role === ROLES.ADMIN || user?.role === ROLES.WORKER;

      unsubUsers = subscribeToUsers((users) => set({ users }));
      unsubRepairs = subscribeToRepairs(user, (repairs) => set({ repairs }));
      unsubBookings = subscribeToBookings(user, (bookings) => set({ bookings }));

      if (isStaff) {
        unsubPhones = subscribeToPhones((phones) => set({ phones }));
        unsubParts = subscribeToParts((parts) => set({ parts }));
        unsubExpenses = subscribeToExpenses((expenses) => set({ expenses }));
        unsubTasks = subscribeToTasks((tasks) => set({ tasks }));
      } else {
        set({ phones: [], parts: [], expenses: [], tasks: [] });
      }
    },

    stopListening: () => {
      unsubUsers?.();
      unsubRepairs?.();
      unsubPhones?.();
      unsubParts?.();
      unsubExpenses?.();
      unsubTasks?.();
      unsubBookings?.();
      unsubUsers = null;
      unsubRepairs = null;
      unsubPhones = null;
      unsubParts = null;
      unsubExpenses = null;
      unsubTasks = null;
      unsubBookings = null;
    },

    // ── POMOCNIKI RÓL ─────────────────────────────────────────

    isAdmin: () => get().currentUser?.role === ROLES.ADMIN,
    isWorker: () => [ROLES.ADMIN, ROLES.WORKER].includes(get().currentUser?.role),
    isCustomer: () => get().currentUser?.role === ROLES.CUSTOMER,

    // ── NAPRAWY ───────────────────────────────────────────────

    repairs: [],

    addRepair: async (data) => {
      const changedBy = get().currentUser?.name;
      return dbAddRepair(data, changedBy);
    },

    updateRepair: async (id, changes) => {
      const changedBy = get().currentUser?.name;
      return dbUpdateRepair(id, changes, changedBy);
    },

    deleteRepair: async (id) => {
      await dbDeleteRepair(id);
      return true;
    },

    getVisibleRepairs: () => get().repairs,
    getRepairById: (id) => get().repairs.find((r) => r.id === id) || null,
    getRepairsByCustomer: (id) => get().repairs.filter((r) => r.customerId === id),
    getRepairsHistoryPage, // jednorazowe, paginowane pobranie starszej historii (nie real-time)

    // ── UŻYTKOWNICY ───────────────────────────────────────────

    users: [],

    getUserById: (id) => get().users.find((u) => u.id === id) || null,
    getCustomers: () => get().users.filter((u) => u.role === ROLES.CUSTOMER),
    getWorkers: () => get().users.filter((u) => u.role === ROLES.WORKER),
    getAllUsers: () => get().users,

    addWalkInCustomer: async (data) => dbAddWalkInCustomer(data),

    updateUserRole: async (userId, newRole) => {
      const updated = await dbUpdateUserRole(userId, newRole);
      await setUserRoleClaimFn({ targetUid: userId, newRole });
      if (get().currentUser?.id === userId) set({ currentUser: updated });
      return updated;
    },

    deleteUser: async (userId) => dbDeleteUser(userId),

    mergeWalkInIntoFirebaseAccount: async (walkInProfile, firebaseUid, intendedRole = null) =>
      dbMergeWalkIn(walkInProfile, firebaseUid, intendedRole),

    // ── WNIOSKI REZERWACJI ────────────────────────────────────

    bookings: [],

    addBooking: async (data) => dbAddBooking(data),
    updateBooking: async (id, changes) => dbUpdateBooking(id, changes),

    convertBookingToRepair: async (bookingId) => {
      const booking = get().bookings.find((b) => b.id === bookingId);
      if (!booking) return null;

      const newRepair = await get().addRepair({
        customerId: booking.customerId,
        brand: booking.brand,
        model: booking.model,
        imei: '',
        description: booking.description,
        status: STATUS.ACCEPTED,
        photos: [],
        partsCost: 0,
        serviceCost: booking.estimatedPrice || 0,
        estimateAccepted: booking.estimatedPrice > 0 ? true : null,
      });

      await get().updateBooking(bookingId, {
        status: BOOKING_STATUS.CONVERTED,
        linkedRepairId: newRepair.id,
      });

      return newRepair;
    },

    getVisibleBookings: () => get().bookings,
    getBookingById: (id) => get().bookings.find((b) => b.id === id) || null,
    getPendingBookingsCount: () =>
      get().bookings.filter((b) => b.status === BOOKING_STATUS.PENDING).length,

    // ── SKUP / SPRZEDAŻ ───────────────────────────────────────

    phones: [],

    addPhone: async (data) => dbAddPhone(data),
    updatePhone: async (id, changes) => dbUpdatePhone(id, changes),
    deletePhone: async (id) => {
      await dbDeletePhone(id);
      return true;
    },
    getPhoneById: (id) => get().phones.find((p) => p.id === id) || null,

    // ── MAGAZYN CZĘŚCI ────────────────────────────────────────

    parts: [],

    addPart: async (data) => dbAddPart(data),
    updatePart: async (id, changes) => dbUpdatePart(id, changes),
    adjustPartQuantity: async (id, delta) => dbAdjustPartQuantity(id, delta),
    deletePart: async (id) => {
      await dbDeletePart(id);
      return true;
    },
    getPartById: (id) => get().parts.find((p) => p.id === id) || null,
    getLowStockParts: () => get().parts.filter((p) => (p.quantity || 0) <= (p.minQuantity || 0)),

    // ── KOSZTY UTRZYMANIA FIRMY ────────────────────────────────
    expenses: [],
    addExpense: async (data) => dbAddExpense(data),
    updateExpense: async (id, changes) => dbUpdateExpense(id, changes),
    deleteExpense: async (id) => {
      await dbDeleteExpense(id);
      return true;
    },
    getExpensesForMonth: (yearMonth) => get().expenses.filter((e) => e.month === yearMonth),

    // ── ZADANIA ────────────────────────────────────────────────
    tasks: [],
    addTask: async (data) => dbAddTask(data),
    updateTask: async (id, changes) => dbUpdateTask(id, changes),
    toggleTaskDone: async (id, done) => dbToggleTaskDone(id, done),
    deleteTask: async (id) => {
      await dbDeleteTask(id);
      return true;
    },

    // ── UI ────────────────────────────────────────────────────

    toastMessage: null,
    showToast: (msg) => {
      set({ toastMessage: msg });
      setTimeout(() => set({ toastMessage: null }), 3000);
    },
  }));
}
