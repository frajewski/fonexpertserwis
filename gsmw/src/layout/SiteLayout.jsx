// Wspólny nagłówek i stopka panelu klienta (bez katalogu B2B)
import { useState } from 'react';
import { NavLink, Link } from 'react-router-dom';
import SHOP from '../shop';
import { IconPhone, IconCall, IconMail, IconPin, IconClock, IconMenu, IconClose } from './icons';
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

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  return (
    <header className="sl-header">
      <div className="sl-wrap sl-header-row">
        <Logo />
        <button type="button" className="sl-burger" aria-label={open ? 'Zamknij menu' : 'Otwórz menu'} aria-expanded={open} onClick={() => setOpen((v) => !v)}>
          {open ? <IconClose /> : <IconMenu />}
        </button>
        <nav className={`sl-nav ${open ? 'sl-nav-open' : ''}`} aria-label="Menu główne">
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.end} onClick={() => setOpen(false)} className={({ isActive }) => `sl-nav-link ${isActive ? 'sl-nav-active' : ''}`}>
              {n.label}
            </NavLink>
          ))}
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="sl-footer" id="kontakt">
      <div className="sl-wrap sl-footer-grid">
        <div>
          <Logo light />
          <p className="sl-footer-note">FONEXPERT — serwis telefonów, tabletów i laptopów.</p>
        </div>
        <div>
          <h2 className="sl-footer-title">Nawigacja</h2>
          <ul className="sl-footer-list">
            {NAV.map((n) => <li key={n.to}><Link to={n.to}>{n.label}</Link></li>)}
          </ul>
        </div>
        <div>
          <h2 className="sl-footer-title">Kontakt</h2>
          <ul className="sl-footer-list sl-footer-icons">
            <li><IconCall size={18} /><a href={SHOP.phoneHref}>{SHOP.phone}</a></li>
            <li><IconMail size={18} /><a href={`mailto:${SHOP.email}`}>{SHOP.email}</a></li>
            <li><IconPin size={18} /><span>{SHOP.addressLine1}<br />{SHOP.addressLine2}</span></li>
          </ul>
        </div>
        <div>
          <h2 className="sl-footer-title">Godziny otwarcia</h2>
          <ul className="sl-footer-list sl-footer-icons">
            <li><IconClock size={18} /><span>{SHOP.hours.map(([d, h]) => <span key={d} className="sl-hours-row">{d}: {h}</span>)}</span></li>
          </ul>
        </div>
      </div>
    </footer>
  );
}

export default function SiteLayout({ children }) {
  return (
    <div className="sl-root">
      <SiteHeader />
      <div className="sl-content">{children}</div>
      <SiteFooter />
    </div>
  );
}
