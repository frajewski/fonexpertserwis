// ============================================================
//  PurchaseContractPage.jsx – „Umowa skupu” (/umowa)
//
//  Jedna strona do skupu od osoby prywatnej: dane sprzedawcy, urządzenie,
//  checkboxy umowy, cena, podpis na ekranie → „Generuj umowę”:
//    1) dodaje telefon do Skupu (status Kupiony, źródło: Klient prywatny),
//    2) drukuje umowę (jedna kartka A4) – papier dla klienta i biura,
//    3) przechodzi do karty telefonu.
// ============================================================

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useStore from '../store/useStore';
import brands from '../constants/brands';
import grades from '../constants/grades';
import { storageOptions } from '../constants/storageOptions';
import TRADE_STATUS from '../constants/tradeStatuses';
import { ScanImeiButton } from '../scanner/ScanButtons';
import { isOnlineNow } from '../network/networkStatus';
import { triggerHaptic } from '../native/haptics';
import { failMessage } from '../utils/friendlyError';
import SignatureField from '../signature/SignaturePad';
import { stampSignature } from '../signature/signatureData';
import { ContractFields, SELLER_FIELDS, initialSeller, initialContract, toPhoneChanges } from '../components/PurchaseContractCard';
import { buildPurchaseAgreementHtml, openPrintWindow, writeAndPrint } from '../utils/printPurchaseAgreement';
import './NewTradePage.css';

export default function PurchaseContractPage() {
  const navigate = useNavigate();
  const addPhone = useStore((s) => s.addPhone);
  const phones = useStore((s) => s.phones);
  const currentUser = useStore((s) => s.currentUser);

  const [seller, setSeller] = useState(() => initialSeller());
  const [form, setForm] = useState(() => ({ ...initialContract(), payment: 'gotówka' }));
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [imei, setImei] = useState('');
  const [color, setColor] = useState('');
  const [storage, setStorage] = useState('');
  const [grade, setGrade] = useState('');
  const [buyPrice, setBuyPrice] = useState('');
  const [boughtDate, setBoughtDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState('');
  const [signature, setSignature] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const onSeller = (k, v) => setSeller((s) => ({ ...s, [k]: v }));
  const onForm = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleGenerate = async () => {
    setError('');
    const price = parseFloat(String(buyPrice).replace(',', '.')) || 0;
    if (!seller.sellerFullName.trim()) return setError('Podaj imię i nazwisko sprzedawcy.');
    if (seller.sellerPesel.length !== 11) return setError('PESEL musi mieć 11 cyfr.');
    if (!seller.sellerIdNumber.trim()) return setError('Podaj serię i numer dowodu.');
    if (!seller.sellerAddress.trim()) return setError('Podaj adres sprzedawcy.');
    if (!brand) return setError('Wybierz markę.');
    if (!model.trim()) return setError('Podaj model.');
    if (!grade) return setError('Wybierz grade.');
    if (price <= 0) return setError('Podaj cenę zakupu.');
    if (!isOnlineNow()) {
      triggerHaptic('warning');
      return setError('Brak połączenia z Internetem. Umowa nie została zapisana — dane zostają w formularzu.');
    }

    const normalizedImei = imei.trim().replace(/\s/g, '');
    if (normalizedImei) {
      const existing = phones.filter((p) => p.imei && p.imei.replace(/\s/g, '') === normalizedImei);
      if (existing.length > 0) {
        const details = existing.map((p) => `• ${p.brand} ${p.model} — zakup ${p.buyPrice || 0} zł, status: ${p.status}`).join('\n');
        if (!window.confirm(`Ten IMEI już jest w bazie:\n\n${details}\n\nDodać kolejny wpis (ponowny odkup)?`)) return;
      }
    }

    // Okno wydruku otwieramy od razu (w kliknięciu), zanim zaczekamy na bazę
    const printWindow = openPrintWindow();

    setLoading(true);
    try {
      const contractData = toPhoneChanges(seller, form);
      const phone = await addPhone({
        brand,
        model: model.trim(),
        imei: imei.trim(),
        color: color.trim(),
        storage,
        grade,
        condition: 'used',
        source: 'private',
        sourceNote: contractData.sellerFullName,
        buyPrice: price,
        boughtAt: boughtDate ? new Date(boughtDate).toISOString() : undefined,
        sellPrice: 0,
        status: TRADE_STATUS.BOUGHT,
        hasIcloudLock: false,
        hasCarrierLock: form.simLock === 'występuje',
        isReported: false,
        warranty: '',
        notes: notes.trim(),
        usedParts: [],
        transactionType: 'purchase',
        komisMinPrice: 0,
        ...contractData,
        ...(signature ? { signatures: { seller: stampSignature(signature, currentUser?.name) } } : {}),
      });

      const printed = writeAndPrint(printWindow, buildPurchaseAgreementHtml(phone));
      triggerHaptic('success');
      if (!printed) {
        alert('Telefon dodany do skupu. Okno wydruku zostało zablokowane — wydrukuj umowę przyciskiem „📄 Drukuj umowę” w karcie telefonu.');
      }
      navigate(`/skup/${phone.id}`);
    } catch (err) {
      if (printWindow && !printWindow.closed) printWindow.close();
      setLoading(false);
      setError(failMessage('Nie udało się zapisać umowy', err));
      triggerHaptic('error');
    }
  };

  return (
    <div className="nt-page">
      <button className="nt-back" onClick={() => navigate('/skup')}>← Skup telefonów</button>
      <h1 className="nt-title">📝 Umowa skupu</h1>
      <p className="nt-hint">Uzupełnij dane, podpis klienta i kliknij „Generuj umowę” — telefon trafi do Skupu, a umowa od razu do druku.</p>

      <div className="nt-form">
        <div className="nt-card">
          <h2 className="nt-section-title">Sprzedawca</h2>
          {SELLER_FIELDS.map(([k, label]) => (
            <label key={k} className="nt-field">
              <span className="nt-label">{label}{['sellerFullName', 'sellerPesel', 'sellerIdNumber', 'sellerAddress'].includes(k) ? ' *' : ''}</span>
              <input
                className="nt-input"
                value={seller[k]}
                inputMode={k === 'sellerPesel' ? 'numeric' : undefined}
                maxLength={k === 'sellerPesel' ? 11 : undefined}
                onChange={(e) => onSeller(k, k === 'sellerPesel' ? e.target.value.replace(/\D/g, '') : e.target.value)}
              />
            </label>
          ))}
        </div>

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
              <input className="nt-input" value={model} onChange={(e) => setModel(e.target.value)} placeholder="np. iPhone 13" />
            </label>
          </div>
          <div className="nt-row">
            <label className="nt-field">
              <span className="nt-label">IMEI 1</span>
              <div className="scan-row">
                <input className="nt-input" value={imei} onChange={(e) => setImei(e.target.value)} maxLength={15} />
                <ScanImeiButton onImei={setImei} />
              </div>
            </label>
            <label className="nt-field">
              <span className="nt-label">Kolor</span>
              <input className="nt-input" value={color} onChange={(e) => setColor(e.target.value)} />
            </label>
          </div>
          <div className="nt-field">
            <span className="nt-label">Pamięć</span>
            <div className="nt-chips">
              {storageOptions.map((s) => (
                <button key={s} type="button" className={`nt-chip ${storage === s ? 'nt-chip-active' : ''}`} onClick={() => setStorage(storage === s ? '' : s)}>{s}</button>
              ))}
            </div>
          </div>
          <div className="nt-field">
            <span className="nt-label">Grade *</span>
            <div className="nt-chips">
              {grades.map((g) => (
                <button key={g.value} type="button" className={`nt-chip ${grade === g.value ? 'nt-chip-active' : ''}`} onClick={() => setGrade(g.value)} title={g.description}>
                  {g.emoji} {g.value}
                </button>
              ))}
            </div>
          </div>

          <ContractFields seller={seller} onSeller={onSeller} form={form} onForm={onForm} showSeller={false} />
        </div>

        <div className="nt-card">
          <h2 className="nt-section-title">Cena</h2>
          <div className="nt-row">
            <label className="nt-field">
              <span className="nt-label">Cena zakupu (zł) *</span>
              <input className="nt-input" inputMode="decimal" value={buyPrice} onChange={(e) => setBuyPrice(e.target.value)} placeholder="0" />
            </label>
            <label className="nt-field">
              <span className="nt-label">Data umowy</span>
              <input type="date" className="nt-input" value={boughtDate} onChange={(e) => setBoughtDate(e.target.value)} />
            </label>
          </div>
          <label className="nt-field">
            <span className="nt-label">Notatka wewnętrzna (nie drukuje się)</span>
            <textarea className="nt-textarea" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </label>
        </div>

        <div className="nt-card">
          <h2 className="nt-section-title">Podpis sprzedawcy</h2>
          <SignatureField
            value={signature}
            onChange={setSignature}
            label="Podpis sprzedawcy"
            hint="Sprzedawca potwierdza umowę i oświadczenia o własności. Bez podpisu na ekranie zostanie pusta linia do podpisu długopisem."
          />
        </div>

        {error && <div className="nt-error">{error}</div>}
        <button type="button" className="nt-submit" onClick={handleGenerate} disabled={loading}>
          {loading ? 'Zapisuję…' : '📄 Generuj umowę i dodaj do skupu'}
        </button>
      </div>
    </div>
  );
}
