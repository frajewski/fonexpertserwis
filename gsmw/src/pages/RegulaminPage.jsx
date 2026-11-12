// Regulamin serwisu – treść z data/regulamin.js (1:1 z dokumentu zaakceptowanego przez prawnika).
// Na ten adres odsyłają wydruki zlecenia i potwierdzenia odbioru z panelu.
import { Link } from 'react-router-dom';
import { REGULAMIN, REGULAMIN_SHORT, REGULAMIN_DATE_LABEL } from '../data/regulamin';
import { usePageMeta } from '../utils/seo';
import './InfoPages.css';

export default function RegulaminPage() {
  usePageMeta({ title: 'Regulamin serwisu', description: 'Regulamin serwisu stacjonarnego Fonexpert w Płońsku: przyjęcie urządzenia, wycena, terminy, gwarancja, reklamacje i dane osobowe.', path: '/regulamin' });
  return (
    <main className="ip">
      <section className="ui-hero ui-hero-compact">
        <div className="ui-wrap ui-hero-inner">
          <p className="ui-eyebrow">Dokumenty</p>
          <h1 className="ui-h1">Regulamin serwisu</h1>
          <p className="ui-lead">Obowiązuje od {REGULAMIN_DATE_LABEL} Akceptujesz go przy przyjęciu urządzenia do naprawy.</p>
        </div>
      </section>
      <article className="ui-wrap ui-wrap-narrow ip-body ip-doc">
        <section className="ip-short" id="skrot" aria-labelledby="skrot-h">
          <h2 id="skrot-h">Regulamin w skrócie</h2>
          <p className="ip-short-lead">Najważniejsze zasady w minutę. Skrót ułatwia lekturę, ale nie zastępuje regulaminu — wiążąca jest pełna treść poniżej.</p>
          <ol className="ip-short-list">
            {REGULAMIN_SHORT.map((p) => (
              <li key={p.title}>
                <strong>{p.title}</strong>
                <span>{p.text} <a href={`#par-${p.par}`} className="ip-short-ref">§{p.par}</a></span>
              </li>
            ))}
          </ol>
        </section>

        <h2 className="ip-full-h">Pełna treść regulaminu</h2>
        <nav className="ip-toc" aria-label="Spis treści">
          {REGULAMIN.map((s, i) => <a key={s.title} href={`#par-${i + 1}`}>{s.title}</a>)}
        </nav>
        {REGULAMIN.map((s, i) => (
          <section key={s.title} id={`par-${i + 1}`}>
            <h2>{s.title}</h2>
            <ol>
              {s.items.map((it, j) => (
                <li key={j}>
                  {it.t}
                  {it.sub && <ol type="a">{it.sub.map((x) => <li key={x}>{x}</li>)}</ol>}
                </li>
              ))}
            </ol>
          </section>
        ))}
        <p className="ip-note">Zgłoszenia online obejmują też <Link to="/zasady-rezerwacji">zasady rezerwacji i zadatku</Link>. Więcej o danych osobowych: <Link to="/polityka-prywatnosci">polityka prywatności</Link>.</p>
      </article>
    </main>
  );
}
