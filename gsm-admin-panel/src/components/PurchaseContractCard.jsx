// ============================================================
//  PurchaseContractCard.jsx – „Dane do umowy” skupu (zwijana karta)
//  Tu uzupełniasz dane sprzedającego i zaznaczasz checkboxy, które potem
//  drukują się na umowie kupna-sprzedaży (utils/printPurchaseAgreement.js).
//  Dane urządzenia/blokad trafiają do phone.contract, dane sprzedającego
//  zostają w polach seller* telefonu.
// ============================================================

import { useState } from 'react';
import { failMessage } from '../utils/friendlyError';
import './PurchaseContractCard.css';

const DEVICE_TYPES = ['telefon komórkowy', 'tablet', 'smartwatch'];
const ACCESSORIES = ['pudełko', 'dowód zakupu', 'ładowarka', 'przewód', 'etui'];
const CONDITIONS = ['sprawne', 'częściowo sprawne', 'uszkodzone'];

const SELLER_FIELDS = [
  ['sellerFullName', 'Imię i nazwisko'],
  ['sellerPesel', 'PESEL'],
  ['sellerIdNumber', 'Seria i numer dowodu'],
  ['sellerIdIssuer', 'Organ wydający dokument'],
  ['sellerAddress', 'Adres zamieszkania (ul., kod, miasto)'],
  ['sellerPhone', 'Telefon'],
  ['sellerEmail', 'E-mail'],
];

function Choice({ options, value, onChange }) {
  return (
    <div className="pc-chips">
      {options.map((o) => (
        <button
          key={o}
          type="button"
          className={`pc-chip ${value === o ? 'pc-chip-on' : ''}`}
          onClick={() => onChange(value === o ? '' : o)}
        >
          {o}
        </button>
      ))}
    </div>
  );
}

export default function PurchaseContractCard({ phone, onSave }) {
  const c = phone.contract || {};
  const [seller, setSeller] = useState(() => Object.fromEntries(SELLER_FIELDS.map(([k]) => [k, phone[k] || ''])));
  const [form, setForm] = useState(() => ({
    deviceType: c.deviceType || 'telefon komórkowy',
    imei2: c.imei2 || '', serial: c.serial || '',
    accessories: c.accessories || [], accessoriesOther: c.accessoriesOther || '',
    condition: c.condition || '', battery: c.battery || '',
    defects: c.defects || '', repairs: c.repairs || '',
    appleLock: c.appleLock || '', frp: c.frp || '', simLock: c.simLock || '',
    otherLock: c.otherLock || '', otherLockNote: c.otherLockNote || '',
    payment: c.payment || '', paymentOther: c.paymentOther || '',
    imeiChecked: !!c.imeiChecked, imeiCheckedAt: c.imeiCheckedAt || '',
  }));
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const set = (k, v) => { setForm((f) => ({ ...f, [k]: v })); setSaved(false); };
  const setS = (k, v) => { setSeller((s) => ({ ...s, [k]: v })); setSaved(false); };
  const toggleAcc = (a) => set('accessories', form.accessories.includes(a) ? form.accessories.filter((x) => x !== a) : [...form.accessories, a]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const trimmedSeller = Object.fromEntries(Object.entries(seller).map(([k, v]) => [k, v.trim()]));
      await onSave({
        ...trimmedSeller,
        contract: {
          ...(phone.contract || {}),
          ...form,
          imeiCheckedAt: form.imeiChecked ? (form.imeiCheckedAt || new Date().toISOString()) : '',
        },
      });
      setSaved(true);
    } catch (err) {
      alert(failMessage('Nie udało się zapisać danych do umowy', err));
    } finally {
      setSaving(false);
    }
  };

  const known = DEVICE_TYPES.includes(form.deviceType);

  return (
    <details className="td-card pc-card">
      <summary className="td-section-title">📄 Dane do umowy</summary>

      <h3 className="pc-h">Sprzedawca</h3>
      <div className="pc-grid">
        {SELLER_FIELDS.map(([k, label]) => (
          <label key={k} className="pc-field">
            <span>{label}</span>
            <input className="td-input" value={seller[k]} onChange={(e) => setS(k, e.target.value)} />
          </label>
        ))}
      </div>

      <h3 className="pc-h">Urządzenie</h3>
      <div className="pc-field"><span>Rodzaj</span></div>
      <div className="pc-chips">
        {DEVICE_TYPES.map((t) => (
          <button key={t} type="button" className={`pc-chip ${form.deviceType === t ? 'pc-chip-on' : ''}`} onClick={() => set('deviceType', t)}>{t}</button>
        ))}
        <button type="button" className={`pc-chip ${!known ? 'pc-chip-on' : ''}`} onClick={() => set('deviceType', known ? ' ' : form.deviceType)}>inne</button>
      </div>
      {!known && (
        <input className="td-input pc-mt" placeholder="Jakie urządzenie?" value={form.deviceType.trim() === '' ? '' : form.deviceType} onChange={(e) => set('deviceType', e.target.value || ' ')} />
      )}
      <div className="pc-grid pc-mt">
        <label className="pc-field"><span>IMEI 2</span><input className="td-input" value={form.imei2} onChange={(e) => set('imei2', e.target.value)} /></label>
        <label className="pc-field"><span>Numer seryjny</span><input className="td-input" value={form.serial} onChange={(e) => set('serial', e.target.value)} /></label>
      </div>

      <div className="pc-field pc-mt"><span>W komplecie</span></div>
      <div className="pc-chips">
        {ACCESSORIES.map((a) => (
          <button key={a} type="button" className={`pc-chip ${form.accessories.includes(a) ? 'pc-chip-on' : ''}`} onClick={() => toggleAcc(a)}>{a}</button>
        ))}
      </div>
      <input className="td-input pc-mt" placeholder="Inne wyposażenie" value={form.accessoriesOther} onChange={(e) => set('accessoriesOther', e.target.value)} />

      <div className="pc-field pc-mt"><span>Stan w chwili zawarcia umowy</span></div>
      <Choice options={CONDITIONS} value={form.condition} onChange={(v) => set('condition', v)} />
      <div className="pc-grid pc-mt">
        <label className="pc-field"><span>Bateria (%)</span><input className="td-input" inputMode="numeric" value={form.battery} onChange={(e) => set('battery', e.target.value.replace(/[^\d]/g, ''))} /></label>
      </div>
      <label className="pc-field pc-mt"><span>Znane uszkodzenia, wady, braki, ślady użytkowania</span><textarea className="td-input pc-text" rows={2} value={form.defects} onChange={(e) => set('defects', e.target.value)} /></label>
      <label className="pc-field pc-mt"><span>Znane wcześniejsze naprawy / wymiany części</span><textarea className="td-input pc-text" rows={2} value={form.repairs} onChange={(e) => set('repairs', e.target.value)} /></label>

      <h3 className="pc-h">Blokady</h3>
      <div className="pc-field"><span>Activation Lock / Find My</span></div>
      <Choice options={['wyłączone', 'nie dotyczy']} value={form.appleLock} onChange={(v) => set('appleLock', v)} />
      <div className="pc-field pc-mt"><span>Google FRP</span></div>
      <Choice options={['wyłączone', 'nie dotyczy']} value={form.frp} onChange={(v) => set('frp', v)} />
      <div className="pc-field pc-mt"><span>SIM-lock</span></div>
      <Choice options={['brak', 'występuje', 'nie sprawdzono']} value={form.simLock} onChange={(v) => set('simLock', v)} />
      <div className="pc-field pc-mt"><span>Inne blokady</span></div>
      <Choice options={['brak', 'występują']} value={form.otherLock} onChange={(v) => set('otherLock', v)} />
      {form.otherLock === 'występują' && (
        <input className="td-input pc-mt" placeholder="Jakie?" value={form.otherLockNote} onChange={(e) => set('otherLockNote', e.target.value)} />
      )}

      <h3 className="pc-h">Weryfikacja i zapłata</h3>
      <label className="pc-check">
        <input type="checkbox" checked={form.imeiChecked} onChange={(e) => set('imeiChecked', e.target.checked)} />
        Sprawdziłem IMEI w bazie urządzeń utraconych/zablokowanych
      </label>
      <div className="pc-field pc-mt"><span>Sposób zapłaty</span></div>
      <Choice options={['gotówka', 'przelew', 'inne']} value={form.payment} onChange={(v) => set('payment', v)} />
      {form.payment === 'inne' && (
        <input className="td-input pc-mt" placeholder="Jak?" value={form.paymentOther} onChange={(e) => set('paymentOther', e.target.value)} />
      )}

      <button type="button" className="td-btn-primary-sm pc-save" onClick={handleSave} disabled={saving}>
        {saving ? 'Zapisuję…' : saved ? '✓ Zapisano' : 'Zapisz dane do umowy'}
      </button>
    </details>
  );
}
