import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import useStore from '../store/useStore';
import brands from '../constants/brands';
import { DOCUMENT_TYPE, documentTypeList } from '../constants/documentTypes';
import STATUS from '../constants/statuses';
import { uploadRepairPhotoWeb } from '../firebase/photoUpload';
import './NewRepairPage.css';

const normalizePhone = (v) => (v || '').replace(/\D/g, '').replace(/^48/, '');

export default function NewRepairPage() {
  const navigate = useNavigate();
  const currentUser = useStore((s) => s.currentUser);
  const addRepair = useStore((s) => s.addRepair);
  const addWalkInCustomer = useStore((s) => s.addWalkInCustomer);
  const customers = useStore((s) => s.getCustomers());

  const isAdmin = currentUser?.role === 'admin';

  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [imei, setImei] = useState('');
  const [description, setDescription] = useState('');
  const [screenLock, setScreenLock] = useState('');
  // Domyślnie dziś, ale edytowalne – żeby dało się wpisać zaległe zlecenie
  // (np. klient przyszedł kilka dni temu, a wpisujemy to do systemu teraz)
  const [acceptedDate, setAcceptedDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [photoFiles, setPhotoFiles] = useState([]); // File[] wybrane, jeszcze niewgrane

  const [documentType, setDocumentType] = useState(DOCUMENT_TYPE.RECEIPT);
  const [customerNip, setCustomerNip] = useState('');

  // Pracownik wpisuje jedną sumę (cenę podaną telefonicznie przez admina);
  // admin może opcjonalnie rozwinąć rozbicie wewnętrzne do własnych rozliczeń —
  // identyczna zasada co w apce mobilnej
  const [totalCostInput, setTotalCostInput] = useState('');
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [partsCost, setPartsCost] = useState('');
  const [serviceCost, setServiceCost] = useState('');

  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerResults, setShowCustomerResults] = useState(false);
  const [showNewCustomerForm, setShowNewCustomerForm] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerPhone, setNewCustomerPhone] = useState('');
  const [newCustomerEmail, setNewCustomerEmail] = useState('');

  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId) || null;

  const matchingCustomers = useMemo(() => {
    const q = customerSearch.toLowerCase().trim();
    const qPhone = normalizePhone(customerSearch);
    if (!q) return [];
    return customers
      .filter((c) =>
        c.name?.toLowerCase().includes(q) ||
        (qPhone.length >= 3 && normalizePhone(c.phone).includes(qPhone))
      )
      .slice(0, 8);
  }, [customers, customerSearch]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleAddWalkInCustomer = async () => {
    if (!newCustomerName.trim()) {
      setError('Podaj imię i nazwisko klienta.');
      return;
    }
    try {
      const created = await addWalkInCustomer({
        name: newCustomerName.trim(),
        phone: newCustomerPhone.trim(),
        email: newCustomerEmail.trim(),
      });
      setSelectedCustomerId(created.id);
      setShowNewCustomerForm(false);
      setNewCustomerName('');
      setNewCustomerPhone('');
      setNewCustomerEmail('');
      setError('');
    } catch (err) {
      setError('Nie udało się dodać klienta: ' + err.message);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!brand)              { setError('Wybierz markę urządzenia.'); return; }
    if (!model.trim())       { setError('Podaj model urządzenia.'); return; }
    if (!description.trim()) { setError('Opisz usterkę.'); return; }
    if (!selectedCustomerId) { setError('Wybierz klienta.'); return; }
    if (documentType === DOCUMENT_TYPE.INVOICE && !customerNip.trim()) {
      setError('Faktura wymaga podania NIP klienta.');
      return;
    }

    setLoading(true);
    try {
      const costData = isAdmin && showBreakdown
        ? { partsCost: parseFloat(partsCost) || 0, serviceCost: (parseFloat(totalCostInput) || 0) - (parseFloat(partsCost) || 0) }
        : { partsCost: 0, serviceCost: parseFloat(totalCostInput) || 0 };

      // Krok 1: stwórz zlecenie bez zdjęć – potrzebujemy id jako część ścieżki
      // w Storage (repairs/{repairId}/...), więc upload nie może być pierwszy
      const newRepair = await addRepair({
        customerId: selectedCustomerId,
        brand,
        model: model.trim(),
        imei: imei.trim(),
        description: description.trim(),
        status: STATUS.ACCEPTED,
        photos: [],
        createdAt: acceptedDate ? new Date(acceptedDate).toISOString() : undefined,
        ...costData,
        estimateAccepted: null,
        screenLock: screenLock.trim(),
        documentType,
        customerNip: customerNip.trim(),
      });

      // Krok 2: jeśli wybrano zdjęcia, wgraj je teraz (mamy już id zlecenia)
      if (photoFiles.length > 0) {
        const uploadedUrls = await Promise.all(
          photoFiles.map((file) => uploadRepairPhotoWeb(newRepair.id, file))
        );
        await useStore.getState().updateRepair(newRepair.id, { repairPhotos: uploadedUrls });
      }

      navigate(`/zlecenia/${newRepair.id}`);
    } catch (err) {
      setLoading(false);
      setError('Nie udało się dodać zlecenia: ' + err.message);
    }
  };

  return (
    <div className="nr-page">
      <button className="nr-back" onClick={() => navigate('/')}>← Wszystkie zlecenia</button>
      <h1 className="nr-title">Nowe zlecenie</h1>

      <form className="nr-form" onSubmit={handleSubmit}>
        {/* KLIENT */}
        <section className="nr-card">
          <h2 className="nr-section-title">Klient</h2>
          {!showNewCustomerForm ? (
            <>
              {selectedCustomer ? (
                <div className="nr-customer-picked">
                  <div>
                    <div className="nr-customer-picked-name">{selectedCustomer.name}</div>
                    <div className="nr-customer-picked-phone">{selectedCustomer.phone || 'Brak numeru'}</div>
                  </div>
                  <button
                    type="button"
                    className="nr-link-btn"
                    onClick={() => { setSelectedCustomerId(''); setCustomerSearch(''); }}
                  >
                    Zmień
                  </button>
                </div>
              ) : (
                <div className="nr-customer-search-wrap">
                  <input
                    className="nr-input"
                    placeholder="Szukaj: imię lub telefon…"
                    value={customerSearch}
                    onChange={(e) => { setCustomerSearch(e.target.value); setShowCustomerResults(true); }}
                    onFocus={() => setShowCustomerResults(true)}
                    onBlur={() => setTimeout(() => setShowCustomerResults(false), 150)}
                  />
                  {showCustomerResults && customerSearch.trim() && (
                    <div className="nr-customer-results">
                      {matchingCustomers.length === 0 ? (
                        <div className="nr-customer-result-empty">Brak wyników — dodaj jako nowego klienta poniżej</div>
                      ) : (
                        matchingCustomers.map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            className="nr-customer-result-row"
                            onClick={() => { setSelectedCustomerId(c.id); setCustomerSearch(''); setShowCustomerResults(false); }}
                          >
                            <span className="nr-customer-result-name">{c.name}</span>
                            <span className="nr-customer-result-phone">{c.phone || '—'}</span>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
              )}
              <button type="button" className="nr-link-btn" onClick={() => setShowNewCustomerForm(true)}>
                + Dodaj nowego klienta
              </button>
            </>
          ) : (
            <div className="nr-new-customer">
              <input className="nr-input" placeholder="Imię i nazwisko *" value={newCustomerName} onChange={(e) => setNewCustomerName(e.target.value)} />
              <input className="nr-input" placeholder="Telefon" value={newCustomerPhone} onChange={(e) => setNewCustomerPhone(e.target.value)} />
              <input className="nr-input" placeholder="Email (opcjonalnie)" value={newCustomerEmail} onChange={(e) => setNewCustomerEmail(e.target.value)} />
              <div className="nr-new-customer-actions">
                <button type="button" className="nr-btn-ghost" onClick={() => setShowNewCustomerForm(false)}>Anuluj</button>
                <button type="button" className="nr-btn-primary-sm" onClick={handleAddWalkInCustomer}>Zapisz klienta</button>
              </div>
            </div>
          )}
        </section>

        {/* URZĄDZENIE */}
        <section className="nr-card">
          <h2 className="nr-section-title">Urządzenie</h2>
          <div className="nr-row">
            <label className="nr-field">
              <span className="nr-label">Marka *</span>
              <select className="nr-select" value={brand} onChange={(e) => setBrand(e.target.value)}>
                <option value="">— Wybierz —</option>
                {brands.map((b) => <option key={b.value} value={b.value}>{b.label}</option>)}
              </select>
            </label>
            <label className="nr-field">
              <span className="nr-label">Model *</span>
              <input className="nr-input" value={model} onChange={(e) => setModel(e.target.value)} placeholder="np. Galaxy S24" />
            </label>
          </div>
          <label className="nr-field">
            <span className="nr-label">IMEI (opcjonalnie)</span>
            <input className="nr-input" value={imei} onChange={(e) => setImei(e.target.value)} placeholder="15 cyfr" maxLength={15} />
          </label>
          <label className="nr-field">
            <span className="nr-label">Data przyjęcia</span>
            <input type="date" className="nr-input" value={acceptedDate} onChange={(e) => setAcceptedDate(e.target.value)} />
          </label>
          <label className="nr-field">
            <span className="nr-label">Opis usterki *</span>
            <textarea className="nr-textarea" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Co się dzieje z urządzeniem?" />
          </label>
          <label className="nr-field">
            <span className="nr-label">Blokada ekranu (opcjonalnie)</span>
            <input className="nr-input" value={screenLock} onChange={(e) => setScreenLock(e.target.value)} placeholder="PIN / wzór" />
          </label>
          <label className="nr-field">
            <span className="nr-label">Zdjęcia urządzenia (opcjonalnie, max 5)</span>
            <input
              className="nr-input"
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => setPhotoFiles(Array.from(e.target.files).slice(0, 5))}
            />
            {photoFiles.length > 0 && (
              <div className="nr-photo-preview">
                {photoFiles.map((f, i) => (
                  <img key={i} src={URL.createObjectURL(f)} alt={`Zdjęcie ${i + 1}`} className="nr-photo-thumb" />
                ))}
              </div>
            )}
          </label>
        </section>

        {/* DOKUMENT */}
        <section className="nr-card">
          <h2 className="nr-section-title">Dokument sprzedaży</h2>
          <div className="nr-doc-toggle">
            {documentTypeList.map((dt) => (
              <button
                key={dt}
                type="button"
                className={`nr-doc-option ${documentType === dt ? 'nr-doc-option-active' : ''}`}
                onClick={() => setDocumentType(dt)}
              >
                {dt}
              </button>
            ))}
          </div>
          {documentType === DOCUMENT_TYPE.INVOICE && (
            <label className="nr-field">
              <span className="nr-label">NIP klienta *</span>
              <input className="nr-input" value={customerNip} onChange={(e) => setCustomerNip(e.target.value)} placeholder="000-000-00-00" />
            </label>
          )}
        </section>

        {/* KOSZTORYS */}
        <section className="nr-card">
          <h2 className="nr-section-title">Wstępny kosztorys</h2>
          <label className="nr-field">
            <span className="nr-label">Cena całości (zł, opcjonalnie)</span>
            <input
              className="nr-input"
              value={totalCostInput}
              onChange={(e) => setTotalCostInput(e.target.value)}
              placeholder="0.00"
            />
          </label>

          {isAdmin && (
            <>
              <button type="button" className="nr-link-btn" onClick={() => setShowBreakdown(!showBreakdown)}>
                {showBreakdown ? '▲ Zwiń rozbicie wewnętrzne' : '🔍 Rozbij na części/usługę (tylko admin)'}
              </button>
              {showBreakdown && (
                <>
                  <label className="nr-field">
                    <span className="nr-label">Koszt części</span>
                    <input className="nr-input" value={partsCost} onChange={(e) => setPartsCost(e.target.value)} placeholder="0.00" />
                  </label>
                  <div className="nr-computed-service">
                    Usługa (wyliczona): <strong>{((parseFloat(totalCostInput) || 0) - (parseFloat(partsCost) || 0)).toFixed(2)} zł</strong>
                    {((parseFloat(totalCostInput) || 0) - (parseFloat(partsCost) || 0)) < 0 && ' — cena całości jest mniejsza niż koszt części!'}
                  </div>
                </>
              )}
            </>
          )}
        </section>

        {error && <div className="nr-error">{error}</div>}

        <button className="nr-submit" type="submit" disabled={loading}>
          {loading ? (photoFiles.length > 0 ? 'Wgrywam zdjęcia…' : 'Zapisuję…') : 'Dodaj zlecenie'}
        </button>
      </form>
    </div>
  );
}
