// FAQ: wyszukiwarka, kategorie, rozwijane odpowiedzi + dane strukturalne dla Google
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import SHOP from '../shop';
import FAQ_GROUPS, { faqSlug } from '../data/faq';
import { useLocation } from 'react-router-dom';
import { IconSearch, IconArrow, IconCall } from '../layout/icons';
import './FaqPage.css';
import { usePageMeta } from '../utils/seo';

const norm = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ł/g, 'l');

export default function FaqPage() {
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('all');

  usePageMeta({ title: 'FAQ — najczęstsze pytania', description: 'Ile kosztuje naprawa, jak długo trwa, czy stracę dane, gwarancja i zadatek — odpowiedzi na najczęstsze pytania klientów serwisu Fonexpert w Płońsku.', path: '/faq' });

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
    return () => { el.remove(); };
  }, []);

  // Wejście z linku /faq#pytanie – otwórz to pytanie (ScrollManager przewija do kotwicy)
  const { hash } = useLocation();
  const openSlug = decodeURIComponent(hash.replace('#', ''));

  const groups = useMemo(() => {
    const nq = norm(q.trim());
    return FAQ_GROUPS
      .filter((g) => cat === 'all' || g.id === cat)
      .map((g) => ({ ...g, items: nq ? g.items.filter(([a, b]) => norm(a + ' ' + b).includes(nq)) : g.items }))
      .filter((g) => g.items.length);
  }, [q, cat]);

  return (
    <main className="fq">
      <section className="ui-hero ui-hero-compact">
        <div className="ui-wrap ui-hero-inner">
          <p className="ui-eyebrow">FAQ</p>
          <h1 className="ui-h1">Najczęściej zadawane <span className="ui-accent">pytania</span></h1>
          <p className="ui-lead fq-sub">Oddajesz telefon do naprawy po raz pierwszy? Wyjaśniamy prostym językiem, jak wygląda zgłoszenie, wycena i naprawa urządzenia.</p>
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
                <details key={question} id={faqSlug(question)} className="fq-item" open={Boolean(q.trim()) || openSlug === faqSlug(question)}>
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
          <Link to="/umow-naprawe" className="ui-btn ui-btn-cta ui-btn-block">Zgłoś naprawę <IconArrow size={18} /></Link>
          <a href={SHOP.phoneHref} className="ui-btn ui-btn-light ui-btn-block"><IconCall size={18} /> {SHOP.phone}</a>
        </aside>
      </div>
    </main>
  );
}
