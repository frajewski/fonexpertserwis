import { useEffect, useRef, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './firebase/firebaseConfig';
import useStore from './store/useStore';
import useSettings from './store/useSettings';
import { useNetworkStatus, isOnlineNow } from './network/networkStatus';
import AppLayout from './layouts/AppLayout';
import { hideSplash } from './native/splash';
import { devError } from './utils/devLog';
import LoginPage from './pages/LoginPage';
import RepairsPage from './pages/RepairsPage';
import RepairDetailPage from './pages/RepairDetailPage';
import NewRepairPage from './pages/NewRepairPage';
import CustomersPage from './pages/CustomersPage';
import CustomerCardPage from './pages/CustomerCardPage';
import BookingsPage from './pages/BookingsPage';
import TradePage from './pages/TradePage';
import NewTradePage from './pages/NewTradePage';
import ImportPhonesPage from './pages/ImportPhonesPage';
import CalculatorPage from './pages/CalculatorPage';
import PartsPage from './pages/PartsPage';
import DashboardPage from './pages/DashboardPage';
import CostsPage from './pages/CostsPage';
import AccountPage from './pages/AccountPage';
import TradeDetailPage from './pages/TradeDetailPage';
import StatsPage from './pages/StatsPage';
import UsersPage from './pages/UsersPage';
import SettingsPage from './pages/SettingsPage';

function ProtectedRoute({ children }) {
  const currentUser = useStore((s) => s.currentUser);
  if (!currentUser) return <Navigate to="/logowanie" replace />;
  return <AppLayout>{children}</AppLayout>;
}

function AdminOnlyRoute({ children }) {
  const currentUser = useStore((s) => s.currentUser);
  if (!currentUser) return <Navigate to="/logowanie" replace />;
  if (currentUser.role !== 'admin') return <Navigate to="/" replace />;
  return <AppLayout>{children}</AppLayout>;
}

export default function App() {
  const restoreSession = useStore((s) => s.restoreSession);
  const startSettingsListener = useSettings((s) => s.startSettingsListener);
  const stopSettingsListener  = useSettings((s) => s.stopSettingsListener);
  const [checking, setChecking] = useState(true);
  // Błąd wczytania konta (np. start bez sieci) – zamiast wiecznego
  // „Wczytywanie…” pokazujemy komunikat i ponawiamy po powrocie sieci.
  const [sessionError, setSessionError] = useState(null);
  const lastFirebaseUserRef = useRef(null);
  const isOnline = useNetworkStatus((s) => s.isOnline);

  const runRestore = async (firebaseUser) => {
    if (firebaseUser && !isOnlineNow()) {
      setSessionError('offline');
      setChecking(false);
      return;
    }
    try {
      await restoreSession(firebaseUser);
      setSessionError(null);
    } catch (err) {
      devError('Nie udało się wczytać konta:', err);
      setSessionError(isOnlineNow() ? 'error' : 'offline');
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    startSettingsListener();
    return stopSettingsListener;
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      lastFirebaseUserRef.current = firebaseUser;
      runRestore(firebaseUser);
    });
    return unsubscribe;
  }, []);

  // Sieć wróciła, a konto nie zostało wczytane → spróbuj ponownie
  useEffect(() => {
    if (isOnline && sessionError) {
      setChecking(true);
      runRestore(lastFirebaseUserRef.current);
    }
  }, [isOnline]);

  // Sesja sprawdzona (zalogowany, niezalogowany albo komunikat o błędzie)
  // → chowamy natywny splash; bez sztucznego opóźnienia
  useEffect(() => {
    if (!checking) hideSplash();
  }, [checking]);

  const retryRestore = () => {
    setChecking(true);
    runRestore(lastFirebaseUserRef.current);
  };

  if (checking) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', color: '#5B6178' }}>
        Wczytywanie…
      </div>
    );
  }

  if (sessionError) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: 24, textAlign: 'center', color: '#5B6178' }}>
        <div style={{ fontWeight: 700, color: '#14192B' }}>
          {sessionError === 'offline' ? 'Brak połączenia z Internetem' : 'Nie udało się wczytać konta'}
        </div>
        <div style={{ fontSize: 14, maxWidth: 320 }}>
          {sessionError === 'offline'
            ? 'Panel wczyta się automatycznie, gdy połączenie wróci.'
            : 'Sprawdź połączenie i spróbuj ponownie.'}
        </div>
        <button type="button" onClick={retryRestore} style={{ padding: '8px 16px', borderRadius: 8, background: '#14192B', color: '#fff', fontWeight: 600 }}>
          Spróbuj ponownie
        </button>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/logowanie" element={<LoginPage />} />
      <Route path="/" element={<ProtectedRoute><RepairsPage /></ProtectedRoute>} />
      <Route path="/zlecenia/nowe" element={<ProtectedRoute><NewRepairPage /></ProtectedRoute>} />
      <Route path="/zlecenia/:id" element={<ProtectedRoute><RepairDetailPage /></ProtectedRoute>} />
      <Route path="/klienci" element={<ProtectedRoute><CustomersPage /></ProtectedRoute>} />
      <Route path="/klienci/:id" element={<ProtectedRoute><CustomerCardPage /></ProtectedRoute>} />
      <Route path="/rezerwacje" element={<ProtectedRoute><BookingsPage /></ProtectedRoute>} />
      <Route path="/skup" element={<AdminOnlyRoute><TradePage /></AdminOnlyRoute>} />
      <Route path="/skup/nowy" element={<AdminOnlyRoute><NewTradePage /></AdminOnlyRoute>} />
      <Route path="/skup/import" element={<AdminOnlyRoute><ImportPhonesPage /></AdminOnlyRoute>} />
      <Route path="/skup/kalkulator" element={<AdminOnlyRoute><CalculatorPage /></AdminOnlyRoute>} />
      <Route path="/magazyn" element={<ProtectedRoute><PartsPage /></ProtectedRoute>} />
      <Route path="/pulpit" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
      <Route path="/koszty" element={<AdminOnlyRoute><CostsPage /></AdminOnlyRoute>} />
      <Route path="/moje-konto" element={<ProtectedRoute><AccountPage /></ProtectedRoute>} />
      <Route path="/skup/:id" element={<AdminOnlyRoute><TradeDetailPage /></AdminOnlyRoute>} />
      <Route path="/statystyki" element={<AdminOnlyRoute><StatsPage /></AdminOnlyRoute>} />
      <Route path="/uzytkownicy" element={<AdminOnlyRoute><UsersPage /></AdminOnlyRoute>} />
      <Route path="/ustawienia" element={<AdminOnlyRoute><SettingsPage /></AdminOnlyRoute>} />
    </Routes>
  );
}
