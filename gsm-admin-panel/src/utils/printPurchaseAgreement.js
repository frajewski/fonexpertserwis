// ============================================================
//  printPurchaseAgreement.js – umowa kupna-sprzedaży telefonu (skup)
//
//  ⚠️ To jest SZKIC dokumentu prawnego, nie gotowy wzór zweryfikowany
//  przez prawnika. Przed faktycznym użyciem z klientami skonsultuj
//  treść z osobą uprawnioną — dotyczy to zwłaszcza oświadczeń
//  o własności i klauzul odpowiedzialności.
//
//  Dane Kupującego (Twojej firmy) są zahardkodowane – to Twoje stałe
//  dane rejestrowe, nie zmieniają się między transakcjami.
// ============================================================

const BUYER = {
  name: 'Fonexpert Filip Rajewski',
  address: 'Bogusławice 29A, 09-100 Płońsk',
  nip: '5671935602',
  regon: '542082892',
};

const fmtDate = (iso) => iso ? new Date(iso).toLocaleDateString('pl-PL') : new Date().toLocaleDateString('pl-PL');

export function printPurchaseAgreement(phone) {
  const html = `
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Umowa kupna-sprzedaży — ${phone.brand} ${phone.model}</title>
        <style>
          body { font-family: -apple-system, Helvetica, Arial, sans-serif; padding: 14px; color: #111; font-size: 11px; line-height: 1.35; }
          h1 { font-size: 15px; text-align: center; margin: 0 0 2px; }
          .place { text-align: center; font-size: 10.5px; color: #555; margin-bottom: 12px; }
          .parties { display: flex; gap: 16px; margin-bottom: 12px; }
          .party { flex: 1; border: 1px solid #ccc; border-radius: 5px; padding: 8px 10px; }
          .party h3 { font-size: 10px; text-transform: uppercase; margin: 0 0 4px; color: #555; }
          .party p { margin: 1px 0; }
          .section { margin-bottom: 10px; }
          .section h3 { font-size: 11.5px; margin: 0 0 4px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
          td { border: 1px solid #ccc; padding: 3px 8px; font-size: 10.5px; }
          td:first-child { font-weight: 600; width: 40%; background: #f7f7f7; }
          .price-row { display: flex; justify-content: space-between; font-size: 13px; font-weight: 700; padding: 6px 0; border-top: 1px solid #333; margin-top: 4px; }
          ol { padding-left: 16px; margin: 4px 0; }
          ol li { margin-bottom: 3px; }
          .signRow { display: flex; justify-content: space-around; margin-top: 24px; }
          .sign { text-align: center; width: 40%; }
          .signLine { border-top: 1px solid #333; margin-bottom: 4px; }
          @media print { @page { margin: 12mm; size: A4; } }
        </style>
      </head>
      <body>
        <h1>UMOWA KUPNA-SPRZEDAŻY</h1>
        <p class="place">zawarta w Płońsku, dnia ${fmtDate()}</p>

        <div class="parties">
          <div class="party">
            <h3>Kupujący</h3>
            <p><strong>${BUYER.name}</strong></p>
            <p>${BUYER.address}</p>
            <p>NIP: ${BUYER.nip}</p>
            <p>REGON: ${BUYER.regon}</p>
          </div>
          <div class="party">
            <h3>Sprzedający</h3>
            <p><strong>${phone.sellerFullName || '[ ________________ ]'}</strong></p>
            <p>${phone.sellerAddress || '[ ________________ ]'}</p>
            <p>Dowód os. / PESEL: ${phone.sellerIdNumber || '[ ________________ ]'}</p>
          </div>
        </div>

        <div class="section">
          <h3>§1 Przedmiot umowy</h3>
          <table>
            <tr><td>Marka i model</td><td>${phone.brand || ''} ${phone.model || ''}</td></tr>
            <tr><td>IMEI / nr seryjny</td><td>${phone.imei || '—'}</td></tr>
            <tr><td>Kolor</td><td>${phone.color || '—'}</td></tr>
            <tr><td>Pamięć</td><td>${phone.storage || '—'}</td></tr>
            <tr><td>Stan urządzenia (grade)</td><td>${phone.grade || '—'}</td></tr>
          </table>
        </div>

        <div class="section">
          <h3>§2 Cena</h3>
          <p>Strony ustalają cenę sprzedaży przedmiotu umowy na kwotę:</p>
          <div class="price-row"><span>Cena sprzedaży</span><span>${phone.buyPrice || 0} zł</span></div>
          <p>Kupujący zapłacił Sprzedającemu powyższą kwotę gotówką / przelewem w dniu zawarcia niniejszej umowy.</p>
        </div>

        <div class="section">
          <h3>§3 Oświadczenia Sprzedającego</h3>
          <ol>
            <li>Sprzedający oświadcza, że jest wyłącznym właścicielem przedmiotu umowy i przysługuje mu prawo do jego sprzedaży.</li>
            <li>Sprzedający oświadcza, że przedmiot umowy jest wolny od wad prawnych oraz praw osób trzecich, w szczególności nie jest przedmiotem zastawu, zajęcia ani innego obciążenia.</li>
            <li>Sprzedający oświadcza, że przedmiot umowy nie pochodzi z czynu zabronionego.</li>
          </ol>
        </div>

        <div class="section">
          <h3>§4 Postanowienia końcowe</h3>
          <ol>
            <li>Z chwilą podpisania niniejszej umowy własność przedmiotu umowy przechodzi na Kupującego.</li>
            <li>W sprawach nieuregulowanych niniejszą umową zastosowanie mają przepisy Kodeksu cywilnego.</li>
            <li>Umowę sporządzono w dwóch jednobrzmiących egzemplarzach, po jednym dla każdej ze stron.</li>
          </ol>
        </div>

        <div class="signRow">
          <div class="sign"><div class="signLine"></div><p>Kupujący</p></div>
          <div class="sign"><div class="signLine"></div><p>Sprzedający</p></div>
        </div>
      </body>
    </html>
  `;

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
