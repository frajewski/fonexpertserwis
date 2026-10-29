import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createBookingRequest } from '../firebase/firestoreApi';
import './BookingPage.css';

// Najczęstsze usterki – klient zaznacza, co wie; „potrzebna diagnoza”, gdy nie wie.
// Ta sama lista jest na serwerze (createBookingRequestWeb) jako biała lista.
export const BOOKING_ISSUES = [
  'Zbity ekran / wyświetlacz', 'Bateria', 'Gniazdo ładowania', 'Aparat', 'Głośnik / mikrofon',
  'Zalanie', 'Nie włącza się', 'Tylna szybka / obudowa', 'Oprogramowanie / blokada', 'Inne',
];

export default function BookingPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '', phone: '', company: '', brand: '', model: '', description: '', preferredDate: '',
    issues: [], needsDiagnosis: false, acceptTerms: false,
  });
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const toggleIssue = (issue) => setForm((f) => ({
    ...f,
    needsDiagnosis: false,
    issues: f.issues.includes(issue) ? f.issues.filter((i) => i !== issue) : [...f.issues, issue],
  }));
  const toggleDiagnosis = () => setForm((f) => ({ ...f, needsDiagnosis: !f.needsDiagnosis, issues: [] }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.phone.trim() || !form.brand.trim() || !form.model.trim()) {
      setError('Wypełnij imię i nazwisko, telefon, markę i model urządzenia.');
      return;
    }
    if (!form.acceptTerms) {
      setError('Zaakceptuj zasady rezerwacji i zadatku.');
      return;
    }
    if (form.issues.length === 0 && !form.needsDiagnosis && !form.description.trim()) {
      setError('Zaznacz, co jest uszkodzone, albo wybierz „Nie wiem — potrzebna diagnoza”.');
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
            Serwis potwierdzi zgłoszenie SMS-em: dostaniesz numer rezerwacji, termin i wstępną wycenę.
            Przy poważniejszych naprawach poprosimy o zadatek BLIK-iem — w tytule wpisz wtedy numer rezerwacji.
            Zadatek przepada w razie rezygnacji lub nieprzybycia w umówionym terminie.
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
        <span className="bk-brand">◈ Fonexpert</span>
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
            <Field label="Model *" value={form.model} onChange={set('model')} placeholder="np. iPhone 14" />
          </div>

          <div className="bk-field">
            <span className="bk-field-label">Co jest uszkodzone? *</span>
            <div className="bk-chips">
              {BOOKING_ISSUES.map((issue) => (
                <button
                  key={issue}
                  type="button"
                  className={`bk-chip ${form.issues.includes(issue) ? 'bk-chip-on' : ''}`}
                  onClick={() => toggleIssue(issue)}
                >
                  {issue}
                </button>
              ))}
            </div>
            <button
              type="button"
              className={`bk-chip bk-chip-diag ${form.needsDiagnosis ? 'bk-chip-on' : ''}`}
              onClick={toggleDiagnosis}
            >
              🔍 Nie wiem — potrzebna diagnoza
            </button>
          </div>

          <label className="bk-field">
            <span className="bk-field-label">Opisz problem{form.issues.length || form.needsDiagnosis ? ' (opcjonalnie)' : ''}</span>
            <textarea
              className="bk-textarea"
              rows={4}
              placeholder="Np. telefon spadł, ekran pęknięty w rogu, dotyk działa"
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

          <div className="bk-terms">
            <h2 className="bk-terms-title">Zasady rezerwacji i zadatku</h2>
            <ul>
              <li>Po przejrzeniu zgłoszenia serwis wyśle SMS z numerem rezerwacji, terminem i wstępną wyceną.</li>
              <li>Przy poważniejszych naprawach, zwłaszcza wymagających zamówienia części, serwis może poprosić o <strong>zadatek</strong> BLIK-iem na numer telefonu (w tytule numer rezerwacji). Rezerwacja jest potwierdzona po wpłacie.</li>
              <li>Zadatek zaliczamy na poczet ceny naprawy.</li>
              <li><strong>Jeśli zrezygnujesz z naprawy albo nie zgłosisz się w umówionym terminie, zadatek przepada</strong> (art. 394 Kodeksu cywilnego). Jeśli naprawy nie wykonamy z naszej winy, zwracamy zadatek w podwójnej wysokości.</li>
            </ul>
          </div>

          <details className="bk-rodo">
            <summary>Informacja o przetwarzaniu danych osobowych (RODO)</summary>
            <p>
              Administratorem Twoich danych jest Fonexpert Filip Rajewski, Bogusławice 29A, 09-100 Płońsk,
              NIP 5671935602, tel. 739 696 665. Dane z formularza (imię i nazwisko, telefon, nazwa firmy, dane urządzenia
              i opis usterki) przetwarzamy, aby obsłużyć zgłoszenie, skontaktować się z Tobą (telefon, SMS) i wykonać
              naprawę — na podstawie art. 6 ust. 1 lit. b RODO (działania przed zawarciem umowy i jej wykonanie), a po
              jej wykonaniu także w celu rozliczeń podatkowych (lit. c) i ewentualnych roszczeń (lit. f).
            </p>
            <p>
              Dane zgłoszenia, które nie zakończyło się naprawą, przechowujemy do 12 miesięcy. Dane związane z wykonaną
              naprawą — przez okres wymagany przepisami podatkowymi i do przedawnienia roszczeń. Odbiorcami danych mogą
              być dostawcy usług informatycznych, z których korzystamy (hosting i baza danych Google Firebase, wysyłka SMS),
              oraz biuro rachunkowe; dane mogą być przetwarzane poza EOG na podstawie standardowych klauzul umownych.
            </p>
            <p>
              Masz prawo dostępu do danych, ich sprostowania, usunięcia lub ograniczenia przetwarzania, sprzeciwu
              oraz skargi do Prezesa UODO. Podanie danych jest dobrowolne, ale bez nich nie obsłużymy zgłoszenia.
            </p>
          </details>

          <label className="bk-accept">
            <input
              type="checkbox"
              checked={form.acceptTerms}
              onChange={(e) => setForm((f) => ({ ...f, acceptTerms: e.target.checked }))}
            />
            <span>Akceptuję zasady rezerwacji i zadatku oraz zapoznałem/am się z informacją o przetwarzaniu danych. *</span>
          </label>

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
