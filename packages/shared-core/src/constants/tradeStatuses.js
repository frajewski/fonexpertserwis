// Statusy telefonów w skupie
import colors from './colors';

export const TRADE_STATUS = {
  BOUGHT:   'Skupiony',
  REPAIR:   'W naprawie',
  READY:    'Gotowy do sprzedaży',
  SOLD:     'Sprzedany',
  CONSIGNED_OUT: 'U komisanta',
};

export const tradeStatusColors = {
  [TRADE_STATUS.BOUGHT]:  '#6B7280',   // szary
  [TRADE_STATUS.REPAIR]:  '#F59E0B',   // żółty
  [TRADE_STATUS.READY]:   '#3B82F6',   // niebieski
  [TRADE_STATUS.SOLD]:    '#1DB954',   // zielony
  [TRADE_STATUS.CONSIGNED_OUT]: '#8B5CF6', // fioletowy
};

export const tradeStatusIcons = {
  [TRADE_STATUS.BOUGHT]:  '📥',
  [TRADE_STATUS.REPAIR]:  '🔧',
  [TRADE_STATUS.READY]:   '✅',
  [TRADE_STATUS.SOLD]:    '💰',
  [TRADE_STATUS.CONSIGNED_OUT]: '🤝',
};

export const tradeStatusList = Object.values(TRADE_STATUS);

export default TRADE_STATUS;
