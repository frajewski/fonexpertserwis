// ============================================================
//  RepairStatusPage.jsx – status naprawy dla klienta
//  Dostęp: token z linku śledzenia (SMS / QR) albo nr zlecenia + telefon.
//  Dane z funkcji (repairToPublicData) – bez notatek wewnętrznych i autorów zmian.
// ============================================================
import { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate, Link } from 'react-router-dom';
import {
  findRepairsByPhone, lookupRepairByToken, acceptEstimate, respondToSlot, rejectEstimate, STATUS,
} from '../firebase/firestoreApi';
import SHOP from '../shop';
import {
  IconInbox, IconSearch, IconWrench, IconCheckCircle, IconBox, IconCheck, IconCopy, IconCalendar,
  IconInfo, IconChevron, IconHeadset, IconCall, IconMail, IconArrow, IconPhone, IconShield, IconX, IconClock, IconTag,
} from '../layout/icons';
import './RepairStatusPage.css';
import { usePageMeta } from '../utils/seo';

const STEPS = [
  { key: 'przyjete', label: 'Przyjęte', Icon: IconInbox, statuses: [STATUS.ACCEPTED] },
  { key: 'diagnoza', label: 'Diagnoza', Icon: IconSearch, statuses: [STATUS.DIAGNOSIS] },
  { key: 'naprawa', label: 'Naprawa', Icon: IconWrench, statuses: [STATUS.REPAIR, STATUS.PARTS, STATUS.CUSTOMER_WAIT] },
  { key: 'gotowe', label: 'Gotowe', Icon: IconCheckCircle, statuses: [STATUS.READY] },
  { key: 'odebrane', label: 'Odebrane', Icon: IconBox, statuses: [STATUS.DELIVERED] },
];

// Komunikat dla każdego statusu z panelu serwisu
const INFO = {
  [STATUS.ACCEPTED]: { badge: 'Zgłoszenie przyjęte', tone: 'blue', text: 'Twoje urządzenie jest w serwisie. Kolejny etap to diagnoza — sprawdzimy przyczynę usterki.' },
  [STATUS.DIAGNOSIS]: { badge: 'W trakcie diagnozy', tone: 'blue', text: 'Sprawdzamy przyczynę usterki. Nie wykonujemy dodatkowych płatnych prac bez Twojej zgody.' },
  [STATUS.REPAIR]: { badge: 'W trakcie naprawy', tone: 'green', text: 'Trwa naprawa. Gdy skończymy, wyślemy SMS, a status zmieni się na „Gotowe”.' },
  [STATUS.PARTS]: { badge: 'Czekamy na części', tone: 'amber', text: 'Zamówiliśmy potrzebne części. Naprawę dokończymy zaraz po ich dostarczeniu.' },
  [STATUS.CUSTOMER_WAIT]: { badge: 'Czekamy na Ciebie', tone: 'amber', text: 'Części dotarły — skontaktowaliśmy się z Tobą w sprawie terminu. Odpowiedz na SMS albo zadzwoń.' },
  [STATUS.READY]: { badge: 'Gotowe do odbioru', tone: 'green', text: `Urządzenie jest gotowe. Zapraszamy po odbiór: ${SHOP.addressLine1}, ${SHOP.hours.map(([d, h]) => `${d} ${h}`).join(', ')}.` },
  [STATUS.DELIVERED]: { badge: 'Odebrane', tone: 'gray', text: 'Urządzenie zostało odebrane, a zlecenie zakończone. Dziękujemy za zaufanie!' },
  [STATUS.CANCELLED]: { badge: 'Zlecenie odwołane', tone: 'red', text: 'To zlecenie zostało odwołane. Jeśli to pomyłka albo masz pytania — zadzwoń do nas.' },
};

const HISTORY_LABEL = {
  [STATUS.ACCEPTED]: 'Przyjęto zgłoszenie',
  [STATUS.DIAGNOSIS]: 'Rozpoczęto diagnozę',
  [STATUS.REPAIR]: 'Rozpoczęto naprawę',
  [STATUS.PARTS]: 'Zamówiono części',
  [STATUS.CUSTOMER_WAIT]: 'Części dotarły — czekamy na kontakt',
  [STATUS.READY]: 'Gotowe do odbioru',
  [STATUS.DELIVERED]: 'Urządzenie odebrane',
  [STATUS.CANCELLED]: 'Zlecenie odwołane',
};

const fmtDate = (iso) => (iso ? new Date(iso).toLocaleDateString('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' }) : '');
const fmtDateTime = (iso) => (iso ? new Date(iso).toLocaleString('pl-PL', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '');
const fmtSlot = (iso) => new Date(iso).toLocaleString('pl-PL', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });

export default function RepairStatusPage() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const phone = location.state?.phone || null;
  const token = new URLSearchParams(location.search).get('token');

  const [repair, setRepair] = useState(null);
  const [others, setOthers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [decision, setDecision] = useState(null);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [slotLoading, setSlotLoading] = useState(false);
  const [slotNote, setSlotNote] = useState('');
  const [slotCounter, setSlotCounter] = useState('');
  const [showSlotNote, setShowSlotNote] = useState(false);
  const [showLegend, setShowLegend] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const loadRepair = async () => {
      setLoading(true);
      setError('');
      try {
        if (token) {
          const result = await lookupRepairByToken(token);
          if (!result?.repair) { setRepair(null); setError(result?.message || 'Nie znaleziono zlecenia dla tego linku.'); return; }
          setRepair(result.repair);
          setOthers([]);
          return;
        }
        if (!phone) { navigate('/status'); return; }
        const list = await findRepairsByPhone(phone);
        setRepair(list.find((r) => r.id === id) || null);
        setOthers(list.filter((r) => r.id !== id));
      } catch (err) {
        console.error('Błąd pobierania danych zlecenia:', err);
        setError(err.message || 'Nie udało się pobrać danych zlecenia.');
      } finally {
        setLoading(false);
      }
    };
    loadRepair();
  }, [id, phone, token, navigate]);

  usePageMeta({ title: repair?.displayNumber ? `Zlecenie #${repair.displayNumber}` : 'Status naprawy', noindex: true });

  if (!phone && !token) return null;

  if (loading || error || !repair) {
    return (
      <main className="rs">
        <Hero />
        <div className="rs-wrap rs-main">
          <section className="rs-card rs-state">
            {loading ? (
              <><span className="rs-spinner" aria-hidden="true" /><p>Wczytuję dane zlecenia…</p></>
            ) : (
              <>
                <span className="rs-state-ic"><IconInfo size={26} /></span>
                <h2>{error ? 'Nie udało się otworzyć zlecenia' : 'Nie znaleziono zlecenia'}</h2>
                <p>{error || 'Sprawdź numer zlecenia i telefon albo otwórz link z SMS-a jeszcze raz.'}</p>
                <div className="rs-state-actions">
                  <button type="button" className="rs-btn rs-btn-primary" onClick={() => navigate('/status')}>Wyszukaj zlecenie</button>
                  <a className="rs-btn rs-btn-ghost" href={SHOP.phoneHref}><IconCall size={16} /> {SHOP.phone}</a>
                </div>
              </>
            )}
          </section>
        </div>
      </main>
    );
  }

  const status = repair.status || STATUS.ACCEPTED;
  const cancelled = status === STATUS.CANCELLED;
  const info = INFO[status] || INFO[STATUS.ACCEPTED];
  const stepIndex = Math.max(0, STEPS.findIndex((s) => s.statuses.includes(status)));
  const CurrentIcon = cancelled ? IconX : STEPS[stepIndex].Icon;
  const deviceName = [repair.brand, repair.model].filter(Boolean).join(' ') || 'Urządzenie';

  const history = (repair.history?.length ? repair.history : (repair.createdAt ? [{ date: repair.createdAt, status: STATUS.ACCEPTED }] : []));
  const lastChange = history.length ? history[history.length - 1].date : null;

  const total = (repair.partsCost || 0) + (repair.serviceCost || 0);
  const canDecide = !!phone || !!token;
  const needsDecision = canDecide && repair.estimateAccepted === null && total > 0 && !cancelled;
  const slot = repair.proposedSlot && status !== STATUS.DELIVERED && !cancelled ? repair.proposedSlot : null;
  const slotPending = slot && slot.status === 'pending' && canDecide;

  const copyNumber = async () => {
    try { await navigator.clipboard.writeText(repair.displayNumber); } catch { /* brak schowka */ }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSlot = async (accept) => {
    if (!canDecide || !slot) return;
    setActionError('');
    if (!accept && slotCounter && new Date(slotCounter).getTime() < Date.now()) { setActionError('Wybierz termin, który jeszcze nie minął.'); return; }
    setSlotLoading(true);
    try {
      const counterAt = !accept && slotCounter ? new Date(slotCounter).toISOString() : null;
      const st = await respondToSlot(repair.id, phone, token, accept, accept ? '' : slotNote, counterAt);
      setRepair((r) => ({ ...r, proposedSlot: { ...r.proposedSlot, status: st, counterAt } }));
      setShowSlotNote(false);
    } catch (err) {
      setActionError(err?.message || 'Nie udało się zapisać odpowiedzi.');
    } finally {
      setSlotLoading(false);
    }
  };

  const handleEstimate = async (accept) => {
    if (!canDecide) return;
    setActionError('');
    setActionLoading(true);
    try {
      if (accept) {
        await acceptEstimate(repair.id, phone, token);
        setDecision('accepted');
        setRepair((r) => ({ ...r, estimateAccepted: true }));
      } else {
        await rejectEstimate(repair.id, phone, token);
        setDecision('rejected');
        setRepair((r) => ({ ...r, estimateAccepted: false, status: STATUS.CANCELLED }));
      }
    } catch (err) {
      setActionError(err.message || 'Nie udało się zapisać decyzji.');
    } finally {
      setActionLoading(false);
    }
  };

  const slotCard = slot && (
    <section className={`rs-card rs-action ${slotPending ? 'rs-action-pending' : ''}`} aria-label="Proponowany termin">
      <div className="rs-action-head">
        <span className="rs-action-ic"><IconCalendar size={22} /></span>
        <div>
          <span className="rs-action-label">Proponowany termin naprawy</span>
          <strong className="rs-action-value">{fmtSlot(slot.at)}</strong>
        </div>
      </div>
      {slotPending && (
        <>
          <p className="rs-action-note">Serwis proponuje ten termin. Daj znać, czy Ci pasuje.</p>
          {showSlotNote && (
            <div className="rs-slot-form">
              <label><span>Kiedy Ci pasuje?</span><input type="datetime-local" min={nowLocalMinute()} value={slotCounter} onChange={(e) => setSlotCounter(e.target.value)} /></label>
              <label><span>Uwagi (opcjonalnie)</span><textarea rows={2} placeholder="np. „mogę tylko po 16”" value={slotNote} onChange={(e) => setSlotNote(e.target.value)} /></label>
            </div>
          )}
          <div className="rs-action-btns">
            {showSlotNote ? (
              <button type="button" className="rs-btn rs-btn-ghost" onClick={() => handleSlot(false)} disabled={slotLoading}>{slotLoading ? 'Wysyłam…' : 'Wyślij prośbę o inny termin'}</button>
            ) : (
              <button type="button" className="rs-btn rs-btn-ghost" onClick={() => setShowSlotNote(true)} disabled={slotLoading}>Inny termin</button>
            )}
            <button type="button" className="rs-btn rs-btn-primary" onClick={() => handleSlot(true)} disabled={slotLoading}>{slotLoading && !showSlotNote ? 'Zapisuję…' : <><IconCheck size={16} /> Pasuje mi</>}</button>
          </div>
        </>
      )}
      {slot.status === 'accepted' && <p className="rs-pill-msg rs-msg-good"><IconCheck size={16} /> Termin potwierdzony — do zobaczenia!</p>}
      {slot.status === 'declined' && (
        <p className="rs-pill-msg rs-msg-amber">Poprosiłeś o inny termin{slot.counterAt ? ` (${fmtSlot(slot.counterAt)})` : ''} — potwierdzimy go SMS-em albo zaproponujemy nowy.</p>
      )}
    </section>
  );

  const estimateCard = total > 0 && (
    <section className={`rs-card rs-action ${needsDecision && !decision ? 'rs-action-pending' : ''}`} aria-label="Kosztorys">
      <div className="rs-action-head">
        <span className="rs-action-ic"><IconTag size={22} /></span>
        <div>
          <span className="rs-action-label">Kosztorys naprawy</span>
          <strong className="rs-action-value rs-price">{total} zł</strong>
        </div>
      </div>
      {needsDecision && !decision && (
        <>
          <p className="rs-action-note">Przygotowaliśmy kosztorys. Zaakceptuj go, żebyśmy mogli kontynuować — jeśli zrezygnujesz, zlecenie zostanie odwołane.</p>
          <div className="rs-action-btns">
            <button type="button" className="rs-btn rs-btn-ghost" onClick={() => handleEstimate(false)} disabled={actionLoading}>Rezygnuję</button>
            <button type="button" className="rs-btn rs-btn-primary" onClick={() => handleEstimate(true)} disabled={actionLoading}>{actionLoading ? 'Zapisuję…' : <><IconCheck size={16} /> Akceptuję kosztorys</>}</button>
          </div>
        </>
      )}
      {(repair.estimateAccepted === true || decision === 'accepted') && <p className="rs-pill-msg rs-msg-good"><IconCheck size={16} /> Kosztorys zaakceptowany</p>}
      {(repair.estimateAccepted === false || decision === 'rejected') && <p className="rs-pill-msg rs-msg-red">Zlecenie odwołane na Twoją prośbę</p>}
    </section>
  );

  const actionFirst = slotPending || (needsDecision && !decision);

  return (
    <main className="rs">
      <Hero />

      <div className="rs-wrap rs-main">
        {/* ===== Główna karta ===== */}
        <section className="rs-card rs-primary" aria-label="Status zlecenia">
          <div className="rs-primary-head">
            <div className="rs-ticket">
              <button type="button" className="rs-case-pill" onClick={copyNumber} title="Skopiuj numer zlecenia">
                Zlecenie #{repair.displayNumber} {copied ? <IconCheck size={15} /> : <IconCopy size={15} />}
              </button>
              {copied && <span className="rs-copied" role="status">Skopiowano</span>}
              <h2 className="rs-device-name">{deviceName}</h2>
              <div className="rs-subline">
                {repair.createdAt && <span><IconCalendar size={16} /> Przyjęto {fmtDate(repair.createdAt)}</span>}
                <span><IconPhone size={16} /> 1 urządzenie</span>
              </div>
            </div>
            <div className="rs-status-box">
              <span className={`rs-badge rs-tone-${info.tone}`}><CurrentIcon size={16} /> {info.badge}</span>
              {lastChange && <span className="rs-caption">Ostatnia zmiana: {fmtDateTime(lastChange)}</span>}
            </div>
          </div>

          {!cancelled && (
            <>
              <div className="rs-steps-head">
                <span className="rs-kicker">Etapy realizacji</span>
                <button type="button" className="rs-text-btn" aria-expanded={showLegend} onClick={() => setShowLegend((v) => !v)}>
                  Co oznaczają statusy? <IconChevron size={16} className={showLegend ? 'rs-rot' : ''} />
                </button>
              </div>
              {showLegend && (
                <p className="rs-legend">
                  <b>Przyjęte</b> — zarejestrowaliśmy urządzenie. <b>Diagnoza</b> — sprawdzamy przyczynę usterki. <b>Naprawa</b> — trwa naprawa (także oczekiwanie na części). <b>Gotowe</b> — urządzenie czeka na odbiór. <b>Odebrane</b> — zlecenie zakończone.
                </p>
              )}
              <ol className="rs-steps" style={{ '--rs-fill': stepIndex / (STEPS.length - 1) }} aria-label="Postęp zlecenia">
                {STEPS.map((s, i) => {
                  const state = i < stepIndex ? 'done' : i === stepIndex ? 'current' : 'future';
                  const Icon = i < stepIndex ? IconCheck : s.Icon;
                  return (
                    <li key={s.key} className={`rs-step rs-step-${state}`} aria-current={state === 'current' ? 'step' : undefined}>
                      <span className="rs-step-circle"><Icon size={22} /></span>
                      <span className="rs-step-text">
                        <strong>{s.label}</strong>
                        <small>{state === 'done' ? 'Zakończony' : state === 'current' ? (status === STATUS.PARTS ? 'Czekamy na części' : status === STATUS.CUSTOMER_WAIT ? 'Czekamy na Ciebie' : 'W toku') : ''}</small>
                      </span>
                    </li>
                  );
                })}
              </ol>
            </>
          )}

          <div className={`rs-explainer rs-explainer-${info.tone}`} aria-live="polite">
            <span className="rs-explainer-ic"><IconInfo size={20} /></span>
            <div>
              <strong>Obecnie: {status}</strong>
              <p>{info.text}{slotPending ? ' Potwierdź proponowany termin poniżej.' : ''}</p>
            </div>
          </div>
        </section>

        {actionError && <div className="rs-error" role="alert">{actionError}</div>}

        {actionFirst && <div className="rs-actions-first">{slotCard}{estimateCard}</div>}

        {/* ===== Szczegóły + historia ===== */}
        <div className="rs-two-col">
          <div className="rs-left">
            <section className="rs-card rs-pad" aria-labelledby="rs-dev-h">
              <div className="rs-card-heading"><h3 id="rs-dev-h">Urządzenie w zleceniu</h3><span className="rs-count">#{repair.displayNumber}</span></div>
              <div className="rs-device">
                <span className="rs-device-ic"><IconPhone size={24} /></span>
                <div>
                  <strong>{deviceName}</strong>
                  <p className="rs-device-label">Zgłoszony problem</p>
                  <p className="rs-device-desc">{repair.description || 'Brak opisu w zleceniu.'}</p>
                </div>
              </div>
              {status === STATUS.DELIVERED && repair.warrantyMonths > 0 && (
                <p className="rs-pill-msg rs-msg-good rs-warranty"><IconShield size={16} /> Gwarancja {repair.warrantyMonths} mies.{repair.warrantyEndDate ? ` — do ${fmtDate(repair.warrantyEndDate)}` : ''}</p>
              )}
              <details className="rs-faq">
                <summary>Czy muszę przychodzić do serwisu, żeby sprawdzić postęp?</summary>
                <p>Nie. Aktualny etap zawsze zobaczysz tutaj, a o ważnych zmianach (np. gotowości do odbioru) poinformujemy Cię SMS-em. W razie pytań zadzwoń i podaj numer zlecenia.</p>
              </details>
            </section>
            {!actionFirst && slotCard}
            {!actionFirst && estimateCard}
          </div>

          <div className="rs-right">
            <section className="rs-card rs-pad" aria-labelledby="rs-hist-h">
              <div className="rs-card-heading"><h3 id="rs-hist-h">Historia zlecenia</h3><span className="rs-count">{history.length} {history.length === 1 ? 'etap' : 'etapy'}</span></div>
              {history.length === 0 ? (
                <p className="rs-muted">Historia pojawi się po pierwszej zmianie statusu.</p>
              ) : (
                <ol className="rs-history">
                  {[...history].reverse().map((h, i) => (
                    <li key={`${h.date}-${i}`} className={i === 0 ? 'rs-h-now' : ''}>
                      <span className="rs-h-dot" aria-hidden="true" />
                      <div>
                        <strong>{HISTORY_LABEL[h.status] || h.status}</strong>
                        <time dateTime={h.date}><IconClock size={13} /> {fmtDateTime(h.date)}</time>
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </section>

            <section className="rs-card rs-contact" aria-labelledby="rs-contact-h">
              <div className="rs-contact-top">
                <span className="rs-contact-ic"><IconHeadset size={24} /></span>
                <div>
                  <h3 id="rs-contact-h">Masz pytanie o naprawę?</h3>
                  <p>Zadzwoń lub napisz i podaj numer zlecenia #{repair.displayNumber}.</p>
                </div>
              </div>
              <div className="rs-contact-btns">
                <a className="rs-btn rs-btn-primary" href={SHOP.phoneHref}><IconCall size={16} /> Zadzwoń</a>
                <a className="rs-btn rs-btn-outline-dark" href={`mailto:${SHOP.email}?subject=${encodeURIComponent(`Pytanie o zlecenie #${repair.displayNumber}`)}`}><IconMail size={16} /> Napisz</a>
              </div>
            </section>
          </div>
        </div>

        {others.length > 0 && (
          <section className="rs-card rs-pad rs-others" aria-labelledby="rs-oth-h">
            <div className="rs-card-heading"><h3 id="rs-oth-h">Twoje inne zlecenia</h3><span className="rs-count">{others.length}</span></div>
            <div className="rs-others-list">
              {others.map((r) => (
                <button key={r.id} type="button" className="rs-other" onClick={() => navigate(`/zlecenie/${r.id}`, { state: { phone } })}>
                  <span>
                    <strong>{[r.brand, r.model].filter(Boolean).join(' ')}</strong>
                    <small>#{r.displayNumber} · {fmtDate(r.createdAt)}</small>
                  </span>
                  <span className={`rs-badge rs-badge-sm rs-tone-${(INFO[r.status] || INFO[STATUS.ACCEPTED]).tone}`}>{r.status}</span>
                </button>
              ))}
            </div>
          </section>
        )}

        <nav className="rs-actions-bar" aria-label="Co dalej">
          <Link to="/umow-naprawe" className="rs-action-link rs-action-primary"><IconWrench size={24} /><strong>Zgłoś kolejną naprawę</strong><IconArrow size={20} /></Link>
          <Link to="/skup-i-sprzedaz" className="rs-action-link"><IconPhone size={24} /><strong>Skup i sprzedaż</strong><IconArrow size={20} /></Link>
          <Link to="/kontakt" className="rs-action-link"><IconInfo size={24} /><strong>Kontakt i dojazd</strong><IconArrow size={20} /></Link>
        </nav>
        <p className="rs-back-row"><button type="button" className="rs-text-btn" onClick={() => navigate('/status')}>← Sprawdź inne zlecenie</button></p>
      </div>
    </main>
  );
}

function Hero() {
  return (
    <section className="rs-hero">
      <div className="rs-wrap rs-hero-inner">
        <div className="rs-hero-copy">
          <p className="rs-eyebrow">Panel klienta / Status zlecenia</p>
          <h1>Twoja naprawa. <span>Wiesz, co dalej.</span></h1>
          <p>Aktualny etap naprawy, szczegóły urządzenia i historia zlecenia — wszystko w jednym miejscu.</p>
        </div>
        <div className="rs-hero-art" aria-hidden="true">
          <div className="rs-art-phone"><IconWrench size={64} /></div>
          <div className="rs-art-check"><IconCheck size={28} /></div>
        </div>
      </div>
    </section>
  );
}

// Bieżąca chwila jako wartość dla <input type="datetime-local"> (czas lokalny)
function nowLocalMinute() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}
