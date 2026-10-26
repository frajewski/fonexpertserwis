import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import useStore from '../store/useStore';
import STATUS, { statusList, statusIcons, terminalStatuses } from '../constants/statuses';
import { warrantyPeriods, calcWarrantyEndDate } from '../constants/warrantyPeriods';
import { uploadRepairPhotoWeb, deletePhotoByUrlWeb } from '../firebase/photoUpload';
import CameraButton from '../components/CameraButton';
import { isOnlineNow, PHOTO_OFFLINE_MESSAGE } from '../network/networkStatus';
import { isNativeCameraAvailable } from '../utils/nativeCamera';
import { triggerHaptic } from '../native/haptics';
import { failMessage } from '../utils/friendlyError';
import SignatureField from '../signature/SignaturePad';
import { stampSignature } from '../signature/signatureData';
import { printRepairConfirmation, buildRepairConfirmationHtml } from '../utils/printConfirmation';
import { printPickupConfirmation, buildPickupConfirmationHtml } from '../utils/printPickupConfirmation';
import DocumentShareButtons from '../components/DocumentShareButtons';
import { canShareText, shareText, safeFileName } from '../documents/shareDocument';
import { printDeviceLabel } from '../utils/printDeviceLabel';
import { messageTemplates } from '../utils/messageTemplates';
import useSettings from '../store/useSettings';
import { PAYMENT_METHODS, PAYMENT_ICONS } from '../constants/paymentMethods';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase/firebaseConfig';
import './RepairDetailPage.css';

const SMS_KIND_LABELS = { manual: '✏️ Własna treść', review: '⭐ Prośba o opinię' };

const fmtDate = (iso) => iso ? new Date(iso).toLocaleDateString('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' }) : '—';
const toDateInputValue = (iso) => iso ? iso.slice(0, 10) : '';

const STATUS_TONE = {
  [STATUS.ACCEPTED]: 'wait', [STATUS.DIAGNOSIS]: 'wait', [STATUS.REPAIR]: 'info',
  [STATUS.PARTS]: 'info', [STATUS.CUSTOMER_WAIT]: 'wait', [STATUS.READY]: 'good', [STATUS.DELIVERED]: 'neutral', [STATUS.CANCELLED]: 'warn',
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

  const [deliveryPayment, setDeliveryPayment] = useState('gotówka');
  const [smsState, setSmsState] = useState(''); // '' | 'sending' | 'sent' | 'error'
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
  const [pickupSignature, setPickupSignature] = useState(null); // podpis przy wydaniu (w formularzu wydania)
  const [savingSignature, setSavingSignature] = useState(false);
  // Musi być przed `if (!repair) return` – inaczej liczba hooków zmienia się,
  // gdy zlecenie dociera ze store po pierwszym renderze (crash „Rendered more hooks”).
  const [depositEditInput, setDepositEditInput] = useState('');

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
    triggerHaptic('light'); // ważna akcja – zmiana statusu zlecenia
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

    // Statusy, po których proponujemy SMS do klienta (raz na zlecenie dla
    // każdego rodzaju; pytamy o potwierdzenie, żeby przypadkowe kliknięcie
    // statusu nie wysłało wiadomości).
    const AUTO_SMS = {
      [STATUS.CUSTOMER_WAIT]: { template: 'partsArrived', field: 'partsSmsSentAt', label: 'części dotarły' },
      [STATUS.READY]: { template: 'ready', field: 'readySmsSentAt', label: 'gotowe do odbioru' },
    };
    const auto = AUTO_SMS[newStatus];
    if (auto && customer?.phone && !repair[auto.field]) {
      if (window.confirm(`Wysłać klientowi SMS „${auto.label}” na numer ${customer.phone}?`)) {
        try {
          const body = messageTemplates(repair, customer.name || 'Kliencie').find((t) => t.id === auto.template)?.body;
          await httpsCallable(functions, 'sendSmsToCustomer')({ phone: customer.phone, text: body, repairId: repair.id, kind: auto.template });
          await updateRepair(id, { [auto.field]: new Date().toISOString() });
        } catch (e) {
          console.error(e);
          alert(e?.message || 'Nie udało się wysłać SMS. Status został zmieniony.');
        }
      }
    }
  };

  const handleConfirmDelivery = async () => {
    const issuedAt = new Date().toISOString();
    await updateRepair(id, {
      status: STATUS.DELIVERED,
      statusUpdatedAt: issuedAt,
      warrantyMonths: selectedWarranty.months,
      warrantyEndDate: calcWarrantyEndDate(issuedAt, selectedWarranty.months),
      issuedAt,
      paymentMethod: deliveryPayment,
      paidAtDelivery: Math.max(0, total - (repair.deposit || 0)),
      ...(pickupSignature ? { signatures: { ...(repair.signatures || {}), pickup: stampSignature(pickupSignature, currentUser?.name) } } : {}),
    });
    setPickupSignature(null);
    triggerHaptic('success');
    setShowWarrantyForm(false);
  };

  // Podpis złożony / usunięty już po zapisaniu zlecenia (np. klient podpisuje później)
  const saveSignature = async (kind, sig) => {
    setSavingSignature(true);
    try {
      const next = { ...(repair.signatures || {}) };
      if (sig) next[kind] = stampSignature(sig, currentUser?.name);
      else delete next[kind];
      await updateRepair(id, { signatures: next });
    } catch (err) {
      triggerHaptic('error');
      alert(failMessage('Nie udało się zapisać podpisu', err));
    } finally {
      setSavingSignature(false);
    }
  };

  const handleDelete = async () => {
    try {
      await deleteRepair(id);
      navigate('/');
    } catch (error) {
      alert(failMessage('Nie udało się usunąć zlecenia', error));
    }
  };


  const handleStartEditCost = () => {
    setPartsCostInput(String(repair.partsCost || 0));
    setServiceCostInput(String(repair.serviceCost || 0));
    setTotalCostInput(String((repair.partsCost || 0) + (repair.serviceCost || 0)));
    setPartsSourceInput(repair.partsSource || '');
    setPartsInvoiceInput(repair.partsInvoiceNumber || '');
    setDepositEditInput(String(repair.deposit || 0));
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
      deposit: parseFloat(depositEditInput) || 0,
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

  // Wspólne dla obu źródeł: plików z <input> i zdjęcia z natywnego aparatu
  const addPhotoFiles = async (selectedFiles) => {
    const files = selectedFiles.slice(0, 5 - (repair.repairPhotos?.length || 0));
    if (files.length === 0) return;
    if (!isOnlineNow()) { triggerHaptic('warning'); alert(PHOTO_OFFLINE_MESSAGE); return; }

    setUploadingPhoto(true);
    try {
      const uploadedUrls = await Promise.all(files.map((file) => uploadRepairPhotoWeb(id, file)));
      // Najświeższa lista ze store – między zdjęciami z aparatu mogła się zmienić
      const current = useStore.getState().getRepairById(id)?.repairPhotos || [];
      const updated = [...current, ...uploadedUrls].slice(0, 5);
      await updateRepair(id, { repairPhotos: updated });
    } catch (error) {
      alert(failMessage('Nie udało się wgrać zdjęć', error));
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleAddPhotos = async (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = ''; // pozwala wybrać te same pliki jeszcze raz, jeśli trzeba
    await addPhotoFiles(files);
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
            {(repair.documentType || repair.customerNip || repair.screenLock) && (
              <div className="rd-chips">
                {repair.documentType && <span className="rd-chip">🧾 {repair.documentType}</span>}
                {repair.customerNip && <span className="rd-chip">NIP {repair.customerNip}</span>}
                {repair.screenLock && <span className="rd-chip">🔒 {repair.screenLock}</span>}
              </div>
            )}
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
                {repair.issuedAt && (
                  <div className="rd-cost-row">
                    <span>SMS z prośbą o opinię</span>
                    <span>
                      {repair.reviewRequestSentAt
                        ? `✅ wysłano ${fmtDate(repair.reviewRequestSentAt)}`
                        : repair.noReviewSms
                          ? '🚫 wyłączony'
                          : '⏳ zaplanowany (3–6 dni po wydaniu)'}
                    </span>
                  </div>
                )}
                {repair.issuedAt && !repair.reviewRequestSentAt && (
                  <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13, marginTop: 6 }}>
                    <input
                      type="checkbox"
                      checked={!!repair.noReviewSms}
                      onChange={(e) => updateRepair(id, { noReviewSms: e.target.checked })}
                    />
                    Nie wysyłaj temu klientowi SMS z prośbą o opinię
                  </label>
                )}
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

            const handleGatewaySend = async () => {
              if (!currentBody.trim() || smsState === 'sending') return;
              setSmsState('sending');
              try {
                await httpsCallable(functions, 'sendSmsToCustomer')({ phone: customer.phone, text: currentBody, repairId: repair.id, kind: messageBody ? 'manual' : selectedTemplateId });
                setSmsState('sent');
              } catch (e) {
                console.error(e);
                alert(e?.message || 'Nie udało się wysłać SMS.');
                setSmsState('error');
              }
              setTimeout(() => setSmsState(''), 3000);
            };

            return (
              <details className="rd-card rd-fold">
                <summary className="rd-section-title">Powiadom klienta</summary>
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
                  „Wyślij SMS” wysyła wiadomość przez telefon z bramką SMS (Pixel musi mieć internet).
                  Możesz też skopiować treść albo otworzyć ją w aplikacji SMS/e-mail.
                </p>
                <div className="rd-notify-actions">
                  {customer.phone && (
                    <button type="button" className="rd-btn-ghost" onClick={handleGatewaySend} disabled={smsState === 'sending'}>
                      {smsState === 'sending' ? '⏳ Wysyłam…' : smsState === 'sent' ? '✓ Wysłano' : '📲 Wyślij SMS'}
                    </button>
                  )}
                  <button type="button" className="rd-btn-ghost" onClick={handleCopyMessage}>
                    {messageCopied ? '✓ Skopiowano' : '📋 Kopiuj treść'}
                  </button>
                  {smsUrl && (
                    <button type="button" className="rd-btn-ghost" onClick={() => { window.location.href = smsUrl; }}>
                      💬 Otwórz SMS
                    </button>
                  )}
                  {mailUrl && (
                    <button type="button" className="rd-btn-ghost" onClick={() => { window.location.href = mailUrl; }}>
                      ✉️ Otwórz e-mail
                    </button>
                  )}
                  {canShareText() && (
                    <button
                      type="button"
                      className="rd-btn-ghost"
                      onClick={() => shareText({ title: `FonExpert — zlecenie nr ${repair.displayNumber || repair.id}`, text: currentBody })
                        .catch((err) => alert(err.message))}
                    >
                      📤 Udostępnij
                    </button>
                  )}
                </div>

                {(repair.smsLog || []).length > 0 && (
                  <div className="rd-sms-log">
                    <h3 className="rd-sms-log-title">Wysłane SMS-y ({repair.smsLog.length})</h3>
                    {[...repair.smsLog].sort((a, b) => (b.at || '').localeCompare(a.at || '')).map((m, i) => (
                      <div key={`${m.at}-${i}`} className="rd-sms-log-item">
                        <div className="rd-sms-log-meta">
                          <strong>{SMS_KIND_LABELS[m.kind] || templates.find((t) => t.id === m.kind)?.label || 'SMS'}</strong>
                          <span>{m.at ? new Date(m.at).toLocaleString('pl-PL', { dateStyle: 'short', timeStyle: 'short' }) : ''}{m.by ? ` · ${m.by}` : ''}</span>
                        </div>
                        <div className="rd-sms-log-text">{m.text}</div>
                      </div>
                    ))}
                  </div>
                )}
              </details>
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
                <label className="rd-cost-edit-field">
                  <span>Zadatek wpłacony <span className="rd-cost-edit-optional">(opcjonalnie)</span></span>
                  <input
                    type="text"
                    className="rd-cost-edit-input"
                    value={depositEditInput}
                    onChange={(e) => setDepositEditInput(e.target.value)}
                    placeholder="0.00"
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
                {repair.deposit > 0 && (
                  <>
                    <div className="rd-cost-row"><span>Zadatek wpłacony</span><span>− {repair.deposit} zł</span></div>
                    <div className="rd-cost-row rd-cost-total"><span>Do zapłaty</span><span>{total - repair.deposit} zł</span></div>
                  </>
                )}
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

          <details className="rd-card rd-fold" open={(repair.repairPhotos?.length || 0) > 0}>
            <summary className="rd-section-title">Zdjęcia ({repair.repairPhotos?.length || 0}/5)</summary>
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
              <div className="rd-photo-actions">
                <CameraButton
                  className="rd-photo-add"
                  requireOnline
                  disabled={uploadingPhoto}
                  onPhoto={(file) => addPhotoFiles([file])}
                />
                <label className="rd-photo-add">
                  {uploadingPhoto ? 'Wgrywam…' : isNativeCameraAvailable() ? '🖼️ Z galerii / plików' : '+ Dodaj zdjęcie'}
                  <input type="file" accept="image/*" multiple hidden onChange={handleAddPhotos} disabled={uploadingPhoto} />
                </label>
              </div>
            )}
          </details>

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

          <details className="rd-card rd-fold">
            <summary className="rd-section-title">Podpisy klienta</summary>
            <div className="rd-sign-label">Przyjęcie</div>
            <SignatureField
              value={repair.signatures?.intake || null}
              onChange={(sig) => saveSignature('intake', sig)}
              label="Podpis klienta – przyjęcie"
              hint="Klient potwierdza przekazanie urządzenia, opis usterki i wstępny kosztorys."
              disabled={savingSignature}
              compact
            />
            {repair.status === STATUS.DELIVERED && (
              <>
                <div className="rd-sign-label" style={{ marginTop: 12 }}>Odbiór</div>
                <SignatureField
                  value={repair.signatures?.pickup || null}
                  onChange={(sig) => saveSignature('pickup', sig)}
                  label="Podpis klienta – odbiór"
                  hint="Klient potwierdza odbiór sprawnego urządzenia i warunki gwarancji."
                  disabled={savingSignature}
                  compact
                />
              </>
            )}
          </details>

          <div className="rd-card">
            <button className="rd-btn-primary" onClick={handlePrint}>
              🖨️ Drukuj potwierdzenie
            </button>
            <div className="rd-doc-actions">
              <DocumentShareButtons
                className="rd-btn-ghost"
                buildHtml={() => buildRepairConfirmationHtml(repair, customer, shopSettings)}
                fileName={`${safeFileName('FonExpert_Zlecenie', repair.displayNumber || repair.id)}.pdf`}
                title={`FonExpert — potwierdzenie przyjęcia, zlecenie nr ${repair.displayNumber || repair.id}`}
                text={`FonExpert — potwierdzenie przyjęcia urządzenia ${repair.brand} ${repair.model}, zlecenie nr ${repair.displayNumber || repair.id}.`}
              />
            </div>
            <button className="rd-btn-ghost rd-btn-label" onClick={() => printDeviceLabel(repair)}>
              🏷️ Drukuj naklejkę na sprzęt
            </button>
            {repair.status === STATUS.DELIVERED && (
              <>
                <button className="rd-btn-ghost rd-btn-label rd-btn-pickup" onClick={() => printPickupConfirmation(repair, customer, shopSettings)}>
                  📄 Drukuj potwierdzenie wydania
                </button>
                <div className="rd-doc-actions">
                  <DocumentShareButtons
                    className="rd-btn-ghost"
                    buildHtml={() => buildPickupConfirmationHtml(repair, customer, shopSettings)}
                    fileName={`${safeFileName('FonExpert_Wydanie', repair.displayNumber || repair.id)}.pdf`}
                    title={`FonExpert — potwierdzenie wydania, zlecenie nr ${repair.displayNumber || repair.id}`}
                    text={`FonExpert — potwierdzenie wydania urządzenia ${repair.brand} ${repair.model}, zlecenie nr ${repair.displayNumber || repair.id}.`}
                  />
                </div>
              </>
            )}
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
              <h2 className="rd-section-title" style={{ marginTop: 16 }}>
                Płatność przy odbiorze — {Math.max(0, total - (repair.deposit || 0))} zł
              </h2>
              <div className="rd-warranty-options">
                {PAYMENT_METHODS.map((m) => (
                  <button
                    key={m}
                    type="button"
                    className={`rd-warranty-option ${deliveryPayment === m ? 'rd-warranty-option-active' : ''}`}
                    onClick={() => setDeliveryPayment(m)}
                  >
                    {PAYMENT_ICONS[m]} {m}
                  </button>
                ))}
              </div>
              <h2 className="rd-section-title" style={{ marginTop: 16 }}>Podpis klienta przy odbiorze</h2>
              <SignatureField
                value={pickupSignature}
                onChange={setPickupSignature}
                label="Podpis klienta – odbiór"
                hint="Klient potwierdza odbiór sprawnego urządzenia i warunki gwarancji."
                compact
              />
              <button className="rd-btn-primary" style={{ marginTop: 12 }} onClick={handleConfirmDelivery}>
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
