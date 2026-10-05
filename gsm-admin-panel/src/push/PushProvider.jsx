// ============================================================
//  PushProvider.jsx – spina powiadomienia z routerem i sesją
//
//  • przekazuje navigate() do handlePushAction (kliknięcia z pusha)
//  • po zalogowaniu personelu: cicha rejestracja (gdy zgoda już jest)
//    i wykonanie zaległej akcji z zimnego startu
//  • powiadomienie in-app, gdy push przyjdzie przy otwartej aplikacji
//  • JEDNORAZOWA karta „Włączyć powiadomienia?” (nie przy każdym starcie)
// ============================================================

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useStore from '../store/useStore';
import { usePushState, hideInAppNotice } from './pushState';
import { setPushNavigator, flushPendingPushAction, handlePushAction } from './handlePushAction';
import { onPushLogin, enablePushNotifications, shouldShowPushPrompt, dismissPushPrompt } from './pushNotifications';
import './push.css';

function InAppNotice() {
  const notice = usePushState((s) => s.notice);
  if (!notice) return null;
  const clickable = !!notice.data?.type;
  return (
    <div
      className={`push-notice ${clickable ? 'push-notice-clickable' : ''}`}
      role="status"
      aria-live="polite"
      onClick={() => { if (clickable) handlePushAction(notice.data); hideInAppNotice(); }}
    >
      <div className="push-notice-title">🔔 {notice.title}</div>
      {notice.body && <div className="push-notice-body">{notice.body}</div>}
    </div>
  );
}

function PermissionPrompt() {
  const { supported, permission } = usePushState();
  const currentUser = useStore((s) => s.currentUser);
  const [visible, setVisible] = useState(shouldShowPushPrompt());
  const [busy, setBusy] = useState(false);
  if (!visible || !supported || permission !== 'prompt' || !['admin', 'worker'].includes(currentUser?.role)) return null;

  return (
    <div className="push-prompt" role="dialog" aria-label="Powiadomienia">
      <div className="push-prompt-text">
        <strong>Włączyć powiadomienia?</strong>
        <span>Nowe zlecenia, zgłoszenia klientów i gotowe naprawy — od razu na telefonie.</span>
      </div>
      <div className="push-prompt-actions">
        <button type="button" className="push-prompt-later" onClick={() => { dismissPushPrompt(); setVisible(false); }}>Nie teraz</button>
        <button
          type="button"
          className="push-prompt-enable"
          disabled={busy}
          onClick={async () => { setBusy(true); try { await enablePushNotifications(); } finally { setBusy(false); setVisible(false); } }}
        >
          Włącz
        </button>
      </div>
    </div>
  );
}

export default function PushProvider({ children }) {
  const navigate = useNavigate();
  const currentUser = useStore((s) => s.currentUser);
  const supported = usePushState((s) => s.supported);

  useEffect(() => {
    setPushNavigator(navigate);
    return () => setPushNavigator(null);
  }, [navigate]);

  useEffect(() => {
    if (!supported || !['admin', 'worker'].includes(currentUser?.role)) return;
    onPushLogin();
    flushPendingPushAction();
  }, [supported, currentUser?.id, currentUser?.role]);

  return (
    <>
      {children}
      <InAppNotice />
      <PermissionPrompt />
    </>
  );
}
