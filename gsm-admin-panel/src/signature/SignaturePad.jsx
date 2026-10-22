// ============================================================
//  SignaturePad.jsx – podpis klienta palcem / rysikiem / myszą
//
//  <SignatureField value={sig} onChange={setSig} label="Podpis klienta" />
//    • podgląd złożonego podpisu + „Podpisz” / „Podpisz ponownie” / „Usuń”
//    • „Podpisz” otwiera pełnoekranowe pole (wygodne na telefonie, działa
//      też w PWA i na komputerze – Pointer Events)
//    • Wstecz na Androidzie = Anuluj (data-back-close)
// ============================================================

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { strokesToSignature, signatureDataUrl } from './signatureData';
import { triggerHaptic } from '../native/haptics';
import './signature.css';

function SignatureModal({ title, hint, onCancel, onConfirm }) {
  const canvasRef = useRef(null);
  const strokesRef = useRef([]);
  const drawingRef = useRef(false);
  const [hasInk, setHasInk] = useState(false);
  const [tooShort, setTooShort] = useState(false);

  // Rozmiar płótna = rozmiar elementu × gęstość ekranu (ostre linie)
  useEffect(() => {
    const canvas = canvasRef.current;
    const setup = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(rect.height * dpr);
      const ctx = canvas.getContext('2d');
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.lineWidth = 2.6;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = '#14192B';
      // obrót/zmiana rozmiaru czyści płótno – rysujemy zapisane linie ponownie
      for (const s of strokesRef.current) {
        ctx.beginPath();
        s.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
        if (s.length === 1) ctx.lineTo(s[0].x + 0.5, s[0].y);
        ctx.stroke();
      }
    };
    setup();
    window.addEventListener('resize', setup);
    return () => window.removeEventListener('resize', setup);
  }, []);

  const point = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const down = (e) => {
    e.preventDefault();
    canvasRef.current.setPointerCapture?.(e.pointerId);
    drawingRef.current = true;
    const p = point(e);
    strokesRef.current.push([p]);
    const ctx = canvasRef.current.getContext('2d');
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(p.x + 0.5, p.y);
    ctx.stroke();
    setHasInk(true);
    setTooShort(false);
  };

  const move = (e) => {
    if (!drawingRef.current) return;
    e.preventDefault();
    const stroke = strokesRef.current[strokesRef.current.length - 1];
    const events = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
    const ctx = canvasRef.current.getContext('2d');
    for (const ev of events.length ? events : [e]) {
      const p = point(ev);
      const last = stroke[stroke.length - 1];
      if (Math.hypot(p.x - last.x, p.y - last.y) < 1.5) continue; // pomijamy mikro-ruchy
      ctx.beginPath();
      ctx.moveTo(last.x, last.y);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
      stroke.push(p);
    }
  };

  const up = () => { drawingRef.current = false; };

  const clear = () => {
    strokesRef.current = [];
    const c = canvasRef.current;
    c.getContext('2d').clearRect(0, 0, c.width, c.height);
    setHasInk(false);
    setTooShort(false);
  };

  const confirm = () => {
    const sig = strokesToSignature(strokesRef.current);
    if (!sig) {
      setTooShort(true);
      triggerHaptic('warning');
      return;
    }
    triggerHaptic('success');
    onConfirm(sig);
  };

  return (
    <div className="sig-overlay" data-back-close onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}>
      <div className="sig-sheet" role="dialog" aria-label={title}>
        <div className="sig-head">
          <div className="sig-title">{title}</div>
          {hint && <div className="sig-hint">{hint}</div>}
        </div>
        <div className="sig-area">
          <canvas
            ref={canvasRef}
            className="sig-canvas"
            onPointerDown={down}
            onPointerMove={move}
            onPointerUp={up}
            onPointerCancel={up}
            onPointerLeave={up}
          />
          {!hasInk && <div className="sig-placeholder">Podpisz tutaj</div>}
          <div className="sig-baseline" />
        </div>
        {tooShort && <div className="sig-error">Podpis jest za krótki – podpisz się jeszcze raz.</div>}
        <div className="sig-actions">
          <button type="button" className="sig-btn sig-btn-ghost" onClick={onCancel}>Anuluj</button>
          <button type="button" className="sig-btn sig-btn-ghost" onClick={clear} disabled={!hasInk}>Wyczyść</button>
          <button type="button" className="sig-btn sig-btn-primary" onClick={confirm} disabled={!hasInk}>Zatwierdź</button>
        </div>
      </div>
    </div>
  );
}

/**
 * Pole formularza: podgląd + przyciski. value = podpis z signatureData (albo null).
 * disabled – np. w trakcie zapisu.
 */
export default function SignatureField({ value, onChange, label = 'Podpis klienta', hint, disabled = false, compact = false }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`sig-field ${compact ? 'sig-field-compact' : ''}`}>
      {value?.path ? (
        <div className="sig-preview">
          <img src={signatureDataUrl(value)} alt={label} />
          <div className="sig-preview-meta">
            ✓ {label}
            {value.at && <span> · {new Date(value.at).toLocaleString('pl-PL', { dateStyle: 'short', timeStyle: 'short' })}</span>}
          </div>
        </div>
      ) : (
        <div className="sig-empty">Brak podpisu</div>
      )}
      <div className="sig-field-actions">
        <button type="button" className="sig-btn sig-btn-outline" disabled={disabled} onClick={() => setOpen(true)}>
          ✍️ {value?.path ? 'Podpisz ponownie' : 'Podpisz'}
        </button>
        {value?.path && (
          <button type="button" className="sig-btn sig-btn-ghost" disabled={disabled} onClick={() => onChange(null)}>Usuń</button>
        )}
      </div>
      {open && createPortal(
        <SignatureModal
          title={label}
          hint={hint}
          onCancel={() => setOpen(false)}
          onConfirm={(sig) => { setOpen(false); onChange(sig); }}
        />,
        document.body,
      )}
    </div>
  );
}
