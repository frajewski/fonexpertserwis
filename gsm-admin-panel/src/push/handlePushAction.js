// ============================================================
//  handlePushAction.js – JEDYNE miejsce routingu po kliknięciu pusha
//
//  Payload `data` z backendu (push.js):
//    service_order → { orderId }   → /zlecenia/{orderId}
//    task          → { taskId }    → /pulpit (lista zadań)
//    booking       → { bookingId } → /rezerwacje
//    inventory     → { partId }    → /magazyn
//    test          → {}            → /moje-konto
//
//  Nie otwieramy żadnych URL-i z payloadu – tylko znane typy i ID
//  w bezpiecznym formacie. Jeśli router albo logowanie nie są jeszcze
//  gotowe (zimny start z powiadomienia), akcja czeka jako „pending”.
// ============================================================

import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';
import useStore from '../store/useStore';
import { isOnlineNow, useNetworkStatus } from '../network/networkStatus';
import { showInAppNotice } from './pushState';

const ID_RE = /^[A-Za-z0-9_-]{1,64}$/;

const ROUTES = {
  task: () => '/pulpit',
  booking: () => '/rezerwacje',
  inventory: () => '/magazyn',
  test: () => '/moje-konto',
};

let navigateFn = null;
let pending = null;
let waitingForNetwork = false;

const isStaffLoggedIn = () => ['admin', 'worker'].includes(useStore.getState().currentUser?.role);

/** Zlecenia może nie być w pamięci (np. starsze) – dociągamy je z Firestore. */
async function ensureRepairLoaded(orderId) {
  if (useStore.getState().getRepairById(orderId)) return true;
  const snap = await getDoc(doc(db, 'repairs', orderId));
  if (!snap.exists()) return false;
  useStore.getState().addHistoricalRepairsToCache([{ id: snap.id, ...snap.data() }]);
  return true;
}

function retryWhenOnline() {
  if (waitingForNetwork) return;
  waitingForNetwork = true;
  const unsub = useNetworkStatus.subscribe((s) => {
    if (!s.isOnline) return;
    unsub();
    waitingForNetwork = false;
    flushPendingPushAction();
  });
}

async function execute(data) {
  const type = String(data?.type || '');

  if (type === 'service_order') {
    const orderId = String(data.orderId || '');
    if (!ID_RE.test(orderId)) return true; // śmieciowy payload – ignorujemy
    const inMemory = !!useStore.getState().getRepairById(orderId);
    if (!inMemory && !isOnlineNow()) {
      showInAppNotice({ title: 'Brak połączenia z Internetem', body: 'Zlecenie otworzy się automatycznie, gdy połączenie wróci.' });
      return false; // zostaje jako pending, ponowimy po powrocie sieci
    }
    try {
      if (!(await ensureRepairLoaded(orderId))) {
        showInAppNotice({ title: 'Nie znaleziono zlecenia', body: 'Mogło zostać usunięte.' });
        return true;
      }
    } catch {
      showInAppNotice({ title: 'Nie udało się wczytać zlecenia', body: 'Sprawdź połączenie i spróbuj ponownie.' });
      return false;
    }
    navigateFn(`/zlecenia/${orderId}`);
    return true;
  }

  const route = ROUTES[type];
  if (route) navigateFn(route());
  return true;
}

/** Wywoływane przez listener kliknięcia powiadomienia (i z in-app toasta). */
export function handlePushAction(data) {
  pending = data || null;
  flushPendingPushAction();
}

/** Próbuje wykonać zaległą akcję – gdy router i sesja są gotowe. */
export async function flushPendingPushAction() {
  if (!pending || !navigateFn || !isStaffLoggedIn()) return;
  const action = pending;
  const done = await execute(action);
  if (done) {
    if (pending === action) pending = null;
  } else {
    retryWhenOnline();
  }
}

/** PushProvider przekazuje tu nawigację routera (null przy odmontowaniu). */
export function setPushNavigator(fn) {
  navigateFn = fn;
  if (fn) flushPendingPushAction();
}
