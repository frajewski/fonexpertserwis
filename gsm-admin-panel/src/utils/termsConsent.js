// ============================================================
//  termsConsent.js – pola akceptacji regulaminu / warunków gwarancji
//  na wydrukach (zlecenie, potwierdzenie odbioru, karta gwarancyjna).
//
//  Zaakceptowane w aplikacji (np. przy podpisie na ekranie) → ☒ z datą.
//  Niezaakceptowane → pusty ☐ do odręcznego zaznaczenia przez klienta.
// ============================================================

import { TERMS } from '../constants/shopInfo';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export const consentCss = `
  .consent { display: flex; gap: 8px; align-items: flex-start; margin: 10px 0 0; font-size: 11.5px; line-height: 1.45; }
  .consentBox { flex-shrink: 0; width: 14px; height: 14px; border: 1.5px solid #111; border-radius: 2px; display: inline-flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 900; line-height: 1; margin-top: 1px; }
  .consentWhen { display: block; font-size: 9px; color: #888; margin-top: 2px; }
  .infoBox { border: 1px solid #ccc; border-radius: 6px; padding: 8px 12px; margin-top: 10px; font-size: 11px; line-height: 1.45; }
  .infoBox p { margin: 0 0 4px; font-weight: 700; font-size: 11.5px; }
  .infoBox ul { margin: 0; padding-left: 16px; }
  .infoBox li { margin-bottom: 2px; }
`;

// accepted = { at: ISO, version } albo null
export function consentLineHtml(text, accepted) {
  const when = accepted?.at
    ? new Date(accepted.at).toLocaleString('pl-PL', { dateStyle: 'short', timeStyle: 'short' })
    : '';
  return `<div class="consent"><span class="consentBox">${accepted ? '✕' : ''}</span>`
    + `<span>${text}${when ? `<span class="consentWhen">zaznaczono elektronicznie ${esc(when)}</span>` : ''}</span></div>`;
}

export const serviceTermsText = () =>
  `Oświadczam, że zapoznałem(-am) się z <b>Regulaminem serwisu fonexpert</b> (obowiązującym od ${TERMS.version}), `
  + `dostępnym w punkcie serwisowym oraz na stronie ${TERMS.url.replace(/^https?:\/\//, '')}, i akceptuję jego treść, `
  + `w tym informacje o przetwarzaniu danych osobowych (§10).`;

// §3 ust. 3 i §6 ust. 4–5 regulaminu: o tych opłatach klient ma być poinformowany przy przyjęciu
export const intakeInfoHtml = () => `
  <div class="infoBox">
    <p>Ważne informacje (pełna treść w Regulaminie serwisu)</p>
    <ul>
      <li>Wycena przy przyjęciu jest orientacyjna. Wyższy koszt naprawy wymaga Twojej akceptacji (§3).</li>
      <li>Diagnoza jest bezpłatna, jeśli zlecisz naprawę. Przy rezygnacji po diagnozie opłata wynosi ${TERMS.diagnosisFee} zł brutto (§3 ust. 3).</li>
      <li>Urządzenie odbierz w ciągu ${TERMS.storageDays} dni od powiadomienia. Później opłata za przechowanie: ${TERMS.storageFeePerDay} zł za każdy dzień zwłoki (§6).</li>
      <li>Zrób kopię zapasową danych. Serwis nie odpowiada za akcesoria niewpisane do zlecenia (§2, §5).</li>
    </ul>
  </div>`;

export const repairWarrantyTermsText = () =>
  `Odebrałem(-am) urządzenie, sprawdziłem(-am) jego działanie i stan wizualny oraz akceptuję warunki gwarancji `
  + `opisane powyżej i w §8 Regulaminu serwisu fonexpert (obowiązującego od ${TERMS.version}).`;

export const salesWarrantyTermsText = () =>
  'Kupujący oświadcza, że zapoznał się z warunkami gwarancji zawartymi w niniejszej karcie i je akceptuje. '
  + 'Gwarancja nie wyłącza, nie ogranicza ani nie zawiesza uprawnień kupującego wynikających z przepisów prawa.';

export const termsAcceptance = () => ({ version: TERMS.version, at: new Date().toISOString(), via: 'w-punkcie' });
