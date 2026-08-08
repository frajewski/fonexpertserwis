// Role użytkowników w systemie
export const ROLES = {
  ADMIN:      'admin',       // pełen dostęp + zarządzanie użytkownikami
  WORKER:     'worker',      // serwisant – zlecenia, skup
  CUSTOMER:   'customer',    // klient – własne zlecenia + wnioski
};

export const ROLE_LABELS = {
  [ROLES.ADMIN]:    '👑 Administrator',
  [ROLES.WORKER]:   '🔧 Pracownik',
  [ROLES.CUSTOMER]: '👤 Klient',
};

export const ROLE_COLORS = {
  [ROLES.ADMIN]:    '#6465FF',
  [ROLES.WORKER]:   '#243B55',
  [ROLES.CUSTOMER]: '#1DB954',
};
