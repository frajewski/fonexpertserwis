// ============================================================
//  printPickupConfirmation.js – potwierdzenie WYDANIA urządzenia po
//  naprawie, ze skróconym regulaminem gwarancji i okresem jej obowiązywania.
//
//  Osobne od printConfirmation.js (to jest potwierdzenie PRZYJĘCIA) –
//  część klientów prosi o dokument w momencie odbioru, nie przyjęcia.
//
//  ⚠️ Skrócony regulamin gwarancji poniżej to SZKIC, nie treść
//  zweryfikowaną przez prawnika. Przed użyciem z klientami skonsultuj
//  warunki gwarancji/rękojmi z osobą uprawnioną.
// ============================================================

const fmtDate = (iso) => iso ? new Date(iso).toLocaleDateString('pl-PL') : new Date().toLocaleDateString('pl-PL');

export function printPickupConfirmation(repair, customer, shopSettings) {
  const html = `
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Potwierdzenie wydania #${repair.displayNumber || repair.id}</title>
        <style>
          body { font-family: -apple-system, Helvetica, Arial, sans-serif; padding: 24px; color: #111; font-size: 12px; line-height: 1.45; }
          .shopName { font-size: 16px; font-weight: 800; text-align: center; margin: 0; }
          .shopSub { font-size: 11px; color: #555; text-align: center; margin: 2px 0; }
          .divider { border-top: 1px solid #ccc; margin: 12px 0; }
          .title { font-size: 14px; font-weight: 700; text-align: center; margin: 4px 0; }
          .repairId { font-size: 18px; font-weight: 800; text-align: center; margin: 6px 0; }
          .row { font-size: 12px; margin-bottom: 3px; }
          .rowLabel { color: #555; }
          .rowValue { color: #111; font-weight: 600; }
          .warrantyBox {
            border: 2px solid #1DB954; border-radius: 6px; padding: 10px 14px;
            margin: 14px 0; text-align: center; background: #f2fbf5;
          }
          .warrantyBox .big { font-size: 16px; font-weight: 800; color: #1DB954; }
          .terms { font-size: 10.5px; color: #333; margin-top: 12px; }
          .terms h3 { font-size: 11.5px; margin: 0 0 6px; }
          .terms ol { padding-left: 16px; margin: 0; }
          .terms li { margin-bottom: 4px; }
          .signRow { display: flex; justify-content: space-around; margin-top: 32px; }
          .sign { text-align: center; width: 40%; }
          .signLine { border-top: 1px solid #999; margin-bottom: 6px; }
          .signLabel { font-size: 10.5px; color: #777; }
          @media print { @page { margin: 16mm; } }
        </style>
      </head>
      <body>
        <p class="shopName">${shopSettings.shopName}</p>
        <p class="shopSub">${shopSettings.shopAddress}</p>
        <p class="shopSub">${shopSettings.shopPhone}</p>
        <div class="divider"></div>

        <p class="title">POTWIERDZENIE WYDANIA URZĄDZENIA PO NAPRAWIE</p>
        <p class="repairId">#${repair.displayNumber || repair.id}</p>

        <div class="row"><span class="rowLabel">Klient:</span> <span class="rowValue">${customer?.name || '—'}</span></div>
        <div class="row"><span class="rowLabel">Urządzenie:</span> <span class="rowValue">${repair.brand || ''} ${repair.model || ''}</span></div>
        ${repair.imei ? `<div class="row"><span class="rowLabel">IMEI:</span> <span class="rowValue">${repair.imei}</span></div>` : ''}
        ${repair.workDescription ? `<div class="row"><span class="rowLabel">Wykonana usługa:</span> <span class="rowValue">${repair.workDescription}</span></div>` : ''}
        <div class="row"><span class="rowLabel">Data wydania:</span> <span class="rowValue">${fmtDate(repair.issuedAt)}</span></div>

        ${repair.warrantyMonths > 0 ? `
          <div class="warrantyBox">
            <div class="big">🛡️ Gwarancja: ${repair.warrantyMonths} mies.</div>
            <div>Obowiązuje do: <strong>${fmtDate(repair.warrantyEndDate)}</strong></div>
          </div>
        ` : `
          <div class="warrantyBox" style="border-color:#999; background:#f5f5f5;">
            <div style="color:#666; font-weight:700;">Bez gwarancji serwisowej</div>
          </div>
        `}

        <div class="terms">
          <h3>Skrócone warunki gwarancji</h3>
          <ol>
            <li>Gwarancja obejmuje wyłącznie wykonaną usługę oraz wymienione podzespoły, w zakresie i przez okres wskazany powyżej.</li>
            <li>Gwarancja nie obejmuje: uszkodzeń mechanicznych, zalania, ingerencji osób trzecich w urządzenie po jego wydaniu, oraz usterek niezwiązanych z zakresem wykonanej naprawy.</li>
            <li>Warunkiem skorzystania z gwarancji jest okazanie niniejszego potwierdzenia wraz z dokumentem zakupu (paragon lub faktura). W przypadku faktury przesłanej do KSeF okazanie papierowej kopii nie jest wymagane.</li>
            <li>Pełny regulamin serwisu dostępny jest w punkcie serwisowym.</li>
          </ol>
        </div>

        <div class="signRow">
          <div class="sign"><div class="signLine"></div><p class="signLabel">Podpis klienta (odbiór)</p></div>
          <div class="sign"><div class="signLine"></div><p class="signLabel">Podpis serwisanta</p></div>
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
