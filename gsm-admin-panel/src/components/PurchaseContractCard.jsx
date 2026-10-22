// ============================================================
//  PurchaseContractCard.jsx – „Dane do umowy” skupu
//
//  ContractFields – wspólny formularz (dane sprzedawcy + urządzenie, blokady,
//  weryfikacja, zapłata), używany:
//    • w zwijanej karcie w szczegółach telefonu (PurchaseContractCard),
//    • na stronie „Umowa skupu” (PurchaseContractPage), która przy okazji
//      dodaje telefon do skupu.
//  Dane urządzenia/blokad trafiają do phone.contract, dane sprzedawcy
//  do pól seller* telefonu; drukuje je utils/printPurchaseAgreement.js.
// ============================================================

import { useState } from 'react';
import { failMessage } from '../utils/friendlyError';
import './PurchaseContractCard.css';

const DEVICE_TYPES = ['telefon komórkowy', 'tablet', 'smartwatch'];
const ACCESSORIES = ['pudełko', 'dowód zakupu', 'ładowarka', 'przewód', 'etui'];
const CONDITIONS = ['sprawne', 'częściowo sprawne', 'uszkodzone'];

export const SELLER_FIELDS = [
  ['sellerFullName', 'Imię i nazwisko'],
  ['sellerPesel', 'PESEL'],
  ['sellerIdNumber', 'Seria i numer dowodu'],
  ['sellerIdIssuer', 'Organ wydający dokument'],
  ['sellerAddress', 'Adres zamieszkania (ul., kod, miasto)'],
  ['sellerPhone', 'Telefon'],
  ['sellerEmail', 'E-mail'],
];

export const initialSeller = (phone = {}) => Object.fromEntries(SELLER_FIELDS.map(([k]) => [k, phone[k] || '']));

export const initialContract = (phone = {}) => {
  const c = phone.contract || {};
  return {
    deviceType: c.deviceType || 'telefon komórkowy',
    imei2: c.imei2 || '', serial: c.serial || '',
    accessories: c.accessories || [], accessoriesOther: c.accessoriesOther || '',
    condition: c.condition || '', battery: c.battery || '',
    defects: c.defects || '', repairs: c.repairs || '',
    appleLock: c.appleLock || '', frp: c.frp || '', simLock: c.simLock || '',
    otherLock: c.otherLock || '', otherLockNote: c.otherLockNote || '',
    payment: c.payment || '', paymentOther: c.paymentOther || '',
    imeiChecked: !!c.imeiChecked, imeiCheckedAt: c.imeiCheckedAt || '',
  };
};

// Gotowe do zapisu: przycięte dane sprzedawcy + kontrakt z datą weryfikacji IMEI
export const toPhoneChanges = (seller, form, prevContract = {}) => ({
  ...Object.fromEntries(Object.entries(seller).map(([k, v]) => [k, String(v || '').trim()])),
  contract: {
    ...prevContract,
    ...form,
    deviceType: (form.deviceType || '').trim() || 'inne',
    imeiCheckedAt: form.imeiChecked ? (form.imeiCheckedAt || new Date().toISOString()) : '',
  },
});

function Choice({ options, value, onChange }) {
  return (
    <div className="pc-chips">
      {options.map((o) => (
        <button key={o} type="button" className={`pc-chip ${value === o ? 'pc-chip-on' : ''}`} onClick={() => onChange(value === o ? '' : o)}>
          {o}
        </button>
      ))}
    </div>
  );
}

/**
 * Pola umowy. seller/form – stan; onSeller(k, v), onForm(k, v) – zmiany.
 * showSeller=false ukrywa sekcję sprzedawcy (gdy strona ma ją osobno).
 */
export function ContractFields({ seller, onSeller, form, onForm, showSeller = true }) {
  const known = DEVICE_TYPES.includes(form.deviceType);
  const toggleAcc = (a) => onForm('accessories', form.accessories.includes(a) ? form.accessories.filter((x) => x !== a) : [...form.accessories, a]);

  return (
    <>
      {showSeller && (
        <>
          <h3 className="pc-h">Sprzedawca</h3>
          <div className="pc-grid">
            {SELLER_FIELDS.map(([k, label]) => (
              <label key={k} className="pc-field">
                <span>{label}</span>
                <input
                  className="pc-input"
                  value={seller[k]}
                  inputMode={k === 'sellerPesel' ? 'numeric' : undefined}
                  maxLength={k === 'sellerPesel' ? 11 : undefined}
                  onChange={(e) => onSeller(k, k === 'sellerPesel' ? e.target.value.replace(/\D/g, '') : e.target.value)}
                />
              </label>
            ))}
          </div>
        </>
      )}

      <h3 className="pc-h">Urządzenie — do umowy</h3>
      <div className="pc-field"><span>Rodzaj</span></div>
      <div className="pc-chips">
        {DEVICE_TYPES.map((t) => (
          <button key={t} type="button" className={`pc-chip ${form.deviceType === t ? 'pc-chip-on' : ''}`} onClick={() => onForm('deviceType', t)}>{t}</button>
        ))}
        <button type="button" className={`pc-chip ${!known ? 'pc-chip-on' : ''}`} onClick={() => onForm('deviceType', known ? ' ' : form.deviceType)}>inne</button>
      </div>
      {!known && (
        <input className="pc-input pc-mt" placeholder="Jakie urządzenie?" value={form.deviceType.trim()} onChange={(e) => onForm('deviceType', e.target.value || ' ')} />
      )}
      <div className="pc-grid pc-grid-2 pc-mt">
        <label className="pc-field"><span>IMEI 2</span><input className="pc-input" value={form.imei2} onChange={(e) => onForm('imei2', e.target.value)} /></label>
        <label className="pc-field"><span>Numer seryjny</span><input className="pc-input" value={form.serial} onChange={(e) => onForm('serial', e.target.value)} /></label>
      </div>

      <div className="pc-field pc-mt"><span>W komplecie</span></div>
      <div className="pc-chips">
        {ACCESSORIES.map((a) => (
          <button key={a} type="button" className={`pc-chip ${form.accessories.includes(a) ? 'pc-chip-on' : ''}`} onClick={() => toggleAcc(a)}>{a}</button>
        ))}
      </div>
      <input className="pc-input pc-mt" placeholder="Inne wyposażenie" value={form.accessoriesOther} onChange={(e) => onForm('accessoriesOther', e.target.value)} />

      <div className="pc-field pc-mt"><span>Stan w chwili zawarcia umowy</span></div>
      <Choice options={CONDITIONS} value={form.condition} onChange={(v) => onForm('condition', v)} />
      <div className="pc-grid pc-grid-2 pc-mt">
        <label className="pc-field"><span>Bateria (%)</span><input className="pc-input" inputMode="numeric" value={form.battery} onChange={(e) => onForm('battery', e.target.value.replace(/[^\d]/g, ''))} /></label>
      </div>
      <label className="pc-field pc-mt"><span>Znane uszkodzenia, wady, braki, ślady użytkowania</span><textarea className="pc-input pc-text" rows={2} value={form.defects} onChange={(e) => onForm('defects', e.target.value)} /></label>
      <label className="pc-field pc-mt"><span>Znane wcześniejsze naprawy / wymiany części</span><textarea className="pc-input pc-text" rows={2} value={form.repairs} onChange={(e) => onForm('repairs', e.target.value)} /></label>

      <h3 className="pc-h">Blokady</h3>
      <div className="pc-field"><span>Activation Lock / Find My</span></div>
      <Choice options={['wyłączone', 'nie dotyczy']} value={form.appleLock} onChange={(v) => onForm('appleLock', v)} />
      <div className="pc-field pc-mt"><span>Google FRP</span></div>
      <Choice options={['wyłączone', 'nie dotyczy']} value={form.frp} onChange={(v) => onForm('frp', v)} />
      <div className="pc-field pc-mt"><span>SIM-lock</span></div>
      <Choice options={['brak', 'występuje', 'nie sprawdzono']} value={form.simLock} onChange={(v) => onForm('simLock', v)} />
      <div className="pc-field pc-mt"><span>Inne blokady</span></div>
      <Choice options={['brak', 'występują']} value={form.otherLock} onChange={(v) => onForm('otherLock', v)} />
      {form.otherLock === 'występują' && (
        <input className="pc-input pc-mt" placeholder="Jakie?" value={form.otherLockNote} onChange={(e) => onForm('otherLockNote', e.target.value)} />
      )}

      <h3 className="pc-h">Weryfikacja i zapłata</h3>
      <label className="pc-check">
        <input type="checkbox" checked={form.imeiChecked} onChange={(e) => onForm('imeiChecked', e.target.checked)} />
        Sprawdziłem IMEI w bazie urządzeń utraconych/zablokowanych
      </label>
      <div className="pc-field pc-mt"><span>Sposób zapłaty</span></div>
      <Choice options={['gotówka', 'przelew', 'inne']} value={form.payment} onChange={(v) => onForm('payment', v)} />
      {form.payment === 'inne' && (
        <input className="pc-input pc-mt" placeholder="Jak?" value={form.paymentOther} onChange={(e) => onForm('paymentOther', e.target.value)} />
      )}
    </>
  );
}

// Zwijana karta w szczegółach telefonu (TradeDetailPage)
export default function PurchaseContractCard({ phone, onSave }) {
  const [seller, setSeller] = useState(() => initialSeller(phone));
  const [form, setForm] = useState(() => initialContract(phone));
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(toPhoneChanges(seller, form, phone.contract));
      setSaved(true);
    } catch (err) {
      alert(failMessage('Nie udało się zapisać danych do umowy', err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <details className="td-card pc-card">
      <summary className="td-section-title">📄 Dane do umowy</summary>
      <ContractFields
        seller={seller}
        onSeller={(k, v) => { setSeller((s) => ({ ...s, [k]: v })); setSaved(false); }}
        form={form}
        onForm={(k, v) => { setForm((f) => ({ ...f, [k]: v })); setSaved(false); }}
      />
      <button type="button" className="td-btn-primary-sm pc-save" onClick={handleSave} disabled={saving}>
        {saving ? 'Zapisuję…' : saved ? '✓ Zapisano' : 'Zapisz dane do umowy'}
      </button>
    </details>
  );
}
