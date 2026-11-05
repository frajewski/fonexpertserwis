// ============================================================
//  HomePage.jsx – strona główna panelu klienta
//  Hero (zgłoszenie + szybkie sprawdzenie statusu) → usługi →
//  najczęstsze naprawy → jak to działa → dlaczego my → FAQ → kontakt.
//  Formularz zgłoszenia żyje na /umow-naprawe (BookingPage).
// ============================================================
import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import SHOP from '../shop';
import FAQ_GROUPS from '../data/faq';
import StatusLookupForm from '../components/StatusLookupForm';
import {
  IconWrench, IconArrow, IconCall, IconShield, IconTimer, IconBox, IconAward, IconCheck,
  IconCrack, IconBattery, IconPlug, IconBack, IconDrop, IconPower, IconCamera, IconSpeaker, IconSearch,
  IconTablet, IconCash, IconSparkle, IconPin, IconClock, IconRoute, IconPhone,
} from '../layout/icons';
import './HomePage.css';

// Klucze = usterki z formularza (BOOKING_ISSUES) – link otwiera formularz z zaznaczoną usterką
const POPULAR = [
  ['Zbity ekran / wyświetlacz', 'Wymiana ekranu', 'Pęknięta szyba, plamy, brak dotyku', IconCrack],
  ['Bateria', 'Wymiana baterii', 'Szybko się rozładowuje lub puchnie', IconBattery],
  ['Gniazdo ładowania', 'Gniazdo ładowania', 'Nie ładuje albo ładuje „pod kątem”', IconPlug],
  ['Tylna szybka / obudowa', 'Tylna szybka', 'Pęknięte plecki, obicia obudowy', IconBack],
  ['Zalanie', 'Zalanie', 'Kontakt z wodą lub innym płynem', IconDrop],
  ['Nie włącza się', 'Nie włącza się', 'Czarny ekran, brak reakcji', IconPower],
  ['Aparat', 'Aparat', 'Rozmyte zdjęcia, pęknięte oczko', IconCamera],
  ['Głośnik / mikrofon', 'Głośnik i mikrofon', 'Nie słychać rozmówcy lub Ciebie', IconSpeaker],
];

const FAQ_TEASER = FAQ_GROUPS.flatMap((g) => g.items).filter(([q]) => [
  'Ile będzie kosztowała naprawa?',
  'Jak długo trwa naprawa telefonu?',
  'Czy stracę zdjęcia, kontakty i inne dane?',
  'Czy używacie oryginalnych części?',
].includes(q));

const MAP_ROUTE = `https://www.google.com/maps/dir/?api=1&destination=${SHOP.mapsLat},${SHOP.mapsLng}`;

export default function HomePage() {
  useEffect(() => { document.title = 'Fonexpert Płońsk — naprawa, skup i sprzedaż telefonów'; }, []);

  return (
    <main className="hp">
      {/* ===== HERO ===== */}
      <section className="hp-hero">
        <div className="ui-wrap hp-hero-grid">
          <div className="hp-hero-copy">
            <p className="ui-eyebrow">Serwis GSM · Płońsk, Pasaż Kaufland</p>
            <h1 className="ui-h1">Szybka i wygodna naprawa Twojego <span className="ui-accent">telefonu</span></h1>
            <p className="ui-lead">Zgłoś usterkę online w 2 minuty. Oddzwonimy z wyceną, a o każdym etapie naprawy poinformujemy Cię SMS-em.</p>
            <div className="ui-btn-row hp-hero-btns">
              <Link to="/umow-naprawe" className="ui-btn ui-btn-cta ui-btn-lg"><IconWrench size={20} /> Zgłoś naprawę online <IconArrow size={18} /></Link>
              <a href={SHOP.phoneHref} className="ui-btn ui-btn-light ui-btn-lg"><IconCall size={18} /> {SHOP.phone}</a>
            </div>
            <ul className="hp-trust" aria-label="Najważniejsze informacje">
              <li><IconShield size={18} /> Wycena przed naprawą</li>
              <li><IconBox size={18} /> Powiadomienia SMS</li>
              <li><IconClock size={18} /> Pon.–Sob. 9:00–21:00</li>
            </ul>
          </div>
          <div className="hp-hero-side">
            <StatusLookupForm variant="glass" title="Masz już zlecenie?" />
          </div>
        </div>
      </section>

      {/* ===== USŁUGI ===== */}
      <section className="ui-section-tight hp-services-wrap">
        <div className="ui-wrap">
          <div className="ui-grid ui-grid-4 hp-services">
            <Link to="/umow-naprawe" className="ui-card ui-card-pad ui-card-link">
              <span className="ui-icon-tile"><IconPhone size={24} /></span>
              <h2 className="ui-h3">Naprawa telefonów</h2>
              <p className="ui-text">Ekrany, baterie, gniazda, aparaty i zalania — głównie na oryginalnych częściach.</p>
              <span className="ui-link">Zgłoś naprawę <IconArrow size={16} /></span>
            </Link>
            <Link to="/umow-naprawe?typ=Tablet" className="ui-card ui-card-pad ui-card-link">
              <span className="ui-icon-tile"><IconTablet size={24} /></span>
              <h2 className="ui-h3">Tablety i laptopy</h2>
              <p className="ui-text">Diagnoza i naprawa tabletów oraz laptopów — także gdy nie wiesz, co się zepsuło.</p>
              <span className="ui-link">Zgłoś urządzenie <IconArrow size={16} /></span>
            </Link>
            <Link to="/skup-i-sprzedaz#wycena" className="ui-card ui-card-pad ui-card-link">
              <span className="ui-icon-tile ui-icon-tile-amber"><IconCash size={24} /></span>
              <h2 className="ui-h3">Skup telefonów</h2>
              <p className="ui-text">Bezpłatna wycena online. Umowę kupna podpisujemy na miejscu w salonie.</p>
              <span className="ui-link">Wyceń telefon <IconArrow size={16} /></span>
            </Link>
            <Link to="/skup-i-sprzedaz" className="ui-card ui-card-pad ui-card-link">
              <span className="ui-icon-tile ui-icon-tile-green"><IconSparkle size={24} /></span>
              <h2 className="ui-h3">Sprzedaż z gwarancją</h2>
              <p className="ui-text">Nowe urządzenia z gwarancją 12–24 mies., używane 1–6 mies. Każde testujemy.</p>
              <span className="ui-link">Zobacz ofertę <IconArrow size={16} /></span>
            </Link>
          </div>
        </div>
      </section>

      {/* ===== NAJCZĘSTSZE NAPRAWY ===== */}
      <section className="ui-section hp-popular">
        <div className="ui-wrap">
          <div className="ui-section-head">
            <div>
              <p className="ui-eyebrow">Najczęstsze naprawy</p>
              <h2 className="ui-h2">Co dolega Twojemu telefonowi?</h2>
              <p className="ui-lead">Wybierz usterkę — formularz otworzy się z nią od razu zaznaczoną.</p>
            </div>
            <Link to="/umow-naprawe?usterka=diagnoza" className="ui-btn ui-btn-secondary"><IconSearch size={18} /> Nie wiem, co się zepsuło</Link>
          </div>
          <div className="hp-issues">
            {POPULAR.map(([key, title, hint, Icon]) => (
              <Link key={key} to={`/umow-naprawe?usterka=${encodeURIComponent(key)}`} className="hp-issue">
                <span className="ui-icon-tile"><Icon size={24} /></span>
                <span className="hp-issue-text"><strong>{title}</strong><small>{hint}</small></span>
                <IconArrow size={18} className="hp-issue-arrow" />
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ===== JAK TO DZIAŁA ===== */}
      <section className="ui-section ui-section-alt">
        <div className="ui-wrap hp-how">
          <div className="hp-how-intro">
            <p className="ui-eyebrow">Jak to działa</p>
            <h2 className="ui-h2">Od zgłoszenia do odbioru w 3 krokach</h2>
            <p className="ui-lead">Bez kolejek i dzwonienia z pytaniem „czy już gotowe?”. Status naprawy sprawdzisz w każdej chwili online.</p>
            <Link to="/umow-naprawe" className="ui-btn ui-btn-primary hp-how-btn">Zgłoś naprawę <IconArrow size={18} /></Link>
          </div>
          <ol className="hp-steps">
            <li><span>1</span><div><strong>Zgłoś usterkę online</strong><p>Wybierz urządzenie i problem, dodaj zdjęcia. Zajmie Ci to około 2 minut.</p></div></li>
            <li><span>2</span><div><strong>Otrzymasz wycenę i termin</strong><p>Odpiszemy SMS-em z numerem rezerwacji, terminem i wstępną ceną. Nic nie naprawiamy bez Twojej zgody.</p></div></li>
            <li><span>3</span><div><strong>Naprawa i odbiór</strong><p>Postęp śledzisz online, a gdy telefon będzie gotowy — dostaniesz SMS.</p></div></li>
          </ol>
        </div>
      </section>

      {/* ===== DLACZEGO MY ===== */}
      <section className="ui-section">
        <div className="ui-wrap">
          <div className="ui-section-head ui-section-head-center">
            <p className="ui-eyebrow">Dlaczego Fonexpert</p>
            <h2 className="ui-h2">Serwis, któremu możesz zostawić telefon</h2>
          </div>
          <ul className="ui-grid ui-grid-4 hp-why">
            <li><span className="ui-icon-tile"><IconTimer size={24} /></span><strong>Szybkie zgłoszenie</strong><p className="ui-text">Formularz online zamiast dzwonienia i czekania w kolejce.</p></li>
            <li><span className="ui-icon-tile ui-icon-tile-green"><IconShield size={24} /></span><strong>Wycena przed naprawą</strong><p className="ui-text">Zawsze znasz koszt, zanim zaczniemy dodatkowe prace.</p></li>
            <li><span className="ui-icon-tile"><IconBox size={24} /></span><strong>Powiadomienia SMS</strong><p className="ui-text">Informujemy o każdym ważnym etapie i gotowości do odbioru.</p></li>
            <li><span className="ui-icon-tile"><IconAward size={24} /></span><strong>Sprawdzone części</strong><p className="ui-text">Przede wszystkim oryginalne części, a zamienniki tylko sprawdzone.</p></li>
          </ul>
        </div>
      </section>

      {/* ===== FAQ ===== */}
      <section className="ui-section ui-section-alt">
        <div className="ui-wrap hp-faq">
          <div>
            <p className="ui-eyebrow">FAQ</p>
            <h2 className="ui-h2">Najczęstsze pytania</h2>
            <p className="ui-lead">Pierwszy raz oddajesz telefon do serwisu? Tu znajdziesz najważniejsze odpowiedzi.</p>
            <Link to="/faq" className="ui-link hp-faq-link">Wszystkie pytania <IconArrow size={16} /></Link>
          </div>
          <div className="hp-faq-list">
            {FAQ_TEASER.map(([q, a]) => (
              <details key={q} className="hp-faq-item">
                <summary>{q}<span className="hp-plus" aria-hidden="true" /></summary>
                <p>{a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ===== KONTAKT ===== */}
      <section className="ui-section">
        <div className="ui-wrap">
          <div className="hp-visit">
            <div className="hp-visit-copy">
              <p className="ui-eyebrow">Odwiedź nas</p>
              <h2 className="ui-h2">Pasaż Kaufland w Płońsku</h2>
              <ul className="hp-visit-list">
                <li><IconPin size={20} /><span>{SHOP.addressLine1}<br />{SHOP.addressLine2}</span></li>
                <li><IconClock size={20} /><span>{SHOP.hours.map(([d, h]) => <span key={d} className="hp-hours">{d}: {h}</span>)}</span></li>
                <li><IconCall size={20} /><a href={SHOP.phoneHref}>{SHOP.phone}</a></li>
              </ul>
            </div>
            <div className="ui-btn-row hp-visit-btns">
              <a href={SHOP.phoneHref} className="ui-btn ui-btn-cta ui-btn-lg"><IconCall size={18} /> Zadzwoń</a>
              <a href={MAP_ROUTE} target="_blank" rel="noreferrer" className="ui-btn ui-btn-light ui-btn-lg"><IconRoute size={18} /> Wyznacz trasę</a>
              <Link to="/kontakt" className="ui-link hp-visit-link">Mapa i kontakt <IconArrow size={16} /></Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
