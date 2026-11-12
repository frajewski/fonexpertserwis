// ============================================================
//  DevicesPage.jsx – „Skup i sprzedaż” (/skup-i-sprzedaz): sprzedaż nowych i używanych
//  (gwarancja, testy) + skup z formularzem wyceny.
//  Zapytanie trafia do panelu admina (Wyceny skupu) przez
//  funkcję createBuybackRequestWeb – listy stanów/akcesoriów
//  muszą się zgadzać z białą listą na serwerze.
// ============================================================
import { useEffect, useRef, useState } from 'react';
import friendlyError, { isValidPlPhone } from '../utils/friendlyError';
import { Link } from 'react-router-dom';
import SHOP from '../shop';
import {
  IconPhone, IconTablet, IconLaptop, IconWatch, IconDots, IconShield, IconCheck, IconArrow,
  IconImage, IconClose, IconSparkle, IconRecycle, IconCash, IconCall, IconSearch, IconTag, IconInfo, IconChevron,
} from '../layout/icons';
import './BookingPage.css';
import { modelsFor } from '../data/models';
import './DevicesPage.css';
import PhoneOffer from '../components/PhoneOffer';
import { usePageMeta } from '../utils/seo';

const DEVICE_TYPES = [
  ['Smartfon', IconPhone], ['Tablet', IconTablet], ['Laptop', IconLaptop], ['Smartwatch', IconWatch], ['Inne', IconDots],
];
const BRANDS = {
  Smartfon: ['Apple', 'Samsung', 'Xiaomi', 'Motorola', 'Google', 'OnePlus', 'Huawei', 'Oppo', 'Realme', 'Honor', 'Nothing', 'Sony'],
  Tablet: ['Apple', 'Samsung', 'Lenovo', 'Xiaomi', 'Huawei'],
  Laptop: ['Apple', 'Lenovo', 'HP', 'Dell', 'Asus', 'Acer', 'MSI'],
  Smartwatch: ['Apple', 'Samsung', 'Garmin', 'Huawei', 'Xiaomi'],
  Inne: [],
};
const OTHER = '__inna__';
const STORAGES = ['64 GB', '128 GB', '256 GB', '512 GB', '1 TB'];
export const CONDITIONS = [
  ['Jak nowy', 'Brak śladów użytkowania, wszystko działa.'],
  ['Bardzo dobry', 'Pojedyncze mikrorysy widoczne pod światło.'],
  ['Dobry', 'Drobne rysy lub otarcia, wszystko działa.'],
  ['Widoczne ślady użytkowania', 'Wyraźne rysy, obicia ramki.'],
  ['Uszkodzony', 'Pęknięcia, niedziałające funkcje, zalanie.'],
];
export const ACCESSORIES = ['Pudełko', 'Ładowarka / kabel', 'Dowód zakupu', 'Etui / szkło'];

const TESTS = [
  'Ekran, dotyk i podświetlenie',
  'Kondycja i ładowanie baterii',
  'Aparaty, latarka i czujniki',
  'Głośniki, mikrofony, wibracje',
  'Sieć, Wi-Fi, Bluetooth, NFC',
  'Przyciski, Face ID / odcisk palca',
  'Blokady konta (iCloud / Google) i IMEI',
  'Reset do ustawień fabrycznych',
];

const EMPTY = {
  deviceType: 'Smartfon', brand: '', brandOther: '', model: '', storage: '', condition: '',
  batteryHealth: '', accessories: [], description: '', name: '', phone: '', acceptPrivacy: false,
};

export default function DevicesPage() {
  const formRef = useRef(null);
  const [form, setForm] = useState(EMPTY);
  const [photos, setPhotos] = useState([]);
  const [showDetails, setShowDetails] = useState(false);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [progress, setProgress] = useState('');
  const [done, setDone] = useState(false);

  usePageMeta({ title: 'Skup i sprzedaż telefonów', description: 'Nowe telefony z gwarancją 12–24 mies., używane z gwarancją 1–6 mies., każdy testowany. Skup telefonów z bezpłatną wyceną online. Fonexpert Płońsk.', path: '/skup-i-sprzedaz' });
  useEffect(() => {
    if (window.location.hash === '#wycena') setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth' }), 80);
  }, []);

  const setField = (key) => (e) => {
    const value = e.target.value;
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key]) setErrors((x) => ({ ...x, [key]: '' }));
  };
  const brand = form.brand === OTHER ? form.brandOther.trim() : form.brand;
  const toggleAcc = (a) => setForm((f) => ({ ...f, accessories: f.accessories.includes(a) ? f.accessories.filter((x) => x !== a) : [...f.accessories, a] }));
  const addPhotos = (fileList) => {
    const files = Array.from(fileList || []).filter((f) => f.type.startsWith('image/') && f.size < 25 * 1024 * 1024);
    setPhotos((prev) => [...prev, ...files.map((file) => ({ file, url: URL.createObjectURL(file) }))].slice(0, 5));
  };
  const removePhoto = (i) => setPhotos((prev) => { URL.revokeObjectURL(prev[i].url); return prev.filter((_, k) => k !== i); });
  const scrollToForm = () => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  const validate = () => {
    const e = {};
    if (!brand) e.brand = form.brand === OTHER ? 'Wpisz markę.' : 'Wybierz markę.';
    if (!form.model.trim()) e.model = 'Wpisz model, np. iPhone 13.';
    if (!form.condition) e.condition = 'Wybierz stan urządzenia.';
    if (!form.name.trim()) e.name = 'Podaj imię.';
    if (!form.phone.trim()) e.phone = 'Podaj numer telefonu — oddzwonimy z wyceną.';
    else if (!isValidPlPhone(form.phone)) e.phone = 'Numer telefonu powinien mieć 9 cyfr.';
    if (form.batteryHealth && (Number(form.batteryHealth) < 1 || Number(form.batteryHealth) > 100)) e.batteryHealth = 'Podaj wartość od 1 do 100.';
    if (!form.acceptPrivacy) e.acceptPrivacy = 'Zaznacz zgodę, żeby wysłać zapytanie.';
    return e;
  };

  const handleSubmit = async (ev) => {
    ev.preventDefault();
    const e = validate();
    setErrors(e);
    setFormError('');
    if (Object.keys(e).length) {
      const first = Object.keys(e)[0];
      if (first === 'batteryHealth') setShowDetails(true);
      setTimeout(() => {
        const el = formRef.current?.querySelector(`[data-field="${first}"]`);
        el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el?.querySelector('input, select, textarea, button')?.focus({ preventScroll: true });
      }, 30);
      return;
    }
    setSubmitting(true);
    try {
      // Firebase dopiero przy wysyłce – strona Skup i sprzedaż ładuje się szybciej
      const { createBuybackRequest, uploadBookingPhotos } = await import('../firebase/firestoreApi');
      let photoPaths = [];
      if (photos.length) {
        setProgress(`Wysyłam zdjęcia (${photos.length})…`);
        photoPaths = await uploadBookingPhotos(photos.map((p) => p.file));
      }
      setProgress('Wysyłam zapytanie…');
      await createBuybackRequest({
        photoPaths,
        deviceType: form.deviceType, brand, model: form.model, storage: form.storage,
        condition: form.condition, batteryHealth: form.batteryHealth, accessories: form.accessories,
        description: form.description, name: form.name, phone: form.phone, acceptPrivacy: form.acceptPrivacy,
      });
      setDone(true);
      scrollToForm();
    } catch (err) {
      console.error('Błąd wysyłania wyceny:', err);
      setFormError(friendlyError(err, 'Nie udało się wysłać zapytania. Spróbuj ponownie albo zadzwoń.'));
    } finally {
      setSubmitting(false);
      setProgress('');
    }
  };

  const reset = () => { photos.forEach((p) => URL.revokeObjectURL(p.url)); setPhotos([]); setForm((f) => ({ ...EMPTY, name: f.name, phone: f.phone })); setDone(false); setErrors({}); };

  return (
    <main className="dv">
      {/* HERO */}
      <section className="ui-hero">
        <div className="ui-wrap ui-hero-inner dv-hero-grid">
          <div>
            <p className="ui-eyebrow">Skup i sprzedaż</p>
            <h1 className="ui-h1">Telefony <span className="ui-accent">nowe i używane</span> — sprawdzone, z gwarancją</h1>
            <p className="ui-lead">Sprzedajemy nowe i używane urządzenia, a Twój stary telefon możemy odkupić. Każdy sprzęt przed sprzedażą przechodzi u nas testy.</p>
            <div className="ui-btn-row dv-hero-btns">
              <button type="button" className="ui-btn ui-btn-cta ui-btn-lg" onClick={scrollToForm}><IconCash size={20} /> Wyceń swój telefon <IconArrow size={18} /></button>
              <a href="#oferta" className="ui-btn ui-btn-light ui-btn-lg"><IconPhone size={18} /> Zobacz dostępne telefony</a>
            </div>
          </div>
          <ul className="dv-hero-stats" aria-label="Gwarancja">
            <li><strong>12–24</strong><span>mies. gwarancji<br />na nowe urządzenia</span></li>
            <li><strong>1–6</strong><span>mies. gwarancji<br />na używane urządzenia</span></li>
            <li><strong>100%</strong><span>urządzeń testowanych<br />przed sprzedażą</span></li>
          </ul>
        </div>
      </section>

      {/* DOSTĘPNE TERAZ – telefony z magazynu oznaczone „Pokaż na stronie” */}
      <PhoneOffer />

      {/* OFERTA */}
      <section className="ui-section-tight">
        <div className="ui-wrap">
          <div className="ui-grid ui-grid-3">
            <article className="ui-card ui-card-pad dv-card">
              <span className="ui-icon-tile"><IconSparkle size={24} /></span>
              <h2 className="ui-h3">Nowe urządzenia</h2>
              <p className="ui-badge"><IconShield size={15} /> Gwarancja 12–24 miesiące</p>
              <p className="ui-text">Fabrycznie nowe telefony, tablety i akcesoria. Pomożemy dobrać model do Twoich potrzeb.</p>
            </article>
            <article className="ui-card ui-card-pad dv-card">
              <span className="ui-icon-tile ui-icon-tile-green"><IconRecycle size={24} /></span>
              <h2 className="ui-h3">Używane urządzenia</h2>
              <p className="ui-badge ui-badge-green"><IconShield size={15} /> Gwarancja 1–6 miesięcy</p>
              <p className="ui-text">Sprawdzone telefony w niższej cenie. Przed sprzedażą każdy egzemplarz testujemy, a o stanie wizualnym i kondycji baterii mówimy otwarcie.</p>
            </article>
            <article className="ui-card ui-card-pad dv-card">
              <span className="ui-icon-tile ui-icon-tile-amber"><IconCash size={24} /></span>
              <h2 className="ui-h3">Skup telefonów</h2>
              <p className="ui-badge dv-badge-amber"><IconTag size={15} /> Bezpłatna wycena</p>
              <p className="ui-text">Odkupimy Twój telefon, tablet lub laptopa — także uszkodzony. Wyślij zapytanie, a odezwiemy się z propozycją ceny.</p>
            </article>
          </div>
          <p className="dv-note">Dokładny okres gwarancji zależy od urządzenia — podajemy go przy zakupie i na dokumencie sprzedaży.</p>
        </div>
      </section>

      {/* TESTY */}
      <section className="ui-section-tight dv-tests-sec">
        <div className="ui-wrap">
          <div className="ui-card ui-card-pad dv-tests">
            <div className="dv-tests-head">
              <span className="ui-icon-tile"><IconSearch size={24} /></span>
              <div>
                <h2 className="ui-h3">Każde urządzenie testujemy, zanim trafi do sprzedaży</h2>
                <p className="ui-text">Dzięki temu eliminujemy ewentualne problemy, zanim telefon trafi w Twoje ręce.</p>
              </div>
            </div>
            <ul className="dv-tests-list">
              {TESTS.map((t) => <li key={t}><span><IconCheck size={13} /></span>{t}</li>)}
            </ul>
          </div>
        </div>
      </section>

      {/* SKUP: kroki + formularz */}
      <section className="ui-section" id="wycena" ref={formRef} style={{ scrollMarginTop: 80 }}>
        <div className="ui-wrap dv-buy">
          <div className="dv-buy-intro">
            <p className="ui-eyebrow">Skup telefonów</p>
            <h2 className="ui-h2">Sprzedaj nam telefon w 3 krokach</h2>
            <ol className="dv-steps">
              <li><span>1</span><div><strong>Wyślij zapytanie</strong><p>Model i stan wystarczą — zdjęcia możesz dodać, jeśli chcesz.</p></div></li>
              <li><span>2</span><div><strong>Otrzymasz wycenę</strong><p>Oddzwonimy lub wyślemy SMS z propozycją ceny.</p></div></li>
              <li><span>3</span><div><strong>Przynieś urządzenie</strong><p>Sprawdzimy je na miejscu i podpiszemy umowę kupna — weź dokument tożsamości.</p></div></li>
            </ol>
            <p className="dv-fine"><IconInfo size={16} /> Wycena z formularza jest wstępna i niewiążąca — ostateczną cenę ustalamy po sprawdzeniu urządzenia.</p>
          </div>

          <div className="ui-card bp-card dv-form-card">
            {done ? (
              <div className="ui-success">
                <span className="ui-success-icon"><IconCheck size={34} /></span>
                <h2>Zapytanie wysłane</h2>
                <p>{[brand, form.model, form.storage].filter(Boolean).join(' ')} — {form.condition.toLowerCase()}</p>
                <ol className="ui-next">
                  <li><span>1</span>Przejrzymy dane{photos.length ? ' i zdjęcia' : ''} i odezwiemy się telefonicznie lub SMS-em na numer {form.phone}.</li>
                  <li><span>2</span>Jeśli cena Ci odpowiada, przynieś urządzenie i dokument tożsamości do {SHOP.addressLine1}.</li>
                </ol>
                <div className="ui-btn-row">
                  <Link to="/" className="ui-btn ui-btn-secondary">Strona główna</Link>
                  <button type="button" className="ui-btn ui-btn-primary" onClick={reset}>Wyceń kolejne urządzenie</button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} noValidate className="bp-pane">
                <h3 className="dv-form-title"><IconCash size={26} /> Bezpłatna wycena</h3>

                <fieldset className="bp-group">
                  <legend className="bp-q">Rodzaj urządzenia</legend>
                  <div className="bp-types dv-types">
                    {DEVICE_TYPES.map(([t, Icon]) => (
                      <button key={t} type="button" className={`bp-type ${form.deviceType === t ? 'bp-type-on' : ''}`} aria-pressed={form.deviceType === t} onClick={() => setForm((f) => ({ ...f, deviceType: t, brand: '' }))}>
                        <Icon size={20} /> {t}
                      </button>
                    ))}
                  </div>
                </fieldset>

                <div className="bp-row">
                  <div className={`ui-field ${errors.brand ? 'ui-field-error' : ''}`} data-field="brand">
                    <label className="ui-label" htmlFor="dv-brand">Marka</label>
                    {form.brand === OTHER ? (
                      <div className="bp-other">
                        <input id="dv-brand" className="ui-input" value={form.brandOther} onChange={setField('brandOther')} placeholder="Wpisz markę" autoFocus onInput={() => errors.brand && setErrors((x) => ({ ...x, brand: '' }))} />
                        <button type="button" className="ui-btn ui-btn-secondary ui-btn-sm" onClick={() => setForm((f) => ({ ...f, brand: '', brandOther: '' }))}>Lista</button>
                      </div>
                    ) : (
                      <select id="dv-brand" className="ui-select" value={form.brand} onChange={setField('brand')}>
                        <option value="">Wybierz markę</option>
                        {BRANDS[form.deviceType].map((b) => <option key={b} value={b}>{b}</option>)}
                        <option value={OTHER}>Inna…</option>
                      </select>
                    )}
                    {errors.brand && <span className="ui-field-msg">{errors.brand}</span>}
                  </div>
                  <div className={`ui-field ${errors.model ? 'ui-field-error' : ''}`} data-field="model">
                    <label className="ui-label" htmlFor="dv-model">Model</label>
                    <input id="dv-model" className="ui-input" list="dv-models" value={form.model} onChange={setField('model')} placeholder="np. iPhone 13, Galaxy S23" autoComplete="off" />
                    <datalist id="dv-models">{modelsFor(brand).map((m) => <option key={m} value={m} />)}</datalist>
                    {errors.model && <span className="ui-field-msg">{errors.model}</span>}
                  </div>
                </div>

                <fieldset className="bp-group" data-field="condition">
                  <legend className="bp-q">Stan urządzenia</legend>
                  <div className={`dv-conds ${errors.condition ? 'dv-conds-error' : ''}`} role="radiogroup" aria-label="Stan urządzenia">
                    {CONDITIONS.map(([c, hint]) => (
                      <button key={c} type="button" role="radio" aria-checked={form.condition === c} className={`dv-cond ${form.condition === c ? 'dv-cond-on' : ''}`}
                        onClick={() => { setForm((f) => ({ ...f, condition: c })); setErrors((x) => ({ ...x, condition: '' })); }}>
                        <span className="dv-radio" />
                        <span><strong>{c}</strong><small>{hint}</small></span>
                      </button>
                    ))}
                  </div>
                  {errors.condition && <span className="ui-field-msg">{errors.condition}</span>}
                </fieldset>

                <div className="bp-row">
                  <div className={`ui-field ${errors.name ? 'ui-field-error' : ''}`} data-field="name">
                    <label className="ui-label" htmlFor="dv-name">Imię</label>
                    <input id="dv-name" className="ui-input" value={form.name} onChange={setField('name')} placeholder="Jan" autoComplete="given-name" />
                    {errors.name && <span className="ui-field-msg">{errors.name}</span>}
                  </div>
                  <div className={`ui-field ${errors.phone ? 'ui-field-error' : ''}`} data-field="phone">
                    <label className="ui-label" htmlFor="dv-phone">Telefon</label>
                    <input id="dv-phone" className="ui-input" type="tel" inputMode="tel" value={form.phone} onChange={setField('phone')} placeholder="500 000 000" autoComplete="tel" />
                    {errors.phone && <span className="ui-field-msg">{errors.phone}</span>}
                  </div>
                </div>

                <div className={`bp-more ${showDetails ? 'bp-more-open' : ''}`}>
                  <button type="button" className="bp-more-toggle" aria-expanded={showDetails} onClick={() => setShowDetails((v) => !v)}>
                    <span><strong>Dodaj szczegóły</strong> <small>pamięć, bateria, zestaw, zdjęcia — dokładniejsza wycena</small></span>
                    {photos.length > 0 && <span className="ui-badge">{photos.length} zdj.</span>}
                    <IconChevron size={18} className="bp-more-chev" />
                  </button>
                  {showDetails && (
                    <div className="bp-more-body">
                      <div className="bp-row">
                        <div className="ui-field">
                          <label className="ui-label" htmlFor="dv-storage">Pamięć</label>
                          <select id="dv-storage" className="ui-select" value={form.storage} onChange={setField('storage')}>
                            <option value="">Nie wiem / nie dotyczy</option>
                            {STORAGES.map((x) => <option key={x} value={x}>{x}</option>)}
                          </select>
                        </div>
                        <div className={`ui-field ${errors.batteryHealth ? 'ui-field-error' : ''}`} data-field="batteryHealth">
                          <label className="ui-label" htmlFor="dv-bat">Kondycja baterii (%)</label>
                          <input id="dv-bat" className="ui-input" type="number" inputMode="numeric" min="1" max="100" value={form.batteryHealth} onChange={setField('batteryHealth')} placeholder="np. 87" />
                          {errors.batteryHealth ? <span className="ui-field-msg">{errors.batteryHealth}</span> : <span className="ui-hint">iPhone: Ustawienia → Bateria → Kondycja.</span>}
                        </div>
                      </div>
                      <div className="ui-field">
                        <span className="ui-label">W zestawie</span>
                        <div className="dv-chips">
                          {ACCESSORIES.map((a) => (
                            <button key={a} type="button" aria-pressed={form.accessories.includes(a)} className={`dv-chip ${form.accessories.includes(a) ? 'dv-chip-on' : ''}`} onClick={() => toggleAcc(a)}>
                              {form.accessories.includes(a) && <IconCheck size={14} />}{a}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="ui-field">
                        <label className="ui-label" htmlFor="dv-desc">Dodatkowe informacje</label>
                        <textarea id="dv-desc" className="ui-textarea" rows={3} value={form.description} onChange={setField('description')} placeholder="Np. wymieniana bateria, rysa na tylnej szybce, brak blokady operatora" />
                      </div>
                      <div className="ui-field">
                        <span className="ui-label">Zdjęcia <small>(do 5) — przód, tył, ramki</small></span>
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
                    </div>
                  )}
                </div>

                <div className={`bp-terms ${errors.acceptPrivacy ? 'bp-terms-error' : ''}`} data-field="acceptPrivacy">
                  <label className="bp-accept">
                    <input type="checkbox" checked={form.acceptPrivacy} onChange={(e) => { setForm((f) => ({ ...f, acceptPrivacy: e.target.checked })); setErrors((x) => ({ ...x, acceptPrivacy: '' })); }} />
                    <span>Zapoznałem/am się z informacją o przetwarzaniu danych i chcę otrzymać wycenę.</span>
                  </label>
                  {errors.acceptPrivacy && <span className="ui-field-msg">{errors.acceptPrivacy}</span>}
                  <p className="bp-doclinks"><Link to="/polityka-prywatnosci" target="_blank">Polityka prywatności</Link></p>
                  <details className="bp-rodo">
                    <summary>Informacja o przetwarzaniu danych osobowych (RODO)</summary>
                    <p>Administratorem Twoich danych jest {SHOP.legalName}, {SHOP.legalAddress}, NIP {SHOP.nip}, tel. {SHOP.phone}. Dane z formularza (imię, telefon, dane i zdjęcia urządzenia) przetwarzamy, aby przygotować wycenę i skontaktować się z Tobą (telefon, SMS) — na podstawie art. 6 ust. 1 lit. b RODO (działania przed zawarciem umowy).</p>
                    <p>Dane zapytania, które nie zakończyło się zakupem, przechowujemy do 12 miesięcy. Odbiorcami danych mogą być dostawcy usług informatycznych (hosting i baza danych Google Firebase, wysyłka SMS); dane mogą być przetwarzane poza EOG na podstawie standardowych klauzul umownych. Masz prawo dostępu do danych, ich sprostowania, usunięcia lub ograniczenia przetwarzania, sprzeciwu oraz skargi do Prezesa UODO. Podanie danych jest dobrowolne, ale bez nich nie przygotujemy wyceny.</p>
                  </details>
                </div>

                {formError && <div className="ui-alert ui-alert-error" role="alert"><IconInfo size={18} /><div><strong>Nie udało się wysłać</strong>{formError}</div></div>}

                <div className="bp-actions dv-actions">
                  <button type="submit" className="ui-btn ui-btn-primary bp-btn-main" disabled={submitting} aria-busy={submitting}>
                    {submitting ? <><span className="ui-spinner" aria-hidden="true" /> {progress || 'Wysyłam…'}</> : <>Wyślij do wyceny <IconArrow size={18} /></>}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
