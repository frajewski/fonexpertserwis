import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useStore from '../store/useStore';
import { BOOKING_STATUS, BOOKING_STATUS_ICONS } from '../constants/bookingStatuses';
import STATUS from '../constants/statuses';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase/firebaseConfig';
import './BookingsPage.css';

const normalizePhone = (v) => (v || '').replace(/\D/g, '').replace(/^48/, '');
const fmtDateTime = (iso) => (iso ? new Date(iso).toLocaleString('pl-PL', { dateStyle: 'short', timeStyle: 'short' }) : '');

// SMS do klienta przez bramkę (z potwierdzeniem); zapisuje się w historii zgłoszenia
async function offerSms(booking, text) {
  const phone = booking.customerPhone;
  if (!phone) return;
  if (!window.confirm(`Wysłać klientowi SMS na numer ${phone}?\n\n„${text}”`)) return;
  try {
    await httpsCallable(functions, 'sendSmsToCustomer')({ phone, text, bookingId: booking.id, kind: 'booking' });
  } catch (err) {
    alert(err?.message || 'Nie udało się wysłać SMS.');
  }
}

const TONE = {
  [BOOKING_STATUS.PENDING]: 'wait', [BOOKING_STATUS.ACCEPTED]: 'good',
  [BOOKING_STATUS.RESCHEDULED]: 'info', [BOOKING_STATUS.REJECTED]: 'warn', [BOOKING_STATUS.CONVERTED]: 'neutral',
};

const fmtDate = (iso) => iso ? new Date(iso).toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—';

export default function BookingsPage() {
  const navigate = useNavigate();
  const bookings = useStore((s) => s.getVisibleBookings());
  const updateBooking = useStore((s) => s.updateBooking);
  const getUserById = useStore((s) => s.getUserById);
  const customers = useStore((s) => s.getCustomers());
  const addWalkInCustomer = useStore((s) => s.addWalkInCustomer);
  const addRepair = useStore((s) => s.addRepair);
  const [busyId, setBusyId] = useState(null);

  const [openId, setOpenId] = useState(null);
  const [noteDrafts, setNoteDrafts] = useState({});
  const [priceDrafts, setPriceDrafts] = useState({});

  const sorted = [...bookings].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const handleAccept = async (b) => {
    const note = (noteDrafts[b.id] || '').trim();
    if (!note) { alert('Dodaj krótką informację dla klienta.'); return; }
    const price = parseFloat(String(priceDrafts[b.id] || '').replace(',', '.')) || 0;
    await updateBooking(b.id, {
      status: BOOKING_STATUS.ACCEPTED,
      adminNote: note,
      estimatedPrice: price,
    });
    setOpenId(null);
    await offerSms(b, `Dzień dobry! Dot. zgłoszenia naprawy ${[b.brand, b.model].filter(Boolean).join(' ')}: ${note}${price ? ` Wstępna cena: ${price} zł.` : ''} Fonexpert`);
  };

  const handleReject = async (b) => {
    const note = (noteDrafts[b.id] || '').trim();
    if (!note) { alert('Podaj powód odrzucenia.'); return; }
    if (!confirm('Na pewno odwołać ten termin?')) return;
    await updateBooking(b.id, { status: BOOKING_STATUS.REJECTED, adminNote: note });
    setOpenId(null);
    await offerSms(b, `Dzień dobry! Dot. zgłoszenia naprawy ${[b.brand, b.model].filter(Boolean).join(' ')}: ${note} Fonexpert`);
  };

  // Zgłoszenie ze strony nie ma konta klienta – szukamy klienta po numerze
  // telefonu, a jeśli go nie ma, zakładamy klienta „z ulicy”.
  const handleConvert = async (b) => {
    if (!confirm('Utworzyć zlecenie naprawy z tego zgłoszenia?')) return;
    setBusyId(b.id);
    try {
      let customerId = b.customerId;
      if (!customerId) {
        const phone = normalizePhone(b.customerPhone);
        const existing = phone ? customers.find((c) => normalizePhone(c.phone) === phone) : null;
        customerId = existing?.id
          || (await addWalkInCustomer({ name: b.customerName || 'Klient', phone: b.customerPhone || '', email: '' })).id;
      }
      const repair = await addRepair({
        customerId,
        brand: b.brand,
        model: b.model || '',
        imei: '',
        description: [b.description, b.preferredDate && `(preferowany termin: ${b.preferredDate})`].filter(Boolean).join(' '),
        status: STATUS.ACCEPTED,
        photos: [],
        partsCost: 0,
        serviceCost: b.estimatedPrice || 0,
        deposit: 0,
        estimateAccepted: b.estimatedPrice > 0 ? true : null,
        screenLock: '',
        documentType: '',
        customerNip: '',
      });
      await updateBooking(b.id, { status: BOOKING_STATUS.CONVERTED, linkedRepairId: repair.id, customerId });
      navigate(`/zlecenia/${repair.id}`);
    } catch (err) {
      alert(err?.message || 'Nie udało się utworzyć zlecenia.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="bk-page">
      <header className="bk-header">
        <h1 className="bk-title">Rezerwacje</h1>
        <p className="bk-count">{sorted.length} zgłoszeń</p>
      </header>

      <div className="bk-list">
        {sorted.map((b) => {
          const customer = b.customerId ? getUserById(b.customerId) : null;
          const tone = TONE[b.status] || 'neutral';
          const isOpen = openId === b.id;
          return (
            <div key={b.id} className="bk-card">
              <div className="bk-row-top" onClick={() => setOpenId(isOpen ? null : b.id)}>
                <div>
                  <div className="bk-device">{b.brand} {b.model}</div>
                  <div className="bk-customer">
                    {customer?.name || b.customerName || 'Klient bez konta'}
                    {b.company && ` · ${b.company}`}
                    {' · '}{b.customerPhone || customer?.phone || '—'}
                  </div>
                  <div className="bk-desc">{b.description}</div>
                  {b.preferredDate && <div className="bk-pref">📅 Preferowany termin: <strong>{/^\d{4}-\d{2}-\d{2}$/.test(b.preferredDate) ? new Date(`${b.preferredDate}T12:00:00`).toLocaleDateString('pl-PL', { weekday: 'short', day: 'numeric', month: 'long' }) : b.preferredDate}</strong></div>}
                </div>
                <div className="bk-row-right">
                  <span className={`bk-badge bk-badge-${tone}`}>
                    {BOOKING_STATUS_ICONS[b.status]} {b.status}
                  </span>
                  <span className="bk-date">{fmtDate(b.createdAt)}</span>
                  {b.source === 'web' && <span className="bk-source">z panelu webowego</span>}
                </div>
              </div>

              {isOpen && b.status === BOOKING_STATUS.PENDING && (
                <div className="bk-actions">
                  <textarea
                    className="bk-note"
                    placeholder="Wiadomość dla klienta (wymagana)…"
                    value={noteDrafts[b.id] || ''}
                    onChange={(e) => setNoteDrafts((p) => ({ ...p, [b.id]: e.target.value }))}
                  />
                  <input
                    className="bk-price"
                    placeholder="Wstępna cena (zł, opcjonalnie)"
                    value={priceDrafts[b.id] || ''}
                    onChange={(e) => setPriceDrafts((p) => ({ ...p, [b.id]: e.target.value }))}
                  />
                  <div className="bk-actions-row">
                    <button className="bk-btn-warn" onClick={() => handleReject(b)}>Odrzuć</button>
                    <button className="bk-btn-primary" onClick={() => handleAccept(b)}>Zaakceptuj termin</button>
                  </div>
                </div>
              )}

              {isOpen && b.status === BOOKING_STATUS.ACCEPTED && (
                <div className="bk-actions">
                  <p className="bk-accepted-note">{b.adminNote}</p>
                  <button className="bk-btn-primary" onClick={() => handleConvert(b)} disabled={busyId === b.id}>
                    {busyId === b.id ? 'Tworzę zlecenie…' : '🔧 Utwórz zlecenie naprawy'}
                  </button>
                </div>
              )}

              {isOpen && b.status === BOOKING_STATUS.CONVERTED && (
                <div className="bk-actions">
                  {b.adminNote && <p className="bk-accepted-note">{b.adminNote}</p>}
                  {b.linkedRepairId && (
                    <button className="bk-btn-primary" onClick={() => navigate(`/zlecenia/${b.linkedRepairId}`)}>
                      Otwórz zlecenie →
                    </button>
                  )}
                </div>
              )}

              {isOpen && b.status === BOOKING_STATUS.REJECTED && (
                <div className="bk-actions">
                  <p className="bk-accepted-note">Powód odrzucenia: {b.adminNote || '—'}</p>
                </div>
              )}

              {isOpen && (b.smsLog || []).length > 0 && (
                <div className="bk-sms-log">
                  {[...b.smsLog].sort((x, y) => (y.at || '').localeCompare(x.at || '')).map((m, i) => (
                    <div key={`${m.at}-${i}`} className="bk-sms-item">
                      <span className="bk-sms-meta">📲 {fmtDateTime(m.at)}</span> {m.text}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {sorted.length === 0 && <div className="bk-empty">Brak zgłoszeń rezerwacji</div>}
      </div>
    </div>
  );
}
