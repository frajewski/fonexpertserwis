// ============================================================
//  ScanButtons.jsx – przyciski skanera używane w formularzach i listach
//
//  <ScanImeiButton onImei={setImei} />
//      obok pola IMEI; wpisuje IMEI tylko gdy kod jest poprawny
//  <ScanCodeButton onImei={...} />
//      przy wyszukiwarce; rozpoznaje IMEI albo QR zlecenia
//
//  Oba renderują się tylko w aplikacji natywnej (w PWA zwracają null).
// ============================================================

import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { isScannerAvailable, scanCode } from './barcodeScanner';
import { extractImei, parseRepairQr } from './codeParsers';
import { findRepairByTrackingToken, REPAIR_NOT_FOUND_MESSAGE } from './repairLookup';
import './scanner.css';

// Stan „busy” bezpieczny przy odmontowaniu komponentu w trakcie skanowania
const useBusy = () => {
  const [busy, setBusy] = useState(false);
  const mounted = useRef(true);
  useEffect(() => () => { mounted.current = false; }, []);
  return [busy, (v) => { if (mounted.current) setBusy(v); }];
};

export function ScanImeiButton({ onImei, className = 'scan-btn' }) {
  const [busy, setBusy] = useBusy();
  if (!isScannerAvailable()) return null;

  const handleClick = async (e) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      const raw = await scanCode('imei');
      if (raw === null) return; // anulowano – pole bez zmian
      const res = extractImei(raw);
      if (res.ok) onImei(res.imei);
      else alert(res.message); // pole zostaje bez zmian
    } catch (err) {
      alert(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <button type="button" className={className} onClick={handleClick} disabled={busy} title="Skanuj kod IMEI">
      {busy ? '…' : '▦ Skanuj'}
    </button>
  );
}

export function ScanCodeButton({ onImei, className = 'scan-btn' }) {
  const [busy, setBusy] = useBusy();
  const navigate = useNavigate();
  if (!isScannerAvailable()) return null;

  const handleClick = async (e) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      const raw = await scanCode('any');
      if (raw === null) return;

      const qr = parseRepairQr(raw);
      if (qr) {
        const repair = await findRepairByTrackingToken(qr.token);
        if (repair) navigate(`/zlecenia/${repair.id}`);
        else alert(REPAIR_NOT_FOUND_MESSAGE);
        return;
      }

      const imei = extractImei(raw);
      if (imei.ok) { onImei?.(imei.imei); return; }

      alert('Nie rozpoznano kodu. Skanuj IMEI urządzenia albo kod QR z potwierdzenia przyjęcia FonExpert.');
    } catch (err) {
      alert(err.message || 'Nie udało się odczytać kodu.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <button type="button" className={className} onClick={handleClick} disabled={busy} title="Skanuj IMEI lub QR zlecenia">
      {busy ? '…' : '▦ Skanuj'}
    </button>
  );
}
