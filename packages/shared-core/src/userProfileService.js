// ============================================================
//  userProfileService.js – profil użytkownika (rola, telefon) w Firestore
//  (WSPÓŁDZIELONE) – @gsm/shared-core
//
//  Fabryka przyjmuje `db` ORAZ już-stworzony `firestoreDb` (z firestoreDb.js
//  w tym samym pakiecie) – nie duplikuje getUserById/findWalkInByEmail,
//  korzysta z tych samych instancji.
// ============================================================

import { doc, setDoc, updateDoc } from 'firebase/firestore';

export function createUserProfileService(db, firestoreDb) {
  const { getUserById, findWalkInByEmail, mergeWalkInIntoFirebaseAccount } = firestoreDb;

  const getProfileByUid = async (uid) => getUserById(uid);

  const createLocalProfile = async ({ uid, name, email, phone = '', role }) => {
    const existing = await getProfileByUid(uid);
    if (existing) return existing;

    const walkInMatch = await findWalkInByEmail(email);
    if (walkInMatch) {
      return mergeWalkInIntoFirebaseAccount(walkInMatch, uid, role);
    }

    const newProfile = {
      role,
      name,
      email,
      emailLower: (email || '').trim().toLowerCase(),
      phone,
      password: null,
      approved: true,
    };
    await setDoc(doc(db, 'users', uid), newProfile);
    return { id: uid, ...newProfile };
  };

  const updateLocalProfile = async (uid, changes) => {
    await updateDoc(doc(db, 'users', uid), changes);
    return getProfileByUid(uid);
  };

  return { getProfileByUid, createLocalProfile, updateLocalProfile };
}
