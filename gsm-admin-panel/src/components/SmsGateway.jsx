// ============================================================
//  SmsGateway.jsx – stan bramki SMS, odpowiedzi klientów i lista STOP
//
//  SmsGatewayStatus  – kiedy telefon z bramką był online, kolejka, błędy
//                      (compact = jedna linijka ostrzeżenia na Pulpicie)
//  SmsInbox          – SMS-y od klientów (webhook bramki → smsInbox)
//  SmsOptOutList     – numery wypisane odpowiedzią STOP (tylko admin)
// ============================================================
import { useCallback, useEffect, useMemo, useState } from 'react';
import { collection, deleteDoc, doc, limit, onSnapshot, orderBy, query, updateDoc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '../firebase/firebaseConfig';
import useStore from '../store/useStore';
import './SmsGateway.css';

const OFFLINE_MIN = 30;
const ago = (iso) => {
  if (!iso) return 'nigdy';
  const min = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (min < 1) return 'przed chwilą';
  if (min < 60) return `${min} min temu`;
  const h = Math.round(min / 60);
  if (h < 48) return `${h} godz. temu`;
  return `${Math.round(h / 24)} dni temu`;
};
const fmt = (iso) => (iso ? new Date(iso).toLocaleString('pl-PL', { dateStyle: 'short', timeStyle: 'short' }) : '');
const digits = (v) => String(v || '').replace(/\D/g, '').slice(-9);

export function SmsGatewayStatus({ compact = false }) {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [registering, setRegistering] = useState(false);
  const isAdmin = useStore((s) => s.currentUser?.role === 'admin');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await httpsCallable(functions, 'smsGatewayStatus')();
      setStatus(data);
    } catch (err) {
      setStatus({ error: 'Nie udało się sprawdzić bramki SMS.', devices: [] });
      console.warn('smsGatewayStatus', err?.code);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const lastSeen = useMemo(() => {
    const times = (status?.devices || []).map((d) => d.lastSeen).filter(Boolean).sort();
    return times[times.length - 1] || null;
  }, [status]);
  const offline = status && !status.error && (!lastSeen || Date.now() - new Date(lastSeen).getTime() > OFFLINE_MIN * 60000);
  const problem = status && (status.error || offline || status.failed > 0 || status.pending > 2);

  if (compact) {
    if (!problem) return null;
    return (
      <div className="sg-warn" role="alert">
        <span>📵</span>
        <div>
          <strong>Bramka SMS wymaga uwagi</strong>
          <span>
            {status.error || (offline ? `Telefon z bramką ostatnio online ${ago(lastSeen)} — SMS-y czekają w kolejce. Uruchom aplikację SMS Gateway i sprawdź internet.` : '')}
            {!status.error && status.pending > 2 ? ` W kolejce: ${status.pending}.` : ''}
            {!status.error && status.failed > 0 ? ` Nieudane (24 h): ${status.failed}.` : ''}
          </span>
        </div>
        <button type="button" className="sg-btn" onClick={load} disabled={loading}>{loading ? '…' : 'Sprawdź'}</button>
      </div>
    );
  }

  const register = async () => {
    setRegistering(true);
    try {
      await httpsCallable(functions, 'registerSmsInbound')();
      await load();
      alert('Odbiór SMS podłączony. Odpowiedzi klientów pojawią się na Pulpicie, a „STOP” wypisze numer z próśb o opinię.');
    } catch (err) {
      alert(err?.message || 'Nie udało się podłączyć odbioru SMS.');
    } finally {
      setRegistering(false);
    }
  };

  return (
    <div className="sg-card">
      <div className="sg-head">
        <h2 className="sg-title">Bramka SMS</h2>
        <button type="button" className="sg-btn" onClick={load} disabled={loading}>{loading ? 'Sprawdzam…' : '↻ Sprawdź'}</button>
      </div>
      {!status ? <p className="sg-muted">Sprawdzam…</p> : status.error ? (
        <p className="sg-bad">⚠️ {status.error}</p>
      ) : (
        <ul className="sg-list">
          <li><span>Telefon z bramką</span><strong className={offline ? 'sg-bad' : 'sg-good'}>{offline ? '● offline' : '● online'} · {ago(lastSeen)}</strong></li>
          {status.pending !== null && <li><span>Czeka w kolejce (24 h)</span><strong className={status.pending > 2 ? 'sg-bad' : ''}>{status.pending}</strong></li>}
          {status.failed !== null && <li><span>Nieudane (24 h)</span><strong className={status.failed > 0 ? 'sg-bad' : ''}>{status.failed}</strong></li>}
          <li><span>Odbiór odpowiedzi i STOP</span><strong className={status.inboundConnected ? 'sg-good' : 'sg-bad'}>{status.inboundConnected ? 'podłączony' : 'niepodłączony'}</strong></li>
        </ul>
      )}
      {isAdmin && status && !status.error && (
        <button type="button" className="sg-btn sg-btn-wide" onClick={register} disabled={registering}>
          {registering ? 'Podłączam…' : status.inboundConnected ? 'Podłącz odbiór SMS ponownie' : 'Podłącz odbiór odpowiedzi SMS'}
        </button>
      )}
      <p className="sg-muted">Gdy telefon jest offline: otwórz aplikację SMS Gateway, sprawdź internet, bateria „Bez ograniczeń”, „Start on boot” włączone.</p>
    </div>
  );
}

export function SmsInbox({ max = 8 }) {
  const [items, setItems] = useState(null);
  const [showAll, setShowAll] = useState(false);
  const users = useStore((s) => s.users);

  useEffect(() => {
    const q = query(collection(db, 'smsInbox'), orderBy('createdAt', 'desc'), limit(50));
    return onSnapshot(q, (snap) => setItems(snap.docs.map((d) => ({ id: d.id, ...d.data() }))), () => setItems([]));
  }, []);

  const byPhone = useMemo(() => {
    const m = {};
    (users || []).forEach((u) => { const k = digits(u.phone); if (k) m[k] = u; });
    return m;
  }, [users]);

  if (!items || items.length === 0) return null;
  const unread = items.filter((m) => !m.read).length;
  const visible = showAll ? items : items.slice(0, max);
  const markRead = (m) => !m.read && updateDoc(doc(db, 'smsInbox', m.id), { read: true }).catch(() => {});

  return (
    <div className="sg-card sg-inbox">
      <div className="sg-head">
        <h2 className="sg-title">Odpowiedzi SMS od klientów {unread > 0 && <span className="sg-badge">{unread} nowe</span>}</h2>
        {unread > 0 && <button type="button" className="sg-btn" onClick={() => items.filter((m) => !m.read).forEach(markRead)}>Oznacz jako przeczytane</button>}
      </div>
      <ul className="sg-msgs">
        {visible.map((m) => {
          const who = byPhone[digits(m.phone)];
          return (
            <li key={m.id} className={m.read ? '' : 'sg-unread'} onClick={() => markRead(m)}>
              <div className="sg-msg-top">
                <strong>{who?.name || m.phone}</strong>
                {who && <span className="sg-muted">{m.phone}</span>}
                {m.isStop && <span className="sg-stop">STOP</span>}
                <span className="sg-time">{fmt(m.receivedAt || m.createdAt)}</span>
              </div>
              <p>{m.text}</p>
              <a href={`tel:${m.phone}`} className="sg-call" onClick={(e) => e.stopPropagation()}>📞 Zadzwoń</a>
            </li>
          );
        })}
      </ul>
      {items.length > max && <button type="button" className="sg-btn" onClick={() => setShowAll((v) => !v)}>{showAll ? 'Pokaż mniej' : `Pokaż wszystkie (${items.length})`}</button>}
    </div>
  );
}

export function SmsOptOutList() {
  const [items, setItems] = useState(null);
  useEffect(() => onSnapshot(collection(db, 'smsOptOut'), (snap) => setItems(snap.docs.map((d) => ({ id: d.id, ...d.data() }))), () => setItems([])), []);
  if (!items) return null;
  const remove = async (m) => {
    if (!window.confirm(`Usunąć ${m.phone} z listy wypisanych? Numer znowu dostanie prośbę o opinię.`)) return;
    await deleteDoc(doc(db, 'smsOptOut', m.id));
  };
  return (
    <div className="sg-card">
      <h2 className="sg-title">Wypisani z SMS-ów (STOP)</h2>
      {items.length === 0 ? <p className="sg-muted">Nikt się nie wypisał. Klient, który odpisze „STOP”, nie dostanie prośby o opinię (SMS-y o naprawie nadal wysyłasz ręcznie).</p> : (
        <ul className="sg-list">
          {items.map((m) => (
            <li key={m.id}><span>{m.phone} <span className="sg-muted">· {fmt(m.at)}</span></span><button type="button" className="sg-btn" onClick={() => remove(m)}>Usuń</button></li>
          ))}
        </ul>
      )}
    </div>
  );
}
