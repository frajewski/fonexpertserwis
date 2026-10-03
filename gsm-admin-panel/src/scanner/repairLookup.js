// ============================================================
//  repairLookup.js – znalezienie zlecenia po tokenie z kodu QR
//
//  1) najpierw lokalnie (zlecenia już wczytane w store – działa offline),
//  2) jeśli nie ma: zapytanie do Firestore po polu `trackingToken`
//     (wymaga sieci – sprawdzamy stan z Etapu 3).
// ============================================================

import { collection, getDocs, limit, query, where } from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';
import useStore from '../store/useStore';
import { isOnlineNow } from '../network/networkStatus';

export const REPAIR_NOT_FOUND_MESSAGE = 'Nie znaleziono zlecenia dla tego kodu QR.';
export const REPAIR_OFFLINE_MESSAGE =
  'Brak połączenia z Internetem. Tego zlecenia nie ma w pamięci telefonu — spróbuj po odzyskaniu sieci.';

/** @returns {Promise<object|null>} zlecenie albo null (nie istnieje). Offline → Error. */
export async function findRepairByTrackingToken(token) {
  const local = useStore.getState().repairs.find((r) => r.trackingToken === token);
  if (local) return local;

  if (!isOnlineNow()) throw new Error(REPAIR_OFFLINE_MESSAGE);

  const snap = await getDocs(query(collection(db, 'repairs'), where('trackingToken', '==', token), limit(1)));
  if (snap.empty) return null;
  const repair = { id: snap.docs[0].id, ...snap.docs[0].data() };
  // starsze zlecenie spoza listy → do store, żeby ekran szczegółów je znalazł
  useStore.getState().addHistoricalRepairsToCache([repair]);
  return repair;
}
