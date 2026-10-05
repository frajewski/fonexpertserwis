// ============================================================
//  pushState.js – stan powiadomień do wyświetlenia w UI
//  (diagnostyka w „Moje konto” + powiadomienie in-app na pierwszym planie)
// ============================================================

import { create } from 'zustand';

export const usePushState = create(() => ({
  supported: false,     // aplikacja Android z pluginem
  permission: 'unknown', // 'prompt' | 'granted' | 'denied' | 'unsupported'
  registered: false,     // token zapisany w backendzie dla bieżącego konta
  lastError: '',
  registerBlocked: false, // bezpiecznik po awarii rejestracji
  notice: null,          // { title, body, data? } – powiadomienie in-app
}));

let noticeTimer;
export function showInAppNotice(notice, ms = 6000) {
  clearTimeout(noticeTimer);
  usePushState.setState({ notice });
  noticeTimer = setTimeout(() => usePushState.setState({ notice: null }), ms);
}
export function hideInAppNotice() {
  clearTimeout(noticeTimer);
  usePushState.setState({ notice: null });
}
