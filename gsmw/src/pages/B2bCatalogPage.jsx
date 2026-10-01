import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getFirestore, collection, onSnapshot } from 'firebase/firestore';
import { app, ensureAnonymousAuth } from '../firebase/firebaseConfig';
import './B2bCatalogPage.css';

const db = getFirestore(app);

const fmtPrice = (n) => `${Number(n || 0).toLocaleString('pl-PL')} zł`;

export default function B2bCatalogPage() {
  const { token } = useParams();
  const [items, setItems] = useState(null); // null = ładowanie
  const [error, setError] = useState('');
  const [brand, setBrand] = useState('');
  const [query, setQuery] = useState('');

  // Oferta jest prywatna – prosimy wyszukiwarki, żeby jej nie indeksowały
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

  const brands = useMemo(
    () => [...new Set((items || []).map((i) => i.brand).filter(Boolean))].sort(),
    [items]
  );

  const visible = useMemo(() => {
    const q = query.toLowerCase().trim();
    return (items || [])
      .filter((i) => !brand || i.brand === brand)
      .filter((i) => !q || `${i.brand} ${i.model} ${i.storage} ${i.color}`.toLowerCase().includes(q))
      .sort((a, b) =>
        `${a.brand} ${a.model}`.localeCompare(`${b.brand} ${b.model}`, 'pl') || (a.price - b.price)
      );
  }, [items, brand, query]);

  const lastUpdate = useMemo(() => {
    const times = (items || []).map((i) => (i.updatedAt && i.updatedAt.toMillis ? i.updatedAt.toMillis() : 0));
    const max = Math.max(0, ...times);
    return max ? new Date(max).toLocaleString('pl-PL') : null;
  }, [items]);

  return (
    <div className="b2b-page">
      <header className="b2b-header">
        <h1 className="b2b-title">Oferta telefonów — Fonexpert</h1>
        <p className="b2b-sub">
          Lista aktualizuje się na żywo{lastUpdate ? ` · ostatnia zmiana: ${lastUpdate}` : ''}
        </p>
      </header>

      {error && <div className="b2b-error">{error}</div>}

      {!error && items === null && <p className="b2b-info">Ładuję ofertę…</p>}

      {!error && items !== null && (
        <>
          <div className="b2b-filters">
            <input
              className="b2b-input"
              placeholder="Szukaj: model, pamięć, kolor…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <select className="b2b-input" value={brand} onChange={(e) => setBrand(e.target.value)}>
              <option value="">Wszystkie marki</option>
              {brands.map((b) => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>

          <p className="b2b-count">{visible.length} z {items.length} pozycji</p>

          {items.length === 0 ? (
            <p className="b2b-info">Brak telefonów w ofercie albo link jest nieaktualny.</p>
          ) : (
            <div className="b2b-grid">
              {visible.map((i) => (
                <div key={i.id} className="b2b-card">
                  <div className="b2b-card-title">{i.brand} {i.model}</div>
                  <div className="b2b-card-meta">
                    {[i.storage, i.color].filter(Boolean).join(' · ')}
                  </div>
                  <div className="b2b-badges">
                    {i.condition === 'new' && <span className="b2b-badge b2b-badge-new">Nowy</span>}
                    {i.grade && <span className="b2b-badge">Grade {i.grade}</span>}
                    {i.hasIcloudLock && <span className="b2b-badge b2b-badge-warn">🔒 iCloud</span>}
                    {i.hasCarrierLock && <span className="b2b-badge b2b-badge-warn">📡 Simlock</span>}
                  </div>
                  <div className="b2b-price">{fmtPrice(i.price)}</div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
