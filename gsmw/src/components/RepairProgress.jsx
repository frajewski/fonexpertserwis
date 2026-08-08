// ============================================================
//  RepairProgress.jsx – sygnaturowy element wizualny: poziomy
//  "schemat" statusu naprawy, w stylu diagnostyki elektronicznej.
//  Węzły połączone linią, aktywny etap podświetlony i pulsujący.
// ============================================================

import { STATUS } from '../firebase/firestoreApi';
import './RepairProgress.css';

const STEPS = [
  { key: STATUS.ACCEPTED,  label: 'Przyjęte',  icon: '◆' },
  { key: STATUS.DIAGNOSIS, label: 'Diagnoza',   icon: '◇' },
  { key: STATUS.REPAIR,    label: 'Naprawa',    icon: '⬡' },
  { key: STATUS.READY,     label: 'Gotowe',     icon: '◈' },
  { key: STATUS.DELIVERED, label: 'Odebrane',   icon: '●' },
];

export default function RepairProgress({ status }) {
  if (status === STATUS.CANCELLED) {
    return (
      <div className="rp-cancelled">
        <span className="rp-cancelled-dot" />
        Zlecenie odwołane
      </div>
    );
  }

  // "Oczekuje na części" wizualnie traktujemy jako część etapu Naprawa
  const effectiveStatus = status === STATUS.PARTS ? STATUS.REPAIR : status;
  const activeIndex = STEPS.findIndex((s) => s.key === effectiveStatus);

  return (
    <div className="rp-track" role="img" aria-label={`Status naprawy: ${status}`}>
      {STEPS.map((step, i) => {
        const isDone   = i < activeIndex;
        const isActive = i === activeIndex;
        const isFuture = i > activeIndex;
        return (
          <div className="rp-step" key={step.key}>
            <div className="rp-node-wrap">
              {i > 0 && (
                <div className={`rp-connector ${isDone || isActive ? 'rp-connector-on' : ''}`} />
              )}
              <div
                className={[
                  'rp-node',
                  isDone && 'rp-node-done',
                  isActive && 'rp-node-active',
                  isFuture && 'rp-node-future',
                ].filter(Boolean).join(' ')}
              >
                {isActive && <span className="rp-pulse" />}
                <span className="rp-icon">{step.icon}</span>
              </div>
            </div>
            <span className={`rp-label ${isActive ? 'rp-label-active' : ''}`}>
              {step.label}
            </span>
            {isActive && status === STATUS.PARTS && (
              <span className="rp-sublabel">czeka na części</span>
            )}
          </div>
        );
      })}
    </div>
  );
}
