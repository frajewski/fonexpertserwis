// ============================================================
//  printDeviceLabel.js – drukowanie małej naklejki na sprzęt
//  (nie mylić z printConfirmation.js, które drukuje pełne potwierdzenie
//  dla klienta). Ta naklejka jest do przyklejenia na samo urządzenie na
//  półce/regale w serwisie – duży numer zlecenia + marka/model + data,
//  żeby dało się błyskawicznie rozpoznać które urządzenie to które,
//  szczególnie przy kilku podobnych modelach naraz.
// ============================================================

const fmtDateShort = (iso) => iso ? new Date(iso).toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit', year: '2-digit' }) : '—';

export function printDeviceLabel(repair) {
  const html = `
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Naklejka #${repair.displayNumber || repair.id}</title>
        <style>
          @page { size: 60mm 40mm; margin: 2mm; }
          body {
            font-family: -apple-system, Helvetica, Arial, sans-serif;
            width: 56mm;
            padding: 0;
            margin: 0;
            color: #000;
          }
          .label {
            border: 1.5px solid #000;
            border-radius: 2mm;
            padding: 3mm;
            box-sizing: border-box;
          }
          .number {
            font-size: 26px;
            font-weight: 900;
            text-align: center;
            letter-spacing: 1px;
            line-height: 1;
          }
          .divider { border-top: 1px dashed #999; margin: 2mm 0; }
          .device {
            font-size: 13px;
            font-weight: 700;
            text-align: center;
            word-break: break-word;
          }
          .imei {
            font-size: 9px;
            color: #444;
            text-align: center;
            margin-top: 1mm;
            font-family: monospace;
          }
          .date {
            font-size: 9px;
            color: #666;
            text-align: center;
            margin-top: 1mm;
          }
          @media print {
            body { -webkit-print-color-adjust: exact; }
          }
        </style>
      </head>
      <body>
        <div class="label">
          <div class="number">#${repair.displayNumber || repair.id}</div>
          <div class="divider"></div>
          <div class="device">${repair.brand || ''} ${repair.model || ''}</div>
          ${repair.color ? `<div class="device" style="font-weight:400;font-size:11px;">${repair.color}</div>` : ''}
          ${repair.imei ? `<div class="imei">IMEI: ${repair.imei}</div>` : ''}
          <div class="date">Przyjęto: ${fmtDateShort(repair.createdAt)}</div>
        </div>
        <script>
          window.onload = () => { window.print(); };
        </script>
      </body>
    </html>
  `;

  const printWindow = window.open('', '_blank', 'width=400,height=400');
  if (!printWindow) {
    alert('Przeglądarka zablokowała otwarcie okna wydruku. Zezwól na wyskakujące okna dla tej strony.');
    return;
  }
  printWindow.document.write(html);
  printWindow.document.close();
}
