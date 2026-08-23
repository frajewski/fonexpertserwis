import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import useStore from '../store/useStore';
import TRADE_STATUS, { tradeStatusIcons, tradeStatusList } from '../constants/tradeStatuses';
import grades from '../constants/grades';
import tradeSources from '../constants/tradeSources';
import './TradeDetailPage.css';

const fmtDate = (iso) => iso ? new Date(iso).toLocaleDateString('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' }) : '—';
const toDateInputValue = (iso) => iso ? iso.slice(0, 10) : '';

export default function TradeDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const currentUser = useStore((s) => s.currentUser);
  const phone = useStore((s) => s.getPhoneById(id));
  const updatePhone = useStore((s) => s.updatePhone);
  const deletePhone = useStore((s) => s.deletePhone);
  const parts = useStore((s) => s.parts);
  const adjustPartQuantity = useStore((s) => s.adjustPartQuantity);

  const isAdmin = currentUser?.role === 'admin';
  const [sellPriceInput, setSellPriceInput] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editImei, setEditImei] = useState('');
  const [editColor, setEditColor] = useState('');
  const [editStorage, setEditStorage] = useState('');
  const [editGrade, setEditGrade] = useState('');
  const [editBuyPrice, setEditBuyPrice] = useState('');
  const [editSellPrice, setEditSellPrice] = useState('');
  const [editBoughtDate, setEditBoughtDate] = useState('');
  const [editSoldDate, setEditSoldDate] = useState('');
  const [editWarranty, setEditWarranty] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editingUsedParts, setEditingUsedParts] = useState(false);
  const [usedPartsInput, setUsedPartsInput] = useState([]);
  const [pickPartId, setPickPartId] = useState('');
  const [pickQuantity, setPickQuantity] = useState('1');
  const [freeTextPartName, setFreeTextPartName] = useState('');

  if (!phone) {
    return (
      <div className="td-page">
        <button className="td-btn-ghost" onClick={() => navigate('/skup')}>← Skup telefonów</button>
        <p style={{ marginTop: 16 }}>Nie znaleziono telefonu.</p>
      </div>
    );
  }

  const grade = grades.find((g) => g.value === phone.grade);
  const profit = (phone.sellPrice || 0) - (phone.buyPrice || 0);

  const handleStatusChange = async (newStatus) => {
    await updatePhone(id, { status: newStatus });
  };

  const handleSetSellPrice = async () => {
    const price = parseFloat(sellPriceInput) || 0;
    await updatePhone(id, { sellPrice: price, status: TRADE_STATUS.SOLD });
    setSellPriceInput('');
  };

  const handleDelete = async () => {
    await deletePhone(id);
    navigate('/skup');
  };

  const handleStartEdit = () => {
    setEditImei(phone.imei || '');
    setEditColor(phone.color || '');
    setEditStorage(phone.storage || '');
    setEditGrade(phone.grade || '');
    setEditBuyPrice(String(phone.buyPrice || 0));
    setEditSellPrice(String(phone.sellPrice || 0));
    setEditBoughtDate(toDateInputValue(phone.boughtAt));
    setEditSoldDate(toDateInputValue(phone.soldAt));
    setEditWarranty(phone.warranty || '');
    setEditNotes(phone.notes || '');
    setEditing(true);
  };

  const handleSaveEdit = async () => {
    await updatePhone(id, {
      imei: editImei.trim(),
      color: editColor.trim(),
      storage: editStorage,
      grade: editGrade,
      buyPrice: parseFloat(editBuyPrice) || 0,
      sellPrice: parseFloat(editSellPrice) || 0,
      boughtAt: editBoughtDate ? new Date(editBoughtDate).toISOString() : phone.boughtAt,
      soldAt: editSoldDate ? new Date(editSoldDate).toISOString() : null,
      warranty: editWarranty.trim(),
      notes: editNotes.trim(),
    });
    setEditing(false);
  };

  const handleStartEditUsedParts = () => {
    setUsedPartsInput(phone.usedParts || []);
    setPickPartId('');
    setPickQuantity('1');
    setFreeTextPartName('');
    setEditingUsedParts(true);
  };

  const handleAddInventoryPart = () => {
    if (!pickPartId) return;
    const part = parts.find((p) => p.id === pickPartId);
    if (!part) return;
    const qty = parseInt(pickQuantity) || 1;
    // Zapamiętujemy cenę jednostkową Z MOMENTU dodania (nie odczytujemy jej
    // na nowo przy zapisie) – żeby późniejsza zmiana ceny części w magazynie
    // nie przeliczała wstecz kosztu już zrealizowanego skupu.
    setUsedPartsInput((prev) => [...prev, { partId: part.id, name: part.name, quantity: qty, unitCost: part.unitCost || 0 }]);
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

  const handleSaveUsedParts = async () => {
    const oldByPartId = {};
    (phone.usedParts || []).forEach((p) => {
      if (p.partId) oldByPartId[p.partId] = (oldByPartId[p.partId] || 0) + p.quantity;
    });
    const newByPartId = {};
    usedPartsInput.forEach((p) => {
      if (p.partId) newByPartId[p.partId] = (newByPartId[p.partId] || 0) + p.quantity;
    });
    const allPartIds = new Set([...Object.keys(oldByPartId), ...Object.keys(newByPartId)]);
    for (const partId of allPartIds) {
      const delta = (newByPartId[partId] || 0) - (oldByPartId[partId] || 0);
      if (delta !== 0) await adjustPartQuantity(partId, -delta);
    }

    // Ta sama zasada co ze stanem magazynowym – doliczamy do kosztu zakupu
    // telefonu TYLKO różnicę kosztu części z magazynu, żeby nie dublować
    // przy wielokrotnej edycji, i żeby nie ruszać kosztu wpisanego ręcznie
    // (za części spoza magazynu).
    const oldPartsCost = (phone.usedParts || []).reduce((sum, p) => sum + (p.partId ? (p.unitCost || 0) * p.quantity : 0), 0);
    const newPartsCost = usedPartsInput.reduce((sum, p) => sum + (p.partId ? (p.unitCost || 0) * p.quantity : 0), 0);
    const costDelta = newPartsCost - oldPartsCost;

    await updatePhone(id, {
      usedParts: usedPartsInput,
      ...(costDelta !== 0 ? { buyPrice: (phone.buyPrice || 0) + costDelta } : {}),
    });
    setEditingUsedParts(false);
  };

  return (
    <div className="td-page">
      <button className="td-btn-ghost" onClick={() => navigate('/skup')}>← Skup telefonów</button>

      <div className="td-layout">
        <div className="td-main">
          <div className="td-card">
            <div className="td-header-top">
              <h1 className="td-device">{phone.brand} {phone.model}</h1>
              <div className="td-header-actions">
                <span className="td-status-icon">{tradeStatusIcons[phone.status]}</span>
                {isAdmin && !editing && (
                  <button className="td-btn-ghost td-btn-edit" onClick={handleStartEdit}>Edytuj</button>
                )}
              </div>
            </div>

            {editing ? (
              <div className="td-edit-form">
                <div className="td-edit-row">
                  <label className="td-edit-field">
                    <span>IMEI</span>
                    <input className="td-input" value={editImei} onChange={(e) => setEditImei(e.target.value)} />
                  </label>
                  <label className="td-edit-field">
                    <span>Kolor</span>
                    <input className="td-input" value={editColor} onChange={(e) => setEditColor(e.target.value)} />
                  </label>
                </div>
                <div className="td-edit-row">
                  <label className="td-edit-field">
                    <span>Pojemność</span>
                    <input className="td-input" value={editStorage} onChange={(e) => setEditStorage(e.target.value)} placeholder="np. 128GB" />
                  </label>
                  <label className="td-edit-field">
                    <span>Stan (grade)</span>
                    <select className="td-input" value={editGrade} onChange={(e) => setEditGrade(e.target.value)}>
                      <option value="">—</option>
                      {grades.map((g) => <option key={g.value} value={g.value}>{g.emoji} {g.label}</option>)}
                    </select>
                  </label>
                </div>
                <div className="td-edit-row">
                  <label className="td-edit-field">
                    <span>Cena zakupu (zł)</span>
                    <input type="number" className="td-input" value={editBuyPrice} onChange={(e) => setEditBuyPrice(e.target.value)} />
                  </label>
                  <label className="td-edit-field">
                    <span>Cena sprzedaży (zł)</span>
                    <input type="number" className="td-input" value={editSellPrice} onChange={(e) => setEditSellPrice(e.target.value)} />
                  </label>
                </div>
                <div className="td-edit-row">
                  <label className="td-edit-field">
                    <span>Data zakupu</span>
                    <input type="date" className="td-input" value={editBoughtDate} onChange={(e) => setEditBoughtDate(e.target.value)} />
                  </label>
                  <label className="td-edit-field">
                    <span>Data sprzedaży</span>
                    <input type="date" className="td-input" value={editSoldDate} onChange={(e) => setEditSoldDate(e.target.value)} />
                  </label>
                </div>
                <label className="td-edit-field">
                  <span>Gwarancja</span>
                  <input className="td-input" value={editWarranty} onChange={(e) => setEditWarranty(e.target.value)} placeholder="np. 30 dni" />
                </label>
                <label className="td-edit-field">
                  <span>Notatki</span>
                  <textarea className="td-input td-textarea" value={editNotes} onChange={(e) => setEditNotes(e.target.value)} rows={3} />
                </label>
                <div className="td-edit-actions">
                  <button className="td-btn-ghost" onClick={() => setEditing(false)}>Anuluj</button>
                  <button className="td-btn-primary-sm" onClick={handleSaveEdit}>Zapisz zmiany</button>
                </div>
              </div>
            ) : (
              <>
                <div className="td-meta">
                  {grade && <span style={{ color: grade.color, fontWeight: 600 }}>{grade.emoji} Grade {phone.grade}</span>}
                  {phone.storage && <span>· {phone.storage}</span>}
                  {phone.color && <span>· {phone.color}</span>}
                </div>
                {phone.imei && <div className="td-imei">IMEI: {phone.imei}</div>}
                {phone.source && (() => {
                  const src = tradeSources.find((s) => s.value === phone.source);
                  return (
                    <div className="td-source">
                      Kupiony od: {src ? `${src.emoji} ${src.label}` : phone.source}
                      {phone.sourceNote && ` — ${phone.sourceNote}`}
                    </div>
                  );
                })()}
                <div className="td-dates">
                  <span>Kupiony: {fmtDate(phone.boughtAt)}</span>
                  {phone.status === TRADE_STATUS.SOLD && <span>Sprzedany: {fmtDate(phone.soldAt)}</span>}
                  {phone.warranty && <span>Gwarancja: {phone.warranty}</span>}
                </div>
              </>
            )}
          </div>

          <div className="td-card">
            <div className="td-header-top">
              <h2 className="td-section-title">Wymienione elementy</h2>
              {isAdmin && !editingUsedParts && (
                <button className="td-btn-ghost" onClick={handleStartEditUsedParts}>
                  {(phone.usedParts || []).length > 0 ? 'Edytuj' : '+ Dodaj'}
                </button>
              )}
            </div>

            {editingUsedParts ? (
              <>
                <div className="td-used-parts-list">
                  {usedPartsInput.map((p, i) => (
                    <div key={i} className="td-used-part-row">
                      <span>{p.name} {p.partId ? '' : '(spoza magazynu)'} × {p.quantity}</span>
                      <button className="td-used-part-remove" onClick={() => handleRemoveUsedPart(i)}>✕</button>
                    </div>
                  ))}
                </div>

                <div className="td-add-part-row">
                  <select className="td-input" value={pickPartId} onChange={(e) => setPickPartId(e.target.value)}>
                    <option value="">— wybierz część z magazynu —</option>
                    {parts.map((p) => (
                      <option key={p.id} value={p.id}>{p.name} (na stanie: {p.quantity || 0})</option>
                    ))}
                  </select>
                  <input type="number" className="td-input td-add-part-qty" value={pickQuantity} min="1" onChange={(e) => setPickQuantity(e.target.value)} />
                  <button className="td-btn-ghost" onClick={handleAddInventoryPart}>Dodaj</button>
                </div>

                <div className="td-add-part-row">
                  <input className="td-input" placeholder="Część spoza magazynu (nazwa)" value={freeTextPartName} onChange={(e) => setFreeTextPartName(e.target.value)} />
                  <button className="td-btn-ghost" onClick={handleAddFreeTextPart}>Dodaj</button>
                </div>

                <div className="td-edit-actions">
                  <button className="td-btn-ghost" onClick={() => setEditingUsedParts(false)}>Anuluj</button>
                  <button className="td-btn-primary-sm" onClick={handleSaveUsedParts}>Zapisz</button>
                </div>
              </>
            ) : (
              (phone.usedParts || []).length > 0 ? (
                <div className="td-used-parts-list">
                  {phone.usedParts.map((p, i) => (
                    <div key={i} className="td-used-part-row"><span>📦 {p.name} × {p.quantity}</span></div>
                  ))}
                </div>
              ) : (
                <p className="td-empty-hint">Brak zapisanych wymienionych elementów.</p>
              )
            )}
          </div>

          {(phone.hasIcloudLock || phone.hasCarrierLock || phone.isReported) && (
            <div className="td-card">
              <h2 className="td-section-title">Blokady</h2>
              <div className="td-locks">
                {phone.hasIcloudLock && <span className="td-lock">🔒 Blokada iCloud</span>}
                {phone.hasCarrierLock && <span className="td-lock">📡 Simlock operatora</span>}
                {phone.isReported && <span className="td-lock td-lock-warn">⚠️ Zgłoszony jako zastrzeżony</span>}
              </div>
            </div>
          )}

          {isAdmin && !editing && (
            <div className="td-card">
              <h2 className="td-section-title">Finanse</h2>
              <div className="td-cost-row"><span>Cena zakupu</span><span>{phone.buyPrice || 0} zł</span></div>
              {phone.status === TRADE_STATUS.SOLD ? (
                <>
                  <div className="td-cost-row"><span>Cena sprzedaży</span><span>{phone.sellPrice || 0} zł</span></div>
                  <div className={`td-cost-row td-cost-total ${profit >= 0 ? 'td-profit-good' : 'td-profit-bad'}`}>
                    <span>Zysk</span><span>{profit >= 0 ? '+' : ''}{profit} zł</span>
                  </div>
                </>
              ) : (
                <div className="td-sell-form">
                  <input className="td-input" placeholder="Cena sprzedaży (zł)" value={sellPriceInput} onChange={(e) => setSellPriceInput(e.target.value)} />
                  <button className="td-btn-primary-sm" onClick={handleSetSellPrice}>Oznacz jako sprzedany</button>
                </div>
              )}
            </div>
          )}

          {!editing && phone.notes && (
            <div className="td-card">
              <h2 className="td-section-title">Notatki</h2>
              <p className="td-notes">{phone.notes}</p>
            </div>
          )}
        </div>

        <div className="td-side">
          <div className="td-card">
            <h2 className="td-section-title">Zmień status</h2>
            <div className="td-status-options">
              {tradeStatusList.map((st) => (
                <button
                  key={st}
                  className={`td-status-option ${phone.status === st ? 'td-status-option-active' : ''}`}
                  onClick={() => handleStatusChange(st)}
                  disabled={phone.status === st}
                >
                  {tradeStatusIcons[st]} {st}
                </button>
              ))}
            </div>
          </div>

          {isAdmin && (
            <div className="td-card td-danger-card">
              {!confirmDelete ? (
                <button className="td-btn-danger-ghost" onClick={() => setConfirmDelete(true)}>Usuń telefon</button>
              ) : (
                <>
                  <p className="td-danger-text">Tej operacji nie da się cofnąć.</p>
                  <div className="td-danger-actions">
                    <button className="td-btn-ghost" onClick={() => setConfirmDelete(false)}>Anuluj</button>
                    <button className="td-btn-danger" onClick={handleDelete}>Usuń trwale</button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
