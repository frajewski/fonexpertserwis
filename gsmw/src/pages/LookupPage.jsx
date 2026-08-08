import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { findRepairByLookup, normalizeDisplayNumber, normalizePhone } from '../firebase/firestoreApi';
import './LookupPage.css';

export default function LookupPage() {
  const navigate = useNavigate();
  const [displayNumber, setDisplayNumber] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!displayNumber.trim() || !phone.trim()) {
      setError('Podaj numer zlecenia i numer telefonu.');
      return;
    }
    setLoading(true);
    setError('');

    try {
      const cleanDisplayNumber = normalizeDisplayNumber(displayNumber);
      const cleanPhone = normalizePhone(phone);
      const repair = await findRepairByLookup(cleanDisplayNumber, cleanPhone);

      if (!repair) {
        setError('Nie znaleziono zlecenia. Sprawdź numer zlecenia i telefon — muszą być zgodne z tymi podanymi przy przyjęciu urządzenia.');
        return;
      }

      navigate(`/zlecenie/${repair.id}`, { state: { phone: cleanPhone } });
    } catch (err) {
      console.error('Błąd wyszukiwania zlecenia:', err);
      setError(err.message || 'Nie udało się połączyć z bazą zleceń.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="lk-page">
      <header className="lk-header">
        <div className="lk-brand">
          <span className="lk-brand-mark">◈</span>
          GSM Serwis
        </div>
      </header>

      <main className="lk-main">
        <div className="lk-hero">
          <span className="lk-eyebrow">Śledzenie naprawy</span>
          <h1 className="lk-title">
            Sprawdź,<br />co dzieje się<br />z Twoim telefonem
          </h1>
          <p className="lk-sub">
            Wpisz numer zlecenia z potwierdzenia przyjęcia i numer telefonu —
            bez logowania, bez instalowania aplikacji.
          </p>
        </div>

        <form className="lk-card" onSubmit={handleSubmit}>
          <label className="lk-field">
            <span className="lk-field-label">Numer zlecenia</span>
            <input
              className="lk-input lk-input-mono"
              type="text"
              placeholder="np. 14/2026"
              value={displayNumber}
              onChange={(e) => setDisplayNumber(e.target.value)}
              autoComplete="off"
            />
            <span className="lk-hint">Znajdziesz go na potwierdzeniu przyjęcia urządzenia</span>
          </label>

          <label className="lk-field">
            <span className="lk-field-label">Numer telefonu</span>
            <input
              className="lk-input"
              type="tel"
              placeholder="500 000 000"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              autoComplete="off"
            />
            <span className="lk-hint">Ten, który podałeś przy przyjęciu naprawy</span>
          </label>

          {error && <div className="lk-error">{error}</div>}

          <button className="lk-submit" type="submit" disabled={loading}>
            {loading ? 'Szukam…' : 'Sprawdź status'}
          </button>
        </form>

        <div className="lk-alt">
          <span className="lk-alt-line" />
          <span>lub</span>
          <span className="lk-alt-line" />
        </div>

        <button className="lk-booking-link" onClick={() => navigate('/umow-naprawe')}>
          Umów nową naprawę online →
        </button>
      </main>
    </div>
  );
}
