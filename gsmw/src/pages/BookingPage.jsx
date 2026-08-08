import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createBookingRequest } from '../firebase/firestoreApi';
import './BookingPage.css';

export default function BookingPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '', phone: '', company: '', brand: '', model: '', description: '', preferredDate: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.phone.trim() || !form.brand.trim() || !form.description.trim()) {
      setError('Wypełnij imię i nazwisko, telefon, marką urządzenia i opis usterki.');
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      await createBookingRequest(form);
      setDone(true);
    } catch (err) {
      console.error('Błąd wysyłania zgłoszenia:', err);
      setError(err.message || 'Nie udało się wysłać zgłoszenia.');
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <div className="bk-page bk-done-page">
        <div className="bk-done-card">
          <span className="bk-done-icon">✓</span>
          <h1 className="bk-done-title">Zgłoszenie wysłane</h1>
          <p className="bk-done-text">
            Serwis odezwie się telefonicznie lub SMS-em, żeby potwierdzić termin i przybliżoną wycenę.
          </p>
          <button className="bk-done-btn" onClick={() => navigate('/')}>Wróć do strony głównej</button>
        </div>
      </div>
    );
  }

  return (
    <div className="bk-page">
      <header className="bk-header">
        <button className="bk-back" onClick={() => navigate(-1)}>← Wróć</button>
        <span className="bk-brand">◈ GSM Serwis</span>
      </header>

      <main className="bk-main">
        <span className="bk-eyebrow">Nowe zgłoszenie</span>
        <h1 className="bk-title">Umów naprawę</h1>
        <p className="bk-sub">
          Wypełnij formularz, a serwis skontaktuje się z Tobą, żeby ustalić termin i wstępną wycenę.
          Dotyczy też zgłoszeń firmowych — wpisz nazwę firmy, jeśli zgłaszasz większą liczbę urządzeń.
        </p>

        <form className="bk-form" onSubmit={handleSubmit}>
          <div className="bk-row">
            <Field label="Imię i nazwisko *" value={form.name} onChange={set('name')} placeholder="Jan Kowalski" />
            <Field label="Telefon *" value={form.phone} onChange={set('phone')} placeholder="500 000 000" type="tel" />
          </div>

          <Field label="Firma (opcjonalnie)" value={form.company} onChange={set('company')} placeholder="Nazwa firmy — przy zgłoszeniach B2B" />

          <div className="bk-row">
            <Field label="Marka urządzenia *" value={form.brand} onChange={set('brand')} placeholder="np. Apple, Samsung" />
            <Field label="Model" value={form.model} onChange={set('model')} placeholder="np. iPhone 14" />
          </div>

          <label className="bk-field">
            <span className="bk-field-label">Opis usterki *</span>
            <textarea
              className="bk-textarea"
              rows={4}
              placeholder="Co się dzieje z urządzeniem?"
              value={form.description}
              onChange={set('description')}
            />
          </label>

          <Field
            label="Preferowany termin (opcjonalnie)"
            value={form.preferredDate}
            onChange={set('preferredDate')}
            type="date"
          />

          {error && <div className="bk-error">{error}</div>}

          <button className="bk-submit" type="submit" disabled={submitting}>
            {submitting ? 'Wysyłam…' : 'Wyślij zgłoszenie'}
          </button>
        </form>
      </main>
    </div>
  );
}

function Field({ label, ...inputProps }) {
  return (
    <label className="bk-field">
      <span className="bk-field-label">{label}</span>
      <input className="bk-input" {...inputProps} />
    </label>
  );
}
