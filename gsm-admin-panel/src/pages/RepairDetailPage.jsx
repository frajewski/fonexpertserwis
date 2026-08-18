import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import useStore from '../store/useStore';
import STATUS, { statusList, statusIcons, terminalStatuses } from '../constants/statuses';
import { warrantyPeriods, calcWarrantyEndDate } from '../constants/warrantyPeriods';
import { uploadRepairPhotoWeb, deletePhotoByUrlWeb } from '../firebase/photoUpload';
import { printRepairConfirmation } from '../utils/printConfirmation';
import { printDeviceLabel } from '../utils/printDeviceLabel';
import { messageTemplates } from '../utils/messageTemplates';
import useSettings from '../store/useSettings';
import './RepairDetailPage.css';

const fmtDate = (iso) => iso ? new Date(iso).toLocaleDateString('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' }) : '—';
const toDateInputValue = (iso) => iso ? iso.slice(0, 10) : '';

const STATUS_TONE = {
  [STATUS.ACCEPTED]: 'wait', [STATUS.DIAGNOSIS]: 'wait', [STATUS.REPAIR]: 'info',
  [STATUS.PARTS]: 'info', [STATUS.READY]: 'good', [STATUS.DELIVERED]: 'neutral', [STATUS.CANCELLED]: 'warn',
};

export default function RepairDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const currentUser = useStore((s) => s.currentUser);
  const updateRepair = useStore((s) => s.updateRepair);
  const deleteRepair = useStore((s) => s.deleteRepair);
  const getUserById = useStore((s) => s.getUserById);
  const repair = useStore((s) => s.getRepairById(id));
  const parts = useStore((s) => s.parts);
  const adjustPartQuantity = useStore((s) => s.adjustPartQuantity);

  const isAdmin = currentUser?.role === 'admin';
  const isStaff = currentUser?.role === 'admin' || currentUser?.role === 'worker';
  const customer = repair ? getUserById(repair.customerId) : null;
  const shopSettings = useSettings();

  const handlePrint = () => {
    printRepairConfirmation(repair, customer, shopSettings);
  };

  // Dla klientów, którzy nie zakładają konta (nie mają dostępu do apki/portalu),
  // nie ma innej drogi zaakceptowania/odrzucenia kosztorysu niż ustnie na miejscu –
  // personel zapisuje wtedy decyzję ręcznie w tym miejscu.
  const handleManualEstimateDecision = (accepted) => {
    updateRepair(repair.id, { estimateAccepted: accepted });
  };

  const [showWarrantyForm, setShowWarrantyForm] = useState(false);
  const [selectedWarranty, setSelectedWarranty] = useState(warrantyPeriods[2]);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [editingCost, setEditingCost] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState('ready');
  const [messageBody, setMessageBody] = useState('');
  const [messageCopied, setMessageCopied] = useState(false);
  const [partsCostInput, setPartsCostInput] = useState('');
  const [serviceCostInput, setServiceCostInput] = useState('');
  const [totalCostInput, setTotalCostInput] = useState('');
  const [partsSourceInput, setPartsSourceInput] = useState('');
  const [partsInvoiceInput, setPartsInvoiceInput] = useState('');
  const [editingDates, setEditingDates] = useState(false);
  const [editCreatedAt, setEditCreatedAt] = useState('');
  const [editReadyAt, setEditReadyAt] = useState('');
  const [editIssuedAt, setEditIssuedAt] = useState('');
  const [editingWork, setEditingWork] = useState(false);
  const [workDescriptionInput, setWorkDescriptionInput] = useState('');
  const [usedPartsInput, setUsedPartsInput] = useState([]); // [{partId, name, quantity}]
  const [pickPartId, setPickPartId] = useState('');
  const [pickQuantity, setPickQuantity] = useState('1');
  const [freeTextPartName, setFreeTextPartName] = useState('');

  if (!repair) {
    return (
      <div className="rd-page">
        <div className="rd-notfound">
          <p>Nie znaleziono zlecenia.</p>
          <button className="rd-btn-ghost" onClick={() => navigate('/')}>← Wróć do listy</button>
        </div>
      </div>
    );
  }

  const isClosed = terminalStatuses.includes(repair.status);
  const total = (repair.partsCost || 0) + (repair.serviceCost || 0);
  const tone = STATUS_TONE[repair.status] || 'neutral';

  const handleStatusChange = async (newStatus) => {
    if (newStatus === STATUS.DELIVERED) {
      setShowWarrantyForm(true);
      return;
    }
    await updateRepair(id, {
      status: newStatus,
      statusUpdatedAt: new Date().toISOString(),
      // Data wykonania (kiedy naprawa faktycznie się skończyła) – osobna od
      // daty wydania (kiedy klient faktycznie odebrał, co bywa dużo później)
      ...(newStatus === STATUS.READY && !repair.readyAt ? { readyAt: new Date().toISOString() } : {}),
    });
  };

  const handleConfirmDelivery = async () => {
    const issuedAt = new Date().toISOString();
    await updateRepair(id, {
      status: STATUS.DELIVERED,
      statusUpdatedAt: issuedAt,
      warrantyMonths: selectedWarranty.months,
      warrantyEndDate: calcWarrantyEndDate(issuedAt, selectedWarranty.months),
      issuedAt,
    });
    setShowWarrantyForm(false);
  };

  const handleDelete = async () => {
    try {
      await deleteRepair(id);
      navigate('/');
    } catch (error) {
      alert('Nie udało się usunąć zlecenia: ' + error.message);
    }
  };

  const handleStartEditCost = () => {
    setPartsCostInput(String(repair.partsCost || 0));
    setServiceCostInput(String(repair.serviceCost || 0));
    setTotalCostInput(String((repair.partsCost || 0) + (repair.serviceCost || 0)));
    setPartsSourceInput(repair.partsSource || '');
    setPartsInvoiceInput(repair.partsInvoiceNumber || '');
    setEditingCost(true);
  };

  // Usługa = Łącznie - Części, liczona automatycznie (admin wpisuje tylko te dwie
  // wartości, bo w praktyce zna cenę części z faktury i cenę całości dla klienta –
  // nie musi ręcznie odejmować w kalkulatorze)
  const computedServiceCost = (parseFloat(totalCostInput) || 0) - (parseFloat(partsCostInput) || 0);

  const handleSaveCost = async () => {
    const newPartsCost = parseFloat(partsCostInput) || 0;
    const newServiceCost = isAdmin ? computedServiceCost : (parseFloat(serviceCostInput) || 0);
    const changed = newPartsCost !== (repair.partsCost || 0) || newServiceCost !== (repair.serviceCost || 0);

    await updateRepair(id, {
      partsCost: newPartsCost,
      serviceCost: newServiceCost,
      // Skąd kupione części i nr faktury – żeby przy reklamacji nie trzeba było
      // szukać po fakturach papierowych, tylko od razu wiadomo gdzie i czym się
      // rozliczyć. Numer faktury celowo nieobowiązkowy (nie każde zlecenie
      // wymaga części).
      partsSource: partsSourceInput.trim(),
      partsInvoiceNumber: partsInvoiceInput.trim(),
      // Jeśli klient już zaakceptował/odrzucił poprzedni kosztorys, a kwota się
      // zmieniła – reset do "czeka na decyzję", tak samo jak w apce mobilnej
      // (EstimateScreen). Klient musi zaakceptować nową kwotę, nie starą.
      ...(changed && repair.estimateAccepted !== null ? { estimateAccepted: null } : {}),
    });
    setEditingCost(false);
  };

  const handleStartEditDates = () => {
    setEditCreatedAt(toDateInputValue(repair.createdAt));
    setEditReadyAt(toDateInputValue(repair.readyAt));
    setEditIssuedAt(toDateInputValue(repair.issuedAt));
    setEditingDates(true);
  };

  const handleSaveDates = async () => {
    await updateRepair(id, {
      createdAt: editCreatedAt ? new Date(editCreatedAt).toISOString() : repair.createdAt,
      readyAt: editReadyAt ? new Date(editReadyAt).toISOString() : null,
      issuedAt: editIssuedAt ? new Date(editIssuedAt).toISOString() : null,
    });
    setEditingDates(false);
  };

  const handleStartEditWork = () => {
    setWorkDescriptionInput(repair.workDescription || '');
    setUsedPartsInput(repair.usedParts || []);
    setPickPartId('');
    setPickQuantity('1');
    setFreeTextPartName('');
    setEditingWork(true);
  };

  const handleAddInventoryPart = () => {
    if (!pickPartId) return;
    const part = parts.find((p) => p.id === pickPartId);
    if (!part) return;
    const qty = parseInt(pickQuantity) || 1;
    // Zapamiętujemy cenę jednostkową Z MOMENTU dodania (nie odczytujemy jej
    // na nowo przy zapisie) – żeby późniejsza zmiana ceny części w magazynie
    // nie przeliczała wstecz kosztu już wykonanych zleceń.
    setUsedPartsInput((prev) => [...prev, { partId: part.id, name: part.name, quantity: qty, unitCost: part.unitCost || 0 }]);
    setPickPartId('');
    setPickQuantity('1');
  };

  const handleAddFreeTextPart = () => {
    if (!freeTextPartName.trim()) return;
    // partId: null – część spoza magazynu (np. kupiona jednorazowo), nic nie
    // odejmujemy ze stanu, tylko zapisujemy nazwę do historii zlecenia
    setUsedPartsInput((prev) => [...prev, { partId: null, name: freeTextPartName.trim(), quantity: 1 }]);
    setFreeTextPartName('');
  };

  const handleRemoveUsedPart = (index) => {
    setUsedPartsInput((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSaveWork = async () => {
    // Porównujemy z tym co było zapisane poprzednio i korygujemy stan
    // magazynowy tylko o RÓŻNICĘ – żeby wielokrotna edycja tego samego
    // zlecenia nie odejmowała części ze stanu za każdym razem od nowa.
    const oldByPartId = {};
    (repair.usedParts || []).forEach((p) => {
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

    // Ta sama zasada co ze stanem magazynowym – doliczamy do kosztorysu
    // zlecenia TYLKO różnicę kosztu części z magazynu (stara suma vs nowa),
    // żeby nie dublować przy wielokrotnej edycji, i żeby nie ruszać części
    // kosztu wpisanej ręcznie w Kosztorysie (za części spoza magazynu).
    const oldPartsCost = (repair.usedParts || []).reduce((sum, p) => sum + (p.partId ? (p.unitCost || 0) * p.quantity : 0), 0);
    const newPartsCost = usedPartsInput.reduce((sum, p) => sum + (p.partId ? (p.unitCost || 0) * p.quantity : 0), 0);
    const costDelta = newPartsCost - oldPartsCost;

    await updateRepair(id, {
      workDescription: workDescriptionInput.trim(),
      usedParts: usedPartsInput,
      ...(costDelta !== 0 ? { partsCost: (repair.partsCost || 0) + costDelta } : {}),
    });
    setEditingWork(false);
  };

  const handleAddPhotos = async (e) => {
    const files = Array.from(e.target.files || []).slice(0, 5 - (repair.repairPhotos?.length || 0));
    if (files.length === 0) return;

    setUploadingPhoto(true);
    try {
      const uploadedUrls = await Promise.all(files.map((file) => uploadRepairPhotoWeb(id, file)));
      const updated = [...(repair.repairPhotos || []), ...uploadedUrls].slice(0, 5);
      await updateRepair(id, { repairPhotos: updated });
    } catch (error) {
      alert('Nie udało się wgrać zdjęć: ' + error.message);
    } finally {
      setUploadingPhoto(false);
      e.target.value = ''; // pozwala wybrać te same pliki jeszcze raz, jeśli trzeba
    }
  };

  const handleRemovePhoto = async (index, url) => {
    const updated = (repair.repairPhotos || []).filter((_, i) => i !== index);
    await updateRepair(id, { repairPhotos: updated });
    await deletePhotoByUrlWeb(url);
  };

  return (
    <div className="rd-page">
      <button className="rd-back" onClick={() => navigate('/')}>← Wszystkie zlecenia</button>

      <div className="rd-layout">
        {/* ===== GŁÓWNA KOLUMNA ===== */}
        <div className="rd-main">
          <div className="rd-card rd-header-card">
            <div className="rd-header-top">
              <div>
                <span className="rd-number">#{repair.displayNumber || repair.id}</span>
                <h1 className="rd-device">
                  {repair.priority && <span className="rd-priority-flag" title="Pilne">🔥</span>}
                  {repair.brand} {repair.model}
                </h1>
              </div>
              <span className={`rd-badge rd-badge-${tone}`}>{statusIcons[repair.status]} {repair.status}</span>
            </div>
            {repair.imei && <div className="rd-imei">IMEI: {repair.imei}</div>}
            <p className="rd-desc">{repair.description}</p>
            {isStaff && !isClosed && (
              <button
                type="button"
                className={`rd-priority-toggle ${repair.priority ? 'rd-priority-toggle-active' : ''}`}
                onClick={() => updateRepair(id, { priority: !repair.priority })}
              >
                {repair.priority ? '🔥 Oznaczone jako pilne — kliknij by cofnąć' : '🔥 Oznacz jako pilne'}
              </button>
            )}
          </div>

          <div className="rd-card">
            <div className="rd-section-header">
              <h2 className="rd-section-title">Daty</h2>
              {isStaff && !editingDates && (
                <button type="button" className="rd-btn-ghost" onClick={handleStartEditDates}>Edytuj</button>
              )}
            </div>

            {editingDates ? (
              <>
                <label className="rd-cost-edit-field">
                  <span>Data przyjęcia</span>
                  <input type="date" className="rd-cost-edit-input" value={editCreatedAt} onChange={(e) => setEditCreatedAt(e.target.value)} />
                </label>
                <label className="rd-cost-edit-field">
                  <span>Data wykonania (naprawa gotowa)</span>
                  <input type="date" className="rd-cost-edit-input" value={editReadyAt} onChange={(e) => setEditReadyAt(e.target.value)} />
                </label>
                <label className="rd-cost-edit-field">
                  <span>Data wydania (klient odebrał)</span>
                  <input type="date" className="rd-cost-edit-input" value={editIssuedAt} onChange={(e) => setEditIssuedAt(e.target.value)} />
                </label>
                <div className="rd-cost-edit-actions">
                  <button type="button" className="rd-btn-ghost" onClick={() => setEditingDates(false)}>Anuluj</button>
                  <button type="button" className="rd-btn-primary" onClick={handleSaveDates}>Zapisz daty</button>
                </div>
              </>
            ) : (
              <>
                <div className="rd-cost-row"><span>Przyjęcia</span><span>{fmtDate(repair.createdAt)}</span></div>
                <div className="rd-cost-row"><span>Wykonania</span><span>{fmtDate(repair.readyAt)}</span></div>
                <div className="rd-cost-row"><span>Wydania</span><span>{fmtDate(repair.issuedAt)}</span></div>
                {repair.readyAt && repair.issuedAt && (
                  (() => {
                    const days = Math.round((new Date(repair.issuedAt) - new Date(repair.readyAt)) / (24 * 60 * 60 * 1000));
                    return days > 0 ? (
                      <div className="rd-pickup-delay">📅 Klient odebrał {days} {days === 1 ? 'dzień' : 'dni'} po zakończeniu naprawy.</div>
                    ) : null;
                  })()
                )}
              </>
            )}
          </div>

          <div className="rd-card">
            <div className="rd-section-header">
              <h2 className="rd-section-title">Wykonana usługa i części</h2>
              {isStaff && !editingWork && (
                <button type="button" className="rd-btn-ghost" onClick={handleStartEditWork}>
                  {repair.workDescription || (repair.usedParts || []).length > 0 ? 'Edytuj' : '+ Dodaj'}
                </button>
              )}
            </div>

            {editingWork ? (
              <>
                <label className="rd-cost-edit-field">
                  <span>Co zostało zrobione</span>
                  <textarea
                    className="rd-cost-edit-input rd-textarea"
                    rows={3}
                    value={workDescriptionInput}
                    onChange={(e) => setWorkDescriptionInput(e.target.value)}
                    placeholder="np. Wymieniono wyświetlacz i baterię, wyczyszczono port ładowania"
                  />
                </label>

                <div className="rd-used-parts-list">
                  {usedPartsInput.map((p, i) => (
                    <div key={i} className="rd-used-part-row">
                      <span>{p.name} {p.partId ? '' : '(spoza magazynu)'} × {p.quantity}</span>
                      <button type="button" className="rd-used-part-remove" onClick={() => handleRemoveUsedPart(i)}>✕</button>
                    </div>
                  ))}
                </div>

                <div className="rd-add-part-row">
                  <select className="rd-cost-edit-input" value={pickPartId} onChange={(e) => setPickPartId(e.target.value)}>
                    <option value="">— wybierz część z magazynu —</option>
                    {parts.map((p) => (
                      <option key={p.id} value={p.id}>{p.name} (na stanie: {p.quantity || 0})</option>
                    ))}
                  </select>
                  <input
                    type="number"
                    className="rd-cost-edit-input rd-add-part-qty"
                    value={pickQuantity}
                    min="1"
                    onChange={(e) => setPickQuantity(e.target.value)}
                  />
                  <button type="button" className="rd-btn-ghost" onClick={handleAddInventoryPart}>Dodaj</button>
                </div>

                <div className="rd-add-part-row">
                  <input
                    className="rd-cost-edit-input"
                    placeholder="Część spoza magazynu (nazwa)"
                    value={freeTextPartName}
                    onChange={(e) => setFreeTextPartName(e.target.value)}
                  />
                  <button type="button" className="rd-btn-ghost" onClick={handleAddFreeTextPart}>Dodaj</button>
                </div>

                <div className="rd-cost-edit-actions">
                  <button type="button" className="rd-btn-ghost" onClick={() => setEditingWork(false)}>Anuluj</button>
                  <button type="button" className="rd-btn-primary" onClick={handleSaveWork}>Zapisz</button>
                </div>
              </>
            ) : (
              <>
                {repair.workDescription && <p className="rd-desc">{repair.workDescription}</p>}
                {(repair.usedParts || []).length > 0 && (
                  <div className="rd-used-parts-list">
                    {repair.usedParts.map((p, i) => (
                      <div key={i} className="rd-used-part-row">
                        <span>📦 {p.name} × {p.quantity}</span>
                      </div>
                    ))}
                  </div>
                )}
                {!repair.workDescription && (repair.usedParts || []).length === 0 && (
                  <p className="rd-empty-hint">Nie uzupełniono jeszcze opisu wykonanej usługi.</p>
                )}
              </>
            )}
          </div>

          {(repair.screenLock || repair.customerNip || repair.documentType) && (
            <div className="rd-card">
              <h2 className="rd-section-title">Dodatkowe informacje</h2>
              {repair.screenLock && (
                <div className="rd-cost-row"><span>PIN / wzór blokady</span><span>{repair.screenLock}</span></div>
              )}
              {repair.documentType && (
                <div className="rd-cost-row"><span>Typ dokumentu</span><span>{repair.documentType}</span></div>
              )}
              {repair.customerNip && (
                <div className="rd-cost-row"><span>NIP</span><span>{repair.customerNip}</span></div>
              )}
            </div>
          )}

          <div className="rd-card">
            <h2 className="rd-section-title">Klient</h2>
            <div className="rd-customer-row">
              <div>
                <div className="rd-customer-name">{customer?.name || '—'}</div>
                <div className="rd-customer-phone">{customer?.phone || '—'}</div>
              </div>
              {customer && (
                <button className="rd-btn-ghost" onClick={() => navigate(`/klienci/${customer.id}`)}>
                  Karta klienta →
                </button>
              )}
            </div>
          </div>

          {isStaff && customer && (customer.phone || customer.email) && (() => {
            const templates = messageTemplates(repair, customer.name || 'Kliencie');
            const currentBody = messageBody || templates.find((t) => t.id === selectedTemplateId)?.body || '';
            const smsUrl = customer.phone ? `sms:${customer.phone}?body=${encodeURIComponent(currentBody)}` : null;
            const mailUrl = customer.email ? `mailto:${customer.email}?subject=${encodeURIComponent('GSM Serwis – aktualizacja zlecenia')}&body=${encodeURIComponent(currentBody)}` : null;

            const handleCopyMessage = () => {
              navigator.clipboard.writeText(currentBody)
                .then(() => { setMessageCopied(true); setTimeout(() => setMessageCopied(false), 2000); })
                .catch(() => alert('Nie udało się skopiować.'));
            };

            return (
              <div className="rd-card">
                <h2 className="rd-section-title">Powiadom klienta</h2>
                <select
                  className="rd-notify-select"
                  value={selectedTemplateId}
                  onChange={(e) => { setSelectedTemplateId(e.target.value); setMessageBody(''); }}
                >
                  {templates.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
                </select>
                <textarea
                  className="rd-notify-textarea"
                  value={currentBody}
                  onChange={(e) => setMessageBody(e.target.value)}
                  rows={4}
                />
                <p className="rd-notify-hint">
                  Panel webowy nie wysyła SMS-ów automatycznie (wymaga płatnej bramki SMS) —
                  skopiuj treść albo otwórz w aplikacji SMS/e-mail na telefonie.
                </p>
                <div className="rd-notify-actions">
                  <button type="button" className="rd-btn-ghost" onClick={handleCopyMessage}>
                    {messageCopied ? '✓ Skopiowano' : '📋 Kopiuj treść'}
                  </button>
                  {smsUrl && <a className="rd-btn-ghost" href={smsUrl}>💬 Otwórz SMS</a>}
                  {mailUrl && <a className="rd-btn-ghost" href={mailUrl}>✉️ Otwórz e-mail</a>}
                </div>
              </div>
            );
          })()}
          <div className="rd-card">
            <div className="rd-section-header">
              <h2 className="rd-section-title">Kosztorys</h2>
              {isStaff && !editingCost && (
                <button type="button" className="rd-btn-ghost" onClick={handleStartEditCost}>
                  Edytuj
                </button>
              )}
            </div>

            {editingCost ? (
              <>
                {isAdmin ? (
                  <>
                    <label className="rd-cost-edit-field">
                      <span>Części (zł)</span>
                      <input
                        type="number"
                        className="rd-cost-edit-input"
                        value={partsCostInput}
                        onChange={(e) => setPartsCostInput(e.target.value)}
                      />
                    </label>
                    <label className="rd-cost-edit-field">
                      <span>Łącznie dla klienta (zł)</span>
                      <input
                        type="number"
                        className="rd-cost-edit-input"
                        value={totalCostInput}
                        onChange={(e) => setTotalCostInput(e.target.value)}
                      />
                    </label>
                    <div className={`rd-cost-computed ${computedServiceCost < 0 ? 'rd-cost-computed-negative' : ''}`}>
                      Usługa (wyliczona): <strong>{computedServiceCost} zł</strong>
                      {computedServiceCost < 0 && ' — łącznie jest mniejsze niż koszt części!'}
                    </div>
                  </>
                ) : (
                  // Pracownik (nie-admin) nie widzi/nie ustawia rozbicia na marżę –
                  // wpisuje jedną kwotę łączną, zapisywaną w serviceCost (partsCost=0),
                  // dokładnie jak w apce mobilnej.
                  <label className="rd-cost-edit-field">
                    <span>Kwota łącznie (zł)</span>
                    <input
                      type="number"
                      className="rd-cost-edit-input"
                      value={serviceCostInput}
                      onChange={(e) => { setServiceCostInput(e.target.value); setPartsCostInput('0'); }}
                    />
                  </label>
                )}

                <label className="rd-cost-edit-field">
                  <span>Skąd kupione części</span>
                  <input
                    type="text"
                    className="rd-cost-edit-input"
                    value={partsSourceInput}
                    onChange={(e) => setPartsSourceInput(e.target.value)}
                    placeholder="np. nazwa hurtowni"
                  />
                </label>
                <label className="rd-cost-edit-field">
                  <span>Nr faktury zakupu części <span className="rd-cost-edit-optional">(opcjonalnie)</span></span>
                  <input
                    type="text"
                    className="rd-cost-edit-input"
                    value={partsInvoiceInput}
                    onChange={(e) => setPartsInvoiceInput(e.target.value)}
                    placeholder="np. FV/123/2026"
                  />
                </label>

                <div className="rd-cost-edit-actions">
                  <button type="button" className="rd-btn-ghost" onClick={() => setEditingCost(false)}>Anuluj</button>
                  <button type="button" className="rd-btn-primary" onClick={handleSaveCost}>Zapisz kosztorys</button>
                </div>
              </>
            ) : (
              <>
                {isAdmin && (
                  <>
                    <div className="rd-cost-row"><span>Części</span><span>{repair.partsCost || 0} zł</span></div>
                    <div className="rd-cost-row"><span>Usługa</span><span>{repair.serviceCost || 0} zł</span></div>
                  </>
                )}
                <div className="rd-cost-row rd-cost-total"><span>Łącznie</span><span>{total} zł</span></div>
                {(repair.partsSource || repair.partsInvoiceNumber) && (
                  <div className="rd-parts-source">
                    {repair.partsSource && <div>📦 Części z: <strong>{repair.partsSource}</strong></div>}
                    {repair.partsInvoiceNumber && <div>🧾 Faktura: <strong>{repair.partsInvoiceNumber}</strong></div>}
                  </div>
                )}
              </>
            )}

            {repair.estimateAccepted === true && (
              <div className="rd-status-line rd-status-good">✓ Kosztorys zaakceptowany przez klienta</div>
            )}
            {repair.estimateAccepted === false && (
              <div className="rd-status-line rd-status-warn">Klient odrzucił kosztorys</div>
            )}
            {repair.estimateAccepted === null && total > 0 && (
              <>
                <div className="rd-status-line rd-status-wait">⏳ Czeka na decyzję klienta</div>
                {isStaff && (
                  <div className="rd-estimate-manual">
                    <p className="rd-estimate-manual-hint">
                      Klient bez konta w apce? Zapisz jego decyzję ręcznie:
                    </p>
                    <div className="rd-estimate-manual-buttons">
                      <button
                        type="button"
                        className="rd-btn-accept"
                        onClick={() => handleManualEstimateDecision(true)}
                      >
                        ✓ Zaakceptowano na miejscu
                      </button>
                      <button
                        type="button"
                        className="rd-btn-reject"
                        onClick={() => handleManualEstimateDecision(false)}
                      >
                        ✕ Odrzucono na miejscu
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          <div className="rd-card">
            <h2 className="rd-section-title">Zdjęcia ({repair.repairPhotos?.length || 0}/5)</h2>
            {repair.repairPhotos?.length > 0 && (
              <div className="rd-photos">
                {repair.repairPhotos.map((url, i) => (
                  <div key={i} className="rd-photo-wrap">
                    <img src={url} alt={`Zdjęcie ${i + 1}`} className="rd-photo" onClick={() => window.open(url, '_blank')} />
                    <button type="button" className="rd-photo-remove" onClick={() => handleRemovePhoto(i, url)}>✕</button>
                  </div>
                ))}
              </div>
            )}
            {(repair.repairPhotos?.length || 0) < 5 && (
              <label className="rd-photo-add">
                {uploadingPhoto ? 'Wgrywam…' : '+ Dodaj zdjęcie'}
                <input type="file" accept="image/*" multiple hidden onChange={handleAddPhotos} disabled={uploadingPhoto} />
              </label>
            )}
          </div>

          {repair.warrantyMonths > 0 && (
            <div className="rd-card">
              <h2 className="rd-section-title">Gwarancja</h2>
              <p className="rd-warranty-text">
                🛡️ {repair.warrantyMonths} mies. — do {fmtDate(repair.warrantyEndDate)}
              </p>
            </div>
          )}
        </div>

        {/* ===== PANEL AKCJI (boczny) ===== */}
        <div className="rd-side">
          <div className="rd-card">
            <button className="rd-btn-primary" onClick={handlePrint}>
              🖨️ Drukuj potwierdzenie
            </button>
            <button className="rd-btn-ghost rd-btn-label" onClick={() => printDeviceLabel(repair)}>
              🏷️ Drukuj naklejkę na sprzęt
            </button>
          </div>

          <div className="rd-card">
            <h2 className="rd-section-title">Zmień status</h2>
            <div className="rd-status-options">
              {statusList.map((st) => (
                <button
                  key={st}
                  className={`rd-status-option ${repair.status === st ? 'rd-status-option-active' : ''}`}
                  onClick={() => handleStatusChange(st)}
                  disabled={repair.status === st}
                >
                  {statusIcons[st]} {st}
                </button>
              ))}
            </div>
          </div>

          {showWarrantyForm && (
            <div className="rd-card rd-warranty-card">
              <h2 className="rd-section-title">Okres gwarancji</h2>
              <div className="rd-warranty-options">
                {warrantyPeriods.map((w) => (
                  <button
                    key={w.months}
                    className={`rd-warranty-option ${selectedWarranty.months === w.months ? 'rd-warranty-option-active' : ''}`}
                    onClick={() => setSelectedWarranty(w)}
                  >
                    {w.label}
                  </button>
                ))}
              </div>
              <button className="rd-btn-primary" onClick={handleConfirmDelivery}>
                Potwierdź wydanie
              </button>
            </div>
          )}

          {isAdmin && (
            <div className="rd-card rd-danger-card">
              {!confirmDelete ? (
                <button className="rd-btn-danger-ghost" onClick={() => setConfirmDelete(true)}>
                  Usuń zlecenie
                </button>
              ) : (
                <>
                  <p className="rd-danger-text">Tej operacji nie da się cofnąć.</p>
                  <div className="rd-danger-actions">
                    <button className="rd-btn-ghost" onClick={() => setConfirmDelete(false)}>Anuluj</button>
                    <button className="rd-btn-danger" onClick={handleDelete}>Usuń trwale</button>
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
