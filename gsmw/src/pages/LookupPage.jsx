// /status – wyszukiwanie zlecenia po numerze i telefonie
import { Link } from 'react-router-dom';
import StatusLookupForm from '../components/StatusLookupForm';
import SHOP from '../shop';
import { IconTag, IconBox, IconCall, IconArrow, IconWrench } from '../layout/icons';
import './LookupPage.css';
import { usePageMeta } from '../utils/seo';

export default function LookupPage() {
  usePageMeta({ title: 'Sprawdź status naprawy', description: 'Sprawdź, na jakim etapie jest naprawa Twojego telefonu — wystarczy numer zlecenia i numer telefonu.', path: '/status' });
  return (
    <main className="lk">
      <section className="ui-hero ui-hero-compact ui-hero-overlap">
        <div className="ui-wrap ui-hero-inner">
          <p className="ui-eyebrow">Śledzenie naprawy</p>
          <h1 className="ui-h1">Sprawdź, co dzieje się z <span className="ui-accent">Twoim telefonem</span></h1>
          <p className="ui-lead">Bez logowania i bez instalowania aplikacji — wystarczy numer zlecenia i telefon.</p>
        </div>
      </section>

      <div className="ui-wrap ui-overlap lk-grid">
        <StatusLookupForm variant="card" title="Wpisz dane zlecenia" />

        <aside className="lk-aside">
          <div className="ui-card ui-card-pad lk-tip">
            <span className="ui-icon-tile"><IconTag size={22} /></span>
            <div>
              <h2 className="ui-h3">Gdzie znajdę numer zlecenia?</h2>
              <p className="ui-text">Na potwierdzeniu przyjęcia (np. <b className="lk-mono">14/2026</b>) i w SMS-ie, który od nas dostałeś. Numer rezerwacji z SMS-a (np. <b className="lk-mono">R001/2026</b>) to jeszcze nie zlecenie — numer zlecenia dostajesz przy oddaniu telefonu. <Link to="/zasady-rezerwacji" className="ui-link">Jak to działa</Link></p>
            </div>
          </div>
          <div className="ui-card ui-card-pad lk-tip">
            <span className="ui-icon-tile ui-icon-tile-green"><IconBox size={22} /></span>
            <div>
              <h2 className="ui-h3">Masz link z SMS-a?</h2>
              <p className="ui-text">Otwórz go — status pokaże się od razu, bez wpisywania danych. Możesz też zeskanować kod QR z potwierdzenia.</p>
            </div>
          </div>
          <div className="ui-card ui-card-pad lk-tip">
            <span className="ui-icon-tile"><IconCall size={22} /></span>
            <div>
              <h2 className="ui-h3">Nie możesz znaleźć zlecenia?</h2>
              <p className="ui-text">Zadzwoń — sprawdzimy je za Ciebie.</p>
              <a href={SHOP.phoneHref} className="ui-link lk-call">{SHOP.phone} <IconArrow size={16} /></a>
            </div>
          </div>
        </aside>
      </div>

      <div className="ui-wrap">
        <div className="lk-new">
          <span><IconWrench size={20} /> Nie masz jeszcze zlecenia?</span>
          <Link to="/umow-naprawe" className="ui-btn ui-btn-primary">Zgłoś naprawę online <IconArrow size={18} /></Link>
        </div>
      </div>
    </main>
  );
}
