import colors from './colors';

// Enum statusów – używaj ZAWSZE tych stałych, nigdy nie pisz stringa na sztywno
// Dzięki temu zmiana nazwy statusu wymaga edycji tylko tego pliku

export const STATUS = {
  ACCEPTED:   'Przyjęte',
  DIAGNOSIS:  'W diagnozie',
  ORDER_PARTS: 'Zamów części',
  REPAIR:     'W naprawie',
  PARTS:      'Oczekuje na części',
  READY:      'Gotowe do odbioru',
  DELIVERED:  'Odebrane',
  CANCELLED:  'Anulowane',
};

// Mapowanie statusu → kolor tła odznaki (StatusBadge)
export const statusColors = {
  [STATUS.ACCEPTED]:  colors.statusAccepted,
  [STATUS.DIAGNOSIS]: colors.statusDiagnosis,
  [STATUS.ORDER_PARTS]: colors.statusOrderParts,
  [STATUS.REPAIR]:    colors.statusRepair,
  [STATUS.PARTS]:     colors.statusParts,
  [STATUS.READY]:     colors.statusReady,
  [STATUS.DELIVERED]: colors.statusDelivered,
  [STATUS.CANCELLED]: colors.statusCancelled,
};

// Ikonka emoji obok statusu – czytelna podpowiedź wizualna
export const statusIcons = {
  [STATUS.ACCEPTED]:  '📥',
  [STATUS.DIAGNOSIS]: '🔍',
  [STATUS.ORDER_PARTS]: '📞',
  [STATUS.REPAIR]:    '🔧',
  [STATUS.PARTS]:     '📦',
  [STATUS.READY]:     '✅',
  [STATUS.DELIVERED]: '👋',
  [STATUS.CANCELLED]: '❌',
};

// Tablica wszystkich statusów w kolejności ścieżki naprawy
// Używana np. do podglądu progressu lub walidacji przejść
export const statusFlow = [
  STATUS.ACCEPTED,
  STATUS.DIAGNOSIS,
  STATUS.ORDER_PARTS,
  STATUS.REPAIR,
  STATUS.PARTS,
  STATUS.READY,
  STATUS.DELIVERED,
];

// Statusy końcowe – po ich osiągnięciu zlecenie jest zamknięte
export const terminalStatuses = [STATUS.DELIVERED, STATUS.CANCELLED];

// Pełna lista do Pickera zmiany statusu (dla serwisanta)
export const statusList = Object.values(STATUS);

export default STATUS;
