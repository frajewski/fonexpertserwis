// Statystyki dla modułu Skup (phones) – analogiczne do calcProfit.js, ale
// dotyczą telefonów kupowanych/sprzedawanych, nie napraw.

const STALE_DAYS_DEFAULT = 30;

// Top modele wg liczby sprzedanych sztuk – [{name: 'Apple iPhone 13', count: 5}, ...]
export const getTopSellingModels = (phonesArray, limit = 5) => {
  const sold = phonesArray.filter((p) => p.status === 'Sprzedany');
  const counts = {};
  sold.forEach((p) => {
    const name = `${p.brand || ''} ${p.model || ''}`.trim() || 'Nieznany';
    counts[name] = (counts[name] || 0) + 1;
  });
  return Object.entries(counts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
};

// Średnia marża (zł) wg marki, tylko sprzedane – [{brand: 'Apple', avgProfit: 320, count: 40}, ...]
export const getAvgProfitByBrand = (phonesArray) => {
  const sold = phonesArray.filter((p) => p.status === 'Sprzedany' && p.brand);
  const byBrand = {};
  sold.forEach((p) => {
    const profit = (p.sellPrice || 0) - (p.buyPrice || 0);
    if (!byBrand[p.brand]) byBrand[p.brand] = { total: 0, count: 0 };
    byBrand[p.brand].total += profit;
    byBrand[p.brand].count += 1;
  });
  return Object.entries(byBrand)
    .map(([brand, { total, count }]) => ({ brand, avgProfit: Math.round(total / count), count }))
    .sort((a, b) => b.avgProfit - a.avgProfit);
};

// Telefony "zalegające" w magazynie – kupione, nie sprzedane, dłużej niż
// staleDays temu (domyślnie 30 dni). Pomaga zauważyć co się nie rusza.
export const getStalePhones = (phonesArray, staleDays = STALE_DAYS_DEFAULT) => {
  const cutoff = Date.now() - staleDays * 24 * 60 * 60 * 1000;
  return phonesArray
    .filter((p) => p.status !== 'Sprzedany' && p.boughtAt && new Date(p.boughtAt).getTime() < cutoff)
    .sort((a, b) => new Date(a.boughtAt) - new Date(b.boughtAt)); // najdłużej zalegające pierwsze
};

const MONTH_NAMES = [
  'Styczeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec',
  'Lipiec', 'Sierpień', 'Wrzesień', 'Październik', 'Listopad', 'Grudzień',
];

// Zysk ze skupu miesiąc po miesiącu dla bieżącego roku, liczony po dacie
// sprzedaży (soldAt) – [{month: 'Styczeń', profit: 1200, count: 4}, ...]
export const getMonthlyTradeData = (phonesArray) => {
  const year = new Date().getFullYear();
  const soldThisYear = phonesArray.filter(
    (p) => p.status === 'Sprzedany' && p.soldAt && new Date(p.soldAt).getFullYear() === year
  );

  return Array.from({ length: 12 }, (_, monthIndex) => {
    const monthPhones = soldThisYear.filter((p) => new Date(p.soldAt).getMonth() === monthIndex);
    const profit = monthPhones.reduce((sum, p) => sum + ((p.sellPrice || 0) - (p.buyPrice || 0)), 0);
    return { month: MONTH_NAMES[monthIndex], count: monthPhones.length, profit };
  });
};

const isInMonth = (iso, year, month) => {
  if (!iso) return false;
  const d = new Date(iso);
  return d.getFullYear() === year && d.getMonth() === month;
};

// Pełne statystyki skupu dla JEDNEGO wybranego miesiąca (nie całego roku) –
// telefony kupione w tym miesiącu, sprzedane w tym miesiącu, i zysk z tych
// sprzedaży. Używane w widoku "Szczegóły miesiąca" na stronie Statystyk.
export const getTradeStatsForMonth = (phonesArray, year, month) => {
  const bought = phonesArray.filter((p) => isInMonth(p.boughtAt, year, month));
  const sold = phonesArray.filter((p) => p.status === 'Sprzedany' && isInMonth(p.soldAt, year, month));
  const profit = sold.reduce((sum, p) => sum + ((p.sellPrice || 0) - (p.buyPrice || 0)), 0);
  // Ile realnie wydano na zakup telefonów w tym miesiącu (niezależnie czy
  // dany telefon już się sprzedał, czy jeszcze leży w magazynie)
  const boughtCost = bought.reduce((sum, p) => sum + (p.buyPrice || 0), 0);
  return { boughtCount: bought.length, soldCount: sold.length, profit, boughtCost, soldPhones: sold };
};

// Zysk ze skupu (tylko liczba, do złączenia z zyskiem z napraw w kartach
// okresów "Dziś"/"Ten miesiąc"/"Ten rok") – liczony po dacie SPRZEDAŻY.
const calcTradeProfit = (soldPhones) =>
  soldPhones.reduce((sum, p) => sum + ((p.sellPrice || 0) - (p.buyPrice || 0)), 0);

export const getTradeProfitToday = (phonesArray) => {
  const today = new Date();
  const sold = phonesArray.filter((p) => {
    if (p.status !== 'Sprzedany' || !p.soldAt) return false;
    const d = new Date(p.soldAt);
    return d.getDate() === today.getDate() && d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
  });
  return calcTradeProfit(sold);
};

export const getTradeProfitThisMonth = (phonesArray) => {
  const now = new Date();
  const sold = phonesArray.filter((p) => p.status === 'Sprzedany' && isInMonth(p.soldAt, now.getFullYear(), now.getMonth()));
  return calcTradeProfit(sold);
};

export const getTradeProfitThisYear = (phonesArray) => {
  const year = new Date().getFullYear();
  const sold = phonesArray.filter((p) => p.status === 'Sprzedany' && p.soldAt && new Date(p.soldAt).getFullYear() === year);
  return calcTradeProfit(sold);
};
