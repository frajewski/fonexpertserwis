// ============================================================
//  BuybackRequestsPage.jsx – „Wyceny skupu” (tylko admin)
//  Zapytania o wycenę z zakładki „Urządzenia” w panelu klienta
//  (kolekcja buybackRequests, zapis przez createBuybackRequestWeb).
// ============================================================
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, deleteDoc, doc, onSnapshot, orderBy, query, updateDoc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '../firebase/firebaseConfig';
import StoragePhotos from '../components/StoragePhotos';
import SHOP from '../constants/shopInfo';
import './BookingsPage.css';

export const BUYBACK_STATUS = { NEW: 'Nowe', QUOTED: 'Wycenione', BOUGHT: 'Kupione', REJECTED: 'Odrzucone' };
const ACTIVE = [BUYBACK_STATUS.NEW, BUYBACK_STATUS.QUOTED];
const TONE = { Nowe: 'info', Wycenione: 'wait', Kupione: 'good', Odrzucone: 'neutral' };

const fmtDateTime = (iso) => (iso ? new Date(iso).toLocaleString('pl-PL', { dateStyle: 'short', timeStyle: 'short' }) : '—');
const toNumber = (v) => parseFloat(String(v || '').replace(',', '.')) || 0;
const deviceName = (b) => [b.brand, b.model, b.storage].filter(Boolean).join(' ');

function Detail({ label, children }) {
  return (<><dt className="bk-dt">{label}</dt><dd className="bk-dd">{children}</dd></>);
}

function quoteSmsText(b, price, note) {
  return [
    `Dzień dobry${b.customerName ? `, ${b.customerName.split(' ')[0]}` : ''}! Dziękujemy za zapytanie o wycenę ${deviceName(b)}.`,
    `Wstępnie możemy zaproponować ${price} zł.`,
    note,
    'Ostateczna cena po sprawdzeniu urządzenia na miejscu — zapraszamy z dokumentem tożsamości.',
    `${SHOP.name}, Pasaż Kaufland Płońsk, tel. ${SHOP.blikPhone}`,
  ].filter(Boolean).join(' ');
}

export default function BuybackRequestsPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [showAll, setShowAll] = useState(false);
  const [openId, setOpenId] = useState(null);
  const [drafts, setDrafts] = useState({});
  const [busyId, setBusyId] = useState(null);
  const [smsDialog, setSmsDialog] = useState(null);

  useEffect(() => {
    const q = query(collection(db, 'buybackRequests'), orderBy('createdAt', 'desc'));
    return onSnapshot(q,
      (snap) => { setItems(snap.docs.map((d) => ({ id: d.id, ...d.data() }))); setLoading(false); },
      (err) => { console.error(err); setLoadError(err.message); setLoading(false); });
  }, []);

  const visible = useMemo(() => (showAll ? items : items.filter((b) => ACTIVE.includes(b.status))), [items, showAll]);
  const draft = (b) => ({ price: b.offerPrice ?? '', note: b.adminNote || '', ...(drafts[b.id] || {}) });
  const setDraft = (id, patch) => setDrafts((d) => ({ ...d, [id]: { ...(d[id] || {}), ...patch } }));

  const run = async (id, fn) => {
    setBusyId(id);
    try { await fn(); } catch (err) { alert(err?.message || 'Coś poszło nie tak.'); } finally { setBusyId(null); }
  };
  const setStatus = (b, status, extra = {}) => run(b.id, () => updateDoc(doc(db, 'buybackRequests', b.id), { status, updatedAt: new Date().toISOString(), ...extra }));

  const handleQuote = (b) => {
    const d = draft(b);
    const price = toNumber(d.price);
    if (!price) { alert('Wpisz proponowaną cenę.'); return; }
    const text = quoteSmsText(b, price, d.note.trim());
    setSmsDialog({ b, text, sending: false, after: { status: BUYBACK_STATUS.QUOTED, offerPrice: price, adminNote: d.note.trim(), quotedAt: new Date().toISOString() } });
  };
  const handleCustomSms = (b) => setSmsDialog({ b, text: `Dzień dobry! Dot. wyceny ${deviceName(b)}: ${SHOP.name}`, sending: false, after: null });

  const confirmSms = async () => {
    const text = smsDialog.text.trim();
    if (!text) { alert('Treść SMS jest pusta.'); return; }
    setSmsDialog((d) => ({ ...d, sending: true }));
    try {
      const { b, after } = smsDialog;
      await httpsCallable(functions, 'sendSmsToCustomer')({ phone: b.customerPhone, text, buybackId: b.id, kind: 'buyback' });
      if (after) await updateDoc(doc(db, 'buybackRequests', b.id), { ...after, updatedAt: new Date().toISOString() });
      setSmsDialog(null);
    } catch (err) {
      alert(err?.message || 'Nie udało się wysłać SMS.');
      setSmsDialog((d) => (d ? { ...d, sending: false } : d));
    }
  };
  const saveWithoutSms = async () => {
    const { b, after } = smsDialog;
    if (after) await setStatus(b, after.status, after);
    setSmsDialog(null);
  };

  const handleDelete = (b) => {
    if (!window.confirm(`Usunąć zapytanie ${deviceName(b)} (${b.customerName})?`)) return;
    run(b.id, () => deleteDoc(doc(db, 'buybackRequests', b.id)));
  };

  const countActive = items.filter((b) => ACTIVE.includes(b.status)).length;

  return (
    <div className="bk-page">
      <header className="bk-header">
        <h1 className="bk-title">Wyceny skupu</h1>
        <p className="bk-count">Zapytania klientów z zakładki „Urządzenia” na stronie</p>
        <div className="bk-tabs">
          <button type="button" className={`bk-tab ${!showAll ? 'bk-tab-on' : ''}`} onClick={() => setShowAll(false)}>Aktywne ({countActive})</button>
          <button type="button" className={`bk-tab ${showAll ? 'bk-tab-on' : ''}`} onClick={() => setShowAll(true)}>Wszystkie ({items.length})</button>
        </div>
      </header>

      {loadError && <div className="bk-empty">Nie udało się wczytać: {loadError}</div>}

      <div className="bk-list">
        {visible.map((b) => {
          const isOpen = openId === b.id;
          const busy = busyId === b.id;
          const d = draft(b);
          return (
            <div key={b.id} className={`bk-card ${isOpen ? 'bk-card-open' : ''}`}>
              <div className="bk-row-top" onClick={() => setOpenId(isOpen ? null : b.id)}>
                <div>
                  <div className="bk-device">{deviceName(b) || 'Urządzenie'}</div>
                  <div className="bk-customer">{b.customerName || 'Klient'}{b.customerPhone && ` · ${b.customerPhone}`}</div>
                  <div className="bk-desc">{[b.condition, b.batteryHealth && `bateria ${b.batteryHealth}%`, (b.photoPaths || []).length && `📷 ${b.photoPaths.length}`].filter(Boolean).join(' · ')}</div>
                </div>
                <div className="bk-row-right">
                  <span className={`bk-badge bk-badge-${TONE[b.status] || 'neutral'}`}>{b.status}{b.offerPrice ? ` · ${b.offerPrice} zł` : ''}</span>
                  <span className="bk-date">{fmtDateTime(b.createdAt)}</span>
                </div>
              </div>

              {isOpen && (
                <div className="bk-body">
                  <dl className="bk-details">
                    <Detail label="Klient">{b.customerName || '—'}</Detail>
                    <Detail label="Telefon">{b.customerPhone ? <a href={`tel:${b.customerPhone}`}>{b.customerPhone}</a> : '—'}</Detail>
                    <Detail label="Urządzenie">{[b.deviceType, deviceName(b)].filter(Boolean).join(' · ') || '—'}</Detail>
                    <Detail label="Stan">{b.condition || '—'}</Detail>
                    <Detail label="Bateria">{b.batteryHealth ? `${b.batteryHealth}%` : 'nie podano'}</Detail>
                    <Detail label="W zestawie">{(b.accessories || []).length ? b.accessories.map((a) => <span key={a} className="bk-chip">{a}</span>) : '—'}</Detail>
                    <Detail label="Opis klienta"><span className="bk-pre">{b.description || '—'}</span></Detail>
                    {(b.photoPaths || []).length > 0 && <Detail label={`Zdjęcia (${b.photoPaths.length})`}><StoragePhotos paths={b.photoPaths} /></Detail>}
                    <Detail label="Wysłano">{fmtDateTime(b.createdAt)}</Detail>
                    {b.offerPrice ? <Detail label="Nasza oferta"><strong>{b.offerPrice} zł</strong>{b.quotedAt ? ` · ${fmtDateTime(b.quotedAt)}` : ''}</Detail> : null}
                  </dl>

                  {ACTIVE.includes(b.status) && (
                    <div className="bk-actions">
                      <div className="bk-actions-row">
                        <input className="bk-price" inputMode="decimal" placeholder="Proponowana cena (zł)" value={d.price} onChange={(e) => setDraft(b.id, { price: e.target.value })} />
                      </div>
                      <textarea className="bk-note" rows={2} placeholder="Dodatkowa informacja do SMS (opcjonalnie), np. cena przy sprawnym Face ID" value={d.note} onChange={(e) => setDraft(b.id, { note: e.target.value })} />
                      <div className="bk-actions-row">
                        <button className="bk-btn-primary" disabled={busy} onClick={() => handleQuote(b)}>📲 {b.status === BUYBACK_STATUS.QUOTED ? 'Wyślij nową wycenę' : 'Wyślij wycenę SMS'}</button>
                        <button className="bk-btn-ghost" disabled={busy} onClick={() => handleCustomSms(b)}>✉️ Inny SMS</button>
                      </div>
                      <div className="bk-actions-row">
                        <button className="bk-btn-ghost" disabled={busy} onClick={() => setStatus(b, BUYBACK_STATUS.BOUGHT, { boughtAt: new Date().toISOString() })}>✅ Kupione</button>
                        <button className="bk-btn-warn" disabled={busy} onClick={() => setStatus(b, BUYBACK_STATUS.REJECTED)}>Odrzuć / klient zrezygnował</button>
                      </div>
                    </div>
                  )}

                  {b.status === BUYBACK_STATUS.BOUGHT && (
                    <div className="bk-actions-row">
                      <button className="bk-btn-primary" onClick={() => navigate('/umowa')}>📝 Umowa skupu →</button>
                    </div>
                  )}
                  {!ACTIVE.includes(b.status) && (
                    <div className="bk-actions-row">
                      <button className="bk-btn-ghost" disabled={busy} onClick={() => setStatus(b, b.offerPrice ? BUYBACK_STATUS.QUOTED : BUYBACK_STATUS.NEW)}>↩︎ Przywróć do aktywnych</button>
                    </div>
                  )}

                  <div className="bk-actions-row bk-delete-row">
                    <button className="bk-btn-delete" disabled={busy} onClick={() => handleDelete(b)}>🗑 Usuń zapytanie</button>
                  </div>

                  {(b.smsLog || []).length > 0 && (
                    <div className="bk-sms-log">
                      {[...b.smsLog].sort((x, y) => (y.at || '').localeCompare(x.at || '')).map((m, i) => (
                        <div key={`${m.at}-${i}`} className="bk-sms-item"><span className="bk-sms-meta">📲 {fmtDateTime(m.at)}</span> {m.text}</div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {!loading && visible.length === 0 && !loadError && (
          <div className="bk-empty">{showAll ? 'Brak zapytań o wycenę' : 'Brak aktywnych zapytań o wycenę'}</div>
        )}
      </div>

      {smsDialog && (
        <div className="bk-modal-backdrop" role="presentation" onClick={() => !smsDialog.sending && setSmsDialog(null)}>
          <div className="bk-modal" role="dialog" aria-modal="true" aria-label="SMS do klienta" onClick={(e) => e.stopPropagation()}>
            <h2 className="bk-modal-title">SMS do klienta</h2>
            <p className="bk-modal-sub">Na numer {smsDialog.b.customerPhone} · możesz poprawić treść przed wysłaniem</p>
            <textarea className="bk-note bk-modal-text" rows={6} value={smsDialog.text} onChange={(e) => setSmsDialog((x) => ({ ...x, text: e.target.value }))} autoFocus />
            <div className="bk-modal-count">{smsDialog.text.length} znaków</div>
            <div className="bk-actions-row">
              <button className="bk-btn-ghost" disabled={smsDialog.sending} onClick={() => setSmsDialog(null)}>Anuluj</button>
              {smsDialog.after && <button className="bk-btn-ghost" disabled={smsDialog.sending} onClick={saveWithoutSms}>Zapisz bez SMS</button>}
              <button className="bk-btn-primary" disabled={smsDialog.sending} onClick={confirmSms}>{smsDialog.sending ? 'Wysyłam…' : '📲 Wyślij SMS'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
