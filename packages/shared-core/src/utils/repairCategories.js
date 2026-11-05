// ============================================================
//  repairCategories.js – grupowanie zleceń w rodzaje napraw
//  na podstawie opisu usterki (wolny tekst), plus statystyki
//  cen i marży dla każdego rodzaju.
// ============================================================

// Kolejność ma znaczenie – wygrywa pierwsza pasująca kategoria
// (np. „bateria szybko się rozładowuje” ma trafić do baterii, nie ładowania).
export const REPAIR_CATEGORIES = [
  { id: 'protect',  label: 'Szkło / folia ochronna',  re: /hartowan|ochronn|folia|foli[ie]|szklo|szkla|naklej/ },
  { id: 'water',    label: 'Zalanie',                 re: /zala[nl]|zalew|wod[aązy]|wilgo|plyn/ },
  { id: 'screen',   label: 'Wyświetlacz / szybka',    re: /lcd|oled|wyswietl|ekran|szybk[aieęy]|dotyk|matryc|digitizer|touch/ },
  { id: 'battery',  label: 'Bateria',                 re: /bater|akumul|puchn|spuchn|rozladow/ },
  { id: 'charging', label: 'Ładowanie / gniazdo',     re: /ladow|laduj|gniazd|port|usb|zlacz|lightning|typ[ -]?c/ },
  { id: 'back',     label: 'Tylna szyba / obudowa',   re: /tyl|plecki|klapk|obudow|ramk/ },
  { id: 'camera',   label: 'Aparat',                  re: /aparat|kamer|obiektyw/ },
  { id: 'audio',    label: 'Głośnik / mikrofon',      re: /glosni|glosno|mikrofon|sluchaw|slychac|dzwiek/ },
  { id: 'buttons',  label: 'Przyciski',               re: /przycisk|klawisz|power|home|glosnosc/ },
  { id: 'network',  label: 'Zasięg / SIM / Wi-Fi',    re: /zasieg|\bsim\b|wi-?fi|bluetooth|\bbt\b|siec|nfc|internet|dane komork|\blte\b|\b5g\b|gps/ },
  { id: 'data',     label: 'Dane / kopiowanie',       re: /kopiow|kopi[aei]\b|przenies|przenosz|odzysk|backup|zgran|dan(e|ych)\b|zdjec|kontakt/ },
  { id: 'software', label: 'Oprogramowanie / blokady', re: /oprogram|software|\bfrp\b|konto google|blokad|aktualiz|wgra|reset|bootloop|restartuj|soft\b|odblok|haslo|\bkod|\bpin\b|wzor|zapomn|icloud|apple id/ },
  { id: 'board',    label: 'Nie włącza się / płyta', re: /nie wlacza|nie wlaczy|nie odpala|nie startuje|nie uruchamia|nie uruchomi|nie bootuje|plyt|zwarc|martwy|nie daje oznak/ },
];

export const OTHER_CATEGORY = { id: 'other', label: 'Inne' };

const normalize = (text) => (text || '')
  .toLowerCase()
  .replace(/ł/g, 'l')
  .normalize('NFD')
  .replace(/[̀-ͯ]/g, '');

export const classifyRepair = (repair) => {
  const text = normalize(`${repair?.faultType || ''} ${repair?.description || ''}`);
  return REPAIR_CATEGORIES.find((c) => c.re.test(text)) || OTHER_CATEGORY;
};

const round = (n) => Math.round(n);
const median = (sorted) => {
  if (!sorted.length) return 0;
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};
const percentile = (sorted, p) => {
  if (!sorted.length) return 0;
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.floor((sorted.length - 1) * p)));
  return sorted[idx];
};

const brandGroup = (brand) => {
  const b = (brand || '').toLowerCase();
  if (b.includes('apple') || b.includes('iphone')) return 'Apple';
  if (b.includes('samsung')) return 'Samsung';
  if (b.includes('xiaomi') || b.includes('redmi') || b.includes('poco')) return 'Xiaomi';
  return 'Inne marki';
};

const summarize = (list) => {
  // Cena = to, co zapłacił klient (usługa + części). Naprawy za 0 zł
  // (gwarancja, reklamacja, gratis) nie zaniżają cen – liczymy je tylko w „ile”.
  const priced = list
    .map((r) => (r.serviceCost || 0) + (r.partsCost || 0))
    .filter((p) => p > 0)
    .sort((a, b) => a - b);
  // Marża tylko ze zleceń z wpisanym kosztem części – bez niego cała cena
  // wyglądałaby na zysk.
  const withParts = list.filter((r) => (r.partsCost || 0) > 0);
  const sum = (arr, f) => arr.reduce((s, x) => s + f(x), 0);
  const avgPrice = priced.length ? sum(priced, (p) => p) / priced.length : 0;
  const avgParts = withParts.length ? sum(withParts, (r) => r.partsCost) / withParts.length : 0;
  const avgMargin = withParts.length ? sum(withParts, (r) => r.serviceCost || 0) / withParts.length : 0;
  const avgMarginPct = withParts.length
    ? sum(withParts, (r) => {
        const total = (r.serviceCost || 0) + (r.partsCost || 0);
        return total > 0 ? (r.serviceCost || 0) / total : 0;
      }) / withParts.length
    : 0;
  return {
    count: list.length,
    pricedCount: priced.length,
    minPrice: priced[0] || 0,
    p25Price: round(percentile(priced, 0.25)),
    medianPrice: round(median(priced)),
    avgPrice: round(avgPrice),
    maxPrice: priced[priced.length - 1] || 0,
    withPartsCount: withParts.length,
    avgParts: round(avgParts),
    avgMargin: round(avgMargin),
    avgMarginPct: Math.round(avgMarginPct * 100),
  };
};

// Statystyki cen i marży wg rodzaju naprawy (+ rozbicie na marki).
// repairsArray – najlepiej tylko zlecenia wydane (STATUS.DELIVERED).
export const getRepairPriceStats = (repairsArray) => {
  const groups = new Map();
  repairsArray.forEach((r) => {
    const cat = classifyRepair(r);
    if (!groups.has(cat.id)) groups.set(cat.id, { ...cat, repairs: [] });
    groups.get(cat.id).repairs.push(r);
  });
  return [...groups.values()]
    .map(({ id, label, repairs }) => {
      const byBrand = new Map();
      repairs.forEach((r) => {
        const b = brandGroup(r.brand);
        if (!byBrand.has(b)) byBrand.set(b, []);
        byBrand.get(b).push(r);
      });
      return {
        id,
        label,
        ...summarize(repairs),
        brands: [...byBrand.entries()]
          .map(([brand, list]) => ({ brand, ...summarize(list) }))
          .sort((a, b) => b.count - a.count),
        examples: [...new Set(repairs.map((r) => (r.description || '').trim()).filter(Boolean))].slice(0, 15),
      };
    })
    .sort((a, b) => (a.id === 'other') - (b.id === 'other') || b.count - a.count);
};
