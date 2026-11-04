// Strona kontaktowa: wizytówka w stylu Google, mapa dojazdu, godziny, dojazd
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import SHOP from '../shop';
import {
  IconCall, IconMail, IconPin, IconClock, IconRoute, IconStar, IconExternal,
  IconCar, IconStore, IconWrench, IconArrow,
} from '../layout/icons';
import './ContactPage.css';

// Pinezka wizytówki Google (maps.app.goo.gl/DZZ1CN5Srx1c7DKSA)
const LL = `${SHOP.mapsLat},${SHOP.mapsLng}`;
const MAP_EMBED = `https://maps.google.com/maps?q=${encodeURIComponent(SHOP.mapsName)}&ll=${LL}&z=17&hl=pl&output=embed`;
const MAP_OPEN = SHOP.mapsUrl;
const MAP_ROUTE = `https://www.google.com/maps/dir/?api=1&destination=${LL}`;

// Godziny wg czasu w Polsce: pon.–sob. 9–21; niedziela tylko handlowa (9–19)
function warsawNow() {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Warsaw', weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(new Date());
  const get = (t) => parts.find((p) => p.type === t)?.value;
  return { day: get('weekday'), mins: Number(get('hour')) * 60 + Number(get('minute')) };
}

function openState() {
  const { day, mins } = warsawNow();
  if (day === 'Sun') return { tone: 'wait', text: 'Niedziela — otwarte tylko w niedziele handlowe (9:00–19:00)' };
  if (mins < 9 * 60) return { tone: 'closed', text: 'Zamknięte · otwieramy o 9:00' };
  if (mins >= 21 * 60) return { tone: 'closed', text: day === 'Sat' ? 'Zamknięte · otwieramy w poniedziałek o 9:00' : 'Zamknięte · otwieramy jutro o 9:00' };
  if (mins >= 20 * 60 + 30) return { tone: 'wait', text: 'Otwarte · zamykamy o 21:00' };
  return { tone: 'open', text: 'Otwarte · do 21:00' };
}

const DAYS = [
  ['Mon', 'Poniedziałek', '9:00 – 21:00'],
  ['Tue', 'Wtorek', '9:00 – 21:00'],
  ['Wed', 'Środa', '9:00 – 21:00'],
  ['Thu', 'Czwartek', '9:00 – 21:00'],
  ['Fri', 'Piątek', '9:00 – 21:00'],
  ['Sat', 'Sobota', '9:00 – 21:00'],
  ['Sun', 'Niedziela', 'handlowa 9:00 – 19:00'],
];

export default function ContactPage() {
  const [state, setState] = useState(openState);
  const today = warsawNow().day;
  useEffect(() => {
    const t = setInterval(() => setState(openState()), 60000);
    return () => clearInterval(t);
  }, []);

  return (
    <main className="cp">
      <section className="cp-hero">
        <div className="cp-wrap">
          <p className="cp-kicker">Kontakt</p>
          <h1 className="cp-title">Zajrzyj do nas w <span className="cp-accent">Pasażu Kaufland</span></h1>
          <p className="cp-sub">Serwis telefonów, tabletów i laptopów w Płońsku. Przyjdź bez umawiania albo zgłoś naprawę online — oddzwonimy.</p>
        </div>
      </section>

      <div className="cp-wrap cp-main">
        {/* Wizytówka */}
        <article className="cp-card" aria-label="Wizytówka Fonexpert">
          <div className="cp-card-top">
            <div className="cp-avatar" aria-hidden="true">F</div>
            <div>
              <h2 className="cp-name">FONEXPERT</h2>
              <p className="cp-cat">Serwis telefonów komórkowych · Płońsk</p>
            </div>
          </div>

          <p className={`cp-open cp-open-${state.tone}`}><span className="cp-dot" />{state.text}</p>

          <div className="cp-actions">
            <a className="cp-act" href={SHOP.phoneHref}><span><IconCall size={20} /></span>Zadzwoń</a>
            <a className="cp-act" href={MAP_ROUTE} target="_blank" rel="noreferrer"><span><IconRoute size={20} /></span>Trasa</a>
            <a className="cp-act" href={`mailto:${SHOP.email}`}><span><IconMail size={20} /></span>E-mail</a>
            <a className="cp-act" href={SHOP.googleProfileUrl} target="_blank" rel="noreferrer"><span><IconStar size={20} /></span>Opinie</a>
          </div>

          <ul className="cp-info">
            <li><IconPin size={20} /><span>{SHOP.addressLine1}<br />{SHOP.addressLine2}</span></li>
            <li><IconCall size={20} /><a href={SHOP.phoneHref}>{SHOP.phone}</a></li>
            <li><IconMail size={20} /><a href={`mailto:${SHOP.email}`}>{SHOP.email}</a></li>
            <li className="cp-info-hours">
              <IconClock size={20} />
              <table className="cp-hours">
                <tbody>
                  {DAYS.map(([k, d, h]) => (
                    <tr key={k} className={k === today ? 'cp-today' : ''}><th scope="row">{d}</th><td>{h}</td></tr>
                  ))}
                </tbody>
              </table>
            </li>
          </ul>

          <a className="cp-google" href={SHOP.googleProfileUrl} target="_blank" rel="noreferrer">
            <span className="cp-g" aria-hidden="true">G</span>
            Zobacz wizytówkę w Google i wystaw opinię
            <IconExternal size={16} />
          </a>
        </article>

        {/* Mapa */}
        <section className="cp-mapbox" aria-label="Mapa dojazdu">
          <iframe
            className="cp-map"
            title="Mapa dojazdu do Fonexpert, Pasaż Kaufland Płońsk"
            src={MAP_EMBED}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            allowFullScreen
          />
          <div className="cp-map-bar">
            <span><IconPin size={18} /> Pasaż Kaufland, ul. Żołnierzy Wyklętych 16</span>
            <span className="cp-map-links">
              <a href={MAP_OPEN} target="_blank" rel="noreferrer">Otwórz w Mapach</a>
              <a className="cp-map-route" href={MAP_ROUTE} target="_blank" rel="noreferrer"><IconRoute size={16} /> Wyznacz trasę</a>
            </span>
          </div>
        </section>
      </div>

      {/* Dojazd */}
      <section className="cp-wrap cp-tips" aria-label="Jak do nas trafić">
        <div className="cp-tip">
          <span className="cp-tip-ic"><IconStore size={24} /></span>
          <div><strong>Pasaż Kaufland</strong><p>Punkt znajdziesz w galerii handlowej przy Kauflandzie — wejdź głównym wejściem do pasażu.</p></div>
        </div>
        <div className="cp-tip">
          <span className="cp-tip-ic"><IconCar size={24} /></span>
          <div><strong>Parking pod sklepem</strong><p>Zaparkujesz na parkingu przy Kauflandzie, kilka kroków od wejścia.</p></div>
        </div>
        <div className="cp-tip">
          <span className="cp-tip-ic"><IconWrench size={24} /></span>
          <div><strong>Bez czekania w kolejce</strong><p>Zgłoś usterkę online, a przygotujemy części i termin, zanim przyjdziesz.</p></div>
        </div>
      </section>

      <section className="cp-wrap">
        <div className="cp-cta">
          <div>
            <h2>Masz zepsuty telefon?</h2>
            <p>Opisz usterkę i dodaj zdjęcia — odezwiemy się z wyceną.</p>
          </div>
          <Link to="/umow-naprawe" className="cp-cta-btn">Zgłoś naprawę online <IconArrow size={18} /></Link>
        </div>
      </section>
    </main>
  );
}
