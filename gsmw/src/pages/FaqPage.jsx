// FAQ: wyszukiwarka, kategorie, rozwijane odpowiedzi + dane strukturalne dla Google
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import SHOP from '../shop';
import FAQ_GROUPS from '../data/faq';
import { IconSearch, IconArrow, IconCall } from '../layout/icons';
import './FaqPage.css';

const norm = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ł/g, 'l');

export default function FaqPage() {
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('all');

  // FAQPage schema (wyniki rozszerzone w Google)
  useEffect(() => {
    const el = document.createElement('script');
    el.type = 'application/ld+json';
    el.text = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: FAQ_GROUPS.flatMap((g) => g.items).map(([name, text]) => ({
        '@type': 'Question', name, acceptedAnswer: { '@type': 'Answer', text },
      })),
    });
    document.head.appendChild(el);
    const prevTitle = document.title;
    document.title = 'FAQ — najczęstsze pytania | Fonexpert Płońsk';
    return () => { el.remove(); document.title = prevTitle; };
  }, []);

  const groups = useMemo(() => {
    const nq = norm(q.trim());
    return FAQ_GROUPS
      .filter((g) => cat === 'all' || g.id === cat)
      .map((g) => ({ ...g, items: nq ? g.items.filter(([a, b]) => norm(a + ' ' + b).includes(nq)) : g.items }))
      .filter((g) => g.items.length);
  }, [q, cat]);

  return (
    <main className="fq">
      <section className="fq-hero">
        <div className="fq-wrap">
          <p className="fq-kicker">FAQ</p>
          <h1 className="fq-title">Najczęściej zadawane <span className="fq-accent">pytania</span></h1>
          <p className="fq-sub">Oddajesz telefon do naprawy po raz pierwszy? Wyjaśniamy prostym językiem, jak wygląda zgłoszenie, wycena i naprawa urządzenia.</p>
          <label className="fq-search">
            <IconSearch size={20} />
            <input type="search" placeholder="Szukaj, np. bateria, gwarancja, dane…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Szukaj w pytaniach" />
          </label>
        </div>
      </section>

      <div className="fq-wrap fq-body">
        <nav className="fq-cats" aria-label="Kategorie pytań">
          <button type="button" className={cat === 'all' ? 'fq-cat-on' : ''} onClick={() => setCat('all')}>Wszystkie</button>
          {FAQ_GROUPS.map((g) => (
            <button key={g.id} type="button" className={cat === g.id ? 'fq-cat-on' : ''} onClick={() => setCat(g.id)}>
              {g.title} <span>{g.items.length}</span>
            </button>
          ))}
        </nav>

        <div className="fq-list">
          {groups.length === 0 && (
            <p className="fq-empty">Nie znaleźliśmy pytania pasującego do „{q}”. Zadzwoń albo opisz problem w formularzu — odpowiemy.</p>
          )}
          {groups.map((g) => (
            <section key={g.id} className="fq-group">
              <h2 className="fq-group-title">{g.title}</h2>
              {g.items.map(([question, answer]) => (
                <details key={question} className="fq-item" open={Boolean(q.trim())}>
                  <summary>{question}<span className="fq-plus" aria-hidden="true" /></summary>
                  <p>{answer}</p>
                </details>
              ))}
            </section>
          ))}
        </div>

        <aside className="fq-help">
          <h2>Nie znalazłeś odpowiedzi?</h2>
          <p>Opisz problem w formularzu albo zadzwoń — pomożemy.</p>
          <Link to="/umow-naprawe" className="fq-btn fq-btn-primary">Zgłoś naprawę <IconArrow size={18} /></Link>
          <a href={SHOP.phoneHref} className="fq-btn fq-btn-ghost"><IconCall size={18} /> {SHOP.phone}</a>
        </aside>
      </div>
    </main>
  );
}
