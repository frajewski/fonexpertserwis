// ============================================================
// firestoreApi.js – dane przez Cloud Functions
// ============================================================

import { httpsCallable } from 'firebase/functions';
import { functions, ensureAnonymousAuth } from './firebaseConfig';

const lookupRepairFn = httpsCallable(functions, 'lookupRepair');
const lookupRepairByTokenFn = httpsCallable(functions, 'lookupRepairByToken');
const lookupRepairsByPhoneFn = httpsCallable(functions, 'lookupRepairsByPhone');
const acceptEstimateWebFn = httpsCallable(functions, 'acceptEstimateWeb');
const rejectEstimateWebFn = httpsCallable(functions, 'rejectEstimateWeb');
const createBookingRequestWebFn = httpsCallable(functions, 'createBookingRequestWeb');

export const lookupRepairByToken = async (token) => {
  try {
    const cleanToken = String(token || '').trim();

    if (!cleanToken) {
      return {
        repair: null,
        message: 'Brakuje tokenu śledzenia.',
      };
    }

    const { data } = await lookupRepairByTokenFn({ token: cleanToken });

    return {
      repair: data,
      message: '',
    };
  } catch (error) {
    console.error('lookupRepairByToken error:', error);

    return {
      repair: null,
      message:
        error?.message ||
        'Nie udało się pobrać zlecenia po linku śledzenia.',
    };
  }
};

export function normalizePhone(phone = '') {
  return String(phone).replace(/[^0-9]/g, '');
}

export function normalizeDisplayNumber(displayNumber = '') {
  return String(displayNumber).trim();
}

function unwrapFunctionsError(err) {
  const code = err?.code || '';
  const message = err?.message || 'Nieznany błąd Firebase.';

  if (code === 'functions/not-found') {
    return { notFound: true, message: 'Nie znaleziono zlecenia.' };
  }

  if (code === 'functions/unauthenticated') {
    return { message: 'Panel nie może zalogować sesji anonimowej Firebase. Sprawdź, czy Anonymous Auth jest włączone w Firebase Authentication.' };
  }

  if (code === 'functions/permission-denied') {
    return { message: 'Brak dostępu do zlecenia. Najczęściej numer telefonu nie zgadza się z numerem zapisanym przy zleceniu.' };
  }

  if (code === 'functions/not-found' || code === 'functions/internal' || code === 'functions/unavailable') {
    return { message };
  }

  if (code === 'functions/unknown') {
    return { message: 'Cloud Function nie odpowiada poprawnie. Sprawdź w Firebase, czy funkcje lookupRepair oraz lookupRepairsByPhone są wdrożone i mają poprawny region.' };
  }

  return { message: `${message}${code ? ` (${code})` : ''}` };
}

export async function findRepairByLookup(displayNumber, phone) {
  await ensureAnonymousAuth();

  const payload = {
    displayNumber: normalizeDisplayNumber(displayNumber),
    phone: normalizePhone(phone),
  };

  try {
    const { data } = await lookupRepairFn(payload);
    return data || null;
  } catch (err) {
    const parsed = unwrapFunctionsError(err);
    if (parsed.notFound) return null;
    throw new Error(parsed.message);
  }
}

export async function findRepairsByPhone(phone) {
  await ensureAnonymousAuth();

  try {
    const { data } = await lookupRepairsByPhoneFn({ phone: normalizePhone(phone) });
    return Array.isArray(data?.repairs) ? data.repairs : [];
  } catch (err) {
    const parsed = unwrapFunctionsError(err);
    throw new Error(parsed.message);
  }
}

export async function acceptEstimate(repairId, phone) {
  await ensureAnonymousAuth();
  await acceptEstimateWebFn({ repairId, phone: normalizePhone(phone) });
  return { id: repairId, estimateAccepted: true };
}

export async function rejectEstimate(repairId, phone) {
  await ensureAnonymousAuth();
  await rejectEstimateWebFn({ repairId, phone: normalizePhone(phone) });
  return { id: repairId, estimateAccepted: false, status: 'Odwołane' };
}

export async function createBookingRequest(formData) {
  await ensureAnonymousAuth();
  const payload = { ...formData, phone: normalizePhone(formData.phone) };
  const { data } = await createBookingRequestWebFn(payload);
  return data;
}

 

export const STATUS = {
  ACCEPTED:   'Przyjęte',
  DIAGNOSIS:  'W diagnozie',
  REPAIR:     'W naprawie',
  PARTS:      'Oczekuje na części',
  READY:      'Gotowe do odbioru',
  DELIVERED:  'Odebrane',
  CANCELLED:  'Odwołane',
};
