// ============================================================
//  printConfirmation.js – generowanie i drukowanie potwierdzenia
//  przyjęcia urządzenia z panelu webowego.
//
//  Szablon HTML jest LUSTRZANIE IDENTYCZNY z tym z apki mobilnej
//  (RepairConfirmScreen.jsx) – ta sama struktura, te same klasy CSS –
//  żeby wydrukowane potwierdzenie wyglądało tak samo niezależnie skąd
//  zostało wygenerowane (telefon serwisanta czy komputer).
//
//  Na webie nie ma expo-print – używamy natywnego window.print()
//  przeglądarki, otwieranego w nowym oknie z wygenerowanym HTML-em.
// ============================================================

const fmtDate = (iso) => iso ? new Date(iso).toLocaleDateString('pl-PL') : '—';

export function printRepairConfirmation(repair, customer, shopSettings) {
  const total = (repair.partsCost || 0) + (repair.serviceCost || 0);
  const trackingUrl = repair.trackingToken
    ? `https://gsm-serwis-klient.web.app/?token=${repair.trackingToken}`
    : null;
  const qrCodeUrl = trackingUrl
    ? `https://api.qrserver.com/v1/create-qr-code/?size=130x130&margin=0&data=${encodeURIComponent(trackingUrl)}`
    : null;

  const row = (label, value) =>
    value ? `<div class="row"><span class="rowLabel">${label}:</span> <span class="rowValue">${value}</span></div>` : '';

  const html = `
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Potwierdzenie #${repair.displayNumber || repair.id}</title>
        <style>
          body { font-family: -apple-system, Helvetica, Arial, sans-serif; padding: 24px; color: #111; }
          .shopName { font-size: 18px; font-weight: 800; text-align: center; margin: 0; }
          .shopSub { font-size: 15px; font-weight: 700; color: #111; text-align: center; margin: 3px 0; }
          .divider { border-top: 1px solid #ccc; margin: 14px 0; }
          .miniDivider { border-top: 1px solid #eee; margin: 8px 0; }
          .title { font-size: 15px; font-weight: 700; text-align: center; margin: 4px 0; }
          .repairId { font-size: 22px; font-weight: 900; color: #111; text-align: center; margin: 8px 0; letter-spacing: 0.5px; }
          .rowValuePhone { color: #111; font-size: 16px; font-weight: 800; }
          .docType { font-size: 13px; font-weight: 800; text-align: center; letter-spacing: 1px; margin: 8px 0 16px; }
          .twoCol { display: flex; gap: 24px; }
          .col { flex: 1; }
          .colTitle { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px; }
          .row { font-size: 13px; margin-bottom: 4px; }
          .rowLabel { color: #555; }
          .rowValue { color: #111; }
          .totalRow { display: flex; justify-content: space-between; margin-top: 6px; padding-top: 6px; border-top: 1px solid #ccc; }
          .totalLabel, .totalValue { font-size: 16px; font-weight: 800; }
          .signRow { display: flex; justify-content: space-around; margin-top: 32px; }
          .sign { text-align: center; width: 40%; }
          .signLine { border-top: 1px solid #999; margin-bottom: 6px; }
          .signLabel { font-size: 11px; color: #777; }
          .footerPhone {
            text-align: center;
            margin-top: 24px;
            padding: 12px;
            border: 2px solid #111;
            border-radius: 8px;
            font-size: 18px;
            font-weight: 900;
          }
          .headerRow { position: relative; }
          .qrBox { position: absolute; top: 0; right: 0; text-align: center; width: 100px; }
          .qrLabel { font-size: 9px; color: #555; margin-top: 2px; }
          @media print { @page { margin: 16mm; } }
        </style>
      </head>
      <body>
        <div class="headerRow">
          <p class="shopName">${shopSettings.shopName}</p>
          <p class="shopSub">${shopSettings.shopAddress}</p>
          <p class="shopSub">${shopSettings.shopPhone}</p>
          ${qrCodeUrl ? `<div class="qrBox"><img src="${qrCodeUrl}" width="80" height="80" /><p class="qrLabel">Zeskanuj, aby<br/>śledzić status</p></div>` : ''}
        </div>
        <div class="divider"></div>

        <p class="title">POTWIERDZENIE PRZYJĘCIA URZĄDZENIA</p>
        <p class="repairId">NR ZLECENIA: #${repair.displayNumber || repair.id}</p>
        ${repair.documentType ? `<p class="docType">${repair.documentType === 'Faktura' ? '📄 FAKTURA' : '🧾 PARAGON'}</p>` : ''}

        <div class="twoCol">
          <div class="col">
            <p class="colTitle">KLIENT</p>
            ${row('Imię i nazwisko', customer?.name)}
            ${customer?.phone ? `<div class="row"><span class="rowLabel">Telefon:</span> <span class="rowValuePhone">${customer.phone}</span></div>` : ''}
            ${row('NIP', repair.customerNip)}
            <div class="miniDivider"></div>
            ${row('Data przyjęcia', fmtDate(repair.createdAt))}
            ${row('Przyjął', shopSettings.shopName)}
          </div>
          <div class="col">
            <p class="colTitle">URZĄDZENIE</p>
            ${row('Marka / Model', `${repair.brand} ${repair.model}`)}
            ${row('IMEI / S/N', repair.imei || '—')}
            ${row('Opis usterki', repair.description)}
            ${row('Wzór blokady', repair.screenLock || '[ ________________ ]')}
          </div>
        </div>

        <div class="divider"></div>
        <p class="colTitle">KOSZTORYS</p>
        <div class="totalRow">
          <span class="totalLabel">ŁĄCZNIE:</span>
          <span class="totalValue">${total} zł</span>
        </div>

        <div class="divider"></div>
        <div class="signRow">
          <div class="sign"><div class="signLine"></div><p class="signLabel">Podpis klienta</p></div>
          <div class="sign"><div class="signLine"></div><p class="signLabel">Podpis serwisanta</p></div>
        </div>

        <div class="footerPhone">📞 Pytania? Zadzwoń: ${shopSettings.shopPhone}</div>
      </body>
    </html>
  `;

  // Otwiera nowe okno z dokumentem i wywołuje natywny dialog drukowania
  // przeglądarki – stamtąd użytkownik może wydrukować na drukarce albo
  // zapisać jako PDF (to standardowa opcja w dialogu drukowania każdej
  // przeglądarki), w zależności co akurat potrzebuje
  const printWindow = window.open('', '_blank', 'width=720,height=900');
  if (!printWindow) {
    alert('Przeglądarka zablokowała otwarcie okna drukowania. Zezwól na wyskakujące okna dla tej strony.');
    return;
  }
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();
  // Małe opóźnienie, żeby przeglądarka zdążyła w pełni wyrenderować dokument
  // przed otwarciem dialogu drukowania (inaczej czasem drukuje pustą stronę)
  setTimeout(() => printWindow.print(), 250);
}
