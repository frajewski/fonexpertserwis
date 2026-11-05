// 404 – zły adres. Zamiast pustej strony: najczęstsze cele i telefon.
import { Link } from 'react-router-dom';
import SHOP from '../shop';
import { usePageMeta } from '../utils/seo';
import { IconWrench, IconBox, IconCall, IconArrow, IconSearch } from '../layout/icons';
import './InfoPages.css';

export default function NotFoundPage() {
  usePageMeta({ title: 'Nie znaleziono strony', noindex: true });
  return (
    <main className="ip">
      <section className="ui-hero ui-hero-compact">
        <div className="ui-wrap ui-hero-inner">
          <p className="ui-eyebrow">Błąd 404</p>
          <h1 className="ui-h1">Nie znaleźliśmy <span className="ui-accent">tej strony</span></h1>
          <p className="ui-lead">Link mógł się zmienić albo zawierać literówkę. Wybierz, czego szukasz:</p>
        </div>
      </section>
      <div className="ui-wrap ip-body">
        <div className="ui-grid ui-grid-3">
          <Link to="/umow-naprawe" className="ui-card ui-card-pad ui-card-link">
            <span className="ui-icon-tile"><IconWrench size={24} /></span>
            <h2 className="ui-h3">Zgłoś naprawę</h2>
            <p className="ui-text">Opisz usterkę online — odezwiemy się z wyceną.</p>
            <span className="ui-link">Przejdź <IconArrow size={16} /></span>
          </Link>
          <Link to="/status" className="ui-card ui-card-pad ui-card-link">
            <span className="ui-icon-tile ui-icon-tile-green"><IconBox size={24} /></span>
            <h2 className="ui-h3">Sprawdź status naprawy</h2>
            <p className="ui-text">Numer zlecenia i telefon wystarczą.</p>
            <span className="ui-link">Przejdź <IconArrow size={16} /></span>
          </Link>
          <Link to="/faq" className="ui-card ui-card-pad ui-card-link">
            <span className="ui-icon-tile"><IconSearch size={24} /></span>
            <h2 className="ui-h3">Najczęstsze pytania</h2>
            <p className="ui-text">Ceny, czas naprawy, gwarancja, dane w telefonie.</p>
            <span className="ui-link">Przejdź <IconArrow size={16} /></span>
          </Link>
        </div>
        <p className="ip-call">Wolisz zapytać? <a href={SHOP.phoneHref} className="ui-link"><IconCall size={16} /> {SHOP.phone}</a> · <Link to="/" className="ui-link">Strona główna</Link></p>
      </div>
    </main>
  );
}
