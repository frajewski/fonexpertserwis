import { useState } from 'react';
import useStore from '../store/useStore';
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
    </div>
  );
}
