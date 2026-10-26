// Kolor plakietki statusu zlecenia → klasy .status-pill .pill-* z styles/tokens.css
import STATUS from '../constants/statuses';

const PILL = {
  [STATUS.ACCEPTED]: 'slate',
  [STATUS.DIAGNOSIS]: 'amber',
  [STATUS.ORDER_PARTS]: 'orange',
  [STATUS.REPAIR]: 'blue',
  [STATUS.PARTS]: 'violet',
  [STATUS.CUSTOMER_WAIT]: 'teal',
  [STATUS.READY]: 'green',
  [STATUS.DELIVERED]: 'gray',
  [STATUS.CANCELLED]: 'red',
};

export const statusPillClass = (status) => `status-pill pill-${PILL[status] || 'gray'}`;
export default statusPillClass;
