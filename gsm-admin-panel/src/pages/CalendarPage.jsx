// ============================================================
//  CalendarPage.jsx – „Kalendarz” (/kalendarz): co, kiedy i z kim
//
//  Tydzień (pon–nd) z terminami napraw z zleceń (proposedSlot):
//    ✅ potwierdzone, ⏳ czekające na odpowiedź klienta,
//    ↔️ termin zaproponowany przez klienta (do akceptacji),
//  oraz rezerwacje online z preferowanym dniem (bez godziny).
//  Terminy napraw czytane z bazy dla wybranego tygodnia (nie tylko z
//  30-dniowego okna na żywo).
// ============================================================

import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';
import useStore from '../store/useStore';
import { BOOKING_STATUS } from '../constants/bookingStatuses';
import './CalendarPage.css';

const DAY = 24 * 60 * 60 * 1000;
const startOfWeek = (d) => {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const dow = (x.getDay() + 6) % 7; // 0 = poniedziałek
  x.setDate(x.getDate() - dow);
  return x;
};
const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const fmtTime = (iso) => new Date(iso).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });

export default function CalendarPage() {
  const navigate = useNavigate();
  const getUserById = useStore((s) => s.getUserById);
  const bookings = useStore((s) => s.bookings || []);
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [slots, setSlots] = useState(null);
  const [error, setError] = useState('');

  const weekEnd = useMemo(() => new Date(weekStart.getTime() + 7 * DAY), [weekStart]);

  useEffect(() => {
    let cancelled = false;
    setSlots(null);
    setError('');
    const from = weekStart.toISOString();
    const to = weekEnd.toISOString();
    Promise.all([
      getDocs(query(collection(db, 'repairs'), where('proposedSlot.at', '>=', from), where('proposedSlot.at', '<', to))),
      getDocs(query(collection(db, 'repairs'), where('proposedSlot.counterAt', '>=', from), where('proposedSlot.counterAt', '<', to))),
    ])
      .then(([a, b]) => {
        if (cancelled) return;
        const list = [];
        a.docs.forEach((d) => {
          const r = { id: d.id, ...d.data() };
          if (r.status === 'Anulowane' || r.proposedSlot?.status === 'declined') return;
          list.push({ kind: r.proposedSlot.status === 'accepted' ? 'accepted' : 'pending', at: r.proposedSlot.at, repair: r });
        });
        b.docs.forEach((d) => {
          const r = { id: d.id, ...d.data() };
          if (r.status === 'Anulowane' || r.proposedSlot?.status !== 'declined') return;
          list.push({ kind: 'counter', at: r.proposedSlot.counterAt, repair: r });
        });
        setSlots(list);
      })
      .catch((err) => {
        console.error(err);
        if (!cancelled) setError('Nie udało się wczytać terminów. Sprawdź połączenie z Internetem.');
      });
    return () => { cancelled = true; };
  }, [weekStart, weekEnd]);

  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => new Date(weekStart.getTime() + i * DAY)), [weekStart]);

  const bookingByDay = useMemo(() => {
    const map = {};
    bookings
      .filter((b) => [BOOKING_STATUS.PENDING, BOOKING_STATUS.ACCEPTED].includes(b.status) && /^\d{4}-\d{2}-\d{2}$/.test(b.preferredDate || ''))
      .forEach((b) => { (map[b.preferredDate] = map[b.preferredDate] || []).push(b); });
    return map;
  }, [bookings]);

  const today = ymd(new Date());
  const rangeLabel = `${days[0].toLocaleDateString('pl-PL', { day: 'numeric', month: 'long' })} – ${days[6].toLocaleDateString('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' })}`;
  const total = (slots?.length || 0);

  const label = (r) => {
    const c = getUserById(r.customerId);
    return { who: c?.name || r.customerName || 'Klient', phone: c?.phone || r.customerPhone || '' };
  };

  return (
    <div className="cal-page">
      <header className="cal-header">
        <div>
          <h1 className="cal-title">Kalendarz</h1>
          <p className="cal-sub">{rangeLabel}{slots ? ` · ${total} ${total === 1 ? 'termin' : 'terminów'}` : ''}</p>
        </div>
        <div className="cal-nav">
          <button type="button" className="cal-btn" aria-label="Poprzedni tydzień" onClick={() => setWeekStart(new Date(weekStart.getTime() - 7 * DAY))}>‹</button>
          <button type="button" className="cal-btn" onClick={() => setWeekStart(startOfWeek(new Date()))}>Dziś</button>
          <button type="button" className="cal-btn" aria-label="Następny tydzień" onClick={() => setWeekStart(new Date(weekStart.getTime() + 7 * DAY))}>›</button>
        </div>
      </header>

      <div className="cal-legend">
        <span><i className="cal-dot cal-accepted" /> potwierdzony</span>
        <span><i className="cal-dot cal-pending" /> czeka na klienta</span>
        <span><i className="cal-dot cal-counter" /> termin klienta do akceptacji</span>
        <span><i className="cal-dot cal-booking" /> rezerwacja (preferowany dzień)</span>
      </div>

      {error && <div className="cal-error">{error}</div>}

      <div className="cal-week">
        {days.map((d) => {
          const key = ymd(d);
          const daySlots = (slots || [])
            .filter((s) => ymd(new Date(s.at)) === key)
            .sort((a, b) => a.at.localeCompare(b.at));
          const dayBookings = bookingByDay[key] || [];
          return (
            <section key={key} className={`cal-day ${key === today ? 'cal-today' : ''}`}>
              <h2 className="cal-day-title">
                {d.toLocaleDateString('pl-PL', { weekday: 'long' })}
                <span>{d.toLocaleDateString('pl-PL', { day: 'numeric', month: 'numeric' })}</span>
              </h2>
              {!slots && !error && <p className="cal-empty">…</p>}
              {slots && daySlots.length === 0 && dayBookings.length === 0 && <p className="cal-empty">—</p>}
              {daySlots.map((s) => {
                const { who, phone } = label(s.repair);
                return (
                  <button key={`${s.repair.id}-${s.kind}`} type="button" className={`cal-item cal-${s.kind}`} onClick={() => navigate(`/zlecenia/${s.repair.id}`)}>
                    <span className="cal-time">{fmtTime(s.at)}</span>
                    <span className="cal-what">{s.repair.brand} {s.repair.model}</span>
                    <span className="cal-who">{who}{phone ? ` · ${phone}` : ''}</span>
                    <span className="cal-meta">#{s.repair.displayNumber || s.repair.id.slice(0, 6)} · {s.kind === 'counter' ? 'termin klienta – do akceptacji' : s.repair.status}</span>
                  </button>
                );
              })}
              {dayBookings.map((b) => (
                <button key={b.id} type="button" className="cal-item cal-booking" onClick={() => navigate('/rezerwacje')}>
                  <span className="cal-time">cały dzień</span>
                  <span className="cal-what">{[b.brand, b.model].filter(Boolean).join(' ')}</span>
                  <span className="cal-who">{b.customerName}{b.customerPhone ? ` · ${b.customerPhone}` : ''}</span>
                  <span className="cal-meta">{b.bookingNumber || 'rezerwacja'} · {b.status}</span>
                </button>
              ))}
            </section>
          );
        })}
      </div>
    </div>
  );
}
