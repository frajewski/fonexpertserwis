// ============================================================
//  DevicesPage.jsx – „Skup i sprzedaż” (/skup-i-sprzedaz): sprzedaż nowych i używanych
//  (gwarancja, testy) + skup z formularzem wyceny.
//  Zapytanie trafia do panelu admina (Wyceny skupu) przez
//  funkcję createBuybackRequestWeb – listy stanów/akcesoriów
//  muszą się zgadzać z białą listą na serwerze.
// ============================================================
import { useEffect, useRef, useState } from 'react';
import { createBuybackRequest, uploadBookingPhotos } from '../firebase/firestoreApi';
import SHOP from '../shop';
import {
  IconPhone, IconTablet, IconLaptop, IconWatch, IconDots, IconShield, IconCheck, IconArrow,
  IconImage, IconClose, IconSparkle, IconRecycle, IconCash, IconCall, IconSearch, IconTag,
} from '../layout/icons';
import './BookingPage.css';
import './DevicesPage.css';

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
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const prev = document.title;
    document.title = 'Skup i sprzedaż telefonów | Fonexpert Płońsk';
    if (window.location.hash === '#wycena') setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth' }), 80);
    return () => { document.title = prev; };
  }, []);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const brand = form.brand === OTHER ? form.brandOther.trim() : form.brand;
  const toggleAcc = (a) => setForm((f) => ({ ...f, accessories: f.accessories.includes(a) ? f.accessories.filter((x) => x !== a) : [...f.accessories, a] }));
  const addPhotos = (fileList) => {
    const files = Array.from(fileList || []).filter((f) => f.type.startsWith('image/') && f.size < 25 * 1024 * 1024);
    setPhotos((prev) => [...prev, ...files.map((file) => ({ file, url: URL.createObjectURL(file) }))].slice(0, 5));
  };
  const removePhoto = (i) => setPhotos((prev) => { URL.revokeObjectURL(prev[i].url); return prev.filter((_, k) => k !== i); });
  const scrollToForm = () => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  const handleSubmit = async (e) => {
    e.preventDefault();
    let msg = '';
    if (!brand || !form.model.trim()) msg = 'Podaj markę i model urządzenia.';
    else if (!form.condition) msg = 'Wybierz stan urządzenia.';
    else if (!form.name.trim() || !form.phone.trim()) msg = 'Podaj imię i numer telefonu — oddzwonimy z wyceną.';
    else if (!form.acceptPrivacy) msg = 'Zaznacz zgodę na przetwarzanie danych.';
    setError(msg);
    if (msg) return;
    setSubmitting(true);
    try {
      const photoPaths = await uploadBookingPhotos(photos.map((p) => p.file));
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
      setError(err.message || 'Nie udało się wysłać zapytania.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="dv">
      {/* HERO */}
      <section className="dv-hero">
        <div className="dv-wrap dv-hero-grid">
          <div>
            <p className="dv-kicker">Sprzedaż i skup</p>
            <h1 className="dv-title">Telefony <span className="dv-accent">nowe i używane</span> — sprawdzone, z gwarancją</h1>
            <p className="dv-sub">Sprzedajemy nowe i używane urządzenia, a Twój stary telefon możemy odkupić. Każdy sprzęt przed sprzedażą przechodzi u nas testy.</p>
            <div className="dv-hero-btns">
              <button type="button" className="bp-cta" onClick={scrollToForm}><IconCash size={22} /> Wyceń swój telefon <IconArrow size={20} /></button>
              <a href={SHOP.phoneHref} className="dv-ghost"><IconCall size={18} /> Zapytaj o dostępność</a>
            </div>
          </div>
          <ul className="dv-hero-stats" aria-label="Gwarancja">
            <li><strong>12–24</strong><span>mies. gwarancji<br />na nowe urządzenia</span></li>
            <li><strong>1–6</strong><span>mies. gwarancji<br />na używane urządzenia</span></li>
            <li><strong>100%</strong><span>urządzeń testowanych<br />przed sprzedażą</span></li>
          </ul>
        </div>
      </section>

      {/* OFERTA */}
      <section className="dv-wrap dv-offer">
        <article className="dv-card">
          <span className="dv-card-ic dv-ic-blue"><IconSparkle size={28} /></span>
          <h2>Nowe urządzenia</h2>
          <p className="dv-badge dv-badge-blue"><IconShield size={16} /> Gwarancja od 12 do 24 miesięcy</p>
          <p>Fabrycznie nowe telefony, tablety i akcesoria. Pomożemy dobrać model do Twoich potrzeb.</p>
        </article>
        <article className="dv-card">
          <span className="dv-card-ic dv-ic-green"><IconRecycle size={28} /></span>
          <h2>Używane urządzenia</h2>
          <p className="dv-badge dv-badge-green"><IconShield size={16} /> Gwarancja od 1 do 6 miesięcy</p>
          <p>Sprawdzone telefony w niższej cenie. Przed sprzedażą każdy egzemplarz testujemy, a o stanie wizualnym i kondycji baterii mówimy otwarcie.</p>
        </article>
        <article className="dv-card">
          <span className="dv-card-ic dv-ic-amber"><IconCash size={28} /></span>
          <h2>Skup telefonów</h2>
          <p className="dv-badge dv-badge-amber"><IconTag size={16} /> Bezpłatna wycena</p>
          <p>Odkupimy Twój telefon, tablet lub laptopa — także uszkodzony. Wyślij zapytanie poniżej, a odezwiemy się z propozycją ceny.</p>
        </article>
      </section>
      <p className="dv-wrap dv-note">Dokładny okres gwarancji zależy od urządzenia — podajemy go przy zakupie i na dokumencie sprzedaży.</p>

      {/* TESTY */}
      <section className="dv-wrap">
        <div className="dv-tests">
          <div className="dv-tests-head">
            <span className="dv-card-ic dv-ic-blue"><IconSearch size={28} /></span>
            <div>
              <h2>Każde urządzenie testujemy, zanim trafi do sprzedaży</h2>
              <p>Dzięki temu eliminujemy ewentualne problemy, zanim telefon trafi w Twoje ręce.</p>
            </div>
          </div>
          <ul className="dv-tests-list">
            {TESTS.map((t) => <li key={t}><span><IconCheck size={14} /></span>{t}</li>)}
          </ul>
        </div>
      </section>

      {/* JAK DZIAŁA SKUP */}
      <section className="dv-wrap dv-how">
        <h2 className="dv-h2">Jak sprzedać nam telefon?</h2>
        <ol className="dv-steps">
          <li><span>1</span><div><strong>Wyślij zapytanie</strong><p>Podaj model, stan i dodaj zdjęcia — zajmie to 2 minuty.</p></div></li>
          <li><span>2</span><div><strong>Otrzymasz wycenę</strong><p>Oddzwonimy lub wyślemy SMS z propozycją ceny.</p></div></li>
          <li><span>3</span><div><strong>Przynieś urządzenie</strong><p>Sprawdzimy je na miejscu i podpiszemy umowę kupna — weź dokument tożsamości.</p></div></li>
        </ol>
      </section>

      {/* FORMULARZ */}
      <section className="dv-wrap" ref={formRef} id="wycena" style={{ scrollMarginTop: 90 }}>
        <div className="bp-card dv-form-card">
          {done ? (
            <div className="bp-done">
              <span className="bp-done-icon"><IconCheck size={34} /></span>
              <h2>Zapytanie wysłane</h2>
              <p>Dziękujemy! Przejrzymy dane i zdjęcia, a następnie odezwiemy się telefonicznie lub SMS-em z wyceną.</p>
              <p>Pamiętaj: wycena z formularza jest wstępna — ostateczną cenę potwierdzamy po sprawdzeniu urządzenia na miejscu.</p>
              <button type="button" className="bp-btn bp-btn-ghost" onClick={() => { setDone(false); setForm(EMPTY); setPhotos([]); }}>Wyceń kolejne urządzenie</button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} noValidate>
              <h2 className="bp-card-title"><IconCash size={34} className="bp-blue" /> Bezpłatna wycena urządzenia</h2>
              <div className="bp-pane">

              <h3 className="bp-q">Rodzaj urządzenia</h3>
              <div className="bp-tiles dv-tiles-5">
                {DEVICE_TYPES.map(([t, Icon]) => (
                  <button key={t} type="button" className={`bp-tile bp-tile-sm ${form.deviceType === t ? 'bp-tile-on' : ''}`} aria-pressed={form.deviceType === t} onClick={() => setForm((f) => ({ ...f, deviceType: t, brand: '' }))}>
                    {form.deviceType === t && <span className="bp-tile-check"><IconCheck size={14} /></span>}
                    <Icon size={28} />
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
                  <input value={form.model} onChange={set('model')} placeholder="np. iPhone 13, Galaxy S23" />
                </label>
              </div>
              {form.brand === OTHER && (
                <label className="bp-field"><span>Jaka marka?</span><input value={form.brandOther} onChange={set('brandOther')} placeholder="Wpisz markę" /></label>
              )}
              <div className="bp-row">
                <label className="bp-field">
                  <span>Pamięć (opcjonalnie)</span>
                  <select value={form.storage} onChange={set('storage')}>
                    <option value="">Nie wiem / nie dotyczy</option>
                    {STORAGES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </label>
                <label className="bp-field">
                  <span>Kondycja baterii % (opcjonalnie)</span>
                  <input type="number" inputMode="numeric" min="1" max="100" value={form.batteryHealth} onChange={set('batteryHealth')} placeholder="np. 87" />
                </label>
              </div>

              <h3 className="bp-q">Stan urządzenia</h3>
              <div className="dv-conds" role="radiogroup" aria-label="Stan urządzenia">
                {CONDITIONS.map(([c, hint]) => (
                  <button key={c} type="button" role="radio" aria-checked={form.condition === c} className={`dv-cond ${form.condition === c ? 'dv-cond-on' : ''}`} onClick={() => setForm((f) => ({ ...f, condition: c }))}>
                    <span className="dv-radio" />
                    <span><strong>{c}</strong><small>{hint}</small></span>
                  </button>
                ))}
              </div>

              <h3 className="bp-q">W zestawie (opcjonalnie)</h3>
              <div className="dv-chips">
                {ACCESSORIES.map((a) => (
                  <button key={a} type="button" aria-pressed={form.accessories.includes(a)} className={`dv-chip ${form.accessories.includes(a) ? 'dv-chip-on' : ''}`} onClick={() => toggleAcc(a)}>
                    {form.accessories.includes(a) && <IconCheck size={14} />}{a}
                  </button>
                ))}
              </div>

              <label className="bp-field">
                <span>Dodatkowe informacje (opcjonalnie)</span>
                <textarea rows={3} value={form.description} onChange={set('description')} placeholder="Np. wymieniana bateria, rysa na tylnej szybce, brak blokady operatora" />
              </label>

              <div className="bp-field">
                <span>Zdjęcia urządzenia (opcjonalnie, do 5) — przód, tył, ramki</span>
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

              <h3 className="bp-q">Twoje dane</h3>
              <div className="bp-row">
                <label className="bp-field"><span>Imię</span><input value={form.name} onChange={set('name')} placeholder="Jan" autoComplete="name" /></label>
                <label className="bp-field"><span>Telefon</span><input type="tel" value={form.phone} onChange={set('phone')} placeholder="500 000 000" autoComplete="tel" /></label>
              </div>

              <details className="bp-rodo">
                <summary>Informacja o przetwarzaniu danych osobowych (RODO)</summary>
                <p>Administratorem Twoich danych jest Fonexpert Filip Rajewski, Bogusławice 29A, 09-100 Płońsk, NIP 5671935602, tel. {SHOP.phone}. Dane z formularza (imię, telefon, dane i zdjęcia urządzenia) przetwarzamy, aby przygotować wycenę i skontaktować się z Tobą (telefon, SMS) — na podstawie art. 6 ust. 1 lit. b RODO (działania przed zawarciem umowy).</p>
                <p>Dane zapytania, które nie zakończyło się zakupem, przechowujemy do 12 miesięcy. Odbiorcami danych mogą być dostawcy usług informatycznych (hosting i baza danych Google Firebase, wysyłka SMS); dane mogą być przetwarzane poza EOG na podstawie standardowych klauzul umownych. Masz prawo dostępu do danych, ich sprostowania, usunięcia lub ograniczenia przetwarzania, sprzeciwu oraz skargi do Prezesa UODO. Podanie danych jest dobrowolne, ale bez nich nie przygotujemy wyceny.</p>
              </details>
              <label className="bp-accept">
                <input type="checkbox" checked={form.acceptPrivacy} onChange={(e) => setForm((f) => ({ ...f, acceptPrivacy: e.target.checked }))} />
                <span>Zapoznałem/am się z informacją o przetwarzaniu danych i chcę otrzymać wycenę.</span>
              </label>

              </div>
              {error && <div className="bp-error" role="alert">{error}</div>}
              <div className="bp-actions">
                <button type="submit" className="bp-btn bp-btn-primary bp-btn-wide" disabled={submitting}>{submitting ? 'Wysyłam…' : 'Wyślij do wyceny'} {!submitting && <IconArrow size={18} />}</button>
              </div>
              <p className="dv-fine">Wycena z formularza jest wstępna i niewiążąca — ostateczną cenę ustalamy po sprawdzeniu urządzenia.</p>
            </form>
          )}
        </div>
      </section>
    </main>
  );
}
