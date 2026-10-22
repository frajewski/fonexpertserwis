// ============================================================
//  printConsignmentOutProtocol.js – protokół przekazania telefonów
//  do komisu zewnętrznego (moje telefony u komisanta).
//
//  ⚠️ SZKIC – przed użyciem skonsultuj treść z osobą uprawnioną.
// ============================================================

import { blockPrintInNativeApp } from './platform';

const OWNER = {
  name: 'Fonexpert Filip Rajewski',
  address: 'Bogusławice 29A, 09-100 Płońsk',
  nip: '5671935602',
  phone: '739 696 665',
};

const esc = (v) => String(v ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const fmtDate = (iso) => (iso ? new Date(iso) : new Date()).toLocaleDateString('pl-PL');

export function printConsignmentOutProtocol(partnerName, partnerPhone, phones) {
  if (blockPrintInNativeApp()) return;

  const rows = phones.map((p, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>${esc(p.brand)} ${esc(p.model)} ${esc(p.storage)} ${esc(p.color)}</td>
      <td class="mono">${esc(p.imei || '—')}</td>
      <td class="right">${Number(p.consignPrice || 0)} zł</td>
    </tr>`).join('');
  const total = phones.reduce((s, p) => s + Number(p.consignPrice || 0), 0);

  const html = `
    <html><head><meta charset="utf-8" />
      <title>Protokół przekazania — ${esc(partnerName)}</title>
      <style>
        body { font-family: -apple-system, Helvetica, Arial, sans-serif; padding: 18px; color: #111; font-size: 11.5px; line-height: 1.4; }
        h1 { font-size: 15px; text-align: center; margin: 0 0 2px; }
        .place { text-align: center; font-size: 10.5px; color: #555; margin-bottom: 14px; }
        .parties { display: flex; gap: 16px; margin-bottom: 14px; }
        .party { flex: 1; border: 1px solid #ccc; border-radius: 5px; padding: 8px 10px; }
        .party h3 { font-size: 10px; text-transform: uppercase; margin: 0 0 4px; color: #555; }
        .party p { margin: 1px 0; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
        th, td { border: 1px solid #ccc; padding: 4px 8px; font-size: 10.5px; text-align: left; }
        th { background: #f7f7f7; }
        .mono { font-family: monospace; }
        .right { text-align: right; }
        .total { text-align: right; font-weight: 700; font-size: 12.5px; margin-bottom: 10px; }
        ol { padding-left: 16px; margin: 4px 0; }
        ol li { margin-bottom: 3px; }
        .signRow { display: flex; justify-content: space-around; margin-top: 56px; }
        .sign { text-align: center; width: 40%; }
        .signLine { border-top: 1px solid #333; margin-bottom: 4px; }
        @media print { @page { margin: 12mm; size: A4; } }
      </style></head>
    <body>
      <h1>PROTOKÓŁ PRZEKAZANIA TELEFONÓW DO KOMISU</h1>
      <p class="place">sporządzony w Płońsku, dnia ${fmtDate()}</p>

      <div class="parties">
        <div class="party">
          <h3>Przekazujący (właściciel towaru)</h3>
          <p><strong>${OWNER.name}</strong></p>
          <p>${OWNER.address}</p>
          <p>NIP: ${OWNER.nip}</p>
          <p>Tel.: ${OWNER.phone}</p>
        </div>
        <div class="party">
          <h3>Komisant (przyjmujący)</h3>
          <p><strong>${esc(partnerName)}</strong></p>
          <p>Tel.: ${esc(partnerPhone || '—')}</p>
        </div>
      </div>

      <table>
        <thead><tr><th>Lp.</th><th>Urządzenie</th><th>IMEI / S/N</th><th class="right">Kwota dla przekazującego</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <p class="total">Razem do zapłaty dla przekazującego: ${total} zł</p>

      <ol>
        <li>Telefony pozostają własnością Przekazującego do chwili zapłaty uzgodnionej kwoty.</li>
        <li>Komisant sprzedaje telefony we własnym imieniu i na własny rachunek; ewentualna nadwyżka ponad uzgodnioną kwotę przysługuje Komisantowi.</li>
        <li>Po sprzedaży Komisant niezwłocznie przekazuje Przekazującemu uzgodnioną kwotę za dany telefon.</li>
        <li>Niesprzedane telefony Komisant zwraca na pierwsze żądanie, w stanie niepogorszonym.</li>
        <li>Komisant odpowiada za utratę lub uszkodzenie telefonów od chwili przyjęcia do zwrotu lub zapłaty.</li>
      </ol>

      <div class="signRow">
        <div class="sign"><div class="signLine"></div><p>Przekazujący</p></div>
        <div class="sign"><div class="signLine"></div><p>Komisant</p></div>
      </div>
    </body></html>`;

  const w = window.open('', '_blank', 'width=800,height=1000');
  if (!w) {
    alert('Przeglądarka zablokowała okno wydruku. Zezwól na wyskakujące okna dla tej strony.');
    return;
  }
  w.document.write(html);
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 250);
}
