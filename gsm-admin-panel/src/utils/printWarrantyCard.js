// ============================================================
//  printWarrantyCard.js – karta gwarancyjna do sprzedanego telefonu
//  (skup/sprzedaż), do wydruku i dołączenia do paragonu/faktury.
//
//  ⚠️ SZKIC, nie treść zweryfikowana przez prawnika. Warunki gwarancji
//  oparte na typowej praktyce rynkowej (refurbed.pl, Luxtrade i inni) -
//  przed użyciem z klientami skonsultuj z osobą uprawnioną, zwłaszcza
//  w zestawieniu z ustawowymi prawami konsumenta z tytułu rękojmi,
//  które obowiązują NIEZALEŻNIE od tej karty.
// ============================================================

import { blockPrintInNativeApp } from './platform';

const SHOP = {
  name: 'Fonexpert Filip Rajewski',
  address: 'Bogusławice 29A, 09-100 Płońsk',
  nip: '5671935602',
  phone: '739 696 665',
};

const fmtDate = (iso) => iso ? new Date(iso).toLocaleDateString('pl-PL') : '—';

export function printWarrantyCard(phone) {
  if (blockPrintInNativeApp()) return;
  const html = `
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Karta gwarancyjna — ${phone.brand} ${phone.model}</title>
        <style>
          body { font-family: -apple-system, Helvetica, Arial, sans-serif; padding: 24px; color: #111; font-size: 12px; line-height: 1.45; }
          .shopName { font-size: 16px; font-weight: 800; text-align: center; margin: 0; }
          .shopSub { font-size: 11px; color: #555; text-align: center; margin: 2px 0; }
          .divider { border-top: 1px solid #ccc; margin: 12px 0; }
          .title { font-size: 15px; font-weight: 700; text-align: center; margin: 4px 0 16px; letter-spacing: 0.3px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 14px; }
          td { border: 1px solid #ccc; padding: 6px 10px; font-size: 12px; }
          td:first-child { font-weight: 600; width: 38%; background: #f7f7f7; }
          .warrantyBox {
            border: 2px solid #1DB954; border-radius: 6px; padding: 10px 14px;
            margin: 14px 0; text-align: center; background: #f2fbf5;
          }
          .warrantyBox .big { font-size: 16px; font-weight: 800; color: #1DB954; }
          .terms h3 { font-size: 12px; margin: 14px 0 6px; }
          .terms ul { padding-left: 16px; margin: 0 0 6px; }
          .terms li { margin-bottom: 3px; }
          .terms p { margin: 4px 0; }
          .fine { font-size: 9.5px; color: #666; margin-top: 10px; }
          .signRow { display: flex; justify-content: space-around; margin-top: 28px; }
          .sign { text-align: center; width: 40%; }
          .signLine { border-top: 1px solid #999; margin-bottom: 6px; }
          .signLabel { font-size: 10px; color: #777; }
          @media print { @page { margin: 16mm; } }
        </style>
      </head>
      <body>
        <p class="shopName">${SHOP.name}</p>
        <p class="shopSub">${SHOP.address} · NIP ${SHOP.nip} · tel. ${SHOP.phone}</p>
        <div class="divider"></div>
        <p class="title">KARTA GWARANCYJNA</p>

        <table>
          <tr><td>Marka i model</td><td>${phone.brand || ''} ${phone.model || ''}</td></tr>
          <tr><td>IMEI / nr seryjny</td><td>${phone.imei || '—'}</td></tr>
          <tr><td>Kolor / pamięć</td><td>${[phone.color, phone.storage].filter(Boolean).join(' / ') || '—'}</td></tr>
          <tr><td>Stan (grade)</td><td>${phone.grade || (phone.condition === 'new' ? 'Nowy' : '—')}</td></tr>
          <tr><td>Data sprzedaży</td><td>${fmtDate(phone.soldAt)}</td></tr>
          <tr><td>Cena</td><td>${phone.sellPrice || 0} zł</td></tr>
        </table>

        ${phone.warrantyMonths > 0 ? `
          <div class="warrantyBox">
            <div class="big">🛡️ Gwarancja: ${phone.warrantyMonths} mies.</div>
            <div>Obowiązuje do: <strong>${fmtDate(phone.warrantyEndDate)}</strong></div>
          </div>
        ` : `
          <div class="warrantyBox" style="border-color:#999; background:#f5f5f5;">
            <div style="color:#666; font-weight:700;">Urządzenie sprzedane bez gwarancji</div>
          </div>
        `}

        <div class="terms">
          <h3>Co obejmuje gwarancja</h3>
          <p>Gwarancja obejmuje wady fabryczne i materiałowe ujawniające się podczas normalnego użytkowania urządzenia, niezwiązane z uszkodzeniami mechanicznymi ani ingerencją osób trzecich.</p>

          <h3>Czego gwarancja NIE obejmuje</h3>
          <ul>
            <li>Uszkodzeń mechanicznych — pęknięcia, zarysowania, wgniecenia, uszkodzenia powstałe w wyniku upadku.</li>
            <li>Uszkodzeń powstałych w wyniku kontaktu z cieczą.</li>
            <li>Napraw, otwarcia lub modyfikacji urządzenia przez osoby spoza autoryzowanego serwisu.</li>
            <li>Naturalnego zużycia baterii (spadek pojemności wraz z czasem użytkowania).</li>
            <li>Śladów użytkowania zgodnych ze stanem (grade) wskazanym w tabeli powyżej, obecnych już w dniu sprzedaży.</li>
            <li>Usterek oprogramowania powstałych w wyniku działań użytkownika (np. nieautoryzowane oprogramowanie).</li>
          </ul>

          <h3>Warunki skorzystania z gwarancji</h3>
          <p>Warunkiem rozpatrzenia zgłoszenia gwarancyjnego jest okazanie niniejszej karty wraz z dowodem zakupu (paragon lub faktura). Zgłoszenia przyjmowane są w punkcie serwisowym lub telefonicznie pod numerem ${SHOP.phone}.</p>
        </div>

        <div class="signRow">
          <div class="sign"><div class="signLine"></div><p class="signLabel">Podpis sprzedawcy</p></div>
          <div class="sign"><div class="signLine"></div><p class="signLabel">Podpis kupującego</p></div>
        </div>
      </body>
    </html>
  `;

  const printWindow = window.open('', '_blank', 'width=720,height=900');
  if (!printWindow) {
    alert('Przeglądarka zablokowała otwarcie okna wydruku. Zezwól na wyskakujące okna dla tej strony.');
    return;
  }
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => printWindow.print(), 250);
}
