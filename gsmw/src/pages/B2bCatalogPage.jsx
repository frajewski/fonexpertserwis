import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getFirestore, collection, onSnapshot } from 'firebase/firestore';
import { app, ensureAnonymousAuth } from '../firebase/firebaseConfig';
import './B2bCatalogPage.css';

const db = getFirestore(app);

const fmtPrice = (n) => `${Number(n || 0).toLocaleString('pl-PL')} zł`;

const WHATSAPP_NUMBER = '48739696665';
const reserveUrl = (i) => {
  const specs = [i.storage, i.color].filter(Boolean).join(', ');
  const text = `Chciałbym zarezerwować: ${i.brand} ${i.model}${specs ? ' (' + specs + ')' : ''} - ${fmtPrice(i.price)}`;
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`;
};

// Przybliżone mapowanie nazw kolorów na kropkę przy telefonie - kosmetyczne
const COLOR_MAP = {
  czarny: '#1a1a1a', black: '#1a1a1a',
  biały: '#f1f1f1', white: '#f1f1f1',
  niebieski: '#3b6fd6', blue: '#3b6fd6',
  zielony: '#4f7a5e', green: '#4f7a5e',
  czerwony: '#b4432f', red: '#b4432f',
  fioletowy: '#7b5ea7', purple: '#7b5ea7',
  złoty: '#c9a869', gold: '#c9a869',
  srebrny: '#b7bcc4', silver: '#b7bcc4',
  różowy: '#d98fa5', pink: '#d98fa5',
  żółty: '#d8c14a', yellow: '#d8c14a',
  szary: '#7a7f8a', gray: '#7a7f8a', grey: '#7a7f8a',
};
const colorToHex = (name) => COLOR_MAP[(name || '').toLowerCase().trim()] || '#5B6273';

export default function B2bCatalogPage() {
  const { token } = useParams();
  const [items, setItems] = useState(null);
  const [error, setError] = useState('');
  const [selectedBrand, setSelectedBrand] = useState(null);
  const [query, setQuery] = useState('');

  useEffect(() => {
    const meta = document.createElement('meta');
    meta.name = 'robots';
    meta.content = 'noindex';
    document.head.appendChild(meta);
    return () => document.head.removeChild(meta);
  }, []);

  useEffect(() => {
    let unsub = null;
    let cancelled = false;

    ensureAnonymousAuth()
      .then(() => {
        if (cancelled) return;
        unsub = onSnapshot(
          collection(db, 'b2bCatalog', token, 'items'),
          (snap) => setItems(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
          () => setError('Nie udało się wczytać oferty. Odśwież stronę.')
        );
      })
      .catch(() => setError('Nie udało się połączyć. Odśwież stronę.'));

    return () => {
      cancelled = true;
      if (unsub) unsub();
    };
  }, [token]);

  useEffect(() => {
    if (!items || !selectedBrand) return;
    if (!items.some((i) => i.brand === selectedBrand)) setSelectedBrand(null);
  }, [items, selectedBrand]);

  const brandGroups = useMemo(() => {
    const groups = {};
    (items || []).forEach((i) => {
      const key = i.brand || 'Inne';
      if (!groups[key]) groups[key] = [];
      groups[key].push(i);
    });
    return Object.entries(groups)
      .map(([brand, list]) => ({
        brand,
        count: list.length,
        min: Math.min(...list.map((i) => Number(i.price) || 0)),
        max: Math.max(...list.map((i) => Number(i.price) || 0)),
        photo: list.find((i) => i.photo)?.photo || null,
      }))
      .sort((a, b) => b.count - a.count);
  }, [items]);

  const brandItems = useMemo(() => {
    if (!selectedBrand) return [];
    const q = query.toLowerCase().trim();
    return (items || [])
      .filter((i) => i.brand === selectedBrand)
      .filter((i) => !q || `${i.model} ${i.storage} ${i.color}`.toLowerCase().includes(q))
      .sort((a, b) => a.model.localeCompare(b.model, 'pl') || (a.price - b.price));
  }, [items, selectedBrand, query]);

  const lastUpdate = useMemo(() => {
    const times = (items || []).map((i) => (i.updatedAt && i.updatedAt.toMillis ? i.updatedAt.toMillis() : 0));
    const max = Math.max(0, ...times);
    return max ? new Date(max).toLocaleString('pl-PL') : null;
  }, [items]);

  const openBrand = (brand) => { setSelectedBrand(brand); setQuery(''); };

  return (
    <div className="b2b-page">
      <header className="b2b-topbar">
        <div className="b2b-topbar-left">
          <span className="b2b-mark">F</span>
          <span className="b2b-brand-wordmark">Fonexpert</span>
        </div>
        <a
          className="b2b-olx-link"
          href="https://www.olx.pl/oferty/uzytkownik/YfCl/"
          target="_blank"
          rel="noopener noreferrer"
        >
          Oferta detaliczna na OLX ↗
        </a>
      </header>

      <div className="b2b-hero">
        <h1 className="b2b-title">Oferta hurtowa Fonexpert</h1>
        {items && items.length > 0 && (
          <p className="b2b-sub">
            {items.length} {items.length === 1 ? 'telefon' : 'telefonów'} w cenach hurtowych, aktualizowane na żywo
            {lastUpdate ? ` – ostatnia zmiana ${lastUpdate}.` : '.'}
          </p>
        )}
      </div>

      {error && <div className="b2b-error">{error}</div>}
      {!error && items === null && <p className="b2b-info">Ładuję ofertę…</p>}
      {!error && items !== null && items.length === 0 && (
        <p className="b2b-info">Brak telefonów w ofercie w tej chwili.</p>
      )}

      {!error && items !== null && items.length > 0 && !selectedBrand && (
        <>
          <div className="b2b-stats-grid">
            <div className="b2b-stat-card">
              <div className="b2b-stat-label">Stan magazynu</div>
              <div className="b2b-stat-value">{items.length} szt. <span className="b2b-stat-note">dostępnych od ręki</span></div>
            </div>
            <div className="b2b-stat-card">
              <div className="b2b-stat-label">Aktualizacja bazy</div>
              <div className="b2b-live">
                <span className="b2b-live-dot"><span className="b2b-live-ping" /><span className="b2b-live-core" /></span>
                <span className="b2b-live-text">Na żywo</span>
              </div>
            </div>
            <div className="b2b-stat-card">
              <div className="b2b-stat-label">Rezerwacja</div>
              <div className="b2b-stat-note-big">Przez WhatsApp, numer przy każdym telefonie</div>
            </div>
          </div>

          <div className="b2b-section-row">
            <span className="b2b-section-label">Wybierz markę</span>
            <span className="b2b-section-hint">Kliknij kafelek, żeby zobaczyć dokładne modele</span>
          </div>

          <div className="b2b-brand-grid">
            {brandGroups.map((g, idx) => (
              <button
                key={g.brand}
                className="b2b-brand-tile"
                onClick={() => openBrand(g.brand)}
                style={
                  g.photo
                    ? { backgroundImage: `url(${g.photo})`, backgroundSize: 'cover', backgroundPosition: 'center' }
                    : undefined
                }
              >
                <div className="b2b-tile-art" style={g.photo ? { background: 'transparent' } : undefined}>
                  {!g.photo && <span className="b2b-tile-initial">{g.brand.charAt(0).toUpperCase()}</span>}
                </div>
                <div className="b2b-tile-info">
                  <div className="b2b-tile-name-row">
                    <span className="b2b-tile-name">{g.brand}</span>
                    <span className="b2b-tile-count">{g.count} szt.</span>
                  </div>
                  <div className="b2b-tile-price">
                    Ceny hurtowe: <strong>{g.min === g.max ? fmtPrice(g.min) : `${fmtPrice(g.min)} – ${fmtPrice(g.max)}`}</strong>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </>
      )}

      {!error && selectedBrand && (
        <>
          <div className="b2b-brand-header">
            <button className="b2b-back" onClick={() => setSelectedBrand(null)}>← Wszystkie marki</button>
            <h2 className="b2b-brand-title">{selectedBrand}</h2>
          </div>

          <input
            className="b2b-input"
            placeholder="Szukaj: model, pamięć, kolor…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />

          <div className="b2b-items">
            {brandItems.map((i) => (
              <div key={i.id} className="b2b-item-card">
                <div className="b2b-item-left">
                  <div className="b2b-item-top">
                    <span className="b2b-item-model">{i.model}</span>
                    {i.condition === 'new' ? (
                      <span className="b2b-pill b2b-pill-new">Nowy</span>
                    ) : i.grade ? (
                      <span className="b2b-pill">Grade {i.grade}</span>
                    ) : null}
                  </div>
                  <div className="b2b-item-meta">
                    {i.color && (
                      <>
                        <span className="b2b-color-dot" style={{ background: colorToHex(i.color) }} />
                        <span>{i.color}</span>
                      </>
                    )}
                    {i.storage && <span>{i.color ? '•' : ''} {i.storage}</span>}
                    {i.hasIcloudLock && <span className="b2b-flag">🔒 iCloud</span>}
                    {i.hasCarrierLock && <span className="b2b-flag">📡 Simlock</span>}
                  </div>
                </div>
                <div className="b2b-item-right">
                  <div className="b2b-item-price">{fmtPrice(i.price)}</div>
                  <a className="b2b-reserve" href={reserveUrl(i)} target="_blank" rel="noopener noreferrer">
                    Rezerwuj →
                  </a>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
