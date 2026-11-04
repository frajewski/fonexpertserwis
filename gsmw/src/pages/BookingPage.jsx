// ============================================================
//  BookingPage.jsx – strona główna i „Umów naprawę” panelu klienta
//  Hero → korzyści → 3-krokowy formularz zgłoszenia → FAQ.
//  Zgłoszenie trafia do panelu admina (Rezerwacje) przez funkcję
//  createBookingRequestWeb – ta sama biała lista usterek co tutaj.
// ============================================================

import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { createBookingRequest, uploadBookingPhotos, findRepairByLookup, normalizeDisplayNumber, normalizePhone } from '../firebase/firestoreApi';
import SHOP from '../shop';
import {
  IconPhone, IconTablet, IconLaptop, IconWrench, IconShield,
  IconCrack, IconBattery, IconPlug, IconCamera, IconSpeaker, IconDrop, IconPower, IconBack, IconCog,
  IconDots, IconSearch, IconArrow, IconCheck, IconTimer, IconBox, IconAward, IconImage, IconTag, IconClose,
} from '../layout/icons';
import './BookingPage.css';

// Najczęstsze usterki – ta sama lista jest na serwerze (createBookingRequestWeb) jako biała lista.
export const BOOKING_ISSUES = [
  'Zbity ekran / wyświetlacz', 'Bateria', 'Gniazdo ładowania', 'Aparat', 'Głośnik / mikrofon',
  'Zalanie', 'Nie włącza się', 'Tylna szybka / obudowa', 'Oprogramowanie / blokada', 'Inne',
];
const ISSUE_UI = {
  'Zbity ekran / wyświetlacz': ['Uszkodzony ekran', IconCrack],
  'Bateria': ['Słaba bateria', IconBattery],
  'Gniazdo ładowania': ['Nie ładuje', IconPlug],
  'Aparat': ['Aparat', IconCamera],
  'Głośnik / mikrofon': ['Głośnik / mikrofon', IconSpeaker],
  'Zalanie': ['Zalanie', IconDrop],
  'Nie włącza się': ['Nie włącza się', IconPower],
  'Tylna szybka / obudowa': ['Tylna szybka', IconBack],
  'Oprogramowanie / blokada': ['Oprogramowanie', IconCog],
  'Inne': ['Inny problem', IconDots],
};

const DEVICE_TYPES = [
  ['Smartfon', IconPhone], ['Tablet', IconTablet], ['Laptop', IconLaptop], ['Inne', IconDots],
];
const BRANDS = {
  Smartfon: ['Apple', 'Samsung', 'Xiaomi', 'Motorola', 'Huawei', 'Oppo', 'Realme', 'Google', 'OnePlus', 'Honor', 'Nokia', 'Sony'],
  Tablet: ['Apple', 'Samsung', 'Lenovo', 'Xiaomi', 'Huawei'],
  Laptop: ['Apple', 'Lenovo', 'HP', 'Dell', 'Asus', 'Acer', 'MSI', 'Samsung'],
  Inne: [],
};
const OTHER = '__inna__';


const STEPS = ['Urządzenie i usterka', 'Opis i zdjęcia', 'Twoje dane'];

export default function BookingPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const formRef = useRef(null);
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    deviceType: 'Smartfon', brand: '', brandOther: '', model: '',
    issues: [], needsDiagnosis: false, description: '', preferredDate: '',
    name: '', phone: '', company: '', acceptTerms: false,
  });
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const [photos, setPhotos] = useState([]); // [{ file, url }]
  const [lookup, setLookup] = useState({ nr: '', phone: '', loading: false, error: '' });

  // /umow-naprawe → od razu do formularza
  useEffect(() => {
    if (location.pathname === '/umow-naprawe') {
      setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
    }
  }, [location.pathname]);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const toggleIssue = (issue) => setForm((f) => ({
    ...f,
    needsDiagnosis: false,
    issues: f.issues.includes(issue) ? f.issues.filter((i) => i !== issue) : [...f.issues, issue],
  }));
  const toggleDiagnosis = () => setForm((f) => ({ ...f, needsDiagnosis: !f.needsDiagnosis, issues: [] }));
  const brand = form.brand === OTHER ? form.brandOther.trim() : form.brand;

  const validate = (s) => {
    if (s === 0) {
      if (!brand) return 'Wybierz albo wpisz markę urządzenia.';
      if (!form.model.trim()) return 'Wpisz model urządzenia.';
      if (form.issues.length === 0 && !form.needsDiagnosis) return 'Zaznacz, co jest uszkodzone, albo wybierz „Nie wiem — potrzebna diagnoza”.';
    }
    if (s === 2) {
      if (!form.name.trim() || !form.phone.trim()) return 'Podaj imię i nazwisko oraz numer telefonu.';
      if (!form.acceptTerms) return 'Zaakceptuj zasady rezerwacji i zadatku.';
    }
    return '';
  };

  const next = () => {
    const msg = validate(step);
    setError(msg);
    if (!msg) {
      setStep((s) => s + 1);
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    for (const s of [0, 1, 2]) {
      const msg = validate(s);
      if (msg) { setError(msg); setStep(s); return; }
    }
    setError('');
    setSubmitting(true);
    try {
      const photoPaths = await uploadBookingPhotos(photos.map((p) => p.file));
      await createBookingRequest({
        photoPaths,
        name: form.name, phone: form.phone, company: form.company,
        deviceType: form.deviceType, brand, model: form.model,
        issues: form.issues, needsDiagnosis: form.needsDiagnosis,
        description: form.description, preferredDate: form.preferredDate,
        acceptTerms: form.acceptTerms,
      });
      setDone(true);
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (err) {
      console.error('Błąd wysyłania zgłoszenia:', err);
      setError(err.message || 'Nie udało się wysłać zgłoszenia.');
    } finally {
      setSubmitting(false);
    }
  };

  const scrollToForm = () => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  const addPhotos = (fileList) => {
    const files = Array.from(fileList || []).filter((f) => f.type.startsWith('image/') && f.size < 25 * 1024 * 1024);
    setPhotos((prev) => [...prev, ...files.map((file) => ({ file, url: URL.createObjectURL(file) }))].slice(0, 5));
  };
  const removePhoto = (i) => setPhotos((prev) => { URL.revokeObjectURL(prev[i].url); return prev.filter((_, k) => k !== i); });

  const handleLookup = async (e) => {
    e.preventDefault();
    if (!lookup.nr.trim() || !lookup.phone.trim()) { setLookup((l) => ({ ...l, error: 'Podaj numer zlecenia i telefon.' })); return; }
    setLookup((l) => ({ ...l, loading: true, error: '' }));
    try {
      const cleanPhone = normalizePhone(lookup.phone);
      const repair = await findRepairByLookup(normalizeDisplayNumber(lookup.nr), cleanPhone);
      if (!repair) { setLookup((l) => ({ ...l, loading: false, error: 'Nie znaleziono zlecenia — sprawdź numer i telefon.' })); return; }
      navigate(`/zlecenie/${repair.id}`, { state: { phone: cleanPhone } });
    } catch (err) {
      setLookup((l) => ({ ...l, loading: false, error: err.message || 'Nie udało się sprawdzić statusu.' }));
    }
  };

  return (
    <main className="bp">
      {/* ===== HERO ===== */}
      <section className="bp-hero">
        <div className="bp-wrap">
          <div className="bp-hero-text">
            <h1 className="bp-hero-title">
              Szybka i wygodna naprawa Twojego <span className="bp-hero-accent">telefonu
                <svg className="bp-swoosh" viewBox="0 0 160 18" aria-hidden="true"><path d="M3 14 C 50 2, 110 2, 157 9" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" /></svg>
              </span>
            </h1>
            <p className="bp-hero-sub">Zgłoś usterkę online, a my zajmiemy się resztą. Wycena, kontakt i naprawa — bez zbędnego czekania.</p>
            <button type="button" className="bp-cta" onClick={scrollToForm}>
              <IconWrench size={24} /> Zgłoś naprawę online <IconArrow size={20} />
            </button>
          </div>

          <ul className="bp-features" aria-label="Dlaczego warto">
            <li><IconTimer size={36} className="bp-f-blue" /><div><strong>Szybkie zgłoszenie</strong><span>Wypełnisz w 2 minuty</span></div></li>
            <li><IconShield size={36} className="bp-f-green" /><div><strong>Wycena przed naprawą</strong><span>Zawsze informujemy o koszcie</span></div></li>
            <li><IconBox size={36} className="bp-f-blue" /><div><strong>Powiadomienia SMS</strong><span>Na każdym etapie naprawy</span></div></li>
            <li><IconAward size={36} className="bp-f-blue" /><div><strong>Sprawdzone części</strong><span>Oryginalne i wysokiej jakości zamienniki</span></div></li>
          </ul>
        </div>
      </section>

      {/* ===== FORMULARZ ===== */}
      <section className="bp-wrap bp-form-grid" ref={formRef} id="formularz" style={{ scrollMarginTop: 90 }}>
        <div className="bp-card">
          {done ? (
            <div className="bp-done">
              <span className="bp-done-icon"><IconCheck size={34} /></span>
              <h2>Zgłoszenie wysłane</h2>
              <p>Serwis potwierdzi zgłoszenie SMS-em: dostaniesz numer rezerwacji, termin i wstępną wycenę.</p>
              <p>Przy poważniejszych naprawach poprosimy o zadatek BLIK-iem — w tytule wpisz wtedy numer rezerwacji. Zadatek przepada w razie rezygnacji lub nieprzybycia w umówionym terminie bez wcześniejszego powiadomienia.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} noValidate>
              <h2 className="bp-card-title"><IconWrench size={34} className="bp-blue" /> Zgłoś urządzenie do naprawy</h2>

              <ol className="bp-steps" aria-label="Kroki formularza">
                {STEPS.map((label, i) => (
                  <li key={label} className={`bp-step ${i === step ? 'bp-step-now' : ''} ${i < step ? 'bp-step-done' : ''}`}>
                    <button type="button" onClick={() => (i < step ? setStep(i) : null)} disabled={i > step} aria-current={i === step ? 'step' : undefined}>
                      <span className="bp-step-dot">{i < step ? <IconCheck size={14} /> : i + 1}</span>
                      <span className="bp-step-label">{label}</span>
                    </button>
                  </li>
                ))}
              </ol>

              {step === 0 && (
                <div className="bp-pane">
                  <h3 className="bp-q">Wybierz rodzaj urządzenia</h3>
                  <div className="bp-tiles bp-tiles-4">
                    {DEVICE_TYPES.map(([t, Icon]) => (
                      <button key={t} type="button" className={`bp-tile ${form.deviceType === t ? 'bp-tile-on' : ''}`} aria-pressed={form.deviceType === t} onClick={() => setForm((f) => ({ ...f, deviceType: t, brand: '' }))}>
                        {form.deviceType === t && <span className="bp-tile-check"><IconCheck size={14} /></span>}
                        <Icon size={34} />
                        <span>{t}</span>
                      </button>
                    ))}
                  </div>

                  <div className="bp-row">
                    <label className="bp-field">
                      <span>Marka</span>
                      <select value={form.brand} onChange={set('brand')}>
                        <option value="">Wybierz markę</option>
                        {BRANDS[form.deviceType].map((b) => <option key={b} value={b}>{b}</option>)}
                        <option value={OTHER}>Inna…</option>
                      </select>
                    </label>
                    <label className="bp-field">
                      <span>Model</span>
                      <input value={form.model} onChange={set('model')} placeholder="np. iPhone 14, Galaxy A54" />
                    </label>
                  </div>
                  {form.brand === OTHER && (
                    <label className="bp-field">
                      <span>Jaka marka?</span>
                      <input value={form.brandOther} onChange={set('brandOther')} placeholder="Wpisz markę" />
                    </label>
                  )}
                  <h3 className="bp-q">Jaka jest usterka?</h3>
                  <div className="bp-tiles bp-tiles-5">
                    {BOOKING_ISSUES.map((issue) => {
                      const [label, Icon] = ISSUE_UI[issue];
                      const on = form.issues.includes(issue);
                      return (
                        <button key={issue} type="button" className={`bp-tile bp-tile-sm ${on ? 'bp-tile-on' : ''}`} aria-pressed={on} onClick={() => toggleIssue(issue)}>
                          {on && <span className="bp-tile-check"><IconCheck size={14} /></span>}
                          <Icon size={28} />
                          <span>{label}</span>
                        </button>
                      );
                    })}
                  </div>
                  <button type="button" className={`bp-diag ${form.needsDiagnosis ? 'bp-diag-on' : ''}`} aria-pressed={form.needsDiagnosis} onClick={toggleDiagnosis}>
                    <IconSearch size={20} /> Nie wiem — potrzebna diagnoza
                  </button>

                </div>
              )}

              {step === 1 && (
                <div className="bp-pane">
                  <label className="bp-field">
                    <span>Opisz problem (opcjonalnie)</span>
                    <textarea rows={4} value={form.description} onChange={set('description')} placeholder="Np. telefon spadł, ekran pęknięty w rogu, dotyk działa" />
                  </label>
                  <label className="bp-field bp-field-half">
                    <span>Preferowany termin (opcjonalnie)</span>
                    <input type="date" value={form.preferredDate} onChange={set('preferredDate')} />
                  </label>
                  <div className="bp-field">
                    <span>Zdjęcia usterki (opcjonalnie, do 5)</span>
                    <div className="bp-photos">
                      {photos.map((p, i) => (
                        <div key={p.url} className="bp-photo">
                          <img src={p.url} alt={`Zdjęcie ${i + 1}`} />
                          <button type="button" aria-label="Usuń zdjęcie" onClick={() => removePhoto(i)}><IconClose size={14} /></button>
                        </div>
                      ))}
                      {photos.length < 5 && (
                        <label className="bp-photo-add">
                          <IconImage size={26} />
                          <span>Dodaj zdjęcie</span>
                          <input type="file" accept="image/*" multiple hidden onChange={(e) => { addPhotos(e.target.files); e.target.value = ''; }} />
                        </label>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="bp-pane">
                  <div className="bp-row">
                    <label className="bp-field"><span>Imię i nazwisko</span><input value={form.name} onChange={set('name')} placeholder="Jan Kowalski" autoComplete="name" /></label>
                    <label className="bp-field"><span>Telefon</span><input type="tel" value={form.phone} onChange={set('phone')} placeholder="500 000 000" autoComplete="tel" /></label>
                  </div>
                  <label className="bp-field"><span>Firma (opcjonalnie)</span><input value={form.company} onChange={set('company')} placeholder="Nazwa firmy — przy zgłoszeniach firmowych" /></label>

                  <div className="bp-terms">
                    <h3>Zasady rezerwacji i zadatku</h3>
                    <ul>
                      <li>Po przejrzeniu zgłoszenia serwis wyśle SMS z numerem rezerwacji, terminem i wstępną wyceną.</li>
                      <li>Przy poważniejszych naprawach, zwłaszcza wymagających zamówienia części, serwis może poprosić o <strong>zadatek</strong> BLIK-iem na numer telefonu (w tytule numer rezerwacji). Rezerwacja jest potwierdzona po wpłacie.</li>
                      <li>Zadatek zaliczamy na poczet ceny naprawy.</li>
                      <li><strong>Jeśli zrezygnujesz z naprawy albo nie zgłosisz się w umówionym terminie bez wcześniejszego powiadomienia serwisu, zadatek przepada</strong> (art. 394 Kodeksu cywilnego). Jeśli naprawy nie wykonamy z naszej winy, zwracamy zadatek w podwójnej wysokości.</li>
                    </ul>
                  </div>

                  <details className="bp-rodo">
                    <summary>Informacja o przetwarzaniu danych osobowych (RODO)</summary>
                    <p>Administratorem Twoich danych jest Fonexpert Filip Rajewski, Bogusławice 29A, 09-100 Płońsk, NIP 5671935602, tel. {SHOP.phone}. Dane z formularza (imię i nazwisko, telefon, nazwa firmy, dane urządzenia i opis usterki) przetwarzamy, aby obsłużyć zgłoszenie, skontaktować się z Tobą (telefon, SMS) i wykonać naprawę — na podstawie art. 6 ust. 1 lit. b RODO (działania przed zawarciem umowy i jej wykonanie), a po jej wykonaniu także w celu rozliczeń podatkowych (lit. c) i ewentualnych roszczeń (lit. f).</p>
                    <p>Dane zgłoszenia, które nie zakończyło się naprawą, przechowujemy do 12 miesięcy. Dane związane z wykonaną naprawą — przez okres wymagany przepisami podatkowymi i do przedawnienia roszczeń. Odbiorcami danych mogą być dostawcy usług informatycznych, z których korzystamy (hosting i baza danych Google Firebase, wysyłka SMS), oraz biuro rachunkowe; dane mogą być przetwarzane poza EOG na podstawie standardowych klauzul umownych.</p>
                    <p>Masz prawo dostępu do danych, ich sprostowania, usunięcia lub ograniczenia przetwarzania, sprzeciwu oraz skargi do Prezesa UODO. Podanie danych jest dobrowolne, ale bez nich nie obsłużymy zgłoszenia.</p>
                  </details>

                  <label className="bp-accept">
                    <input type="checkbox" checked={form.acceptTerms} onChange={(e) => setForm((f) => ({ ...f, acceptTerms: e.target.checked }))} />
                    <span>Akceptuję zasady rezerwacji i zadatku oraz zapoznałem/am się z informacją o przetwarzaniu danych.</span>
                  </label>
                </div>
              )}

              {error && <div className="bp-error" role="alert">{error}</div>}

              <div className="bp-actions">
                {step > 0 && <button type="button" className="bp-btn bp-btn-ghost" onClick={() => { setError(''); setStep((s) => s - 1); }}>Wstecz</button>}
                {step < 2 ? (
                  <button type="button" className="bp-btn bp-btn-primary bp-btn-wide" onClick={next}>Dalej <IconArrow size={18} /></button>
                ) : (
                  <button type="submit" className="bp-btn bp-btn-primary bp-btn-wide" disabled={submitting}>{submitting ? 'Wysyłam…' : 'Wyślij zgłoszenie'} {!submitting && <IconArrow size={18} />}</button>
                )}
              </div>
            </form>
          )}
        </div>

        <aside className="bp-aside" aria-label="Dlaczego warto zgłosić online">
          <div className="bp-promo">
            <h2>Pęknięty <span>ekran?</span></h2>
            <p>Zgłoś naprawę online i poznaj wycenę bez wychodzenia z domu.</p>
            <svg className="bp-promo-phone" viewBox="0 0 160 260" aria-hidden="true">
              <defs>
                <linearGradient id="pp" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#3B82F6" /><stop offset="1" stopColor="#0B1F4D" /></linearGradient>
              </defs>
              <rect x="22" y="8" width="128" height="244" rx="22" fill="#0B1226" stroke="#60A5FA" strokeWidth="3" />
              <rect x="30" y="16" width="112" height="228" rx="16" fill="url(#pp)" />
              <g stroke="#E0F2FE" strokeWidth="1.4" fill="none" opacity=".9">
                <path d="M96 150 L60 96 L44 60" /><path d="M96 150 L140 120" /><path d="M96 150 L130 210 L138 240" />
                <path d="M96 150 L52 196" /><path d="M96 150 L92 70 L104 24" /><path d="M96 150 L34 140" />
                <path d="M70 120 L82 128 M118 136 L128 150 M112 188 L122 178 M66 168 L78 176" />
              </g>
              <circle cx="96" cy="150" r="5" fill="#E0F2FE" />
            </svg>
          </div>
          <ul className="bp-checks">
            <li><span><IconCheck size={14} /></span> Wycena przed naprawą</li>
            <li><span><IconCheck size={14} /></span> Indywidualna wycena</li>
            <li><span><IconCheck size={14} /></span> Powiadomienia o postępie</li>
          </ul>
        </aside>
      </section>

      {/* ===== STATUS ===== */}
      <section className="bp-wrap">
        <form className="bp-status" onSubmit={handleLookup}>
          <IconBox size={54} className="bp-status-icon" />
          <div className="bp-status-text">
            <h2>Sprawdź status naprawy</h2>
            <p>Wpisz numer zlecenia i telefon, i zobacz, na jakim etapie jest Twoje urządzenie.</p>
          </div>
          <div className="bp-status-form">
            <label className="bp-status-input"><IconTag size={20} /><input aria-label="Numer zlecenia" placeholder="Nr zlecenia" value={lookup.nr} onChange={(e) => setLookup((l) => ({ ...l, nr: e.target.value }))} /></label>
            <label className="bp-status-input"><IconPhone size={20} /><input aria-label="Telefon" type="tel" placeholder="Telefon" value={lookup.phone} onChange={(e) => setLookup((l) => ({ ...l, phone: e.target.value }))} /></label>
            <button type="submit" className="bp-btn bp-btn-primary" disabled={lookup.loading}>{lookup.loading ? 'Szukam…' : 'Sprawdź'} <IconArrow size={18} /></button>
          </div>
          {lookup.error && <p className="bp-status-error" role="alert">{lookup.error}</p>}
        </form>
      </section>
    </main>
  );
}
