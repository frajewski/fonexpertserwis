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
const createBuybackRequestWebFn = httpsCallable(functions, 'createBuybackRequestWeb');
const respondToSlotWebFn = httpsCallable(functions, 'respondToSlotWeb');

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
    console.error('Brak sesji anonimowej (Anonymous Auth?)', err);
    return { message: 'Usługa jest chwilowo niedostępna. Spróbuj za chwilę.' };
  }

  if (code === 'functions/permission-denied') {
    return { notFound: true, message: 'Numer telefonu nie zgadza się z numerem podanym przy przyjęciu.' };
  }

  if (code === 'functions/not-found' || code === 'functions/internal' || code === 'functions/unavailable') {
    return { message };
  }

  if (code === 'functions/unknown') {
    console.error('Funkcja nie odpowiada poprawnie (wdrożenie/region?)', err);
    return { message: 'Usługa jest chwilowo niedostępna. Spróbuj za chwilę.' };
  }

  console.error('Błąd funkcji:', code, message);
  return { message };
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

export async function acceptEstimate(repairId, phone, token) {
  await ensureAnonymousAuth();
  await acceptEstimateWebFn({ repairId, phone: normalizePhone(phone), token: token || undefined });
  return { id: repairId, estimateAccepted: true };
}

export async function rejectEstimate(repairId, phone, token) {
  await ensureAnonymousAuth();
  await rejectEstimateWebFn({ repairId, phone: normalizePhone(phone), token: token || undefined });
  return { id: repairId, estimateAccepted: false, status: 'Odwołane' };
}

export async function respondToSlot(repairId, phone, token, accept, note, counterAt) {
  await ensureAnonymousAuth();
  await respondToSlotWebFn({ repairId, phone: normalizePhone(phone), token: token || undefined, accept, note: note || '', counterAt: counterAt || undefined });
  return accept ? 'accepted' : 'declined';
}

// Zmniejsza zdjęcie do max 1600 px (JPEG ~0.82) – szybszy upload z telefonu.
// Gdy przeglądarka nie umie zdekodować (np. HEIC), wysyłamy oryginał.
async function compressImage(file) {
  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bmp.width * scale);
    canvas.height = Math.round(bmp.height * scale);
    canvas.getContext('2d').drawImage(bmp, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise((res) => canvas.toBlob(res, 'image/jpeg', 0.82));
    return blob || file;
  } catch {
    return file;
  }
}

// Wgrywa zdjęcia rezerwacji do bookingUploads/<uid sesji>/… i zwraca ścieżki
export async function uploadBookingPhotos(files) {
  if (!files?.length) return [];
  const user = await ensureAnonymousAuth();
  const { ref, uploadBytes } = await import('firebase/storage');
  const { storage } = await import('./firebaseConfig');
  const stamp = Date.now();
  const paths = [];
  for (let i = 0; i < Math.min(files.length, 5); i++) {
    const blob = await compressImage(files[i]);
    const ext = blob.type === 'image/jpeg' ? 'jpg' : (files[i].name.split('.').pop() || 'img').toLowerCase().slice(0, 5);
    const path = `bookingUploads/${user.uid}/${stamp}-${i}.${ext}`;
    await uploadBytes(ref(storage, path), blob, { contentType: blob.type || files[i].type || 'image/jpeg' });
    paths.push(path);
  }
  return paths;
}

export async function createBuybackRequest(formData) {
  await ensureAnonymousAuth();
  const { data } = await createBuybackRequestWebFn({ ...formData, phone: normalizePhone(formData.phone) });
  return data;
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
  CUSTOMER_WAIT: 'Czeka na klienta',
  READY:      'Gotowe do odbioru',
  DELIVERED:  'Odebrane',
  CANCELLED:  'Odwołane',
};
