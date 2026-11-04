// ============================================================
//  BookingPage.jsx – strona główna i „Umów naprawę” panelu klienta
//  Hero → korzyści → 3-krokowy formularz zgłoszenia → FAQ.
//  Zgłoszenie trafia do panelu admina (Rezerwacje) przez funkcję
//  createBookingRequestWeb – ta sama biała lista usterek co tutaj.
// ============================================================

import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { createBookingRequest } from '../firebase/firestoreApi';
import SHOP from '../shop';
import {
  IconPhone, IconTablet, IconLaptop, IconDevice, IconWrench, IconBolt, IconHeadset, IconShield,
  IconCrack, IconBattery, IconPlug, IconCamera, IconSpeaker, IconDrop, IconPower, IconBack, IconCog,
  IconDots, IconSearch, IconArrow, IconCheck, IconCall, IconClock, IconPin,
} from '../layout/icons';
import './BookingPage.css';

// Najczęstsze usterki – ta sama lista jest na serwerze (createBookingRequestWeb) jako biała lista.
export const BOOKING_ISSUES = [
  'Zbity ekran / wyświetlacz', 'Bateria', 'Gniazdo ładowania', 'Aparat', 'Głośnik / mikrofon',
  'Zalanie', 'Nie włącza się', 'Tylna szybka / obudowa', 'Oprogramowanie / blokada', 'Inne',
];
const ISSUE_UI = {
  'Zbity ekran / wyświetlacz': ['Zbity ekran', IconCrack],
  'Bateria': ['Bateria', IconBattery],
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
  ['Smartfon', IconPhone], ['Tablet', IconTablet], ['Laptop', IconLaptop], ['Inne', IconDevice],
];
const BRANDS = {
  Smartfon: ['Apple', 'Samsung', 'Xiaomi', 'Motorola', 'Huawei', 'Oppo', 'Realme', 'Google', 'OnePlus', 'Honor', 'Nokia', 'Sony'],
  Tablet: ['Apple', 'Samsung', 'Lenovo', 'Xiaomi', 'Huawei'],
  Laptop: ['Apple', 'Lenovo', 'HP', 'Dell', 'Asus', 'Acer', 'MSI', 'Samsung'],
  Inne: [],
};
const OTHER = '__inna__';

const FAQ = [
  ['Jak długo trwa naprawa?', 'Zależy od usterki i dostępności części. Proste naprawy, jak wymiana ekranu czy baterii, często robimy od ręki, jeśli część jest na miejscu. Gdy część trzeba zamówić, termin potwierdzimy SMS-em.'],
  ['Czy muszę wcześniej umawiać wizytę?', 'Nie — możesz przyjść w godzinach otwarcia. Zgłoszenie online pozwala nam wcześniej przygotować lub zamówić część, więc naprawa idzie szybciej.'],
  ['Skąd dowiem się o statusie naprawy?', 'Przy przyjęciu dostaniesz potwierdzenie z numerem zlecenia i kodem QR. Status sprawdzisz w zakładce „Sprawdź status”, a o ważnych zmianach (kosztorys, gotowe do odbioru) poinformujemy SMS-em.'],
  ['Czy otrzymam wycenę przed naprawą?', 'Tak. Przed naprawą przekażemy kosztorys — naprawę wykonujemy dopiero po Twojej akceptacji, online przez link albo telefonicznie.'],
];

const STEPS = ['Urządzenie', 'Usterka', 'Kontakt'];

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
    }
    if (s === 1 && form.issues.length === 0 && !form.needsDiagnosis && !form.description.trim()) {
      return 'Zaznacz, co jest uszkodzone, albo wybierz „Nie wiem — potrzebna diagnoza”.';
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
      await createBookingRequest({
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

  return (
    <main className="bp">
      {/* ===== HERO ===== */}
      <section className="bp-hero">
        <div className="bp-wrap bp-hero-grid">
          <div className="bp-hero-text">
            <h1 className="bp-hero-title">Twój telefon znów będzie <span>działał jak należy.</span></h1>
            <p className="bp-hero-sub">Zgłoś usterkę online w kilka chwil. Skontaktujemy się z Tobą, aby ustalić szczegóły naprawy.</p>
            <div className="bp-hero-actions">
              <button type="button" className="bp-btn bp-btn-primary bp-btn-lg" onClick={scrollToForm}>
                <IconWrench size={22} /> Zgłoś naprawę <IconArrow size={18} />
              </button>
              <Link to="/status" className="bp-btn bp-btn-ghost bp-btn-lg"><IconSearch size={20} /> Sprawdź status</Link>
            </div>
          </div>
          <div className="bp-hero-media">
            <img src="/hero-repair.jpg" alt="Serwisant naprawia smartfon na macie serwisowej" />
          </div>
        </div>
      </section>

      {/* ===== KORZYŚCI ===== */}
      <section className="bp-wrap bp-features" aria-label="Dlaczego warto">
        <div className="bp-feature">
          <IconBolt size={40} className="bp-feature-icon bp-green" />
          <div><h2>Szybkie zgłoszenie</h2><p>Intuicyjny formularz, który zajmie Ci tylko kilka minut.</p></div>
        </div>
        <div className="bp-feature">
          <IconHeadset size={40} className="bp-feature-icon bp-blue" />
          <div><h2>Kontakt z serwisem</h2><p>Szybko oddzwonimy lub napiszemy, aby potwierdzić zgłoszenie.</p></div>
        </div>
        <div className="bp-feature">
          <IconShield size={40} className="bp-feature-icon bp-green" />
          <div><h2>Przejrzyste zasady</h2><p>Jasne informacje o przebiegu naprawy i jej kosztach.</p></div>
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
              <button type="button" className="bp-btn bp-btn-ghost" onClick={() => navigate('/status')}>Sprawdź status naprawy</button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} noValidate>
              <h2 className="bp-card-title"><IconWrench size={30} className="bp-blue" /> Zgłoś urządzenie do naprawy</h2>

              <ol className="bp-steps" aria-label="Kroki formularza">
                {STEPS.map((label, i) => (
                  <li key={label} className={`bp-step ${i === step ? 'bp-step-now' : ''} ${i < step ? 'bp-step-done' : ''}`}>
                    <button type="button" onClick={() => (i < step ? setStep(i) : null)} disabled={i > step} aria-current={i === step ? 'step' : undefined}>
                      <span className="bp-step-dot">{i < step ? <IconCheck size={16} /> : i + 1}</span>
                      <span className="bp-step-label">{i + 1}. {label}</span>
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
                </div>
              )}

              {step === 1 && (
                <div className="bp-pane">
                  <h3 className="bp-q">Co się dzieje z urządzeniem?</h3>
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

                  <label className="bp-field">
                    <span>Opisz problem{form.issues.length || form.needsDiagnosis ? ' (opcjonalnie)' : ''}</span>
                    <textarea rows={4} value={form.description} onChange={set('description')} placeholder="Np. telefon spadł, ekran pęknięty w rogu, dotyk działa" />
                  </label>
                  <label className="bp-field bp-field-half">
                    <span>Preferowany termin (opcjonalnie)</span>
                    <input type="date" value={form.preferredDate} onChange={set('preferredDate')} />
                  </label>
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

        <aside className="bp-aside" aria-label="Jak to działa i kontakt">
          <div className="bp-aside-card">
            <h2>Jak to działa?</h2>
            <ol className="bp-how">
              <li><strong>Wysyłasz zgłoszenie</strong><span>Urządzenie, usterka i Twój telefon.</span></li>
              <li><strong>Dostajesz SMS</strong><span>Numer rezerwacji, termin i wstępna wycena.</span></li>
              <li><strong>Naprawiamy</strong><span>Status sprawdzisz online w każdej chwili.</span></li>
            </ol>
          </div>
          <div className="bp-aside-card">
            <h2>Wolisz zadzwonić?</h2>
            <a className="bp-aside-phone" href={SHOP.phoneHref}><IconCall size={20} /> {SHOP.phone}</a>
            <p className="bp-aside-row"><IconPin size={18} /><span>{SHOP.addressLine1}, {SHOP.addressLine2}</span></p>
            <p className="bp-aside-row"><IconClock size={18} /><span>{SHOP.hours.map(([d, h]) => <span key={d} className="bp-aside-hours">{d}: {h}</span>)}</span></p>
          </div>
        </aside>
      </section>

      {/* ===== FAQ ===== */}
      <section className="bp-wrap bp-faq">
        <div>
          <h2 className="bp-faq-title">Najczęściej zadawane <span>pytania</span></h2>
          <p className="bp-faq-sub">Sprawdź odpowiedzi na najpopularniejsze pytania dotyczące zgłaszania napraw.</p>
        </div>
        <div className="bp-faq-list">
          {FAQ.map(([q, a]) => (
            <details key={q} className="bp-faq-item">
              <summary>{q}</summary>
              <p>{a}</p>
            </details>
          ))}
        </div>
      </section>
    </main>
  );
}
