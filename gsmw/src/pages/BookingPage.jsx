// ============================================================
//  BookingPage.jsx – „Umów naprawę” (/umow-naprawe)
//  2 kroki: 1) urządzenie i usterka, 2) kontakt (+ szczegóły opcjonalnie).
//  Zgłoszenie trafia do panelu admina (Rezerwacje) przez funkcję
//  createBookingRequestWeb – ta sama biała lista usterek co tutaj.
//  Parametry: ?usterka=<usterka z listy | diagnoza>, ?typ=Tablet|Laptop|Inne
// ============================================================
import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { createBookingRequest, uploadBookingPhotos } from '../firebase/firestoreApi';
import friendlyError, { isValidPlPhone } from '../utils/friendlyError';
import SHOP from '../shop';
import {
  IconPhone, IconTablet, IconLaptop, IconWrench, IconCrack, IconBattery, IconPlug, IconCamera, IconSpeaker,
  IconDrop, IconPower, IconBack, IconCog, IconDots, IconSearch, IconArrow, IconCheck, IconImage, IconClose,
  IconInfo, IconCall, IconChevron, IconBox, IconShield,
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
const DEVICE_TYPES = [['Smartfon', IconPhone], ['Tablet', IconTablet], ['Laptop', IconLaptop], ['Inne', IconDots]];
const BRANDS = {
  Smartfon: ['Apple', 'Samsung', 'Xiaomi', 'Motorola', 'Huawei', 'Oppo', 'Realme', 'Google', 'OnePlus', 'Honor', 'Nokia', 'Sony'],
  Tablet: ['Apple', 'Samsung', 'Lenovo', 'Xiaomi', 'Huawei'],
  Laptop: ['Apple', 'Lenovo', 'HP', 'Dell', 'Asus', 'Acer', 'MSI', 'Samsung'],
  Inne: [],
};
const OTHER = '__inna__';
const STEPS = ['Urządzenie i usterka', 'Twoje dane'];

export default function BookingPage() {
  const [params] = useSearchParams();
  const formRef = useRef(null);
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(() => {
    const typ = params.get('typ');
    const usterka = params.get('usterka');
    return {
      deviceType: DEVICE_TYPES.some(([t]) => t === typ) ? typ : 'Smartfon',
      brand: '', brandOther: '', model: '',
      issues: BOOKING_ISSUES.includes(usterka) ? [usterka] : [],
      needsDiagnosis: usterka === 'diagnoza',
      description: '', preferredDate: '', name: '', phone: '', company: '', acceptTerms: false,
    };
  });
  const [showDetails, setShowDetails] = useState(false);
  const [photos, setPhotos] = useState([]); // [{ file, url }]
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [progress, setProgress] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => { document.title = 'Zgłoś naprawę online | Fonexpert Płońsk'; }, []);
  useEffect(() => () => photos.forEach((p) => URL.revokeObjectURL(p.url)), []); // eslint-disable-line react-hooks/exhaustive-deps

  const brand = form.brand === OTHER ? form.brandOther.trim() : form.brand;
  const setField = (key) => (e) => {
    const value = e.target.value;
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key]) setErrors((x) => ({ ...x, [key]: '' }));
  };
  const toggleIssue = (issue) => {
    setForm((f) => ({ ...f, needsDiagnosis: false, issues: f.issues.includes(issue) ? f.issues.filter((i) => i !== issue) : [...f.issues, issue] }));
    setErrors((x) => ({ ...x, issues: '' }));
  };
  const toggleDiagnosis = () => {
    setForm((f) => ({ ...f, needsDiagnosis: !f.needsDiagnosis, issues: [] }));
    setErrors((x) => ({ ...x, issues: '' }));
  };

  const validate = (s) => {
    const e = {};
    if (s === 0) {
      if (!brand) e.brand = form.brand === OTHER ? 'Wpisz markę urządzenia.' : 'Wybierz markę urządzenia.';
      if (!form.model.trim()) e.model = 'Wpisz model, np. iPhone 13.';
      if (form.issues.length === 0 && !form.needsDiagnosis) e.issues = 'Zaznacz usterkę albo wybierz „Nie wiem — potrzebna diagnoza”.';
    }
    if (s === 1) {
      if (!form.name.trim()) e.name = 'Podaj imię i nazwisko.';
      if (!form.phone.trim()) e.phone = 'Podaj numer telefonu — na niego wyślemy SMS.';
      else if (!isValidPlPhone(form.phone)) e.phone = 'Numer telefonu powinien mieć 9 cyfr.';
      if (form.preferredDate && form.preferredDate < todayLocal()) e.preferredDate = 'Termin nie może być wcześniejszy niż dzisiaj.';
      if (!form.acceptTerms) e.acceptTerms = 'Zaakceptuj zasady, żeby wysłać zgłoszenie.';
    }
    return e;
  };

  const focusFirstError = (e) => {
    const first = Object.keys(e)[0];
    if (first === 'preferredDate') setShowDetails(true);
    setTimeout(() => {
      const el = formRef.current?.querySelector(`[data-field="${first}"]`);
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el?.querySelector('input, select, textarea, button')?.focus({ preventScroll: true });
    }, 30);
  };

  const next = () => {
    const e = validate(0);
    setErrors(e);
    if (Object.keys(e).length) { focusFirstError(e); return; }
    setStep(1);
    setFormError('');
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleSubmit = async (ev) => {
    ev.preventDefault();
    if (step === 0) { next(); return; }
    const e0 = validate(0);
    if (Object.keys(e0).length) { setErrors(e0); setStep(0); focusFirstError(e0); return; }
    const e1 = validate(1);
    setErrors(e1);
    if (Object.keys(e1).length) { focusFirstError(e1); return; }
    setFormError('');
    setSubmitting(true);
    try {
      let photoPaths = [];
      if (photos.length) {
        setProgress(`Wysyłam zdjęcia (${photos.length})…`);
        photoPaths = await uploadBookingPhotos(photos.map((p) => p.file));
      }
      setProgress('Wysyłam zgłoszenie…');
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
      setFormError(friendlyError(err, 'Nie udało się wysłać zgłoszenia. Spróbuj ponownie albo zadzwoń.'));
    } finally {
      setSubmitting(false);
      setProgress('');
    }
  };

  const addPhotos = (fileList) => {
    const files = Array.from(fileList || []).filter((f) => f.type.startsWith('image/') && f.size < 25 * 1024 * 1024);
    setPhotos((prev) => [...prev, ...files.map((file) => ({ file, url: URL.createObjectURL(file) }))].slice(0, 5));
  };
  const removePhoto = (i) => setPhotos((prev) => { URL.revokeObjectURL(prev[i].url); return prev.filter((_, k) => k !== i); });

  const reset = () => {
    photos.forEach((p) => URL.revokeObjectURL(p.url));
    setPhotos([]);
    setForm((f) => ({ ...f, brand: '', brandOther: '', model: '', issues: [], needsDiagnosis: false, description: '', preferredDate: '', acceptTerms: false }));
    setStep(0); setDone(false); setErrors({});
  };

  const summary = [form.deviceType, brand, form.model].filter(Boolean).join(' · ');
  const issueSummary = form.needsDiagnosis ? 'Diagnoza' : form.issues.map((i) => ISSUE_UI[i][0]).join(', ');

  return (
    <main className="bp">
      <section className="ui-hero ui-hero-compact ui-hero-overlap">
        <div className="ui-wrap ui-hero-inner">
          <p className="ui-eyebrow">Umów naprawę</p>
          <h1 className="ui-h1">Zgłoś naprawę <span className="ui-accent">online</span></h1>
          <p className="ui-lead">Dwa krótkie kroki. Odpiszemy SMS-em z numerem rezerwacji, terminem i wstępną wyceną.</p>
        </div>
      </section>

      <div className="ui-wrap ui-overlap bp-layout">
        <div className="ui-card bp-card" ref={formRef} style={{ scrollMarginTop: 90 }}>
          {done ? (
            <div className="ui-success">
              <span className="ui-success-icon"><IconCheck size={34} /></span>
              <h2>Zgłoszenie wysłane — dziękujemy!</h2>
              <p>{summary}{issueSummary ? ` — ${issueSummary}` : ''}</p>
              <ol className="ui-next">
                <li><span>1</span>Przejrzymy zgłoszenie i odpiszemy SMS-em na numer {form.phone} — z numerem rezerwacji, terminem i wstępną ceną.</li>
                <li><span>2</span>Przy poważniejszych naprawach poprosimy o zadatek BLIK-iem (w tytule numer rezerwacji).</li>
                <li><span>3</span>Przyjdź w umówionym terminie do {SHOP.addressLine1}.</li>
              </ol>
              <div className="ui-btn-row">
                <Link to="/" className="ui-btn ui-btn-secondary">Strona główna</Link>
                <button type="button" className="ui-btn ui-btn-primary" onClick={reset}>Zgłoś kolejne urządzenie</button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} noValidate>
              <ol className="bp-steps" aria-label="Kroki formularza">
                {STEPS.map((label, i) => (
                  <li key={label} className={`bp-step ${i === step ? 'bp-step-now' : ''} ${i < step ? 'bp-step-done' : ''}`}>
                    <button type="button" onClick={() => (i < step ? setStep(i) : null)} disabled={i > step} aria-current={i === step ? 'step' : undefined}>
                      <span className="bp-step-dot">{i < step ? <IconCheck size={14} /> : i + 1}</span>
                      <span>{label}</span>
                    </button>
                  </li>
                ))}
              </ol>

              {step === 0 && (
                <div className="bp-pane">
                  <fieldset className="bp-group">
                    <legend className="bp-q">Rodzaj urządzenia</legend>
                    <div className="bp-types">
                      {DEVICE_TYPES.map(([t, Icon]) => (
                        <button key={t} type="button" className={`bp-type ${form.deviceType === t ? 'bp-type-on' : ''}`} aria-pressed={form.deviceType === t}
                          onClick={() => setForm((f) => ({ ...f, deviceType: t, brand: '' }))}>
                          <Icon size={22} /> {t}
                        </button>
                      ))}
                    </div>
                  </fieldset>

                  <div className="bp-row">
                    <div className={`ui-field ${errors.brand ? 'ui-field-error' : ''}`} data-field="brand">
                      <label className="ui-label" htmlFor="bp-brand">Marka</label>
                      {form.brand === OTHER ? (
                        <div className="bp-other">
                          <input id="bp-brand" className="ui-input" value={form.brandOther} onChange={setField('brandOther')} placeholder="Wpisz markę" autoFocus
                            onInput={() => errors.brand && setErrors((x) => ({ ...x, brand: '' }))} />
                          <button type="button" className="ui-btn ui-btn-secondary ui-btn-sm" onClick={() => setForm((f) => ({ ...f, brand: '', brandOther: '' }))}>Lista</button>
                        </div>
                      ) : (
                        <select id="bp-brand" className="ui-select" value={form.brand} onChange={setField('brand')}>
                          <option value="">Wybierz markę</option>
                          {BRANDS[form.deviceType].map((b) => <option key={b} value={b}>{b}</option>)}
                          <option value={OTHER}>Inna…</option>
                        </select>
                      )}
                      {errors.brand && <span className="ui-field-msg">{errors.brand}</span>}
                    </div>
                    <div className={`ui-field ${errors.model ? 'ui-field-error' : ''}`} data-field="model">
                      <label className="ui-label" htmlFor="bp-model">Model</label>
                      <input id="bp-model" className="ui-input" value={form.model} onChange={setField('model')} placeholder="np. iPhone 14, Galaxy A54" autoComplete="off" />
                      {errors.model && <span className="ui-field-msg">{errors.model}</span>}
                    </div>
                  </div>

                  <fieldset className={`bp-group ${errors.issues ? 'bp-group-error' : ''}`} data-field="issues">
                    <legend className="bp-q">Co jest uszkodzone? <small>możesz zaznaczyć kilka</small></legend>
                    <div className="bp-tiles">
                      {BOOKING_ISSUES.map((issue) => {
                        const [label, Icon] = ISSUE_UI[issue];
                        const on = form.issues.includes(issue);
                        return (
                          <button key={issue} type="button" className={`bp-tile ${on ? 'bp-tile-on' : ''}`} aria-pressed={on} onClick={() => toggleIssue(issue)}>
                            {on && <span className="bp-tile-check"><IconCheck size={12} /></span>}
                            <Icon size={24} />
                            <span>{label}</span>
                          </button>
                        );
                      })}
                    </div>
                    <button type="button" className={`bp-diag ${form.needsDiagnosis ? 'bp-diag-on' : ''}`} aria-pressed={form.needsDiagnosis} onClick={toggleDiagnosis}>
                      {form.needsDiagnosis ? <IconCheck size={18} /> : <IconSearch size={18} />} Nie wiem — potrzebna diagnoza
                    </button>
                    {errors.issues && <span className="ui-field-msg">{errors.issues}</span>}
                  </fieldset>
                </div>
              )}

              {step === 1 && (
                <div className="bp-pane">
                  <div className="bp-summary">
                    <span className="ui-icon-tile"><IconWrench size={20} /></span>
                    <div><strong>{summary}</strong><span>{issueSummary}</span></div>
                    <button type="button" className="ui-link" onClick={() => setStep(0)}>Zmień</button>
                  </div>

                  <div className="bp-row">
                    <div className={`ui-field ${errors.name ? 'ui-field-error' : ''}`} data-field="name">
                      <label className="ui-label" htmlFor="bp-name">Imię i nazwisko</label>
                      <input id="bp-name" className="ui-input" value={form.name} onChange={setField('name')} placeholder="Jan Kowalski" autoComplete="name" />
                      {errors.name && <span className="ui-field-msg">{errors.name}</span>}
                    </div>
                    <div className={`ui-field ${errors.phone ? 'ui-field-error' : ''}`} data-field="phone">
                      <label className="ui-label" htmlFor="bp-phone">Telefon</label>
                      <input id="bp-phone" className="ui-input" type="tel" inputMode="tel" value={form.phone} onChange={setField('phone')} placeholder="500 000 000" autoComplete="tel" />
                      {errors.phone ? <span className="ui-field-msg">{errors.phone}</span> : <span className="ui-hint">Na ten numer wyślemy SMS z potwierdzeniem.</span>}
                    </div>
                  </div>

                  <div className={`bp-more ${showDetails ? 'bp-more-open' : ''}`}>
                    <button type="button" className="bp-more-toggle" aria-expanded={showDetails} onClick={() => setShowDetails((v) => !v)}>
                      <span><strong>Dodaj szczegóły</strong> <small>opis, zdjęcia, preferowany termin — opcjonalnie</small></span>
                      {photos.length > 0 && <span className="ui-badge">{photos.length} zdj.</span>}
                      <IconChevron size={18} className="bp-more-chev" />
                    </button>
                    {showDetails && (
                      <div className="bp-more-body">
                        <div className="ui-field">
                          <label className="ui-label" htmlFor="bp-desc">Opis problemu</label>
                          <textarea id="bp-desc" className="ui-textarea" rows={3} value={form.description} onChange={setField('description')} placeholder="Np. telefon spadł, ekran pęknięty w rogu, dotyk działa" />
                        </div>
                        <div className="ui-field">
                          <span className="ui-label">Zdjęcia usterki <small>(do 5)</small></span>
                          <div className="bp-photos">
                            {photos.map((p, i) => (
                              <div key={p.url} className="bp-photo">
                                <img src={p.url} alt={`Zdjęcie ${i + 1}`} />
                                <button type="button" aria-label={`Usuń zdjęcie ${i + 1}`} onClick={() => removePhoto(i)}><IconClose size={14} /></button>
                              </div>
                            ))}
                            {photos.length < 5 && (
                              <label className="bp-photo-add">
                                <IconImage size={24} />
                                <span>Dodaj</span>
                                <input type="file" accept="image/*" multiple hidden onChange={(e) => { addPhotos(e.target.files); e.target.value = ''; }} />
                              </label>
                            )}
                          </div>
                        </div>
                        <div className="bp-row">
                          <div className={`ui-field ${errors.preferredDate ? 'ui-field-error' : ''}`} data-field="preferredDate">
                            <label className="ui-label" htmlFor="bp-date">Preferowany termin</label>
                            <input id="bp-date" className="ui-input" type="date" min={todayLocal()} value={form.preferredDate} onChange={setField('preferredDate')} />
                            {errors.preferredDate && <span className="ui-field-msg">{errors.preferredDate}</span>}
                          </div>
                          <div className="ui-field">
                            <label className="ui-label" htmlFor="bp-company">Firma</label>
                            <input id="bp-company" className="ui-input" value={form.company} onChange={setField('company')} placeholder="Przy zgłoszeniu firmowym" />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className={`bp-terms ${errors.acceptTerms ? 'bp-terms-error' : ''}`} data-field="acceptTerms">
                    <label className="bp-accept">
                      <input type="checkbox" checked={form.acceptTerms} onChange={(e) => { setForm((f) => ({ ...f, acceptTerms: e.target.checked })); setErrors((x) => ({ ...x, acceptTerms: '' })); }} />
                      <span>Akceptuję <strong>zasady rezerwacji i zadatku</strong> oraz zapoznałem/am się z informacją o przetwarzaniu danych.</span>
                    </label>
                    {errors.acceptTerms && <span className="ui-field-msg">{errors.acceptTerms}</span>}
                    <details className="bp-rodo">
                      <summary>Zasady rezerwacji i zadatku</summary>
                      <ul>
                        <li>Po przejrzeniu zgłoszenia wyślemy SMS z numerem rezerwacji, terminem i wstępną wyceną.</li>
                        <li>Przy poważniejszych naprawach, zwłaszcza wymagających zamówienia części, możemy poprosić o <strong>zadatek</strong> BLIK-iem na numer telefonu (w tytule numer rezerwacji). Rezerwacja jest potwierdzona po wpłacie.</li>
                        <li>Zadatek zaliczamy na poczet ceny naprawy.</li>
                        <li><strong>Jeśli zrezygnujesz z naprawy albo nie zgłosisz się w umówionym terminie bez wcześniejszego powiadomienia serwisu, zadatek przepada</strong> (art. 394 Kodeksu cywilnego). Jeśli naprawy nie wykonamy z naszej winy, zwracamy zadatek w podwójnej wysokości.</li>
                      </ul>
                    </details>
                    <details className="bp-rodo">
                      <summary>Informacja o przetwarzaniu danych osobowych (RODO)</summary>
                      <p>Administratorem Twoich danych jest {SHOP.legalName}, {SHOP.legalAddress}, NIP {SHOP.nip}, tel. {SHOP.phone}. Dane z formularza (imię i nazwisko, telefon, nazwa firmy, dane urządzenia i opis usterki) przetwarzamy, aby obsłużyć zgłoszenie, skontaktować się z Tobą (telefon, SMS) i wykonać naprawę — na podstawie art. 6 ust. 1 lit. b RODO (działania przed zawarciem umowy i jej wykonanie), a po jej wykonaniu także w celu rozliczeń podatkowych (lit. c) i ewentualnych roszczeń (lit. f).</p>
                      <p>Dane zgłoszenia, które nie zakończyło się naprawą, przechowujemy do 12 miesięcy. Dane związane z wykonaną naprawą — przez okres wymagany przepisami podatkowymi i do przedawnienia roszczeń. Odbiorcami danych mogą być dostawcy usług informatycznych, z których korzystamy (hosting i baza danych Google Firebase, wysyłka SMS), oraz biuro rachunkowe; dane mogą być przetwarzane poza EOG na podstawie standardowych klauzul umownych.</p>
                      <p>Masz prawo dostępu do danych, ich sprostowania, usunięcia lub ograniczenia przetwarzania, sprzeciwu oraz skargi do Prezesa UODO. Podanie danych jest dobrowolne, ale bez nich nie obsłużymy zgłoszenia.</p>
                    </details>
                  </div>
                </div>
              )}

              {formError && <div className="ui-alert ui-alert-error bp-form-error" role="alert"><IconInfo size={18} /><div><strong>Nie udało się wysłać</strong>{formError}</div></div>}

              <div className="bp-actions">
                {step > 0 && <button type="button" className="ui-btn ui-btn-secondary" onClick={() => { setFormError(''); setStep(0); }} disabled={submitting}>Wstecz</button>}
                {step === 0 ? (
                  <button type="button" className="ui-btn ui-btn-primary bp-btn-main" onClick={next}>Dalej <IconArrow size={18} /></button>
                ) : (
                  <button type="submit" className="ui-btn ui-btn-primary bp-btn-main" disabled={submitting} aria-busy={submitting}>
                    {submitting ? <><span className="ui-spinner" aria-hidden="true" /> {progress || 'Wysyłam…'}</> : <>Wyślij zgłoszenie <IconArrow size={18} /></>}
                  </button>
                )}
              </div>
            </form>
          )}
        </div>

        <aside className="bp-aside" aria-label="Co dalej">
          <div className="ui-card ui-card-pad">
            <h2 className="ui-h3">Co stanie się dalej?</h2>
            <ol className="bp-next">
              <li><span><IconBox size={18} /></span><div><strong>SMS z potwierdzeniem</strong><p>Numer rezerwacji, termin i wstępna wycena.</p></div></li>
              <li><span><IconShield size={18} /></span><div><strong>Wycena przed naprawą</strong><p>Nie wykonujemy płatnych prac bez Twojej zgody.</p></div></li>
              <li><span><IconCheck size={18} /></span><div><strong>Status online</strong><p>Postęp naprawy sprawdzisz w każdej chwili.</p></div></li>
            </ol>
          </div>
          <div className="ui-card ui-card-pad bp-help">
            <h2 className="ui-h3">Wolisz zadzwonić?</h2>
            <p className="ui-text">Pon.–Sob. 9:00–21:00, niedziele handlowe 9:00–19:00.</p>
            <a href={SHOP.phoneHref} className="ui-btn ui-btn-secondary ui-btn-block"><IconCall size={18} /> {SHOP.phone}</a>
            <Link to="/status" className="ui-link">Masz już zlecenie? Sprawdź status <IconArrow size={16} /></Link>
          </div>
        </aside>
      </div>
    </main>
  );
}

// Dzisiejsza data w formacie YYYY-MM-DD (czas lokalny) — dolna granica terminu
function todayLocal() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
