import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import useStore from '../store/useStore';
import TRADE_STATUS, { tradeStatusIcons, tradeStatusList } from '../constants/tradeStatuses';
import grades from '../constants/grades';
import tradeSources from '../constants/tradeSources';
import { printPurchaseAgreement, buildPurchaseAgreementHtml } from '../utils/printPurchaseAgreement';
import { printWarrantyCard, buildWarrantyCardHtml } from '../utils/printWarrantyCard';
import DocumentShareButtons from '../components/DocumentShareButtons';
import { safeFileName } from '../documents/shareDocument';
import { uploadTradePhotoWeb, deletePhotoByUrlWeb } from '../firebase/photoUpload';
import CameraButton from '../components/CameraButton';
import { isOnlineNow, PHOTO_OFFLINE_MESSAGE } from '../network/networkStatus';
import { isNativeCameraAvailable } from '../utils/nativeCamera';
import { printConsignmentAgreement, buildConsignmentAgreementHtml } from '../utils/printConsignmentAgreement';
import { warrantyPeriods, calcWarrantyEndDate } from '../constants/warrantyPeriods';
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
  const [photoUploading, setPhotoUploading] = useState(false);
  const [selectedSaleWarranty, setSelectedSaleWarranty] = useState(warrantyPeriods[2]);
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
  const [editB2bListed, setEditB2bListed] = useState(false);
  const [editB2bPrice, setEditB2bPrice] = useState('');
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
    const soldAt = new Date().toISOString();
    await updatePhone(id, {
      sellPrice: price,
      status: TRADE_STATUS.SOLD,
      soldAt,
      warrantyMonths: selectedSaleWarranty.months,
      warrantyEndDate: calcWarrantyEndDate(soldAt, selectedSaleWarranty.months),
    });
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
    setEditB2bListed(!!phone.b2bListed);
    setEditB2bPrice(phone.b2bPrice ? String(phone.b2bPrice) : '');
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
      b2bListed: editB2bListed,
      b2bPrice: parseFloat(editB2bPrice) || 0,
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
    if ((part.quantity || 0) <= 0) {
      alert(`Brak "${part.name}" na stanie magazynowym. Uzupełnij stan w Magazynie przed dodaniem.`);
      return;
    }
    if (qty > (part.quantity || 0)) {
      alert(`Na stanie jest tylko ${part.quantity} szt. "${part.name}", nie ${qty}.`);
      return;
    }
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


  // Wspólne dla obu źródeł: pliku z <input> i zdjęcia z natywnego aparatu.
  // Przy podmianie kasuje stare zdjęcie ze Storage (jak dotąd).
  const uploadPhonePhoto = async (file) => {
    if (!isOnlineNow()) { alert(PHOTO_OFFLINE_MESSAGE); return; }
    setPhotoUploading(true);
    try {
      const oldUrl = phone.photo;
      const url = await uploadTradePhotoWeb(id, file);
      await updatePhone(id, { photo: url });
      if (oldUrl) await deletePhotoByUrlWeb(oldUrl);
    } catch (err) {
      alert('Nie udało się wgrać zdjęcia: ' + err.message);
    } finally {
      setPhotoUploading(false);
    }
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
                {isAdmin && (
                  <button
                    className="td-btn-ghost"
                    onClick={() => phone.transactionType === 'consignment' ? printConsignmentAgreement(phone) : printPurchaseAgreement(phone)}
                  >
                    📄 Drukuj umowę
                  </button>
                )}
                {isAdmin && (
                  <DocumentShareButtons
                    className="td-btn-ghost"
                    docLabel="umowę"
                    buildHtml={() => (phone.transactionType === 'consignment' ? buildConsignmentAgreementHtml(phone) : buildPurchaseAgreementHtml(phone))}
                    fileName={`${safeFileName(phone.transactionType === 'consignment' ? 'FonExpert_Umowa_komisu' : 'FonExpert_Umowa', phone.brand, phone.model, phone.imei ? phone.imei.slice(-4) : phone.id.slice(0, 6))}.pdf`}
                    title={`FonExpert — ${phone.transactionType === 'consignment' ? 'umowa komisu' : 'umowa kupna-sprzedaży'}: ${phone.brand} ${phone.model}`}
                  />
                )}
                {isAdmin && phone.status === TRADE_STATUS.SOLD && (
                  <button className="td-btn-ghost" onClick={() => printWarrantyCard(phone)}>
                    🛡️ Drukuj kartę gwarancyjną
                  </button>
                )}
                {isAdmin && phone.status === TRADE_STATUS.SOLD && (
                  <DocumentShareButtons
                    className="td-btn-ghost"
                    docLabel="kartę"
                    buildHtml={() => buildWarrantyCardHtml(phone)}
                    fileName={`${safeFileName('FonExpert_Karta_gwarancyjna', phone.brand, phone.model, phone.imei ? phone.imei.slice(-4) : phone.id.slice(0, 6))}.pdf`}
                    title={`FonExpert — karta gwarancyjna: ${phone.brand} ${phone.model}`}
                  />
                )}
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

                <label className="td-edit-field td-b2b-check">
                  <input type="checkbox" checked={editB2bListed} onChange={(e) => setEditB2bListed(e.target.checked)} />
                  <span>W ofercie B2B (widoczny w katalogu klienta hurtowego)</span>
                </label>
                {editB2bListed && (
                  <label className="td-edit-field">
                    <span>Cena B2B (zł)</span>
                    <input className="td-input" value={editB2bPrice} onChange={(e) => setEditB2bPrice(e.target.value)} placeholder="0.00" />
                  </label>
                )}
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
                  {phone.b2bListed && <span>🏷️ B2B: {phone.b2bPrice || 0} zł</span>}
                  {phone.warrantyMonths > 0 ? (
                    <span>🛡️ Gwarancja: {phone.warrantyMonths} mies. — do {fmtDate(phone.warrantyEndDate)}</span>
                  ) : phone.warranty ? (
                    <span>Gwarancja: {phone.warranty}</span>
                  ) : null}
                </div>
              </>
            )}
          </div>

          <div className="td-card">
            <h2 className="td-section-title">Zdjęcie</h2>
            {phone.photo ? (
              <img src={phone.photo} alt="" className="td-photo-single" />
            ) : (
              <p className="td-empty-hint">Brak zdjęcia.</p>
            )}
            {isAdmin && (
              <div className="td-photo-actions">
                <CameraButton
                  className="td-photo-upload-btn"
                  requireOnline
                  label={phone.photo ? '📷 Zrób nowe zdjęcie' : '📷 Zrób zdjęcie'}
                  disabled={photoUploading}
                  onPhoto={uploadPhonePhoto}
                />
                <label className="td-photo-upload-btn">
                  {photoUploading
                    ? 'Wgrywam…'
                    : isNativeCameraAvailable()
                      ? '🖼️ Z galerii / plików'
                      : phone.photo ? 'Podmień zdjęcie' : '+ Dodaj zdjęcie'}
                  <input
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    disabled={photoUploading}
                    onChange={async (e) => {
                      const file = e.target.files && e.target.files[0];
                      e.target.value = '';
                      if (file) await uploadPhonePhoto(file);
                    }}
                  />
                </label>
                {phone.photo && (
                  <button
                    type="button"
                    className="td-photo-remove-btn"
                    disabled={photoUploading}
                    onClick={async () => {
                      if (!window.confirm('Usunąć zdjęcie?')) return;
                      const oldUrl = phone.photo;
                      await updatePhone(id, { photo: null });
                      await deletePhotoByUrlWeb(oldUrl);
                    }}
                  >
                    Usuń zdjęcie
                  </button>
                )}
              </div>
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
                  <div className="td-warranty-picker">
                    <span className="td-warranty-picker-label">Gwarancja dla kupującego:</span>
                    <div className="td-warranty-options">
                      {warrantyPeriods.map((w) => (
                        <button
                          key={w.months}
                          type="button"
                          className={`td-warranty-option ${selectedSaleWarranty.months === w.months ? 'td-warranty-option-active' : ''}`}
                          onClick={() => setSelectedSaleWarranty(w)}
                        >
                          {w.label}
                        </button>
                      ))}
                    </div>
                  </div>
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
