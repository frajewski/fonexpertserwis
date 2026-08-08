import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useStore from '../store/useStore';
import './LoginPage.css';

export default function LoginPage() {
  const navigate = useNavigate();
  const login = useStore((s) => s.login);
  const sendPasswordReset = useStore((s) => s.sendPasswordReset);
  const currentUser = useStore((s) => s.currentUser);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [showReset, setShowReset] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState('');
  const [resetSent, setResetSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email.trim() || !password) {
      setError('Podaj adres email i hasło.');
      return;
    }

    setLoading(true);
    const result = await login(email.trim(), password);
    setLoading(false);

    if (!result.success) {
      setError(result.error);
      return;
    }

    if (!['admin', 'worker'].includes(result.user.role)) {
      setError('To konto nie ma dostępu do panelu administracyjnego — zaloguj się kontem pracownika lub admina.');
      return;
    }

    navigate('/');
  };

  const handleSendReset = async (e) => {
    e.preventDefault();
    setResetError('');
    if (!resetEmail.trim()) { setResetError('Podaj adres email.'); return; }

    setResetLoading(true);
    const result = await sendPasswordReset(resetEmail.trim());
    setResetLoading(false);

    if (!result.success) { setResetError(result.error); return; }
    setResetSent(true);
  };

  return (
    <div className="lp-page">
      <div className="lp-card">
        <div className="lp-brand">
          <span className="lp-brand-mark">F</span>
          <span className="lp-brand-text">Fonexpert</span>
        </div>
        <h1 className="lp-title">Panel zarządzania</h1>
        <p className="lp-sub">
          {showReset ? 'Wpisz swój email, wyślemy link do zresetowania hasła' : 'Zaloguj się kontem administratora lub pracownika'}
        </p>

        {!showReset ? (
          <>
            <form className="lp-form" onSubmit={handleSubmit}>
              <label className="lp-field">
                <span className="lp-field-label">Email</span>
                <input
                  className="lp-input"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ty@firma.pl"
                  autoComplete="username"
                />
              </label>

              <label className="lp-field">
                <span className="lp-field-label">Hasło</span>
                <input
                  className="lp-input"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                />
              </label>

              {error && <div className="lp-error">{error}</div>}

              <button className="lp-submit" type="submit" disabled={loading}>
                {loading ? 'Logowanie…' : 'Zaloguj się'}
              </button>
            </form>
            <button
              type="button"
              className="lp-forgot-link"
              onClick={() => { setShowReset(true); setResetSent(false); setResetError(''); setResetEmail(email); }}
            >
              Zapomniałeś hasła?
            </button>
          </>
        ) : (
          <>
            {resetSent ? (
              <div className="lp-reset-sent">
                <p>✓ Jeśli konto z adresem <strong>{resetEmail}</strong> istnieje, wysłaliśmy na nie link do zresetowania hasła. Sprawdź skrzynkę (i spam).</p>
                <button type="button" className="lp-forgot-link" onClick={() => setShowReset(false)}>← Wróć do logowania</button>
              </div>
            ) : (
              <form className="lp-form" onSubmit={handleSendReset}>
                <label className="lp-field">
                  <span className="lp-field-label">Email</span>
                  <input
                    className="lp-input"
                    type="email"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    placeholder="ty@firma.pl"
                    autoComplete="username"
                  />
                </label>

                {resetError && <div className="lp-error">{resetError}</div>}

                <button className="lp-submit" type="submit" disabled={resetLoading}>
                  {resetLoading ? 'Wysyłanie…' : 'Wyślij link do resetu'}
                </button>
                <button type="button" className="lp-forgot-link" onClick={() => setShowReset(false)}>← Wróć do logowania</button>
              </form>
            )}
          </>
        )}
      </div>
    </div>
  );
}
