// ============================================================
//  codeParsers.js – rozpoznawanie zeskanowanych kodów (czyste funkcje,
//  bez aparatu i bez Firebase – łatwe do testowania)
//
//  • extractImei(raw)     – wyciąga 15-cyfrowy IMEI (z kontrolą Luhna)
//  • parseRepairQr(raw)   – rozpoznaje QR z potwierdzenia przyjęcia
//                           (link do panelu klienta z tokenem śledzenia)
//
//  Bezpieczeństwo: żaden zeskanowany URL nie jest otwierany. Akceptujemy
//  wyłącznie nasz własny format linku, z którego bierzemy sam token.
// ============================================================

export const IMEI_INVALID_MESSAGE = 'Zeskanowany kod nie zawiera poprawnego numeru IMEI.';
export const IMEI_AMBIGUOUS_MESSAGE = 'Zeskanowany kod zawiera kilka różnych numerów IMEI. Wpisz właściwy numer ręcznie.';

// Kontrola Luhna – ostatnia (15.) cyfra IMEI jest cyfrą kontrolną.
// Odrzuca przypadkowe 15-cyfrowe ciągi (np. numery seryjne, kody EAN z dopiskiem).
export const isValidImei = (value) => {
  if (!/^\d{15}$/.test(value)) return false;
  let sum = 0;
  for (let i = 0; i < 15; i++) {
    let d = Number(value[i]);
    if (i % 2 === 1) { d *= 2; if (d > 9) d -= 9; }
    sum += d;
  }
  return sum % 10 === 0;
};

/**
 * @returns {{ ok: true, imei: string } | { ok: false, message: string }}
 */
export const extractImei = (raw) => {
  const text = String(raw ?? '').trim();
  if (!text) return { ok: false, message: IMEI_INVALID_MESSAGE };

  // 1) Ciągi DOKŁADNIE 15 cyfr (16+ cyfr nie jest przycinane – to nie IMEI)
  const candidates = new Set(text.match(/(?<!\d)\d{15}(?!\d)/g) || []);

  // 2) Etykiety drukują IMEI z odstępami, np. "35 209900 176148 1" –
  //    sklejamy tylko wtedy, gdy kod składa się wyłącznie z cyfr i spacji/myślników
  if (candidates.size === 0 && /^[\d\s-]+$/.test(text)) {
    const joined = text.replace(/[\s-]/g, '');
    if (joined.length === 15) candidates.add(joined);
  }

  const valid = [...candidates].filter(isValidImei);
  if (valid.length === 1) return { ok: true, imei: valid[0] };
  if (valid.length > 1) return { ok: false, message: IMEI_AMBIGUOUS_MESSAGE };
  return { ok: false, message: IMEI_INVALID_MESSAGE };
};

// Format linku generowanego w potwierdzeniu przyjęcia (printConfirmation.js
// i firestoreDb.js): https://gsm-serwis-klient.web.app/?token=<trackingToken>
const TRACKING_HOSTS = ['gsm-serwis-klient.web.app'];
const TRACKING_TOKEN_RE = /^[a-z0-9]{4,16}-[a-z0-9]{4,16}$/; // np. "m1abc2d3-k9x8y7z6w5v4"

/** @returns {{ token: string } | null} */
export const parseRepairQr = (raw) => {
  const text = String(raw ?? '').trim();
  let url;
  try {
    url = new URL(text);
  } catch {
    return null; // nie URL (zwykły tekst) – to nie nasz QR
  }
  if (url.protocol !== 'https:') return null;              // np. javascript:, http:, intent:
  if (!TRACKING_HOSTS.includes(url.hostname)) return null; // obca domena
  if (url.pathname !== '/' && url.pathname !== '') return null;
  const token = url.searchParams.get('token') || '';
  return TRACKING_TOKEN_RE.test(token) ? { token } : null;
};
