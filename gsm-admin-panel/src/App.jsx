import { useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './firebase/firebaseConfig';
import useStore from './store/useStore';
import useSettings from './store/useSettings';
import AppLayout from './layouts/AppLayout';
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

  useEffect(() => {
    startSettingsListener();
    return stopSettingsListener;
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      await restoreSession(firebaseUser);
      setChecking(false);
    });
    return unsubscribe;
  }, []);

  if (checking) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', color: '#5B6178' }}>
        Wczytywanie…
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
      <Route path="/moje-konto" element={<ProtectedRoute><AccountPage /></ProtectedRoute>} />
      <Route path="/skup/:id" element={<AdminOnlyRoute><TradeDetailPage /></AdminOnlyRoute>} />
      <Route path="/statystyki" element={<AdminOnlyRoute><StatsPage /></AdminOnlyRoute>} />
      <Route path="/uzytkownicy" element={<AdminOnlyRoute><UsersPage /></AdminOnlyRoute>} />
      <Route path="/ustawienia" element={<AdminOnlyRoute><SettingsPage /></AdminOnlyRoute>} />
    </Routes>
  );
}
