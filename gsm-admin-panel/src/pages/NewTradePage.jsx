import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import useStore from '../store/useStore';
import brands from '../constants/brands';
import grades from '../constants/grades';
import tradeSources from '../constants/tradeSources';
import { storageOptions } from '../constants/storageOptions';
import TRADE_STATUS from '../constants/tradeStatuses';
import './NewTradePage.css';

export default function NewTradePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const addPhone = useStore((s) => s.addPhone);
  const phones = useStore((s) => s.phones);
  const parts = useStore((s) => s.parts);
  const adjustPartQuantity = useStore((s) => s.adjustPartQuantity);
  const [condition, setCondition] = useState('used');

  // Kalkulator wyceny (CalculatorPage) może tu przekierować z gotową
  // podpowiedzią marki/modelu/grade/ceny – wypełniamy nią formularz od razu.
  const prefill = location.state?.prefill || {};

  const [brand, setBrand] = useState(prefill.brand || '');
  const [model, setModel] = useState(prefill.model || '');
  const [imei, setImei] = useState('');
  const [color, setColor] = useState('');
  const [storage, setStorage] = useState('');
  const [grade, setGrade] = useState(prefill.grade || '');
  const [source, setSource] = useState('');
  const [sourceNote, setSourceNote] = useState('');
  const [buyPrice, setBuyPrice] = useState(prefill.buyPrice != null ? String(prefill.buyPrice) : '');
  const [boughtDate, setBoughtDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [hasIcloudLock, setHasIcloudLock] = useState(false);
  const [hasCarrierLock, setHasCarrierLock] = useState(false);
  const [isReported, setIsReported] = useState(false);
  const [warranty, setWarranty] = useState('');
  const [usedPartsInput, setUsedPartsInput] = useState([]);
  const [pickPartId, setPickPartId] = useState('');
  const [pickQuantity, setPickQuantity] = useState('1');
  const [freeTextPartName, setFreeTextPartName] = useState('');
  const [notes, setNotes] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleAddInventoryPart = () => {
    if (!pickPartId) return;
    const part = parts.find((p) => p.id === pickPartId);
    if (!part) return;
    const qty = parseInt(pickQuantity) || 1;
    setUsedPartsInput((prev) => [...prev, { partId: part.id, name: part.name, quantity: qty }]);
    setPickPartId('');
    setPickQuantity('1');
  };

  const handleAddFreeTextPart = () => {
    if (!freeTextPartName.trim()) return;
    setUsedPartsInput((prev) => [...prev, { partId: null, name: freeTextPartName.trim(), quantity: 1 }]);
    setFreeTextPartName('');
  };

  const handleRemoveUsedPart = (index) => {
    setUsedPartsInput((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!brand)        { setError('Wybierz markę.'); return; }
    if (!model.trim()) { setError('Podaj model.'); return; }
    if (!grade)        { setError('Wybierz grade.'); return; }
    if (!source)       { setError('Wybierz źródło zakupu.'); return; }
    if (!buyPrice)      { setError('Podaj cenę zakupu.'); return; }

    // Ostrzeżenie o duplikacie IMEI – nie blokuje na twardo, bo czasem ten sam
    // telefon jest legalnie odkupywany od klienta drugi raz, ale ma pomóc
    // złapać przypadkowe podwójne dodanie (np. dwukrotne kliknięcie "Zapisz").
    const normalizedImei = imei.trim().replace(/\s/g, '');
    if (normalizedImei) {
      const existing = phones.filter((p) => p.imei && p.imei.replace(/\s/g, '') === normalizedImei);
      if (existing.length > 0) {
        const details = existing.map((p) => `• ${p.brand} ${p.model} — zakup ${p.buyPrice || 0} zł, status: ${p.status}`).join('\n');
        const proceed = window.confirm(
          `Ten IMEI już istnieje w bazie (${existing.length}x):\n\n${details}\n\n` +
          `Czy na pewno chcesz dodać kolejny wpis z tym samym IMEI? (OK jeśli to faktyczny ponowny odkup, Anuluj jeśli to pomyłka)`
        );
        if (!proceed) return;
      }
    }

    setLoading(true);
    try {
      const phone = await addPhone({
        brand, model: model.trim(), imei: imei.trim(),
        color: color.trim(), storage, grade, source, sourceNote: sourceNote.trim(),
        buyPrice: parseFloat(buyPrice) || 0,
        boughtAt: boughtDate ? new Date(boughtDate).toISOString() : undefined,
        sellPrice: 0,
        status: TRADE_STATUS.BOUGHT,
        hasIcloudLock, hasCarrierLock, isReported, condition,
        warranty: warranty.trim(),
        notes: notes.trim(),
        usedParts: usedPartsInput,
      });
      for (const p of usedPartsInput) {
        if (p.partId) await adjustPartQuantity(p.partId, -p.quantity);
      }
      navigate(`/skup/${phone.id}`);
    } catch (err) {
      setLoading(false);
      setError('Nie udało się dodać telefonu: ' + err.message);
    }
  };

  return (
    <div className="nt-page">
      <button className="nt-back" onClick={() => navigate('/skup')}>← Skup telefonów</button>
      <h1 className="nt-title">Dodaj telefon</h1>

      <div className="nt-condition-toggle">
        <button
          type="button"
          className={`nt-condition-option ${condition === 'new' ? 'nt-condition-option-active' : ''}`}
          onClick={() => setCondition('new')}
        >
          ✨ Nowy
        </button>
        <button
          type="button"
          className={`nt-condition-option ${condition === 'used' ? 'nt-condition-option-active' : ''}`}
          onClick={() => setCondition('used')}
        >
          🔁 Używany
        </button>
      </div>

      <form className="nt-form" onSubmit={handleSubmit}>
        <div className="nt-card">
          <h2 className="nt-section-title">Urządzenie</h2>
          <div className="nt-row">
            <label className="nt-field">
              <span className="nt-label">Marka *</span>
              <select className="nt-select" value={brand} onChange={(e) => setBrand(e.target.value)}>
                <option value="">— Wybierz —</option>
                {brands.map((b) => <option key={b.value} value={b.value}>{b.label}</option>)}
              </select>
            </label>
            <label className="nt-field">
              <span className="nt-label">Model *</span>
              <input className="nt-input" value={model} onChange={(e) => setModel(e.target.value)} placeholder="np. iPhone 13 Pro" />
            </label>
          </div>
          <div className="nt-row">
            <label className="nt-field">
              <span className="nt-label">IMEI</span>
              <input className="nt-input" value={imei} onChange={(e) => setImei(e.target.value)} maxLength={15} />
            </label>
            <label className="nt-field">
              <span className="nt-label">Kolor</span>
              <input className="nt-input" value={color} onChange={(e) => setColor(e.target.value)} placeholder="np. Czarny" />
            </label>
          </div>
          <label className="nt-field">
            <span className="nt-label">Pamięć</span>
            <div className="nt-chips">
              {storageOptions.map((s) => (
                <button key={s} type="button" className={`nt-chip ${storage === s ? 'nt-chip-active' : ''}`} onClick={() => setStorage(storage === s ? '' : s)}>{s}</button>
              ))}
            </div>
          </label>
          <label className="nt-field">
            <span className="nt-label">Grade *</span>
            <div className="nt-chips">
              {grades.map((g) => (
                <button key={g.value} type="button" className={`nt-chip ${grade === g.value ? 'nt-chip-active' : ''}`} onClick={() => setGrade(g.value)} title={g.description}>
                  {g.emoji} {g.value}
                </button>
              ))}
            </div>
          </label>
        </div>

        <div className="nt-card">
          <h2 className="nt-section-title">Blokady</h2>
          <label className="nt-checkbox"><input type="checkbox" checked={hasIcloudLock} onChange={(e) => setHasIcloudLock(e.target.checked)} /> Blokada iCloud (Find My)</label>
          <label className="nt-checkbox"><input type="checkbox" checked={hasCarrierLock} onChange={(e) => setHasCarrierLock(e.target.checked)} /> Simlock operatora</label>
          <label className="nt-checkbox"><input type="checkbox" checked={isReported} onChange={(e) => setIsReported(e.target.checked)} /> Zgłoszony jako zastrzeżony/kradziony</label>
        </div>

        <div className="nt-card">
          <h2 className="nt-section-title">Zakup</h2>
          <label className="nt-field">
            <span className="nt-label">Źródło *</span>
            <select className="nt-select" value={source} onChange={(e) => setSource(e.target.value)}>
              <option value="">— Wybierz —</option>
              {tradeSources.map((s) => <option key={s.value} value={s.value}>{s.emoji} {s.label}</option>)}
            </select>
          </label>
          <label className="nt-field">
            <span className="nt-label">Notatka (nick OLX, imię klienta…)</span>
            <input className="nt-input" value={sourceNote} onChange={(e) => setSourceNote(e.target.value)} />
          </label>
          <label className="nt-field">
            <span className="nt-label">Cena zakupu (zł) *</span>
            <input className="nt-input" value={buyPrice} onChange={(e) => setBuyPrice(e.target.value)} placeholder="0.00" />
          </label>
          <label className="nt-field">
            <span className="nt-label">Data zakupu</span>
            <input type="date" className="nt-input" value={boughtDate} onChange={(e) => setBoughtDate(e.target.value)} />
          </label>
          <label className="nt-field">
            <span className="nt-label">Gwarancja</span>
            <input className="nt-input" value={warranty} onChange={(e) => setWarranty(e.target.value)} placeholder="np. 30 dni" />
          </label>
          <label className="nt-field">
            <span className="nt-label">Notatki</span>
            <textarea className="nt-textarea" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </label>
        </div>

        <div className="nt-card">
            <h2 className="nt-section-title">Wymienione elementy</h2>
            <div className="nt-used-parts-list">
              {usedPartsInput.map((p, i) => (
                <div key={i} className="nt-used-part-row">
                  <span>{p.name} {p.partId ? '' : '(spoza magazynu)'} × {p.quantity}</span>
                  <button type="button" className="nt-used-part-remove" onClick={() => handleRemoveUsedPart(i)}>✕</button>
                </div>
              ))}
            </div>
            <div className="nt-row">
              <select className="nt-input" value={pickPartId} onChange={(e) => setPickPartId(e.target.value)}>
                <option value="">— wybierz część z magazynu —</option>
                {parts.map((p) => (
                  <option key={p.id} value={p.id}>{p.name} (na stanie: {p.quantity || 0})</option>
                ))}
              </select>
              <input type="number" className="nt-input" style={{ maxWidth: 70 }} value={pickQuantity} min="1" onChange={(e) => setPickQuantity(e.target.value)} />
              <button type="button" className="nt-back" onClick={handleAddInventoryPart}>Dodaj</button>
            </div>
            <div className="nt-row">
              <input className="nt-input" placeholder="Część spoza magazynu (nazwa)" value={freeTextPartName} onChange={(e) => setFreeTextPartName(e.target.value)} />
              <button type="button" className="nt-back" onClick={handleAddFreeTextPart}>Dodaj</button>
            </div>
          </div>

      {error && <div className="nt-error">{error}</div>}
        <button className="nt-submit" type="submit" disabled={loading}>{loading ? 'Zapisuję…' : 'Dodaj do skupu'}</button>
      </form>
    </div>
  );
}
