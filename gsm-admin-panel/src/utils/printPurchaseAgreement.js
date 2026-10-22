// ============================================================
//  printPurchaseAgreement.js – umowa sprzedaży urządzenia (skup)
//
//  Układ: jedna kartka A4. Dane i znaczniki (checkboxy) pochodzą z karty
//  „Dane do umowy” w szczegółach telefonu (phone.contract + dane sprzedającego);
//  niezaznaczone pola drukują się puste, więc można je też uzupełnić długopisem.
//
//  ⚠️ To jest SZKIC dokumentu prawnego (na bazie projektu przygotowanego
//  z pomocą AI), nie wzór zweryfikowany przez prawnika. Przed użyciem
//  z klientami skonsultuj treść z osobą uprawnioną — zwłaszcza oświadczenia
//  o własności, rękojmię, klauzulę RODO i odstąpienie od umowy.
//
//  Dane Kupującego (Twojej firmy) są zahardkodowane – to Twoje stałe
//  dane rejestrowe, nie zmieniają się między transakcjami.
// ============================================================

import { blockPrintInNativeApp } from './platform';
import { signatureBlockHtml } from '../signature/signatureData';

const BUYER = {
  name: 'Fonexpert Filip Rajewski',
  address: 'Bogusławice 29A, 09-100 Płońsk',
  nip: '5671935602',
  regon: '542082892',
  phone: '739 696 665',
};

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmtDate = (iso) => (iso ? new Date(iso) : new Date()).toLocaleDateString('pl-PL');

// ---- kwota słownie (do 999 999,99 zł) ----
const ONES = ['', 'jeden', 'dwa', 'trzy', 'cztery', 'pięć', 'sześć', 'siedem', 'osiem', 'dziewięć'];
const TEENS = ['dziesięć', 'jedenaście', 'dwanaście', 'trzynaście', 'czternaście', 'piętnaście', 'szesnaście', 'siedemnaście', 'osiemnaście', 'dziewiętnaście'];
const TENS = ['', '', 'dwadzieścia', 'trzydzieści', 'czterdzieści', 'pięćdziesiąt', 'sześćdziesiąt', 'siedemdziesiąt', 'osiemdziesiąt', 'dziewięćdziesiąt'];
const HUNDREDS = ['', 'sto', 'dwieście', 'trzysta', 'czterysta', 'pięćset', 'sześćset', 'siedemset', 'osiemset', 'dziewięćset'];

const below1000 = (n) => {
  const h = Math.floor(n / 100);
  const t = Math.floor((n % 100) / 10);
  const o = n % 10;
  const parts = [HUNDREDS[h]];
  if (t === 1) parts.push(TEENS[o]);
  else parts.push(TENS[t], ONES[o]);
  return parts.filter(Boolean).join(' ');
};

const plural = (n, one, few, many) => {
  if (n === 1) return one;
  const last = n % 10;
  const lastTwo = n % 100;
  return last >= 2 && last <= 4 && !(lastTwo >= 12 && lastTwo <= 14) ? few : many;
};

export function amountInWords(value) {
  const num = Math.round((Number(value) || 0) * 100) / 100;
  const zl = Math.floor(num);
  const gr = Math.round((num - zl) * 100);
  if (zl > 999999) return '';
  let words;
  if (zl === 0) words = 'zero';
  else {
    const thousands = Math.floor(zl / 1000);
    const rest = zl % 1000;
    const tWords = thousands === 0 ? '' : thousands === 1 ? 'tysiąc' : `${below1000(thousands)} ${plural(thousands, 'tysiąc', 'tysiące', 'tysięcy')}`;
    words = [tWords, rest ? below1000(rest) : ''].filter(Boolean).join(' ');
  }
  return `${words} ${plural(zl, 'złoty', 'złote', 'złotych')}${gr ? ` ${String(gr).padStart(2, '0')}/100` : ''}`;
}

// ---- elementy HTML ----
const cb = (on) => `<span class="cb">${on ? '✓' : ''}</span>`;
const opt = (on, label) => `<span class="opt">${cb(on)} ${esc(label)}</span>`;
const val = (v, minWidth = 60) => (v ? `<b>${esc(v)}</b>` : `<span class="dots" style="min-width:${minWidth}px"></span>`);
const has = (arr, item) => Array.isArray(arr) && arr.includes(item);

export function buildPurchaseAgreementHtml(phone) {
  const c = phone.contract || {};
  const price = Number(phone.buyPrice) || 0;
  const contractNo = c.number || `SKUP/${new Date(phone.boughtAt || Date.now()).getFullYear()}/${String(phone.id || '').slice(0, 5).toUpperCase()}`;
  const device = c.deviceType || 'telefon komórkowy';
  const known = ['telefon komórkowy', 'tablet', 'smartwatch'];

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>Umowa sprzedaży — ${esc(phone.brand)} ${esc(phone.model)}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: -apple-system, Helvetica, Arial, sans-serif; margin: 0; padding: 9px 12px; color: #111; font-size: 9.2px; line-height: 1.25; }
  h1 { font-size: 14px; text-align: center; margin: 0; letter-spacing: .02em; }
  .sub { text-align: center; font-size: 9.2px; color: #444; margin: 1px 0 5px; }
  .parties { display: flex; gap: 8px; margin-bottom: 4px; }
  .party { flex: 1; border: 1px solid #999; border-radius: 3px; padding: 3px 6px; }
  .party h3 { font-size: 8.4px; text-transform: uppercase; margin: 0 0 2px; color: #444; letter-spacing: .04em; }
  .party p { margin: 1.5px 0; }
  .row { margin: 2px 0; }
  .dots { display: inline-block; border-bottom: 1px dotted #555; height: 9px; vertical-align: bottom; }
  .cb { display: inline-block; width: 8.5px; height: 8.5px; border: 1px solid #111; text-align: center; font-size: 8px; line-height: 7.5px; vertical-align: -1px; font-weight: 700; }
  .opt { display: inline-block; margin-right: 7px; white-space: nowrap; }
  h2 { font-size: 9.4px; margin: 4px 0 2px; text-transform: uppercase; letter-spacing: .03em; background: #eee; padding: 1px 4px; }
  .box { border: 1px solid #999; border-radius: 3px; padding: 3px 6px; margin-bottom: 3px; }
  .grid2 { display: grid; grid-template-columns: 1fr 1fr; column-gap: 12px; }
  .cols { column-count: 2; column-gap: 12px; }
  .cols h2 { break-after: avoid; }
  .cols p { margin: 1.5px 0; text-align: justify; }
  .clause { break-inside: avoid; }
  .price { font-size: 11.5px; font-weight: 700; }
  .signRow { display: flex; justify-content: space-around; margin-top: 14px; }
  .sign { text-align: center; width: 40%; }
  .signLine { border-top: 1px solid #333; margin-bottom: 2px; height: 14px; }
  .sign p { margin: 0; font-size: 8.6px; }
  @media print { @page { margin: 7mm; size: A4; } }
</style>
</head>
<body>
  <h1>UMOWA SPRZEDAŻY URZĄDZENIA MOBILNEGO</h1>
  <p class="sub">Nr umowy: <b>${esc(contractNo)}</b> · zawarta w Płońsku dnia <b>${fmtDate(phone.boughtAt)}</b></p>

  <div class="parties">
    <div class="party">
      <h3>Sprzedawca</h3>
      <p>Imię i nazwisko: ${val(phone.sellerFullName, 140)}</p>
      <p>PESEL: ${val(phone.sellerPesel, 80)} &nbsp; Dowód (seria i nr): ${val(phone.sellerIdNumber, 70)}</p>
      <p>Organ wydający dokument: ${val(phone.sellerIdIssuer, 100)}</p>
      <p>Adres zamieszkania: ${val(phone.sellerAddress, 150)}</p>
      <p>Tel.: ${val(phone.sellerPhone, 70)} &nbsp; E-mail: ${val(phone.sellerEmail, 80)}</p>
    </div>
    <div class="party">
      <h3>Kupujący</h3>
      <p><b>${esc(BUYER.name)}</b></p>
      <p>${esc(BUYER.address)}</p>
      <p>NIP: ${BUYER.nip} · REGON: ${BUYER.regon}</p>
      <p>Tel.: ${BUYER.phone}</p>
    </div>
  </div>
  <p class="row">Tożsamość Sprzedawcy zweryfikowano na podstawie okazanego oryginału dokumentu tożsamości. Sprzedawca oświadcza, że ukończył 18 lat, ma pełną zdolność do czynności prawnych, działa we własnym imieniu i sprzedaje jako osoba fizyczna poza prowadzoną działalnością gospodarczą lub zawodową.</p>

  <h2>§ 1. Przedmiot sprzedaży</h2>
  <div class="box">
    <div class="row">Rodzaj: ${known.map((k) => opt(device === k, k)).join('')}${opt(!known.includes(device), 'inne')}${!known.includes(device) ? `<b>${esc(device)}</b>` : ''}</div>
    <div class="grid2">
      <div class="row">Producent / model: ${val(`${phone.brand || ''} ${phone.model || ''}`.trim(), 90)}</div>
      <div class="row">Kolor: ${val(phone.color, 50)} &nbsp; Pamięć: ${val(phone.storage, 40)} &nbsp; Stan (grade): ${val(phone.grade, 20)}</div>
      <div class="row">IMEI 1: ${val(phone.imei, 105)}</div>
      <div class="row">IMEI 2: ${val(c.imei2, 90)} &nbsp; Nr seryjny: ${val(c.serial, 70)}</div>
    </div>
    <div class="row">W komplecie: ${opt(has(c.accessories, 'pudełko'), 'pudełko')}${opt(has(c.accessories, 'dowód zakupu'), 'dowód zakupu')}${opt(has(c.accessories, 'ładowarka'), 'ładowarka')}${opt(has(c.accessories, 'przewód'), 'przewód')}${opt(has(c.accessories, 'etui'), 'etui')}inne: ${val(c.accessoriesOther, 90)}</div>
    <div class="row">Stan w chwili zawarcia umowy: ${['sprawne', 'częściowo sprawne', 'uszkodzone'].map((s) => opt(c.condition === s, s)).join('')} &nbsp; Bateria: ${val(c.battery ? `${c.battery}%` : '', 28)}</div>
    <div class="row">Znane uszkodzenia, wady, braki, ślady użytkowania: ${val(c.defects, 360)}</div>
    <div class="row">Znane wcześniejsze naprawy / wymiany części: ${val(c.repairs, 310)}</div>
    <div class="row">Blokady: Activation Lock / Find My: ${opt(c.appleLock === 'wyłączone', 'wyłączone')}${opt(c.appleLock === 'nie dotyczy', 'nie dotyczy')} &nbsp;|&nbsp; Google FRP: ${opt(c.frp === 'wyłączone', 'wyłączone')}${opt(c.frp === 'nie dotyczy', 'nie dotyczy')}</div>
    <div class="row">SIM-lock: ${opt(c.simLock === 'brak', 'brak')}${opt(c.simLock === 'występuje', 'występuje')}${opt(c.simLock === 'nie sprawdzono', 'nie sprawdzono')} &nbsp;|&nbsp; Inne blokady: ${opt(c.otherLock === 'brak', 'brak')}${opt(c.otherLock === 'występują', 'występują')} ${val(c.otherLockNote, 70)}</div>
    <div class="row">Kupujący sprawdził numer IMEI w bazie urządzeń utraconych/zablokowanych: ${opt(!!c.imeiChecked, 'tak')} dnia ${val(c.imeiChecked ? fmtDate(c.imeiCheckedAt) : '', 60)}</div>
    <div class="row">Sprzedawca oświadcza, że poinformował Kupującego o wszystkich znanych mu wadach, uszkodzeniach i nieprawidłowościach urządzenia.</div>
  </div>

  <div class="cols">
    <h2>§ 2. Oświadczenia Sprzedawcy o własności i pochodzeniu</h2>
    <p class="clause">1. Sprzedawca oświadcza, że: a) jest wyłącznym właścicielem urządzenia i może nim swobodnie rozporządzać; b) urządzenie nie pochodzi z kradzieży, przywłaszczenia, oszustwa ani innego czynu zabronionego i nie zostało zgłoszone jako utracone, zgubione, skradzione lub przywłaszczone; c) nie jest ono własnością operatora, leasingodawcy, instytucji finansowej ani innej osoby trzeciej; d) nie jest przedmiotem zastawu, przewłaszczenia na zabezpieczenie, leasingu, najmu, zajęcia komorniczego ani innego prawa lub ograniczenia na rzecz osoby trzeciej; e) nie jest przedmiotem szkody zgłoszonej ubezpieczycielowi, z tytułu której ubezpieczyciel lub inny podmiot nabył lub może dochodzić praw do urządzenia; f) nie jest obciążone niespłaconymi ratami ani innymi zobowiązaniami, które mogłyby skutkować jego zablokowaniem lub odebraniem; g) jego IMEI nie znajduje się — według wiedzy Sprzedawcy — na liście urządzeń zablokowanych; h) po sprzedaży nie zgłosi urządzenia jako utraconego ani nie podejmie działań prowadzących do jego zablokowania.</p>
    <p class="clause">2. Powyższe oświadczenia są zgodne ze stanem faktycznym i prawnym na dzień zawarcia umowy oraz mają istotne znaczenie dla decyzji Kupującego i ustalonej ceny.</p>

    <h2>§ 3. Konta, blokady i dane użytkownika</h2>
    <p class="clause">1. Sprzedawca oświadcza, że przed wydaniem urządzenia wylogował (lub umożliwił Kupującemu wylogowanie) swoje konta użytkownika (Apple ID/iCloud, Google, Samsung Account i in.), wyłączył funkcje „Znajdź”, Activation Lock i FRP, usunął kod blokady ekranu albo przekazał dane niezbędne do odblokowania, oraz wyjął kartę SIM, kartę pamięci i inne nośniki niebędące przedmiotem sprzedaży.</p>
    <p class="clause">2. Sprzedawca miał możliwość wykonania kopii danych, które chciał zachować, i upoważnia Kupującego do trwałego usunięcia danych, przywrócenia ustawień fabrycznych, aktualizacji i ponownej instalacji oprogramowania. Kupujący nie odpowiada za dane pozostawione w urządzeniu.</p>

    <h2>§ 4. Cena i zapłata</h2>
    <p class="clause">1. Cena sprzedaży urządzenia: <span class="price">${price ? `${price} zł` : '................ zł'}</span>, słownie: <b>${price ? esc(amountInWords(price)) : '........................................'}</b>.</p>
    <p class="clause">2. Zapłata: ${opt(c.payment === 'gotówka', 'gotówką')}${opt(c.payment === 'przelew', 'przelewem')}${opt(c.payment === 'inne', 'inaczej')}${c.payment === 'inne' ? `<b>${esc(c.paymentOther)}</b>` : ''}. W razie zapłaty gotówką podpis Sprzedawcy jest potwierdzeniem otrzymania całej ceny. W razie przelewu za dzień zapłaty uważa się dzień uznania rachunku Sprzedawcy.</p>

    <h2>§ 5. Wydanie i własność</h2>
    <p class="clause">Urządzenie wraz z wyposażeniem z § 1 zostaje wydane Kupującemu w dniu podpisania umowy. Własność przechodzi na Kupującego z chwilą wydania urządzenia i zapłaty ceny. Kupujący może następnie swobodnie nim rozporządzać, w tym je sprzedać, naprawić, zregenerować lub wymienić części.</p>

    <h2>§ 6. Stan techniczny i odpowiedzialność</h2>
    <p class="clause">1. Kupujący miał możliwość oględzin i podstawowej diagnostyki przed zakupem. Nie oznacza to zrzeczenia się praw z tytułu wad ukrytych, wad prawnych, wad, o których Sprzedawca wiedział i nie poinformował, ani niezgodności z oświadczeniami Sprzedawcy z niniejszej umowy.</p>
    <p class="clause">2. Sprzedawca odpowiada za wady urządzenia na zasadach Kodeksu cywilnego; strony nie wyłączają ani nie ograniczają jego odpowiedzialności z tytułu rękojmi. Sprzedawca nie odpowiada za wady, o których Kupujący wiedział w chwili zawarcia umowy, w szczególności opisane w § 1.</p>

    <h2>§ 7. Nieprawdziwe oświadczenia, blokada IMEI, prawa osób trzecich</h2>
    <p class="clause">1. Jeżeli okaże się, że oświadczenie Sprzedawcy było nieprawdziwe, w szczególności gdy osoba trzecia zgłosi prawa do urządzenia, zostanie ono zablokowane z przyczyn istniejących przed zawarciem umowy (przez operatora, producenta, bank, ubezpieczyciela lub inny podmiot), okaże się utracone, skradzione lub należące do osoby trzeciej, ujawnią się raty, leasing, zastaw lub inne obciążenie albo inne okoliczności uniemożliwiające zgodne z prawem korzystanie z urządzenia lub jego dalszą sprzedaż — Kupującemu przysługują uprawnienia z przepisów prawa, w tym (gdy zachodzą przesłanki ustawowe) odstąpienie od umowy, zwrot ceny i naprawienie szkody.</p>
    <p class="clause">2. W razie skutecznego odstąpienia Sprzedawca zwraca otrzymaną cenę w terminie 7 dni od otrzymania oświadczenia o odstąpieniu. Zatrzymanie urządzenia lub wydanie go właścicielowi, Policji, prokuraturze, sądowi lub innemu uprawnionemu organowi nie wyłącza obowiązku zwrotu ceny.</p>

    <h2>§ 8. Dane osobowe</h2>
    <p class="clause">1. Administratorem danych Sprzedawcy jest ${esc(BUYER.name)}, ${esc(BUYER.address)}, NIP ${BUYER.nip}, tel. ${BUYER.phone}. 2. Dane (w tym PESEL i dane z dokumentu tożsamości) przetwarzamy w celu zawarcia i wykonania umowy (art. 6 ust. 1 lit. b RODO), identyfikacji strony i realizacji obowiązków prawnych, w tym podatkowych i rachunkowych (lit. c), oraz ustalenia, dochodzenia lub obrony roszczeń i zabezpieczenia transakcji (lit. f). 3. Dane przechowujemy przez okres wymagany przepisami (w tym 5 lat od końca roku podatkowego) i do czasu przedawnienia roszczeń z umowy; odbiorcami mogą być biuro rachunkowe i uprawnione organy. 4. Przysługuje prawo dostępu do danych, sprostowania, ograniczenia przetwarzania, usunięcia (w przypadkach przewidzianych prawem), sprzeciwu oraz skargi do Prezesa UODO. 5. Podanie danych jest dobrowolne, ale niezbędne do zawarcia umowy.</p>

    <h2>§ 9. Postanowienia końcowe</h2>
    <p class="clause">W sprawach nieuregulowanych stosuje się przepisy prawa polskiego, w szczególności Kodeksu cywilnego. Nieważność lub bezskuteczność któregokolwiek postanowienia nie wpływa na ważność pozostałych. Umowę sporządzono w dwóch jednobrzmiących egzemplarzach, po jednym dla każdej ze stron. Sprzedawca oświadcza, że przeczytał umowę, rozumie jej treść, potwierdza prawdziwość danych i oświadczeń oraz otrzymał jeden egzemplarz.</p>
  </div>

  <div class="signRow">
    ${signatureBlockHtml(phone.signatures?.seller, 'SPRZEDAWCA (czytelny podpis)', '')}
    <div class="sign"><div class="signLine"></div><p>KUPUJĄCY — ${esc(BUYER.name)}</p></div>
  </div>
</body>
</html>`;
}

export function printPurchaseAgreement(phone) {
  if (blockPrintInNativeApp()) return;
  const html = buildPurchaseAgreementHtml(phone);
  const printWindow = window.open('', '_blank', 'width=800,height=1000');
  if (!printWindow) {
    alert('Przeglądarka zablokowała otwarcie okna wydruku. Zezwól na wyskakujące okna dla tej strony.');
    return;
  }
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => printWindow.print(), 250);
}
