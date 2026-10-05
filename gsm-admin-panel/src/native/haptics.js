// ============================================================
//  haptics.js – krótkie wibracje potwierdzające (Capacitor Haptics)
//
//  triggerHaptic('success' | 'warning' | 'error' | 'light')
//
//  • Tylko aplikacja natywna. W przeglądarce/PWA – no-op (webowa wersja
//    pluginu wołałaby navigator.vibrate, a panel w przeglądarce ma
//    zachowywać się jak dotąd).
//  • „Odpal i zapomnij”: nie czeka, nie rzuca – brak silnika wibracji
//    albo wyłączone wibracje w telefonie nie dają żadnego błędu.
//  • Używamy oszczędnie: zapis, wynik skanu, zablokowana operacja,
//    ważna zmiana statusu. Nie przy każdym kliknięciu.
// ============================================================

import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';

const available = () => Capacitor.isNativePlatform() && Capacitor.isPluginAvailable('Haptics');

const ACTIONS = {
  success: () => Haptics.notification({ type: NotificationType.Success }),
  warning: () => Haptics.notification({ type: NotificationType.Warning }),
  error: () => Haptics.notification({ type: NotificationType.Error }),
  light: () => Haptics.impact({ style: ImpactStyle.Light }),
};

export function triggerHaptic(type = 'light') {
  if (!available()) return;
  const action = ACTIONS[type] || ACTIONS.light;
  try {
    Promise.resolve(action()).catch(() => {});
  } catch {
    /* brak wsparcia – ignorujemy */
  }
}
