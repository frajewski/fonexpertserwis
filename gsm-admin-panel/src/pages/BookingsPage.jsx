// ============================================================
//  BookingsPage.jsx – „Rezerwacje” (/rezerwacje)
//
//  Zgłoszenia ze strony klienta („Umów naprawę”, gsmw). Kliknięcie w zgłoszenie
//  rozwija pełne szczegóły. Akceptacja:
//    • nadaje numer rezerwacji (R001/2026 – licznik w counters/bookings-ROK),
//    • zapisuje odpowiedź dla klienta, wstępną cenę i ewentualny zadatek,
//    • proponuje SMS z numerem i – przy zadatku – instrukcją wpłaty BLIK-iem
//      na numer telefonu z numerem rezerwacji w tytule.
//  Wpłatę zadatku oznaczasz ręcznie; przy tworzeniu zlecenia przechodzi ona
//  do zlecenia jako zadatek (i do raportu Kasy).
// ============================================================

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { doc, runTransaction } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '../firebase/firebaseConfig';
import useStore from '../store/useStore';
import { BOOKING_STATUS, BOOKING_STATUS_ICONS } from '../constants/bookingStatuses';
import STATUS from '../constants/statuses';
import SHOP from '../constants/shopInfo';
import './BookingsPage.css';

const TONE = {
  [BOOKING_STATUS.PENDING]: 'wait', [BOOKING_STATUS.ACCEPTED]: 'good',
  [BOOKING_STATUS.RESCHEDULED]: 'info', [BOOKING_STATUS.REJECTED]: 'warn', [BOOKING_STATUS.CONVERTED]: 'neutral',
};
const ACTIVE = [BOOKING_STATUS.PENDING, BOOKING_STATUS.ACCEPTED];

const normalizePhone = (v) => (v || '').replace(/\D/g, '').replace(/^48/, '');
const fmtDate = (iso) => (iso ? new Date(iso).toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—');
const fmtDateTime = (iso) => (iso ? new Date(iso).toLocaleString('pl-PL', { dateStyle: 'short', timeStyle: 'short' }) : '—');
const fmtPreferred = (v) => (/^\d{4}-\d{2}-\d{2}$/.test(v || '')
  ? new Date(`${v}T12:00:00`).toLocaleDateString('pl-PL', { weekday: 'long', day: 'numeric', month: 'long' })
  : v);
const toNumber = (v) => parseFloat(String(v || '').replace(',', '.')) || 0;
const deviceName = (b) => [b.brand, b.model].filter(Boolean).join(' ');

// Kolejny numer rezerwacji: R001/2026, R002/2026… (transakcja – bez duplikatów)
async function nextBookingNumber() {
  const year = new Date().getFullYear();
  const ref = doc(db, 'counters', `bookings-${year}`);
  const seq = await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    const next = (snap.exists() ? snap.data().last || 0 : 0) + 1;
    tx.set(ref, { last: next }, { merge: true });
    return next;
  });
  return `R${String(seq).padStart(3, '0')}/${year}`;
}

function acceptSmsText(b, { number, note, price, deposit }) {
  return [
    `Dzień dobry! Rezerwacja ${number} (${deviceName(b)}) przyjęta.`,
    note,
    price ? `Wstępna cena: ${price} zł.` : '',
    deposit ? `Prosimy o zadatek ${deposit} zł BLIK-iem na nr ${SHOP.blikPhone}, w tytule: ${number}.` : '',
    SHOP.name,
  ].filter(Boolean).join(' ');
}

// SMS do klienta przez bramkę (z potwierdzeniem); zapisuje się w historii zgłoszenia
async function offerSms(booking, text) {
  const phone = booking.customerPhone;
  if (!phone) { alert('Zgłoszenie nie ma numeru telefonu – SMS nie zostanie wysłany.'); return; }
  if (!window.confirm(`Wysłać klientowi SMS na numer ${phone}?\n\n„${text}”`)) return;
  try {
    await httpsCallable(functions, 'sendSmsToCustomer')({ phone, text, bookingId: booking.id, kind: 'booking' });
  } catch (err) {
    alert(err?.message || 'Nie udało się wysłać SMS.');
  }
}

function Detail({ label, children }) {
  return (
    <>
      <dt className="bk-dt">{label}</dt>
      <dd className="bk-dd">{children}</dd>
    </>
  );
}

export default function BookingsPage() {
  const navigate = useNavigate();
  const bookings = useStore((s) => s.getVisibleBookings());
  const updateBooking = useStore((s) => s.updateBooking);
  const getUserById = useStore((s) => s.getUserById);
  const customers = useStore((s) => s.getCustomers());
  const addWalkInCustomer = useStore((s) => s.addWalkInCustomer);
  const addRepair = useStore((s) => s.addRepair);

  const [openId, setOpenId] = useState(null);
  const [showAll, setShowAll] = useState(false);
  const [drafts, setDrafts] = useState({});
  const [busyId, setBusyId] = useState(null);

  const draft = (id) => ({ note: '', price: '', depositRequired: false, deposit: '', ...(drafts[id] || {}) });
  const setDraft = (id, k, v) => setDrafts((p) => ({ ...p, [id]: { ...draft(id), ...(p[id] || {}), [k]: v } }));

  const sorted = [...bookings].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const visible = showAll ? sorted : sorted.filter((b) => ACTIVE.includes(b.status));

  const withBusy = (id, fn) => async (...args) => {
    setBusyId(id);
    try { await fn(...args); } catch (err) { alert(err?.message || 'Coś poszło nie tak.'); } finally { setBusyId(null); }
  };

  const handleAccept = (b) => withBusy(b.id, async () => {
    const d = draft(b.id);
    const note = d.note.trim();
    if (!note) { alert('Wpisz odpowiedź dla klienta (np. termin wizyty).'); return; }
    const price = toNumber(d.price);
    const deposit = d.depositRequired ? toNumber(d.deposit) : 0;
    if (d.depositRequired && deposit <= 0) { alert('Podaj kwotę zadatku.'); return; }
    const number = b.bookingNumber || await nextBookingNumber();
    await updateBooking(b.id, {
      status: BOOKING_STATUS.ACCEPTED,
      bookingNumber: number,
      adminNote: note,
      estimatedPrice: price,
      depositRequired: deposit > 0,
      depositAmount: deposit,
      depositPaidAt: null,
      acceptedAt: new Date().toISOString(),
    });
    await offerSms(b, acceptSmsText(b, { number, note, price, deposit }));
  })();

  const handleReject = (b) => withBusy(b.id, async () => {
    const note = draft(b.id).note.trim();
    if (!note) { alert('Wpisz powód odrzucenia (trafi do klienta).'); return; }
    if (!window.confirm('Na pewno odrzucić to zgłoszenie?')) return;
    await updateBooking(b.id, { status: BOOKING_STATUS.REJECTED, adminNote: note });
    await offerSms(b, `Dzień dobry! Dot. zgłoszenia naprawy ${deviceName(b)}: ${note} ${SHOP.name}`);
  })();

  const handleDepositPaid = (b) => withBusy(b.id, async () => {
    if (!window.confirm(`Potwierdzić wpłatę zadatku ${b.depositAmount} zł (tytuł: ${b.bookingNumber})?`)) return;
    await updateBooking(b.id, { depositPaidAt: new Date().toISOString() });
  })();

  const handleResend = (b) => withBusy(b.id, async () => {
    await offerSms(b, acceptSmsText(b, {
      number: b.bookingNumber, note: b.adminNote, price: b.estimatedPrice, deposit: b.depositPaidAt ? 0 : b.depositAmount,
    }));
  })();

  // Zgłoszenie ze strony nie ma konta klienta – szukamy klienta po numerze
  // telefonu, a jeśli go nie ma, zakładamy klienta „z ulicy”.
  const handleConvert = (b) => withBusy(b.id, async () => {
    if (b.depositRequired && !b.depositPaidAt
      && !window.confirm('Zadatek nie jest oznaczony jako wpłacony. Utworzyć zlecenie mimo to?')) return;
    if (!window.confirm('Utworzyć zlecenie naprawy z tej rezerwacji?')) return;
    let customerId = b.customerId;
    if (!customerId) {
      const phone = normalizePhone(b.customerPhone);
      const existing = phone ? customers.find((c) => normalizePhone(c.phone) === phone) : null;
      customerId = existing?.id
        || (await addWalkInCustomer({ name: b.customerName || 'Klient', phone: b.customerPhone || '', email: '' })).id;
    }
    const issueText = b.needsDiagnosis ? 'Diagnoza' : (b.issues || []).join(', ');
    const repair = await addRepair({
      customerId,
      brand: b.brand,
      model: b.model || '',
      imei: '',
      description: [issueText, b.description, b.bookingNumber && `(rezerwacja ${b.bookingNumber})`].filter(Boolean).join(' — '),
      status: STATUS.ACCEPTED,
      photos: [],
      partsCost: 0,
      serviceCost: b.estimatedPrice || 0,
      deposit: b.depositPaidAt ? (b.depositAmount || 0) : 0,
      estimateAccepted: b.estimatedPrice > 0 ? true : null,
      screenLock: '',
      documentType: '',
      customerNip: '',
    });
    await updateBooking(b.id, { status: BOOKING_STATUS.CONVERTED, linkedRepairId: repair.id, customerId });
    navigate(`/zlecenia/${repair.id}`);
  })();

  return (
    <div className="bk-page">
      <header className="bk-header">
        <h1 className="bk-title">Rezerwacje</h1>
        <div className="bk-tabs">
          <button type="button" className={`bk-tab ${!showAll ? 'bk-tab-on' : ''}`} onClick={() => setShowAll(false)}>
            Aktywne ({sorted.filter((b) => ACTIVE.includes(b.status)).length})
          </button>
          <button type="button" className={`bk-tab ${showAll ? 'bk-tab-on' : ''}`} onClick={() => setShowAll(true)}>
            Wszystkie ({sorted.length})
          </button>
        </div>
      </header>

      <div className="bk-list">
        {visible.map((b) => {
          const customer = b.customerId ? getUserById(b.customerId) : null;
          const tone = TONE[b.status] || 'neutral';
          const isOpen = openId === b.id;
          const d = draft(b.id);
          const busy = busyId === b.id;
          const issueSummary = b.needsDiagnosis ? '🔍 Diagnoza' : (b.issues || []).join(', ');
          const phone = b.customerPhone || customer?.phone || '';
          const depositPending = b.depositRequired && !b.depositPaidAt;

          return (
            <div key={b.id} className={`bk-card ${isOpen ? 'bk-card-open' : ''}`}>
              <div className="bk-row-top" onClick={() => setOpenId(isOpen ? null : b.id)}>
                <div>
                  <div className="bk-device">
                    {b.bookingNumber && <span className="bk-number">{b.bookingNumber}</span>}
                    {deviceName(b) || 'Urządzenie'}
                  </div>
                  <div className="bk-customer">
                    {customer?.name || b.customerName || 'Klient bez konta'}
                    {b.company && ` · ${b.company}`}
                    {phone && ` · ${phone}`}
                  </div>
                  {(issueSummary || b.description) && <div className="bk-desc">{issueSummary || b.description}</div>}
                </div>
                <div className="bk-row-right">
                  <span className={`bk-badge bk-badge-${tone}`}>{BOOKING_STATUS_ICONS[b.status]} {b.status}</span>
                  {depositPending && b.status === BOOKING_STATUS.ACCEPTED && <span className="bk-badge bk-badge-wait">💰 czeka na zadatek</span>}
                  <span className="bk-date">{fmtDate(b.createdAt)}</span>
                </div>
              </div>

              {isOpen && (
                <div className="bk-body">
                  <dl className="bk-details">
                    {b.bookingNumber && <Detail label="Nr rezerwacji"><strong>{b.bookingNumber}</strong></Detail>}
                    <Detail label="Klient">{customer?.name || b.customerName || '—'}</Detail>
                    <Detail label="Telefon">{phone ? <a href={`tel:${phone}`}>{phone}</a> : '—'}</Detail>
                    {b.company && <Detail label="Firma">{b.company}</Detail>}
                    <Detail label="Urządzenie">{deviceName(b) || '—'}</Detail>
                    <Detail label="Usterka">
                      {b.needsDiagnosis ? <span className="bk-chip bk-chip-diag">🔍 Potrzebna diagnoza</span>
                        : (b.issues || []).length ? (b.issues || []).map((i) => <span key={i} className="bk-chip">{i}</span>)
                          : '—'}
                    </Detail>
                    <Detail label="Opis klienta"><span className="bk-pre">{b.description || '—'}</span></Detail>
                    <Detail label="Preferowany termin">{b.preferredDate ? fmtPreferred(b.preferredDate) : 'dowolny'}</Detail>
                    <Detail label="Zgłoszono">{fmtDateTime(b.createdAt)}{b.source === 'web' ? ' · ze strony' : ''}</Detail>
                    {b.adminNote && <Detail label="Odpowiedź serwisu">{b.adminNote}</Detail>}
                    {b.estimatedPrice > 0 && <Detail label="Wstępna cena">{b.estimatedPrice} zł</Detail>}
                    {b.depositRequired && (
                      <Detail label="Zadatek">
                        {b.depositAmount} zł BLIK na {SHOP.blikPhone} ·{' '}
                        {b.depositPaidAt ? <strong className="bk-ok">wpłacony {fmtDateTime(b.depositPaidAt)}</strong> : <strong className="bk-wait">czeka na wpłatę</strong>}
                      </Detail>
                    )}
                  </dl>

                  {b.status === BOOKING_STATUS.PENDING && (
                    <div className="bk-actions">
                      <textarea
                        className="bk-note"
                        placeholder="Odpowiedź dla klienta – np. „Zapraszamy w czwartek 30.10 o 12:00.” (trafi do SMS-a)"
                        value={d.note}
                        onChange={(e) => setDraft(b.id, 'note', e.target.value)}
                      />
                      <div className="bk-inline">
                        <input className="bk-price" inputMode="decimal" placeholder="Wstępna cena (zł, opcjonalnie)" value={d.price} onChange={(e) => setDraft(b.id, 'price', e.target.value)} />
                        <label className="bk-check">
                          <input type="checkbox" checked={d.depositRequired} onChange={(e) => setDraft(b.id, 'depositRequired', e.target.checked)} />
                          Wymagaj zadatku BLIK
                        </label>
                        {d.depositRequired && (
                          <input className="bk-price bk-price-sm" inputMode="decimal" placeholder="Kwota zadatku (zł)" value={d.deposit} onChange={(e) => setDraft(b.id, 'deposit', e.target.value)} />
                        )}
                      </div>
                      {d.note.trim() && (
                        <p className="bk-preview">
                          <span>Podgląd SMS:</span>{' '}
                          {acceptSmsText(b, {
                            number: b.bookingNumber || 'R…/…',
                            note: d.note.trim(),
                            price: toNumber(d.price),
                            deposit: d.depositRequired ? toNumber(d.deposit) : 0,
                          })}
                        </p>
                      )}
                      <div className="bk-actions-row">
                        <button className="bk-btn-warn" disabled={busy} onClick={() => handleReject(b)}>Odrzuć</button>
                        <button className="bk-btn-primary" disabled={busy} onClick={() => handleAccept(b)}>
                          {busy ? 'Zapisuję…' : 'Zaakceptuj i nadaj numer'}
                        </button>
                      </div>
                    </div>
                  )}

                  {b.status === BOOKING_STATUS.ACCEPTED && (
                    <div className="bk-actions-row bk-actions-wrap">
                      <button className="bk-btn-ghost" disabled={busy} onClick={() => handleResend(b)}>📲 Wyślij SMS ponownie</button>
                      {depositPending && (
                        <button className="bk-btn-ghost" disabled={busy} onClick={() => handleDepositPaid(b)}>💰 Zadatek wpłacony</button>
                      )}
                      <button className="bk-btn-primary" disabled={busy} onClick={() => handleConvert(b)}>
                        {busy ? 'Chwila…' : '🔧 Utwórz zlecenie naprawy'}
                      </button>
                    </div>
                  )}

                  {b.status === BOOKING_STATUS.CONVERTED && b.linkedRepairId && (
                    <div className="bk-actions-row">
                      <button className="bk-btn-primary" onClick={() => navigate(`/zlecenia/${b.linkedRepairId}`)}>Otwórz zlecenie →</button>
                    </div>
                  )}

                  {(b.smsLog || []).length > 0 && (
                    <div className="bk-sms-log">
                      {[...b.smsLog].sort((x, y) => (y.at || '').localeCompare(x.at || '')).map((m, i) => (
                        <div key={`${m.at}-${i}`} className="bk-sms-item">
                          <span className="bk-sms-meta">📲 {fmtDateTime(m.at)}</span> {m.text}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {visible.length === 0 && (
          <div className="bk-empty">{showAll ? 'Brak zgłoszeń rezerwacji' : 'Brak aktywnych rezerwacji'}</div>
        )}
      </div>
    </div>
  );
}
