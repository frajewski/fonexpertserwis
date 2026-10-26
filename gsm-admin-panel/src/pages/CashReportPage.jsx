// ============================================================
//  CashReportPage.jsx – „Kasa” (/kasa): raport dnia
//
//  Czyta z bazy (nie z 30-dniowego okna na żywo), więc działa dla dowolnego dnia:
//    • zlecenia WYDANE tego dnia (issuedAt) – kwota pobrana przy odbiorze
//      (paidAtDelivery; dla starszych zleceń: łącznie − zadatek) + metoda,
//    • telefony SPRZEDANE tego dnia (soldAt) – cena sprzedaży + metoda,
//    • zadatki przyjęte tego dnia (zlecenia przyjęte z deposit > 0).
//  Wydruk – osobne okno A4 (papier dla biura rachunkowego).
// ============================================================

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';
import useStore from '../store/useStore';
import { PAYMENT_METHODS, PAYMENT_ICONS } from '../constants/paymentMethods';
import { blockPrintInNativeApp } from '../utils/platform';
import './CashReportPage.css';

const NO_METHOD = 'nie podano';
const todayInput = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const dayRange = (ymd) => {
  const [y, m, d] = ymd.split('-').map(Number);
  const start = new Date(y, m - 1, d);
  const end = new Date(y, m - 1, d + 1);
  return [start.toISOString(), end.toISOString()];
};
const fmtTime = (iso) => (iso ? new Date(iso).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' }) : '');
const zl = (n) => `${Math.round((Number(n) || 0) * 100) / 100} zł`;
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const fetchRange = async (col, field, [from, to]) => {
  const snap = await getDocs(query(collection(db, col), where(field, '>=', from), where(field, '<', to)));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
};

export default function CashReportPage() {
  const navigate = useNavigate();
  const getUserById = useStore((s) => s.getUserById);
  const [day, setDay] = useState(todayInput);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setData(null);
    setError('');
    const range = dayRange(day);
    Promise.all([
      fetchRange('repairs', 'issuedAt', range),
      fetchRange('phones', 'soldAt', range),
      fetchRange('repairs', 'createdAt', range),
    ])
      .then(([issued, sold, created]) => {
        if (cancelled) return;
        const repairs = issued
          .filter((r) => r.status === 'Odebrane')
          .map((r) => ({
            id: r.id,
            at: r.issuedAt,
            label: `#${r.displayNumber || r.id.slice(0, 6)} · ${r.brand || ''} ${r.model || ''}`.trim(),
            who: getUserById(r.customerId)?.name || '',
            method: r.paymentMethod || NO_METHOD,
            amount: r.paidAtDelivery ?? Math.max(0, (r.partsCost || 0) + (r.serviceCost || 0) - (r.deposit || 0)),
          }));
        const phones = sold
          .filter((p) => p.status === 'Sprzedany')
          .map((p) => ({
            id: p.id,
            at: p.soldAt,
            label: `${p.brand || ''} ${p.model || ''}`.trim(),
            who: '',
            method: p.paymentMethod || NO_METHOD,
            amount: Number(p.sellPrice) || 0,
          }));
        const deposits = created
          .filter((r) => (r.deposit || 0) > 0)
          .map((r) => ({
            id: r.id,
            at: r.createdAt,
            label: `#${r.displayNumber || r.id.slice(0, 6)} · ${r.brand || ''} ${r.model || ''}`.trim(),
            who: getUserById(r.customerId)?.name || '',
            method: NO_METHOD,
            amount: r.deposit,
          }));
        setData({ repairs, phones, deposits });
      })
      .catch((err) => {
        console.error(err);
        if (!cancelled) setError('Nie udało się wczytać danych kasy. Sprawdź połączenie z Internetem.');
      });
    return () => { cancelled = true; };
  }, [day, getUserById]);

  const sales = data ? [...data.repairs, ...data.phones] : [];
  const methods = [...PAYMENT_METHODS, NO_METHOD];
  const byMethod = Object.fromEntries(methods.map((m) => [m, sales.filter((x) => x.method === m).reduce((s, x) => s + x.amount, 0)]));
  const depositsTotal = data ? data.deposits.reduce((s, x) => s + x.amount, 0) : 0;
  const salesTotal = sales.reduce((s, x) => s + x.amount, 0);

  const dayLabel = new Date(`${day}T12:00:00`).toLocaleDateString('pl-PL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  const handlePrint = () => {
    if (!data || blockPrintInNativeApp()) return;
    const rows = (list) => list.map((x) => `<tr><td>${fmtTime(x.at)}</td><td>${esc(x.label)}${x.who ? ` — ${esc(x.who)}` : ''}</td><td>${esc(x.method)}</td><td class="r">${zl(x.amount)}</td></tr>`).join('')
      || '<tr><td colspan="4" class="empty">brak</td></tr>';
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Raport kasy ${day}</title><style>
      body{font-family:-apple-system,Helvetica,Arial,sans-serif;font-size:11px;color:#111;padding:14px}
      h1{font-size:16px;margin:0 0 2px}h2{font-size:12px;margin:14px 0 4px;text-transform:uppercase}
      table{width:100%;border-collapse:collapse}td,th{border:1px solid #bbb;padding:3px 6px;text-align:left}
      th{background:#f2f2f2}.r{text-align:right;white-space:nowrap}.empty{color:#888;text-align:center}
      .sum td{font-weight:700}@media print{@page{size:A4;margin:12mm}}
    </style></head><body>
      <h1>Raport kasy — Fonexpert</h1><p>${esc(dayLabel)}</p>
      <h2>Podsumowanie wg sposobu płatności</h2>
      <table><tr><th>Sposób płatności</th><th class="r">Kwota</th></tr>
      ${methods.filter((m) => m !== NO_METHOD || byMethod[m] > 0).map((m) => `<tr><td>${esc(m)}</td><td class="r">${zl(byMethod[m])}</td></tr>`).join('')}
      <tr class="sum"><td>Razem sprzedaż (naprawy + telefony)</td><td class="r">${zl(salesTotal)}</td></tr>
      <tr><td>Zadatki przyjęte tego dnia</td><td class="r">${zl(depositsTotal)}</td></tr></table>
      <h2>Wydane naprawy</h2><table><tr><th>Godz.</th><th>Zlecenie</th><th>Płatność</th><th class="r">Kwota</th></tr>${rows(data.repairs)}</table>
      <h2>Sprzedane telefony</h2><table><tr><th>Godz.</th><th>Telefon</th><th>Płatność</th><th class="r">Kwota</th></tr>${rows(data.phones)}</table>
      <h2>Zadatki</h2><table><tr><th>Godz.</th><th>Zlecenie</th><th>Płatność</th><th class="r">Kwota</th></tr>${rows(data.deposits)}</table>
    </body></html>`;
    const w = window.open('', '_blank', 'width=800,height=1000');
    if (!w) { alert('Przeglądarka zablokowała okno wydruku. Zezwól na wyskakujące okna dla tej strony.'); return; }
    w.document.write(html);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 250);
  };

  const Section = ({ title, list, linkTo }) => (
    <div className="cr-card">
      <h2 className="cr-section-title">{title} ({list.length})</h2>
      {list.length === 0 ? <p className="cr-empty">Brak</p> : (
        <div className="cr-list">
          {list.map((x) => (
            <button key={x.id} type="button" className="cr-row" onClick={() => navigate(linkTo(x.id))}>
              <span className="cr-time">{fmtTime(x.at)}</span>
              <span className="cr-label">{x.label}{x.who ? <em> — {x.who}</em> : null}</span>
              <span className="cr-method">{PAYMENT_ICONS[x.method] || '❔'} {x.method}</span>
              <span className="cr-amount">{zl(x.amount)}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="cr-page">
      <header className="cr-header">
        <div>
          <h1 className="cr-title">Kasa</h1>
          <p className="cr-sub">{dayLabel}</p>
        </div>
        <div className="cr-actions">
          <input type="date" className="cr-date" value={day} max={todayInput()} onChange={(e) => e.target.value && setDay(e.target.value)} />
          <button type="button" className="cr-btn" onClick={handlePrint} disabled={!data}>🖨️ Drukuj raport</button>
        </div>
      </header>

      {error && <div className="cr-error">{error}</div>}
      {!data && !error && <p className="cr-empty">Wczytuję…</p>}

      {data && (
        <>
          <div className="cr-tiles">
            {methods.filter((m) => m !== NO_METHOD || byMethod[m] > 0).map((m) => (
              <div key={m} className="cr-tile">
                <span className="cr-tile-label">{PAYMENT_ICONS[m] || '❔'} {m}</span>
                <span className="cr-tile-value">{zl(byMethod[m])}</span>
              </div>
            ))}
            <div className="cr-tile cr-tile-total">
              <span className="cr-tile-label">Razem sprzedaż</span>
              <span className="cr-tile-value">{zl(salesTotal)}</span>
            </div>
            <div className="cr-tile">
              <span className="cr-tile-label">Zadatki przyjęte</span>
              <span className="cr-tile-value">{zl(depositsTotal)}</span>
            </div>
          </div>

          <Section title="Wydane naprawy" list={data.repairs} linkTo={(id) => `/zlecenia/${id}`} />
          <Section title="Sprzedane telefony" list={data.phones} linkTo={(id) => `/skup/${id}`} />
          <Section title="Zadatki" list={data.deposits} linkTo={(id) => `/zlecenia/${id}`} />
          <p className="cr-hint">„Nie podano” = sprzedaż sprzed wprowadzenia wyboru płatności albo bez wybranej metody. Zadatki nie mają metody płatności.</p>
        </>
      )}
    </div>
  );
}
