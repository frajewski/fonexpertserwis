import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useStore from '../store/useStore';
import TRADE_STATUS from '../constants/tradeStatuses';
import { printConsignmentOutProtocol } from '../utils/printConsignmentOutProtocol';
import './ConsignedOutPage.css';

const STALE_DAYS = 30;
const fmtDate = (iso) => (iso ? new Date(iso).toLocaleDateString('pl-PL') : '—');
const daysSince = (iso) => (iso ? Math.floor((Date.now() - new Date(iso).getTime()) / 86400000) : 0);
const num = (v) => parseFloat(String(v).replace(',', '.')) || 0;

export default function ConsignedOutPage() {
  const navigate = useNavigate();
  const phones = useStore((s) => s.phones);
  const updatePhone = useStore((s) => s.updatePhone);

  const [showForm, setShowForm] = useState(false);
  const [partnerName, setPartnerName] = useState('');
  const [partnerPhone, setPartnerPhone] = useState('');
  const [search, setSearch] = useState('');
  const [picked, setPicked] = useState({}); // { phoneId: 'kwota' }
  const [busy, setBusy] = useState(false);
  const [settle, setSettle] = useState({}); // { phoneId: 'kwota' } – edytowana przy rozliczeniu
  const [editingGroup, setEditingGroup] = useState(null); // nazwa edytowanego komisanta
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');

  const out = useMemo(() => phones.filter((p) => p.status === TRADE_STATUS.CONSIGNED_OUT), [phones]);

  const groups = useMemo(() => {
    const map = {};
    out.forEach((p) => {
      const key = p.consignedTo || 'Bez nazwy';
      (map[key] = map[key] || []).push(p);
    });
    return Object.entries(map)
      .map(([name, list]) => ({
        name,
        phone: list.find((p) => p.consignedPartnerPhone)?.consignedPartnerPhone || '',
        list: list.sort((a, b) => new Date(a.consignedAt || 0) - new Date(b.consignedAt || 0)),
      }))
      .sort((a, b) => a.name.localeCompare(b.name, 'pl'));
  }, [out]);

  const handlePartnerNameChange = (value) => {
    setPartnerName(value);
    const existing = groups.find((g) => g.name.toLowerCase() === value.trim().toLowerCase());
    if (existing && !partnerPhone.trim()) setPartnerPhone(existing.phone);
  };

  const startEditGroup = (g) => {
    setEditingGroup(g.name);
    setEditName(g.name === 'Bez nazwy' ? '' : g.name);
    setEditPhone(g.phone || '');
  };

  const handleSaveGroup = async (g) => {
    const name = editName.trim();
    if (!name) { alert('Podaj nazwę komisanta.'); return; }
    const clash = groups.find((x) => x.name !== g.name && x.name.toLowerCase() === name.toLowerCase());
    if (clash && !window.confirm(`Komisant „${clash.name}” już istnieje. Połączyć telefony pod jedną nazwą?`)) return;
    try {
      await Promise.all(g.list.map((p) => updatePhone(p.id, { consignedTo: name, consignedPartnerPhone: editPhone.trim() })));
      setEditingGroup(null);
    } catch (err) {
      alert('Nie udało się zapisać komisanta: ' + err.message);
    }
  };

  const handleMovePhone = async (p, targetName) => {
    if (!targetName) return;
    const target = groups.find((g) => g.name === targetName);
    try {
      await updatePhone(p.id, { consignedTo: targetName, consignedPartnerPhone: target?.phone || '' });
    } catch (err) {
      alert('Nie udało się przenieść telefonu: ' + err.message);
    }
  };

  const frozenCost = out.reduce((s, p) => s + (p.buyPrice || 0), 0);
  const expectedPayout = out.reduce((s, p) => s + (p.consignPrice || 0), 0);
  const expectedProfit = expectedPayout - frozenCost;

  // Telefony, które można wydać: w magazynie (nie sprzedane, nie już u komisanta)
  const available = useMemo(() => {
    const q = search.toLowerCase().trim();
    return phones
      .filter((p) => p.status !== TRADE_STATUS.SOLD && p.status !== TRADE_STATUS.CONSIGNED_OUT)
      .filter((p) => !q || `${p.brand} ${p.model} ${p.imei || ''}`.toLowerCase().includes(q))
      .slice(0, 40);
  }, [phones, search]);

  const pickedIds = Object.keys(picked);
  const togglePick = (p) => setPicked((prev) => {
    const next = { ...prev };
    if (next[p.id] !== undefined) delete next[p.id];
    else next[p.id] = p.consignPrice > 0 ? String(p.consignPrice) : (p.sellPrice > 0 ? String(p.sellPrice) : '');
    return next;
  });

  const handleGive = async () => {
    if (!partnerName.trim()) { alert('Podaj, komu przekazujesz telefony.'); return; }
    if (pickedIds.length === 0) { alert('Zaznacz co najmniej jeden telefon.'); return; }
    if (pickedIds.some((id) => num(picked[id]) <= 0)) { alert('Wpisz kwotę dla każdego zaznaczonego telefonu.'); return; }

    setBusy(true);
    try {
      const now = new Date().toISOString();
      const changed = [];
      for (const id of pickedIds) {
        const base = phones.find((p) => p.id === id);
        const changes = {
          status: TRADE_STATUS.CONSIGNED_OUT,
          consignedTo: partnerName.trim(),
          consignedPartnerPhone: partnerPhone.trim(),
          consignedAt: now,
          consignPrice: num(picked[id]),
          consignPrevStatus: base?.status || TRADE_STATUS.READY,
        };
        await updatePhone(id, changes);
        changed.push({ ...base, ...changes });
      }
      printConsignmentOutProtocol(partnerName.trim(), partnerPhone.trim(), changed);
      setPicked({}); setSearch(''); setShowForm(false); setPartnerName(''); setPartnerPhone('');
    } catch (err) {
      alert('Nie udało się przekazać telefonów: ' + err.message);
    } finally {
      setBusy(false);
    }
  };

  const handleSettle = async (p) => {
    const amount = settle[p.id] !== undefined ? num(settle[p.id]) : (p.consignPrice || 0);
    if (amount <= 0) { alert('Wpisz kwotę, którą komisant Ci zapłacił.'); return; }
    if (!window.confirm(`Rozliczyć ${p.brand} ${p.model} za ${amount} zł?`)) return;
    try {
      await updatePhone(p.id, {
        status: TRADE_STATUS.SOLD,
        sellPrice: amount,
        soldAt: new Date().toISOString(),
        consignSettledAt: new Date().toISOString(),
      });
    } catch (err) {
      alert('Nie udało się rozliczyć: ' + err.message);
    }
  };

  const handleReturn = async (p) => {
    if (!window.confirm(`Telefon ${p.brand} ${p.model} wrócił od komisanta?`)) return;
    try {
      await updatePhone(p.id, {
        status: p.consignPrevStatus || TRADE_STATUS.READY,
        consignedTo: null,
        consignedPartnerPhone: null,
        consignedAt: null,
        consignPrevStatus: null,
      });
    } catch (err) {
      alert('Nie udało się zapisać zwrotu: ' + err.message);
    }
  };

  return (
    <div className="co-page">
      <header className="co-header">
        <div>
          <h1 className="co-title">U komisantów</h1>
          <p className="co-sub">{out.length} {out.length === 1 ? 'telefon' : 'telefonów'} poza sklepem</p>
        </div>
        <button className="co-btn-primary" onClick={() => setShowForm((v) => !v)}>
          {showForm ? 'Zamknij' : '+ Przekaż do komisu'}
        </button>
      </header>

      <div className="co-summary">
        <div className="co-sum-card"><span className="co-sum-value">{frozenCost} zł</span><span className="co-sum-label">Zamrożony koszt zakupu</span></div>
        <div className="co-sum-card"><span className="co-sum-value">{expectedPayout} zł</span><span className="co-sum-label">Do odebrania od komisantów</span></div>
        <div className="co-sum-card"><span className={`co-sum-value ${expectedProfit >= 0 ? 'co-good' : 'co-bad'}`}>{expectedProfit >= 0 ? '+' : ''}{expectedProfit} zł</span><span className="co-sum-label">Zysk po rozliczeniu</span></div>
      </div>

      {showForm && (
        <section className="co-card">
          <h2 className="co-card-title">Przekaż telefony do komisu</h2>
          <div className="co-form-row">
            <input className="co-input" list="co-partners" placeholder="Komisant (imię / nazwa) *" value={partnerName} onChange={(e) => handlePartnerNameChange(e.target.value)} />
            <datalist id="co-partners">
              {groups.map((g) => <option key={g.name} value={g.name} />)}
            </datalist>
            <input className="co-input" placeholder="Telefon komisanta" value={partnerPhone} onChange={(e) => setPartnerPhone(e.target.value)} />
          </div>
          <input className="co-input" placeholder="Szukaj telefonu w magazynie: model, IMEI…" value={search} onChange={(e) => setSearch(e.target.value)} />

          <div className="co-pick-list">
            {available.length === 0 && <p className="co-empty">Brak telefonów spełniających kryteria.</p>}
            {available.map((p) => {
              const on = picked[p.id] !== undefined;
              return (
                <div key={p.id} className={`co-pick-row ${on ? 'co-pick-on' : ''}`}>
                  <label className="co-pick-main">
                    <input type="checkbox" checked={on} onChange={() => togglePick(p)} />
                    <span>
                      <strong>{p.brand} {p.model}</strong>
                      <span className="co-pick-meta"> {p.storage || ''} {p.color || ''} · {p.imei || 'brak IMEI'} · zakup {p.buyPrice || 0} zł</span>
                    </span>
                  </label>
                  {on && (
                    <input
                      className="co-input co-input-amount"
                      inputMode="decimal"
                      placeholder="Kwota dla mnie (zł)"
                      value={picked[p.id]}
                      onChange={(e) => setPicked((prev) => ({ ...prev, [p.id]: e.target.value }))}
                    />
                  )}
                </div>
              );
            })}
          </div>

          <p className="co-hint">Kwota to to, ile chcesz dostać za telefon. Nadwyżka ponad nią należy do komisanta.</p>
          <button className="co-btn-primary" disabled={busy} onClick={handleGive}>
            {busy ? 'Zapisuję…' : `Przekaż (${pickedIds.length}) i drukuj protokół`}
          </button>
        </section>
      )}

      {groups.length === 0 && !showForm && (
        <div className="co-empty-big">Żaden telefon nie jest teraz u komisanta.</div>
      )}

      {groups.map((g) => {
        const groupTotal = g.list.reduce((s, p) => s + (p.consignPrice || 0), 0);
        return (
          <section key={g.name} className="co-card">
            {editingGroup === g.name ? (
              <div className="co-group-edit">
                <input className="co-input" placeholder="Nazwa komisanta *" value={editName} onChange={(e) => setEditName(e.target.value)} />
                <input className="co-input" placeholder="Telefon" value={editPhone} onChange={(e) => setEditPhone(e.target.value)} />
                <button className="co-btn-primary co-btn-sm" onClick={() => handleSaveGroup(g)}>Zapisz</button>
                <button className="co-btn-ghost co-btn-sm" onClick={() => setEditingGroup(null)}>Anuluj</button>
              </div>
            ) : (
              <div className="co-group-head">
                <div>
                  <h2 className="co-card-title">{g.name}</h2>
                  {g.phone && <span className="co-group-phone">{g.phone}</span>}
                </div>
                <div className="co-group-right">
                  <span className="co-group-total">Do zapłaty: {groupTotal} zł</span>
                  <button className="co-btn-ghost co-btn-sm" onClick={() => startEditGroup(g)}>✏️ Edytuj</button>
                  <button className="co-btn-ghost co-btn-sm" onClick={() => printConsignmentOutProtocol(g.name, g.phone, g.list)}>🖨️ Protokół</button>
                </div>
              </div>
            )}

            {g.list.map((p) => {
              const days = daysSince(p.consignedAt);
              const stale = days >= STALE_DAYS;
              return (
                <div key={p.id} className={`co-phone ${stale ? 'co-phone-stale' : ''}`}>
                  <div className="co-phone-info" onClick={() => navigate(`/skup/${p.id}`)}>
                    <div className="co-phone-name">{p.brand} {p.model} <span className="co-pick-meta">{p.storage || ''} {p.color || ''}</span></div>
                    <div className="co-phone-meta">
                      IMEI {p.imei || '—'} · wydany {fmtDate(p.consignedAt)} ·{' '}
                      <span className={stale ? 'co-bad' : ''}>{days} dni{stale ? ' ⚠️' : ''}</span>
                    </div>
                    <div className="co-phone-meta">Kwota dla mnie: <strong>{p.consignPrice || 0} zł</strong> · zakup {p.buyPrice || 0} zł · zysk {(p.consignPrice || 0) - (p.buyPrice || 0)} zł</div>
                  </div>
                  <div className="co-phone-actions">
                    <input
                      className="co-input co-input-amount"
                      inputMode="decimal"
                      value={settle[p.id] !== undefined ? settle[p.id] : (p.consignPrice || '')}
                      onChange={(e) => setSettle((prev) => ({ ...prev, [p.id]: e.target.value }))}
                      title="Kwota, którą komisant faktycznie zapłacił"
                    />
                    <button className="co-btn-primary co-btn-sm" onClick={() => handleSettle(p)}>💰 Zapłacił</button>
                    <button className="co-btn-ghost co-btn-sm" onClick={() => handleReturn(p)}>↩ Zwrot</button>
                    {groups.length > 1 && (
                      <select className="co-input co-select-move" value="" onChange={(e) => handleMovePhone(p, e.target.value)} title="Przenieś do innego komisanta">
                        <option value="">Przenieś do…</option>
                        {groups.filter((x) => x.name !== g.name).map((x) => <option key={x.name} value={x.name}>{x.name}</option>)}
                      </select>
                    )}
                  </div>
                </div>
              );
            })}
          </section>
        );
      })}
    </div>
  );
}
