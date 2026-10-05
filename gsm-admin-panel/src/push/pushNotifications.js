// ============================================================
//  pushNotifications.js – natywne powiadomienia push (Android, FCM)
//
//  Flow:
//    start aplikacji → initPushNotifications(): kanał + listenery
//    zalogowany personel + zgoda już udzielona → register() (cicho)
//    zgoda jeszcze nie udzielona → pytamy dopiero gdy użytkownik kliknie
//      „Włącz powiadomienia” (jednorazowa karta albo „Moje konto”)
//    listener 'registration' → token → Cloud Function registerPushDevice
//      (zapis w users/{uid}/devices/{deviceId}; ten sam deviceId = brak
//       duplikatów, nowy token = aktualizacja wpisu → rotacja tokenu)
//    wylogowanie → unregisterPushDevice + usunięcie tokenu FCM z telefonu
//
//  Wysyłka pushy jest WYŁĄCZNIE w backendzie (firebase/functions/push.js).
//  iOS i web push nie są w tym etapie włączone.
// ============================================================

import { Capacitor } from '@capacitor/core';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase/firebaseConfig';
import useStore from '../store/useStore';
import { isOnlineNow, useNetworkStatus } from '../network/networkStatus';
import { usePushState, showInAppNotice } from './pushState';
import { handlePushAction } from './handlePushAction';
import { version as appVersion } from '../../package.json';
import { devWarn } from '../utils/devLog';

export const CHANNEL_ID = 'fonexpert_general';
const DEVICE_ID_KEY = 'fx_push_device_id';
const PROMPT_DISMISSED_KEY = 'fx_push_prompt_dismissed';
const REGISTER_PENDING_KEY = 'fx_push_register_pending';

// Ustawiane przy buildzie (vite.config.js): czy w projekcie Android jest
// google-services.json. Bez niego register() wysypuje aplikację natywnie.
// eslint-disable-next-line no-undef
const FIREBASE_CONFIGURED = typeof __FX_PUSH_CONFIGURED__ !== 'undefined' && __FX_PUSH_CONFIGURED__ === true;
const NOT_CONFIGURED_MESSAGE = 'Powiadomienia wyłączone: brak pliku google-services.json w aplikacji Android.';
const CRASHED_MESSAGE = 'Poprzednia rejestracja powiadomień przerwała działanie aplikacji – automatyczne ponawianie wstrzymane. Użyj „Spróbuj ponownie”.';

let Push = null;          // moduł pluginu (ładowany tylko natywnie)
let currentToken = null;  // ostatni token z FCM
let syncedFor = null;     // `${uid}:${token}` – już zapisane w backendzie
let initialized = false;

export const isPushSupported = () =>
  Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android' && Capacitor.isPluginAvailable('PushNotifications');

const safeStorage = {
  get: (k) => { try { return localStorage.getItem(k); } catch { return null; } },
  set: (k, v) => { try { localStorage.setItem(k, v); } catch { /* brak */ } },
  remove: (k) => { try { localStorage.removeItem(k); } catch { /* brak */ } },
};

// Bezpiecznik: znacznik przed register(), kasowany po odpowiedzi FCM.
// Jeśli został po poprzednim uruchomieniu → aplikacja padła w trakcie
// rejestracji, więc nie ponawiamy automatycznie (koniec pętli awarii).
const registerCrashedBefore = () => !!safeStorage.get(REGISTER_PENDING_KEY);
const clearRegisterPending = () => safeStorage.remove(REGISTER_PENDING_KEY);

async function safeRegister({ manual = false } = {}) {
  if (!FIREBASE_CONFIGURED) {
    usePushState.setState({ registered: false, lastError: NOT_CONFIGURED_MESSAGE });
    return;
  }
  if (!manual && registerCrashedBefore()) {
    usePushState.setState({ registered: false, lastError: CRASHED_MESSAGE, registerBlocked: true });
    return;
  }
  safeStorage.set(REGISTER_PENDING_KEY, String(Date.now()));
  usePushState.setState({ registerBlocked: false });
  await Push.register();
}

/** Stały identyfikator TEJ instalacji aplikacji (nie zmienia się przy rotacji tokenu). */
export function getDeviceId() {
  let id = safeStorage.get(DEVICE_ID_KEY);
  if (!id) {
    id = (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`).replace(/[^A-Za-z0-9_-]/g, '');
    safeStorage.set(DEVICE_ID_KEY, id);
  }
  return id;
}

// Nazwa urządzenia tylko do wyświetlenia w diagnostyce (np. „Pixel 10 Pro”)
const deviceName = () => {
  const m = navigator.userAgent.match(/Android [\d.]+; ([^;)]+?)(?: Build|\))/);
  return m ? m[1].trim() : 'Android';
};

const normalizePermission = (p) => (p === 'prompt-with-rationale' ? 'prompt' : p);

const isStaff = (u) => ['admin', 'worker'].includes(u?.role);

/** Zapis tokenu w backendzie dla zalogowanego użytkownika (z ponowieniem po powrocie sieci). */
async function syncToken() {
  const user = useStore.getState().currentUser;
  if (!currentToken || !isStaff(user)) return;
  const key = `${user.id}:${currentToken}`;
  if (syncedFor === key) return;
  if (!isOnlineNow()) {
    const unsub = useNetworkStatus.subscribe((s) => { if (s.isOnline) { unsub(); syncToken(); } });
    return;
  }
  try {
    await httpsCallable(functions, 'registerPushDevice')({
      deviceId: getDeviceId(),
      token: currentToken,
      platform: 'android',
      deviceName: deviceName(),
      appVersion,
    });
    syncedFor = key;
    usePushState.setState({ registered: true, lastError: '' });
  } catch (err) {
    devWarn('[push] zapis tokenu nie powiódł się', err);
    usePushState.setState({ registered: false, lastError: 'Nie udało się zapisać urządzenia na serwerze.' });
  }
}

/** Raz przy starcie aplikacji: kanał Androida + listenery (także dla kliknięcia z zimnego startu). */
export async function initPushNotifications() {
  if (initialized || !isPushSupported()) {
    if (!isPushSupported()) usePushState.setState({ supported: false, permission: 'unsupported' });
    return;
  }
  initialized = true;
  usePushState.setState({ supported: true });
  try {
    ({ PushNotifications: Push } = await import('@capacitor/push-notifications'));

    await Push.createChannel({
      id: CHANNEL_ID,
      name: 'FonExpert — powiadomienia',
      description: 'Nowe zlecenia, zgłoszenia klientów, zadania i alerty magazynowe',
      importance: 4, // HIGH – baner + dźwięk zgodnie z ustawieniami systemu
      visibility: 0, // PRIVATE – na ekranie blokady bez treści
    }).catch((e) => devWarn('[push] kanał', e));

    await Push.addListener('registration', ({ value }) => {
      clearRegisterPending();
      currentToken = value;
      syncToken();
    });
    await Push.addListener('registrationError', (err) => {
      clearRegisterPending();
      devWarn('[push] registrationError', err);
      usePushState.setState({ registered: false, lastError: 'Rejestracja w FCM nie powiodła się.' });
    });
    // Aplikacja otwarta: system nie pokazuje powiadomienia – pokazujemy własne in-app
    await Push.addListener('pushNotificationReceived', (n) => {
      showInAppNotice({ title: n.title || 'FonExpert', body: n.body || '', data: n.data || {} });
    });
    // Kliknięcie powiadomienia (tło, zamknięta aplikacja)
    await Push.addListener('pushNotificationActionPerformed', ({ notification }) => {
      handlePushAction(notification?.data || {});
    });

    const { receive } = await Push.checkPermissions();
    usePushState.setState({ permission: normalizePermission(receive) });
  } catch (err) {
    devWarn('[push] inicjalizacja nie powiodła się', err);
    usePushState.setState({ lastError: 'Powiadomienia są niedostępne na tym urządzeniu.' });
  }
}

/** Po zalogowaniu personelu: jeśli zgoda już jest – rejestrujemy po cichu. */
export async function onPushLogin({ manual = false } = {}) {
  if (!Push) return;
  try {
    const { receive } = await Push.checkPermissions();
    const permission = normalizePermission(receive);
    usePushState.setState({ permission });
    if (permission === 'granted') {
      if (currentToken) syncToken();
      await safeRegister({ manual }); // token (ew. nowy) przyjdzie przez listener 'registration'
    }
  } catch (err) {
    devWarn('[push] register', err);
    usePushState.setState({ lastError: 'Nie udało się zarejestrować powiadomień (brak konfiguracji Firebase w aplikacji?).' });
  }
}

/** Akcja użytkownika „Włącz powiadomienia” – tylko tu pytamy o zgodę. */
export async function enablePushNotifications() {
  if (!Push) return 'unsupported';
  safeStorage.set(PROMPT_DISMISSED_KEY, '1');
  let { receive } = await Push.checkPermissions();
  if (normalizePermission(receive) === 'prompt') ({ receive } = await Push.requestPermissions());
  const permission = normalizePermission(receive);
  usePushState.setState({ permission });
  if (permission === 'granted') await onPushLogin({ manual: true });
  return permission;
}

export const shouldShowPushPrompt = () => safeStorage.get(PROMPT_DISMISSED_KEY) !== '1';
export const dismissPushPrompt = () => safeStorage.set(PROMPT_DISMISSED_KEY, '1');

/** Przed wylogowaniem: odpinamy urządzenie od konta i kasujemy token FCM na telefonie. */
export async function onPushLogout() {
  if (!Push) return;
  if (isOnlineNow()) {
    try {
      await Promise.race([
        httpsCallable(functions, 'unregisterPushDevice')({ deviceId: getDeviceId() }),
        new Promise((resolve) => setTimeout(resolve, 4000)),
      ]);
    } catch (err) {
      devWarn('[push] unregisterPushDevice', err);
    }
  }
  // Nawet offline: usunięty token przestaje działać w FCM, więc nawet jeśli
  // serwer nie zdążył się dowiedzieć, poprzednie konto nie dostanie tu pushy
  // (backend sam wyłączy martwy token przy pierwszej wysyłce).
  try { await Push.unregister(); } catch { /* ignorujemy */ }
  currentToken = null;
  syncedFor = null;
  usePushState.setState({ registered: false });
}

/**
 * Powrót aplikacji z tła: użytkownik mógł zmienić zgodę w ustawieniach
 * telefonu. Aktualizujemy stan; nowa zgoda → rejestracja (z bezpiecznikiem).
 */
export async function refreshPushOnResume() {
  if (!Push) return;
  try {
    const { receive } = await Push.checkPermissions();
    const permission = normalizePermission(receive);
    if (permission === usePushState.getState().permission) return;
    usePushState.setState({ permission });
    if (permission === 'granted' && isStaff(useStore.getState().currentUser)) await onPushLogin();
  } catch (err) {
    devWarn('[push] sprawdzenie zgody po powrocie', err);
  }
}

/** Ręczne ponowienie po zablokowanej (bezpiecznik) rejestracji – z „Moje konto”. */
export async function retryPushRegistration() {
  clearRegisterPending();
  await onPushLogin({ manual: true });
}

/** Test push (tylko admin, tylko na własne urządzenia – sprawdza backend). */
export async function sendTestPush() {
  const res = await httpsCallable(functions, 'sendTestPush')();
  return res.data;
}
