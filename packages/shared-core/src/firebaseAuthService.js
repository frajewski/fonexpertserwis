// ============================================================
//  firebaseAuthService.js – logowanie/rejestracja przez Firebase (WSPÓŁDZIELONE)
//  @gsm/shared-core – fabryka przyjmująca `auth` jako wstrzykiwaną zależność,
//  z tych samych powodów co firestoreDb.js (różna inicjalizacja Auth na
//  różnych platformach).
// ============================================================

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  sendPasswordResetEmail,
  sendEmailVerification,
  reauthenticateWithCredential,
  EmailAuthProvider,
  updatePassword,
} from 'firebase/auth';

const mapFirebaseError = (code) => {
  const messages = {
    'auth/email-already-in-use': 'Ten adres email jest już zajęty.',
    'auth/invalid-email': 'Nieprawidłowy adres email.',
    'auth/weak-password': 'Hasło musi mieć minimum 6 znaków.',
    'auth/user-not-found': 'Nie znaleziono użytkownika z tym adresem email.',
    'auth/wrong-password': 'Nieprawidłowe hasło.',
    'auth/invalid-credential': 'Nieprawidłowy email lub hasło.',
    'auth/too-many-requests': 'Za dużo nieudanych prób. Spróbuj ponownie później.',
    'auth/network-request-failed': 'Brak połączenia z internetem.',
  };
  return messages[code] || 'Wystąpił błąd. Spróbuj ponownie.';
};

export function createFirebaseAuthService(auth) {
  const firebaseLogin = async (email, password) => {
    try {
      const result = await signInWithEmailAndPassword(auth, email.trim(), password);
      return { success: true, user: result.user };
    } catch (error) {
      return { success: false, error: mapFirebaseError(error.code) };
    }
  };

  const firebaseRegister = async (email, password, displayName) => {
    try {
      const result = await createUserWithEmailAndPassword(auth, email.trim(), password);
      if (displayName) {
        await updateProfile(result.user, { displayName });
      }
      // Wysyłamy mail weryfikacyjny od razu po rejestracji – nie blokujemy
      // konta na niezweryfikowany email (to nadal działający serwis, nie
      // chcemy zamykać nikogo za drzwiami), tylko informujemy w UI.
      try { await sendEmailVerification(result.user); } catch (_) { /* nie krytyczne */ }
      return { success: true, user: result.user };
    } catch (error) {
      return { success: false, error: mapFirebaseError(error.code) };
    }
  };

  // Ponowna wysyłka maila weryfikacyjnego (np. z przycisku "Wyślij ponownie"
  // w banerze przypominającym o weryfikacji)
  const firebaseResendVerification = async () => {
    if (!auth.currentUser) return { success: false, error: 'Nie jesteś zalogowany.' };
    try {
      await sendEmailVerification(auth.currentUser);
      return { success: true };
    } catch (error) {
      return { success: false, error: mapFirebaseError(error.code) };
    }
  };

  // Zmiana hasła przez zalogowanego użytkownika (nie mylić z resetem przez
  // email). Firebase wymaga "świeżego" zalogowania do operacji wrażliwych
  // jak zmiana hasła – więc najpierw reautentykujemy bieżącym hasłem, dopiero
  // potem ustawiamy nowe. Dzięki temu ktoś, kto podejrzy zapomniany otwarty
  // panel, nie zmieni hasła bez znajomości starego.
  const firebaseChangePassword = async (currentPassword, newPassword) => {
    const user = auth.currentUser;
    if (!user || !user.email) return { success: false, error: 'Nie jesteś zalogowany.' };
    try {
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, newPassword);
      return { success: true };
    } catch (error) {
      return { success: false, error: mapFirebaseError(error.code) };
    }
  };

  const firebaseLogout = () => signOut(auth);

  // Wysyła e-mail z linkiem do zresetowania hasła (obsługa Firebase, nie
  // budujemy własnego mechanizmu). Zawsze zwraca sukces (nawet jeśli konto
  // nie istnieje) – to celowe, żeby nie zdradzać czy dany email jest w bazie.
  const firebaseSendPasswordReset = async (email) => {
    try {
      await sendPasswordResetEmail(auth, email.trim());
      return { success: true };
    } catch (error) {
      if (error.code === 'auth/invalid-email') {
        return { success: false, error: 'Nieprawidłowy adres email.' };
      }
      return { success: true }; // user-not-found itp. – nie zdradzamy szczegółów
    }
  };

  const subscribeToAuthChanges = (callback) => onAuthStateChanged(auth, callback);

  return { firebaseLogin, firebaseRegister, firebaseLogout, firebaseSendPasswordReset, firebaseResendVerification, firebaseChangePassword, subscribeToAuthChanges };
}
