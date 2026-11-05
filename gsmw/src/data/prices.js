// ============================================================
//  prices.js – cennik „od” na stronie klienta.
//  Kwoty ustalone przez właściciela na podstawie statystyk napraw
//  (panel → Statystyki → Ceny i marże wg rodzaju naprawy, 11.2026).
//  Zmieniasz cenę? Popraw liczbę poniżej i wdróż stronę.
// ============================================================

export const PRICE_BRANDS = ['iPhone', 'Samsung', 'Xiaomi', 'Inne marki'];

// issue = klucz usterki z formularza (BOOKING_ISSUES) – link otwiera formularz
export const PRICES = [
  { name: 'Wymiana wyświetlacza', issue: 'Zbity ekran / wyświetlacz', from: { iPhone: 200, Samsung: 150, Xiaomi: 250, 'Inne marki': 150 } },
  { name: 'Wymiana baterii', issue: 'Bateria', from: { iPhone: 200, Samsung: 250, Xiaomi: 100, 'Inne marki': 250 } },
  { name: 'Wymiana gniazda ładowania', issue: 'Gniazdo ładowania', from: { iPhone: 100, Samsung: 250, Xiaomi: 100, 'Inne marki': 100 } },
  { name: 'Czyszczenie gniazda ładowania', issue: 'Gniazdo ładowania', from: { iPhone: 50, Samsung: 50, Xiaomi: 50, 'Inne marki': 50 } },
];

// Najniższa cena „od” dla danej usterki z formularza (dowolna marka)
export const minPriceForIssue = (issue) => {
  const all = PRICES.filter((p) => p.issue === issue).flatMap((p) => Object.values(p.from));
  return all.length ? Math.min(...all) : null;
};

// Marka z formularza → kolumna cennika
const brandColumn = (brand) => {
  const b = (brand || '').toLowerCase();
  if (b === 'apple' || b.includes('iphone')) return 'iPhone';
  if (b === 'samsung') return 'Samsung';
  if (b === 'xiaomi' || b.includes('redmi') || b.includes('poco')) return 'Xiaomi';
  return 'Inne marki';
};

// Cena „od” dla usterki i marki – do podpowiedzi w formularzu
export const priceFor = (issue, brand) => {
  const col = brandColumn(brand);
  const list = PRICES.filter((p) => p.issue === issue).map((p) => p.from[col]).filter(Boolean);
  return list.length ? Math.min(...list) : null;
};

// Nazwa usługi w podpowiedzi formularza („wymiana baterii od 200 zł”)
export const ISSUE_PRICE_LABEL = {
  'Zbity ekran / wyświetlacz': 'wymiana wyświetlacza',
  'Bateria': 'wymiana baterii',
  'Gniazdo ładowania': 'naprawa gniazda ładowania',
};

export const PRICE_NOTE = 'Ceny orientacyjne za naprawę z częścią. Dokładną kwotę podamy po obejrzeniu telefonu — zależy od modelu i rodzaju części. Nic nie naprawiamy bez Twojej zgody na cenę.';
