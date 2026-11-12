// ============================================================
//  PhoneOffer.jsx – „Dostępne teraz”: telefony na sprzedaż
//  Dane: kolekcja shopOffer (publiczna), którą wypełnia Cloud Function
//  syncShopOffer z magazynu (panel → Skup → telefon → „Pokaż na stronie”).
//  Sprzedany telefon znika sam.
// ============================================================
import { useEffect, useMemo, useState } from 'react';
import SHOP from '../shop';
import { IconCall, IconShield, IconPhone } from '../layout/icons';
import './PhoneOffer.css';

const GRADE_LABEL = {
  'A+': 'Jak nowy', A: 'Bardzo dobry', 'A-': 'Bardzo dobry', 'B+': 'Dobry', B: 'Dobry', 'B-': 'Zadowalający',
  'C+': 'Widoczne ślady', C: 'Widoczne ślady', 'C-': 'Mocne ślady użytkowania', D: 'Uszkodzony',
};

// Nazwa koloru → kropka (PL i EN, także nazwy Apple)
const COLORS = [
  [/black titanium|czarny tytan/, '#3a3a3c'], [/white titanium|biały tytan/, '#e7e4df'], [/blue titanium|niebieski tytan/, '#4b5d79'],
  [/natural|naturalny/, '#b9ab9b'], [/desert|pustynn/, '#c8a27a'], [/space black|midnight|północ|czarn|black|grafit|graphite/, '#1f2328'],
  [/starlight|księżyc|biał|white|silver|srebr/, '#efeae0'], [/deep purple|purple|fiolet|lawend|lavender/, '#6d4aa8'],
  [/yellow|żółt/, '#f5c518'], [/blue|niebiesk|granat|navy|ultramarine/, '#3b82f6'], [/red|czerwon/, '#dc2626'],
  [/green|zielon|mint|miętow/, '#22a35a'], [/pink|róż/, '#f4a6c6'], [/gold|złot/, '#d4af37'], [/orange|pomarańcz/, '#f97316'],
  [/gray|grey|szar/, '#8b929c'],
];
const colorHex = (name) => {
  const n = String(name || '').toLowerCase();
  return (COLORS.find(([re]) => re.test(n)) || [])[1] || null;
};

const fmtPrice = (n) => `${Number(n).toLocaleString('pl-PL', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} zł`;
const smsHref = (item) => {
  const phone = SHOP.phoneHref.replace('tel:', '');
  const body = `Dzień dobry, czy ${[item.brand, item.model, item.storage, item.color].filter(Boolean).join(' ')} za ${fmtPrice(item.price)} jest dostępny?`;
  return `sms:${phone}?body=${encodeURIComponent(body)}`;
};

function Placeholder({ color }) {
  return (
    <svg viewBox="0 0 120 160" className="po-ph" aria-hidden="true">
      <rect x="30" y="10" width="60" height="140" rx="12" fill={color || '#c9d3e3'} />
      <rect x="35" y="16" width="50" height="128" rx="8" fill="rgba(255,255,255,.18)" />
      <rect x="50" y="20" width="20" height="5" rx="2.5" fill="rgba(0,0,0,.35)" />
    </svg>
  );
}

export default function PhoneOffer() {
  const [items, setItems] = useState(null); // null = ładowanie
  const [failed, setFailed] = useState(false);
  const [brand, setBrand] = useState('Wszystkie');

  useEffect(() => {
    let off = false;
    (async () => {
      try {
        const [{ app }, { getFirestore, collection, getDocs }] = await Promise.all([
          import('../firebase/firebaseConfig'),
          import('firebase/firestore'),
        ]);
        const snap = await getDocs(collection(getFirestore(app), 'shopOffer'));
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() })).filter((x) => x.price > 0 && x.model);
        list.sort((a, b) => a.brand.localeCompare(b.brand, 'pl') || a.price - b.price);
        if (!off) setItems(list);
      } catch (e) {
        console.error('Nie udało się wczytać oferty', e);
        if (!off) { setFailed(true); setItems([]); }
      }
    })();
    return () => { off = true; };
  }, []);

  const brands = useMemo(() => ['Wszystkie', ...new Set((items || []).map((i) => i.brand).filter(Boolean))], [items]);
  const shown = (items || []).filter((i) => brand === 'Wszystkie' || i.brand === brand);

  return (
    <section className="ui-section-tight po-sec" id="oferta" aria-labelledby="po-title">
      <div className="ui-wrap">
        <div className="po-panel">
          <div className="po-head">
            <div>
              <p className="po-eyebrow">Dostępne teraz w punkcie</p>
              <h2 className="po-title" id="po-title">Telefony na sprzedaż</h2>
              <p className="po-lead">Każdy egzemplarz przetestowany, z gwarancją. Pojedyncze sztuki — zadzwoń lub napisz, żeby sprawdzić dostępność albo zarezerwować.</p>
            </div>
            {brands.length > 2 && (
              <div className="po-filters" role="group" aria-label="Marka">
                {brands.map((b) => (
                  <button key={b} type="button" className={`po-chip ${brand === b ? 'po-chip-on' : ''}`} aria-pressed={brand === b} onClick={() => setBrand(b)}>{b}</button>
                ))}
              </div>
            )}
          </div>

          {items === null ? (
            <ul className="po-grid" aria-busy="true">
              {[0, 1, 2].map((i) => <li key={i} className="po-card po-skel" />)}
            </ul>
          ) : shown.length === 0 ? (
            <div className="po-empty">
              <IconPhone size={28} />
              <p>{failed ? 'Nie udało się wczytać oferty.' : 'Oferta zmienia się na bieżąco — w tej chwili nie mamy telefonów wystawionych online.'} Zadzwoń, a powiemy, co mamy na miejscu.</p>
              <a href={SHOP.phoneHref} className="ui-btn ui-btn-cta"><IconCall size={18} /> {SHOP.phone}</a>
            </div>
          ) : (
            <ul className="po-grid">
              {shown.map((it) => {
                const dot = colorHex(it.color);
                const isNew = it.condition === 'new';
                return (
                  <li key={it.id} className="po-card">
                    <div className="po-img">
                      {it.photo
                        ? <img src={it.photo} alt={`${it.brand} ${it.model}`} loading="lazy" decoding="async" />
                        : <Placeholder color={dot} />}
                      <span className={`po-cond ${isNew ? 'po-cond-new' : ''}`}>{isNew ? 'Nowy' : 'Używany'}</span>
                      {it.photo && it.photoIsStock && <span className="po-stock">zdjęcie poglądowe</span>}
                    </div>
                    <div className="po-body">
                      <h3 className="po-name"><small>{it.brand}</small>{it.model}</h3>
                      <ul className="po-specs">
                        {it.storage && <li className="po-storage">{it.storage}</li>}
                        {it.color && <li>{dot && <span className="po-dot" style={{ background: dot }} />}{it.color}</li>}
                        {it.batteryHealth && <li><span className="po-batt" aria-hidden="true"><span style={{ width: `${it.batteryHealth}%` }} /></span>Bateria {it.batteryHealth}%</li>}
                        {!isNew && it.grade && GRADE_LABEL[it.grade] && <li>Stan: {GRADE_LABEL[it.grade]}</li>}
                      </ul>
                      {it.note && <p className="po-note">{it.note}</p>}
                      <p className="po-warranty"><IconShield size={14} /> Gwarancja {isNew ? '12–24' : '1–6'} mies.</p>
                      <div className="po-foot">
                        <strong className="po-price">{fmtPrice(it.price)}</strong>
                        <a className="po-ask" href={smsHref(it)} aria-label={`Zapytaj SMS-em o ${it.brand} ${it.model}`}>Zapytaj</a>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
          <p className="po-fine">Ceny brutto. Dokładny okres gwarancji podajemy na dokumencie sprzedaży. Telefon możesz obejrzeć i sprawdzić w punkcie w Pasażu Kaufland.</p>
        </div>
      </div>
    </section>
  );
}
