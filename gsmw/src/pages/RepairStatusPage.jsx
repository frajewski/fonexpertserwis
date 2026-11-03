import { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import RepairProgress from '../components/RepairProgress';
import {
  findRepairsByPhone,
  lookupRepairByToken,
  acceptEstimate,
  respondToSlot,
  rejectEstimate,
  STATUS,
} from '../firebase/firestoreApi';
import './RepairStatusPage.css';

const fmtDate = (iso) => {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('pl-PL', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
};

export default function RepairStatusPage() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const phone = location.state?.phone || null;
  const token = new URLSearchParams(location.search).get('token');

  const [repair, setRepair] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [decision, setDecision] = useState(null);
  const [error, setError] = useState('');
  const [slotLoading, setSlotLoading] = useState(false);
  const [slotNote, setSlotNote] = useState('');
  const [showSlotNote, setShowSlotNote] = useState(false);

  useEffect(() => {
    const loadRepair = async () => {
      setLoading(true);
      setError('');

      try {
        if (token) {
          const result = await lookupRepairByToken(token);

          if (!result?.repair) {
            setRepair(null);
            setHistory([]);
            setError(result?.message || 'Nie znaleziono zlecenia dla tego linku.');
            return;
          }

          setRepair(result.repair);
          setHistory([]);
          return;
        }

        if (!phone) {
          navigate('/');
          return;
        }

        const list = await findRepairsByPhone(phone);
        const found = list.find((r) => r.id === id);

        setRepair(found || null);
        setHistory(list.filter((r) => r.id !== id));
      } catch (err) {
        console.error('Błąd pobierania danych zlecenia:', err);
        setError(err.message || 'Nie udało się pobrać danych zlecenia.');
      } finally {
        setLoading(false);
      }
    };

    loadRepair();
  }, [id, phone, token, navigate]);

  if (!phone && !token) return null;

  if (loading) {
    return <div className="rs-loading">Wczytuję dane zlecenia…</div>;
  }

  if (error) {
    return (
      <div className="rs-loading">
        {error}{' '}
        <button className="rs-back-link" onClick={() => navigate('/')}>
          Wróć do wyszukiwania
        </button>
      </div>
    );
  }

  if (!repair) {
    return (
      <div className="rs-loading">
        Nie znaleziono tego zlecenia.{' '}
        <button className="rs-back-link" onClick={() => navigate('/')}>
          Wróć do wyszukiwania
        </button>
      </div>
    );
  }

  const total = (repair.partsCost || 0) + (repair.serviceCost || 0);

  const canDecide = !!phone || !!token;

  const needsDecision =
    canDecide &&
    repair.estimateAccepted === null &&
    total > 0 &&
    repair.status !== STATUS.CANCELLED;

  const handleSlot = async (accept) => {
    if (!canDecide || !repair?.proposedSlot) return;
    setSlotLoading(true);
    setError('');
    try {
      const status = await respondToSlot(repair.id, phone, token, accept, accept ? '' : slotNote);
      setRepair((r) => ({ ...r, proposedSlot: { ...r.proposedSlot, status } }));
      setShowSlotNote(false);
    } catch (err) {
      setError(err?.message || 'Nie udało się zapisać odpowiedzi.');
    } finally {
      setSlotLoading(false);
    }
  };

  const handleAccept = async () => {
    if (!canDecide) return;

    setActionLoading(true);
    try {
      await acceptEstimate(repair.id, phone, token);
      setDecision('accepted');
      setRepair((r) => ({ ...r, estimateAccepted: true }));
    } catch (err) {
      setError(err.message || 'Nie udało się zaakceptować kosztorysu.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!canDecide) return;

    setActionLoading(true);
    try {
      await rejectEstimate(repair.id, phone, token);
      setDecision('rejected');
      setRepair((r) => ({
        ...r,
        estimateAccepted: false,
        status: STATUS.CANCELLED,
      }));
    } catch (err) {
      setError(err.message || 'Nie udało się odrzucić kosztorysu.');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="rs-page">
      <header className="rs-header">
        <button className="rs-back" onClick={() => navigate('/')}>
          ← Wyszukaj inne zlecenie
        </button>
        <span className="rs-brand">◈ Fonexpert</span>
      </header>

      <main className="rs-main">
        <section className="rs-device-card">
          <div className="rs-device-top">
            <span className="rs-number">#{repair.displayNumber}</span>
            <span className="rs-date">
              {repair.createdAt ? `Przyjęte ${fmtDate(repair.createdAt)}` : ''}
            </span>
          </div>

          <h1 className="rs-device-name">
            {repair.brand} {repair.model}
          </h1>

          <p className="rs-device-desc">{repair.description}</p>
        </section>

        <section className="rs-progress-card">
          <RepairProgress status={repair.status} />
        </section>

        {repair.proposedSlot && repair.status !== STATUS.DELIVERED && repair.status !== STATUS.CANCELLED && (
          <section className={`rs-estimate-card ${repair.proposedSlot.status === 'pending' ? 'rs-estimate-pending' : ''}`}>
            <div className="rs-estimate-row">
              <span className="rs-estimate-label">Proponowany termin</span>
              <span className="rs-estimate-amount rs-slot-when">
                {new Date(repair.proposedSlot.at).toLocaleString('pl-PL', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>

            {repair.proposedSlot.status === 'pending' && canDecide && (
              <>
                <p className="rs-estimate-note">Serwis proponuje ten termin naprawy. Daj znać, czy Ci pasuje.</p>
                {showSlotNote && (
                  <textarea
                    className="rs-slot-note"
                    rows={3}
                    placeholder="Kiedy Ci pasuje? Np. „jutro po 16” (opcjonalnie)"
                    value={slotNote}
                    onChange={(e) => setSlotNote(e.target.value)}
                  />
                )}
                <div className="rs-estimate-actions">
                  {showSlotNote ? (
                    <button className="rs-btn rs-btn-ghost" onClick={() => handleSlot(false)} disabled={slotLoading}>
                      {slotLoading ? 'Wysyłam…' : 'Wyślij prośbę o inny termin'}
                    </button>
                  ) : (
                    <button className="rs-btn rs-btn-ghost" onClick={() => setShowSlotNote(true)} disabled={slotLoading}>
                      Inny termin
                    </button>
                  )}
                  <button className="rs-btn rs-btn-primary" onClick={() => handleSlot(true)} disabled={slotLoading}>
                    {slotLoading && !showSlotNote ? 'Zapisuję…' : 'Pasuje mi'}
                  </button>
                </div>
              </>
            )}

            {repair.proposedSlot.status === 'accepted' && (
              <div className="rs-estimate-status rs-status-good">✓ Termin potwierdzony — do zobaczenia!</div>
            )}
            {repair.proposedSlot.status === 'declined' && (
              <div className="rs-estimate-status rs-status-warn">Poprosiłeś o inny termin — serwis odezwie się z nową propozycją.</div>
            )}
          </section>
        )}

        {total > 0 && (
          <section className={`rs-estimate-card ${needsDecision ? 'rs-estimate-pending' : ''}`}>
            <div className="rs-estimate-row">
              <span className="rs-estimate-label">Kosztorys naprawy</span>
              <span className="rs-estimate-amount">{total} zł</span>
            </div>

            {needsDecision && !decision && (
              <>
                <p className="rs-estimate-note">
                  Serwis przygotował kosztorys naprawy. Zaakceptuj, żeby kontynuować,
                  albo zrezygnuj — w tym przypadku zlecenie zostanie odwołane.
                </p>

                <div className="rs-estimate-actions">
                  <button
                    className="rs-btn rs-btn-ghost"
                    onClick={handleReject}
                    disabled={actionLoading}
                  >
                    Rezygnuję
                  </button>

                  <button
                    className="rs-btn rs-btn-primary"
                    onClick={handleAccept}
                    disabled={actionLoading}
                  >
                    {actionLoading ? 'Zapisuję…' : 'Akceptuję kosztorys'}
                  </button>
                </div>
              </>
            )}

            {(repair.estimateAccepted === true || decision === 'accepted') && (
              <div className="rs-estimate-status rs-status-good">
                ✓ Kosztorys zaakceptowany
              </div>
            )}

            {(repair.estimateAccepted === false || decision === 'rejected') && (
              <div className="rs-estimate-status rs-status-warn">
                Zlecenie odwołane na Twoją prośbę
              </div>
            )}

            {repair.status === STATUS.DELIVERED && repair.warrantyMonths > 0 && (
              <div className="rs-warranty">
                🛡️ Gwarancja {repair.warrantyMonths} mies. — do{' '}
                {fmtDate(repair.warrantyEndDate)}
              </div>
            )}
          </section>
        )}

        {history.length > 0 && (
          <section className="rs-history">
            <h2 className="rs-history-title">Poprzednie zlecenia</h2>

            <div className="rs-history-list">
              {history.map((r) => (
                <button
                  key={r.id}
                  className="rs-history-item"
                  onClick={() => navigate(`/zlecenie/${r.id}`, { state: { phone } })}
                >
                  <div>
                    <div className="rs-history-device">
                      {r.brand} {r.model}
                    </div>
                    <div className="rs-history-meta">
                      #{r.displayNumber} · {fmtDate(r.createdAt)}
                    </div>
                  </div>

                  <span className={`rs-history-badge rs-badge-${badgeTone(r.status)}`}>
                    {r.status}
                  </span>
                </button>
              ))}
            </div>
          </section>
        )}

        <button className="rs-booking-cta" onClick={() => navigate('/umow-naprawe')}>
          + Umów kolejną naprawę
        </button>
      </main>
    </div>
  );
}

function badgeTone(status) {
  if (status === STATUS.READY || status === STATUS.DELIVERED) return 'good';
  if (status === STATUS.CANCELLED) return 'warn';
  return 'wait';
}