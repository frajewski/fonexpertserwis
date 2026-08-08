// ============================================================
//  calcProfit.js – obliczenia finansowe i statystyki serwisu
//  Użycie: import { calcProfit, getStatsByPeriod } from '../utils/calcProfit'
// ============================================================

import { STATUS } from '../constants/statuses';
import { getMonthName } from './formatDate';

// Zysk z jednej naprawy = serviceCost (to pole JEST już wyliczone jako
// Łącznie − Części w formularzu kosztorysu, więc nie odejmujemy części
// drugi raz)
export const calcSingleProfit = (repair) => repair.serviceCost || 0;

// Łączny zysk z tablicy napraw
export const calcProfit = (repairsArray) =>
  repairsArray.reduce((sum, r) => sum + calcSingleProfit(r), 0);

// Łączny przychód = to co realnie zapłacili klienci (usługa + części razem)
export const calcRevenue = (repairsArray) =>
  repairsArray.reduce((sum, r) => sum + (r.serviceCost || 0) + (r.partsCost || 0), 0);

// Łączne koszty części
export const calcPartsCost = (repairsArray) =>
  repairsArray.reduce((sum, r) => sum + (r.partsCost || 0), 0);

// ---- HELPERY DAT ----

const isSameDay = (iso, ref) => {
  const d = new Date(iso);
  return d.getDate() === ref.getDate() && d.getMonth() === ref.getMonth() && d.getFullYear() === ref.getFullYear();
};
const isSameMonth = (iso, year, month) => {
  const d = new Date(iso);
  return d.getFullYear() === year && d.getMonth() === month;
};
const isSameYear = (iso, year) => new Date(iso).getFullYear() === year;

// Data, wg której "wpada" zysk – wydanie klientowi, nie przyjęcie. Fallback
// dla starszych zleceń sprzed wprowadzenia issuedAt/statusUpdatedAt.
const getIssuedDate = (r) => r.issuedAt || r.statusUpdatedAt || r.createdAt;

// ---- FILTROWANIE PO DACIE PRZYJĘCIA (ile zleceń WPŁYNĘŁO w okresie) ----

export const filterToday = (repairsArray) => {
  const today = new Date();
  return repairsArray.filter((r) => isSameDay(r.createdAt, today));
};

export const filterThisMonth = (repairsArray) => {
  const now = new Date();
  return repairsArray.filter((r) => isSameMonth(r.createdAt, now.getFullYear(), now.getMonth()));
};

export const filterThisYear = (repairsArray) => {
  const year = new Date().getFullYear();
  return repairsArray.filter((r) => isSameYear(r.createdAt, year));
};

export const filterByMonth = (repairsArray, year, month) =>
  repairsArray.filter((r) => isSameMonth(r.createdAt, year, month));

// ---- FILTROWANIE ZAKOŃCZONYCH PO DACIE WYDANIA (kiedy zysk faktycznie "wpada") ----

export const filterDeliveredToday = (repairsArray) => {
  const today = new Date();
  return repairsArray.filter((r) => r.status === STATUS.DELIVERED && isSameDay(getIssuedDate(r), today));
};

export const filterDeliveredThisMonth = (repairsArray) => {
  const now = new Date();
  return repairsArray.filter((r) => r.status === STATUS.DELIVERED && isSameMonth(getIssuedDate(r), now.getFullYear(), now.getMonth()));
};

export const filterDeliveredThisYear = (repairsArray) => {
  const year = new Date().getFullYear();
  return repairsArray.filter((r) => r.status === STATUS.DELIVERED && isSameYear(getIssuedDate(r), year));
};

export const filterDeliveredByMonth = (repairsArray, year, month) =>
  repairsArray.filter((r) => r.status === STATUS.DELIVERED && isSameMonth(getIssuedDate(r), year, month));

// ---- STATYSTYKI ZBIORCZE ----

// repairsArray = zlecenia PRZYJĘTE w okresie (dla total/active/cancelled)
// deliveredInPeriod = zlecenia WYDANE w tym samym okresie (dla revenue/profit)
export const getStats = (repairsArray, deliveredInPeriod) => {
  const completed = deliveredInPeriod;
  const active    = repairsArray.filter((r) =>
    r.status !== STATUS.DELIVERED && r.status !== STATUS.CANCELLED
  );
  const cancelled = repairsArray.filter((r) => r.status === STATUS.CANCELLED);

  return {
    total:         repairsArray.length,
    completed:     completed.length,
    active:        active.length,
    cancelled:     cancelled.length,
    revenue:       calcRevenue(completed),
    partsCost:     calcPartsCost(completed),
    profit:        calcProfit(completed),
  };
};

// Statystyki podzielone na dzisiaj / ten miesiąc / ten rok
export const getStatsByPeriod = (repairsArray) => ({
  today:     getStats(filterToday(repairsArray), filterDeliveredToday(repairsArray)),
  thisMonth: getStats(filterThisMonth(repairsArray), filterDeliveredThisMonth(repairsArray)),
  thisYear:  getStats(filterThisYear(repairsArray), filterDeliveredThisYear(repairsArray)),
});

// ---- RANKINGI ----

const countOccurrences = (items) =>
  items.reduce((acc, item) => {
    acc[item] = (acc[item] || 0) + 1;
    return acc;
  }, {});

const sortedRanking = (countObj) =>
  Object.entries(countObj)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

export const getTopBrands = (repairsArray) => {
  const brands = repairsArray.map((r) => r.brand).filter(Boolean);
  return sortedRanking(countOccurrences(brands));
};

// TODO: gdy dodasz pole faultType do Repair, użyj r.faultType zamiast opisu
export const getTopFaults = (repairsArray) => {
  const faults = repairsArray
    .map((r) => r.description?.split(' ').slice(0, 3).join(' ') || 'Brak opisu')
    .filter(Boolean);
  return sortedRanking(countOccurrences(faults)).slice(0, 5);
};

// Dane miesięczne dla bieżącego roku – count = ile PRZYJĘTO, profit = ile
// zysku faktycznie wpadło (po dacie WYDANIA) w danym miesiącu
export const getMonthlyData = (repairsArray) => {
  const year = new Date().getFullYear();

  return Array.from({ length: 12 }, (_, monthIndex) => {
    const monthRepairs = repairsArray.filter((r) => isSameMonth(r.createdAt, year, monthIndex));
    const delivered = filterDeliveredByMonth(repairsArray, year, monthIndex);
    return {
      month:  getMonthName(monthIndex),
      count:  monthRepairs.length,
      profit: calcProfit(delivered),
    };
  });
};

// Zlecenia "zawieszone" – nie w statusie końcowym, i status nie zmienił się
// od dłuższego czasu (domyślnie 5 dni). Fallback na createdAt dla starszych
// zleceń sprzed wprowadzenia statusUpdatedAt, żeby nic nie wypadło z radaru.
export const getStaleRepairs = (repairsArray, terminalStatuses, staleDays = 5) => {
  const cutoff = Date.now() - staleDays * 24 * 60 * 60 * 1000;
  return repairsArray
    .filter((r) => !terminalStatuses.includes(r.status))
    .filter((r) => new Date(r.statusUpdatedAt || r.createdAt).getTime() < cutoff)
    .sort((a, b) => new Date(a.statusUpdatedAt || a.createdAt) - new Date(b.statusUpdatedAt || b.createdAt));
};
