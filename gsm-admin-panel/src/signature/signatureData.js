// ============================================================
//  signatureData.js – podpis klienta jako WEKTOR (bez obrazów w bazie)
//
//  Podpis zapisujemy jako ścieżkę SVG (kilka KB tekstu), a nie jako PNG/Base64:
//  mało danych w Firestore, ostry wydruk w każdej skali, brak problemów
//  z CORS przy generowaniu PDF. Format w dokumencie:
//    { path: 'M10 20L12 21…', w: 320, h: 120, at: ISO, by: 'Imię pracownika' }
// ============================================================

const MIN_POINTS = 12;      // krótsze „podpisy” to raczej przypadkowe dotknięcie
const PAD = 6;              // margines wokół podpisu w viewBox

/**
 * strokes: [[{x,y}, …], …] w pikselach płótna → { path, w, h } albo null (pusty podpis)
 * Obcina puste marginesy i zaokrągla współrzędne (mniejszy zapis).
 */
export function strokesToSignature(strokes) {
  const pts = strokes.flat();
  if (pts.length < MIN_POINTS) return null;
  const minX = Math.min(...pts.map((p) => p.x));
  const minY = Math.min(...pts.map((p) => p.y));
  const maxX = Math.max(...pts.map((p) => p.x));
  const maxY = Math.max(...pts.map((p) => p.y));
  if (maxX - minX < 20 && maxY - minY < 20) return null; // kropka, nie podpis

  const r = (v) => Math.round(v);
  const path = strokes
    .filter((s) => s.length > 0)
    .map((s) => {
      const [first, ...rest] = s;
      const start = `M${r(first.x - minX + PAD)} ${r(first.y - minY + PAD)}`;
      // pojedynczy punkt = krótka kreska, żeby był widoczny
      if (rest.length === 0) return `${start}l1 0`;
      return start + rest.map((p) => `L${r(p.x - minX + PAD)} ${r(p.y - minY + PAD)}`).join('');
    })
    .join('');
  return { path, w: r(maxX - minX + PAD * 2), h: r(maxY - minY + PAD * 2) };
}

/** Pełny dokument SVG (czarny tusz) – do podglądu i dokumentów PDF. */
export function signatureSvg(sig, color = '#111') {
  if (!sig?.path) return '';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${sig.w} ${sig.h}" width="${sig.w}" height="${sig.h}">`
    + `<path d="${sig.path}" fill="none" stroke="${color}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
}

/** data: URL obrazka – działa w <img>, w oknie wydruku i w html2canvas (PDF). */
export function signatureDataUrl(sig) {
  const svg = signatureSvg(sig);
  return svg ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}` : '';
}

const escapeHtml = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/**
 * Fragment HTML pola podpisu w dokumentach do druku/PDF.
 * Z podpisem: obrazek nad linią + data. Bez podpisu: pusta linia jak dotąd.
 */
export function signatureBlockHtml(sig, label, labelClass = 'signLabel') {
  const lbl = labelClass ? `<p class="${labelClass}">${escapeHtml(label)}</p>` : `<p>${escapeHtml(label)}</p>`;
  if (!sig?.path) return `<div class="sign"><div class="signLine"></div>${lbl}</div>`;
  const when = sig.at ? new Date(sig.at).toLocaleString('pl-PL', { dateStyle: 'short', timeStyle: 'short' }) : '';
  // Obrazek „wisi” nad linią (absolutnie), więc linie podpisów w rzędzie
  // zostają na tej samej wysokości – z podpisem i bez
  return `<div class="sign">`
    + `<div style="position:relative;">`
    + `<img src="${signatureDataUrl(sig)}" alt="Podpis" style="position:absolute;left:0;right:0;bottom:3px;margin:0 auto;max-width:100%;height:46px;object-fit:contain;" />`
    + `<div class="signLine"></div></div>${lbl}`
    + (when ? `<p style="font-size:9px;color:#999;margin:2px 0 0;">podpisano elektronicznie ${escapeHtml(when)}</p>` : '')
    + `</div>`;
}

/** Dokleja metadane (kiedy, kto przyjął) do świeżo złożonego podpisu. */
export const stampSignature = (sig, staffName) => (sig ? { ...sig, at: new Date().toISOString(), by: staffName || '' } : null);
