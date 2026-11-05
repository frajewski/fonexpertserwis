// Wspólny nagłówek, stopka i pasek akcji panelu klienta (bez katalogu B2B)
import { useEffect, useState } from 'react';
import { NavLink, Link, useLocation } from 'react-router-dom';
import SHOP from '../shop';
import { IconPhone, IconCall, IconMail, IconPin, IconClock, IconMenu, IconClose, IconWrench } from './icons';
import './SiteLayout.css';

function Logo({ light = false }) {
  return (
    <Link to="/" className={`sl-logo ${light ? 'sl-logo-light' : ''}`} aria-label="Fonexpert — strona główna">
      <IconPhone size={34} className="sl-logo-icon" />
      <span>
        <span className="sl-logo-name">FONEXPERT</span>
        <span className="sl-logo-tag">SERWIS GSM</span>
      </span>
    </Link>
  );
}

const NAV = [
  { to: '/', label: 'Strona główna', end: true },
  { to: '/umow-naprawe', label: 'Umów naprawę' },
  { to: '/status', label: 'Sprawdź status' },
  { to: '/skup-i-sprzedaz', label: 'Skup i sprzedaż' },
  { to: '/faq', label: 'FAQ' },
  { to: '/kontakt', label: 'Kontakt' },
];

// Strony z własnym przyklejonym paskiem akcji formularza – tam nie pokazujemy dolnego paska
const NO_ACTION_BAR = ['/umow-naprawe', '/skup-i-sprzedaz'];

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const { pathname, search } = useLocation();
  // Strona statusu (/?token=… albo /zlecenie/:id) podświetla „Sprawdź status”, nie „Stronę główną”
  const onStatus = pathname.startsWith('/zlecenie') || (pathname === '/' && new URLSearchParams(search).has('token'));
  const navActive = (n, isActive) => (n.to === '/status' ? isActive || onStatus : n.to === '/' ? isActive && !onStatus : isActive);

  // Zamknij menu po zmianie strony; Esc zamyka; przy otwartym menu strona się nie przewija
  useEffect(() => { setOpen(false); }, [pathname, search]);
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', onKey);
    document.body.classList.add('sl-lock');
    return () => { document.removeEventListener('keydown', onKey); document.body.classList.remove('sl-lock'); };
  }, [open]);

  return (
    <header className="sl-header">
      <div className="sl-wrap sl-header-row">
        <Logo />
        <button type="button" className="sl-burger" aria-label={open ? 'Zamknij menu' : 'Otwórz menu'} aria-expanded={open} aria-controls="sl-menu" onClick={() => setOpen((v) => !v)}>
          {open ? <IconClose /> : <IconMenu />}
        </button>
        <nav id="sl-menu" className={`sl-nav ${open ? 'sl-nav-open' : ''}`} aria-label="Menu główne">
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => `sl-nav-link ${navActive(n, isActive) ? 'sl-nav-active' : ''}`}>
              {n.label}
            </NavLink>
          ))}
          <div className="sl-nav-extra">
            <a href={SHOP.phoneHref} className="ui-btn ui-btn-secondary ui-btn-block"><IconCall size={18} /> Zadzwoń: {SHOP.phone}</a>
            <Link to="/umow-naprawe" className="ui-btn ui-btn-primary ui-btn-block"><IconWrench size={18} /> Zgłoś naprawę online</Link>
            <p className="sl-nav-hours"><IconClock size={16} /> Pon.–Sob. 9:00–21:00 · {SHOP.addressLine1}</p>
          </div>
        </nav>
      </div>
      {open && <button type="button" className="sl-backdrop" aria-label="Zamknij menu" tabIndex={-1} onClick={() => setOpen(false)} />}
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="sl-footer">
      <div className="sl-wrap sl-footer-grid">
        <div>
          <Logo light />
          <p className="sl-footer-note">FONEXPERT — naprawa, skup i sprzedaż telefonów, tabletów i laptopów w Płońsku.</p>
        </div>
        <div>
          <p className="sl-footer-title">Nawigacja</p>
          <ul className="sl-footer-list">
            {NAV.map((n) => <li key={n.to}><Link to={n.to}>{n.label}</Link></li>)}
          </ul>
        </div>
        <div>
          <p className="sl-footer-title">Kontakt</p>
          <ul className="sl-footer-list sl-footer-icons">
            <li><IconCall size={18} /><a href={SHOP.phoneHref}>{SHOP.phone}</a></li>
            <li><IconMail size={18} /><a href={`mailto:${SHOP.email}`}>{SHOP.email}</a></li>
            <li><IconPin size={18} /><span>{SHOP.addressLine1}<br />{SHOP.addressLine2}</span></li>
          </ul>
        </div>
        <div>
          <p className="sl-footer-title">Godziny otwarcia</p>
          <ul className="sl-footer-list sl-footer-icons">
            <li><IconClock size={18} /><span>{SHOP.hours.map(([d, h]) => <span key={d} className="sl-hours-row">{d}: {h}</span>)}</span></li>
          </ul>
        </div>
      </div>
      <div className="sl-wrap sl-footer-bottom">
        <span>© {new Date().getFullYear()} {SHOP.legalName}</span>
        <span className="sl-footer-legal">
          <Link to="/polityka-prywatnosci">Polityka prywatności</Link>
          <Link to="/zasady-rezerwacji">Zasady rezerwacji i zadatku</Link>
        </span>
      </div>
    </footer>
  );
}

// Dolny pasek na telefonie: najważniejsze akcje zawsze pod kciukiem
function MobileActionBar() {
  const { pathname } = useLocation();
  if (NO_ACTION_BAR.includes(pathname)) return null;
  return (
    <div className="sl-actionbar" role="region" aria-label="Szybki kontakt">
      <a href={SHOP.phoneHref} className="ui-btn ui-btn-secondary"><IconCall size={18} /> Zadzwoń</a>
      <Link to="/umow-naprawe" className="ui-btn ui-btn-primary"><IconWrench size={18} /> Zgłoś naprawę</Link>
    </div>
  );
}

// Po przejściu na inną podstronę – na górę (albo do kotwicy z adresu)
function ScrollManager() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (hash) {
      const id = decodeURIComponent(hash.slice(1));
      const t = setTimeout(() => document.getElementById(id)?.scrollIntoView({ block: 'start' }), 60);
      return () => clearTimeout(t);
    }
    window.scrollTo(0, 0);
    return undefined;
  }, [pathname, hash]);
  return null;
}

export default function SiteLayout({ children }) {
  const { pathname } = useLocation();
  const hasBar = !NO_ACTION_BAR.includes(pathname);
  return (
    <div className={`sl-root ${hasBar ? 'sl-has-bar' : ''}`}>
      <a href="#tresc" className="sl-skip">Przejdź do treści</a>
      <ScrollManager />
      <SiteHeader />
      <div className="sl-content" id="tresc" tabIndex={-1}>{children}</div>
      <SiteFooter />
      <MobileActionBar />
    </div>
  );
}
