import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useStore from '../store/useStore';
import { BOOKING_STATUS, BOOKING_STATUS_ICONS } from '../constants/bookingStatuses';
import './BookingsPage.css';

const TONE = {
  [BOOKING_STATUS.PENDING]: 'wait', [BOOKING_STATUS.ACCEPTED]: 'good',
  [BOOKING_STATUS.RESCHEDULED]: 'info', [BOOKING_STATUS.REJECTED]: 'warn', [BOOKING_STATUS.CONVERTED]: 'neutral',
};

const fmtDate = (iso) => iso ? new Date(iso).toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—';

export default function BookingsPage() {
  const navigate = useNavigate();
  const bookings = useStore((s) => s.getVisibleBookings());
  const updateBooking = useStore((s) => s.updateBooking);
  const convertBookingToRepair = useStore((s) => s.convertBookingToRepair);
  const getUserById = useStore((s) => s.getUserById);

  const [openId, setOpenId] = useState(null);
  const [noteDrafts, setNoteDrafts] = useState({});
  const [priceDrafts, setPriceDrafts] = useState({});

  const sorted = [...bookings].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const handleAccept = async (b) => {
    const note = (noteDrafts[b.id] || '').trim();
    if (!note) { alert('Dodaj krótką informację dla klienta.'); return; }
    await updateBooking(b.id, {
      status: BOOKING_STATUS.ACCEPTED,
      adminNote: note,
      estimatedPrice: parseFloat(priceDrafts[b.id]) || 0,
    });
    setOpenId(null);
  };

  const handleReject = async (b) => {
    const note = (noteDrafts[b.id] || '').trim();
    if (!note) { alert('Podaj powód odrzucenia.'); return; }
    if (!confirm('Na pewno odwołać ten termin?')) return;
    await updateBooking(b.id, { status: BOOKING_STATUS.REJECTED, adminNote: note });
    setOpenId(null);
  };

  const handleConvert = async (b) => {
    if (!confirm('Przekształcić ten termin w zlecenie naprawy?')) return;
    const repair = await convertBookingToRepair(b.id);
    navigate(`/zlecenia/${repair.id}`);
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
                  <button className="bk-btn-primary" onClick={() => handleConvert(b)}>
                    🔧 Utwórz zlecenie naprawy
                  </button>
                </div>
              )}

              {isOpen && ![BOOKING_STATUS.PENDING, BOOKING_STATUS.ACCEPTED].includes(b.status) && (
                <div className="bk-actions">
                  <p className="bk-accepted-note">
                    Status tego zgłoszenia ("{b.status}") nie pasuje do żadnej znanej akcji –
                    sprawdź szczegóły poniżej. {b.adminNote && `Notatka: ${b.adminNote}`}
                  </p>
                  <pre className="bk-raw-data">{JSON.stringify(b, null, 2)}</pre>
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
