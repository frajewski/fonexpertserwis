import { useState } from 'react';
import useStore from '../store/useStore';
import { useNetworkStatus, CONNECTION_TYPE_LABELS } from '../network/networkStatus';
import { usePushState } from '../push/pushState';
import { enablePushNotifications, sendTestPush, retryPushRegistration } from '../push/pushNotifications';
import { Capacitor } from '@capacitor/core';
import DiagnosticsCard from '../components/DiagnosticsCard';
import './AccountPage.css';

export default function AccountPage() {
  const currentUser = useStore((s) => s.currentUser);
  const changePassword = useStore((s) => s.changePassword);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    if (!currentPassword || !newPassword || !confirmPassword) {
      setError('Wypełnij wszystkie pola.');
      return;
    }
    if (newPassword.length < 6) {
      setError('Nowe hasło musi mieć minimum 6 znaków.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Nowe hasła się nie zgadzają.');
      return;
    }

    setLoading(true);
    const result = await changePassword(currentPassword, newPassword);
    setLoading(false);

    if (!result.success) {
      setError(result.error);
      return;
    }

    setSuccess(true);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
  };

  const network = useNetworkStatus();
  const push = usePushState();
  const [pushBusy, setPushBusy] = useState(false);
  const PERMISSION_LABELS = { granted: 'Przyznana', denied: 'Odmówiona', prompt: 'Jeszcze nie pytano', unsupported: 'Niedostępne', unknown: '—' };
  const runPush = async (fn) => {
    setPushBusy(true);
    try { await fn(); } catch (err) { alert(err?.message || 'Nie udało się.'); } finally { setPushBusy(false); }
  };

  return (
    <div className="ac-page">
      <h1 className="ac-title">Moje konto</h1>

      <div className="ac-card">
        <h2 className="ac-section-title">Dane konta</h2>
        <div className="ac-info-row"><span>Imię</span><span>{currentUser?.name || '—'}</span></div>
        <div className="ac-info-row"><span>Email</span><span>{currentUser?.email || '—'}</span></div>
        <div className="ac-info-row"><span>Rola</span><span>{currentUser?.role === 'admin' ? 'Administrator' : 'Pracownik'}</span></div>
      </div>

      <div className="ac-card">
        <h2 className="ac-section-title">Połączenie</h2>
        <div className="ac-info-row">
          <span>Status</span>
          <span style={{ fontWeight: 700, color: network.isOnline ? '#12805C' : '#B42318' }}>
            {network.isOnline ? '● Online' : '● Offline'}
          </span>
        </div>
        <div className="ac-info-row"><span>Typ połączenia</span><span>{CONNECTION_TYPE_LABELS[network.connectionType] || 'Nieznany'}</span></div>
        <div className="ac-info-row"><span>Źródło informacji</span><span>{network.source === 'native' ? 'Capacitor Network (aplikacja)' : 'Przeglądarka (navigator.onLine)'}</span></div>
        <div className="ac-info-row">
          <span>Ostatnia zmiana</span>
          <span>{network.lastChangedAt ? new Date(network.lastChangedAt).toLocaleTimeString('pl-PL') : '—'}</span>
        </div>
      </div>

      <div className="ac-card">
        <h2 className="ac-section-title">Powiadomienia push</h2>
        {!push.supported ? (
          <p className="ac-push-hint">Powiadomienia działają w aplikacji Android. W przeglądarce nie są jeszcze dostępne.</p>
        ) : (
          <>
            <div className="ac-info-row"><span>Zgoda na powiadomienia</span><span>{PERMISSION_LABELS[push.permission] || push.permission}</span></div>
            <div className="ac-info-row"><span>Urządzenie zarejestrowane</span><span>{push.registered ? 'Tak' : 'Nie'}</span></div>
            <div className="ac-info-row"><span>Platforma</span><span>{Capacitor.getPlatform()}</span></div>
            {push.lastError && <div className="ac-error">{push.lastError}</div>}
            {push.registerBlocked && (
              <button className="ac-submit" type="button" disabled={pushBusy} onClick={() => runPush(retryPushRegistration)}>Spróbuj ponownie</button>
            )}
            {push.permission === 'prompt' && (
              <button className="ac-submit" type="button" disabled={pushBusy} onClick={() => runPush(enablePushNotifications)}>🔔 Włącz powiadomienia</button>
            )}
            {push.permission === 'denied' && (
              <p className="ac-push-hint">Powiadomienia są wyłączone. Włącz je w ustawieniach telefonu: Aplikacje → FonExpert Serwis → Powiadomienia.</p>
            )}
            {currentUser?.role === 'admin' && push.registered && (
              <button
                className="ac-submit"
                type="button"
                disabled={pushBusy}
                onClick={() => runPush(async () => {
                  const r = await sendTestPush();
                  alert(`Wysłano testowe powiadomienie na ${r?.sent ?? 0} urządzeń.`);
                })}
              >
                Wyślij testowe powiadomienie
              </button>
            )}
          </>
        )}
      </div>

      <div className="ac-card">
        <h2 className="ac-section-title">Zmień hasło</h2>
        <form className="ac-form" onSubmit={handleSubmit}>
          <label className="ac-field">
            <span>Obecne hasło</span>
            <input
              type="password"
              className="ac-input"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              autoComplete="current-password"
            />
          </label>
          <label className="ac-field">
            <span>Nowe hasło</span>
            <input
              type="password"
              className="ac-input"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoComplete="new-password"
              placeholder="minimum 6 znaków"
            />
          </label>
          <label className="ac-field">
            <span>Powtórz nowe hasło</span>
            <input
              type="password"
              className="ac-input"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
            />
          </label>

          {error && <div className="ac-error">{error}</div>}
          {success && <div className="ac-success">✓ Hasło zostało zmienione.</div>}

          <button className="ac-submit" type="submit" disabled={loading}>
            {loading ? 'Zapisywanie…' : 'Zmień hasło'}
          </button>
        </form>
      </div>
      <DiagnosticsCard />
    </div>
  );
}
