// Statusy wniosków o naprawę składanych przez klientów

export const BOOKING_STATUS = {
  PENDING:      'Oczekuje',         // nowy wniosek, admin nie odpowiedział
  ACCEPTED:     'Zaakceptowany',    // admin przyjął termin i cenę
  RESCHEDULED:  'Inny termin',      // admin proponuje inny termin
  REJECTED:     'Odrzucony',        // admin odrzucił z powodem
  CONVERTED:    'Przekształcony',   // stał się zleceniem naprawy
};

export const BOOKING_STATUS_COLORS = {
  [BOOKING_STATUS.PENDING]:     '#F59E0B',
  [BOOKING_STATUS.ACCEPTED]:    '#1DB954',
  [BOOKING_STATUS.RESCHEDULED]: '#3B82F6',
  [BOOKING_STATUS.REJECTED]:    '#FF4C4C',
  [BOOKING_STATUS.CONVERTED]:   '#243B55',
};

export const BOOKING_STATUS_ICONS = {
  [BOOKING_STATUS.PENDING]:     '⏳',
  [BOOKING_STATUS.ACCEPTED]:    '✅',
  [BOOKING_STATUS.RESCHEDULED]: '📅',
  [BOOKING_STATUS.REJECTED]:    '❌',
  [BOOKING_STATUS.CONVERTED]:   '🔧',
};
