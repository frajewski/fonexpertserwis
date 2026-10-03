// ============================================================
//  htmlToPdf.js – zamiana istniejącego szablonu HTML dokumentu na PDF
//
//  Dokumenty (potwierdzenia, umowy, karta gwarancyjna) już istnieją jako
//  HTML w utils/print*.js. Zamiast pisać je drugi raz, renderujemy TEN SAM
//  HTML w ukrytej ramce, robimy z niego obraz (html2canvas) i składamy
//  stronę A4 (jsPDF). Działa lokalnie – bez sieci też.
//
//  Biblioteki ładowane są dynamicznie (import()), dopiero gdy ktoś kliknie
//  „Udostępnij” / „Pobierz PDF” – nie powiększają startu aplikacji.
// ============================================================

const A4_WIDTH_PX = 794;          // A4 przy 96 dpi
const A4_WIDTH_MM = 210;
const A4_HEIGHT_MM = 297;
const IMAGE_TIMEOUT_MS = 5000;    // np. kod QR z sieci – nie czekamy w nieskończoność

const waitForImages = (doc) => Promise.all(
  Array.from(doc.images).map((img) => (img.complete ? null : new Promise((resolve) => {
    const done = () => resolve();
    img.addEventListener('load', done, { once: true });
    img.addEventListener('error', done, { once: true });
    setTimeout(done, IMAGE_TIMEOUT_MS);
  }))),
);

/** HTML (pełny dokument) → Blob PDF (application/pdf), A4, wiele stron jeśli trzeba. */
export async function htmlToPdfBlob(html) {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import('html2canvas'),
    import('jspdf'),
  ]);

  // Osobna, niewidoczna ramka – style dokumentu nie mieszają się ze stylami panelu
  const iframe = document.createElement('iframe');
  iframe.setAttribute('aria-hidden', 'true');
  Object.assign(iframe.style, {
    position: 'fixed', left: '-10000px', top: '0', width: `${A4_WIDTH_PX}px`, height: '10px', border: '0',
  });
  document.body.appendChild(iframe);

  try {
    const doc = iframe.contentDocument;
    doc.open();
    doc.write(html.replace(/<script[\s\S]*?<\/script>/gi, '')); // bez skryptów (np. auto-print)
    doc.close();
    await waitForImages(doc);
    // Niska ramka → scrollHeight = faktyczna wysokość treści (bez pustej strony na końcu)
    const contentHeight = Math.ceil(doc.documentElement.scrollHeight);
    iframe.style.height = `${contentHeight}px`;

    const canvas = await html2canvas(doc.body, {
      scale: 2,               // ostrość tekstu
      useCORS: true,          // obrazki z innych domen (QR), jeśli serwer pozwala
      backgroundColor: '#ffffff',
      windowWidth: A4_WIDTH_PX,
      windowHeight: contentHeight,
      height: contentHeight,
      logging: false,
    });

    const pdf = new jsPDF({ unit: 'mm', format: 'a4', compress: true });
    const pageHeightPx = Math.floor(canvas.width * (A4_HEIGHT_MM / A4_WIDTH_MM));
    const pageCanvas = document.createElement('canvas');
    pageCanvas.width = canvas.width;

    for (let y = 0, page = 0; y < canvas.height; y += pageHeightPx, page++) {
      const sliceHeight = Math.min(pageHeightPx, canvas.height - y);
      if (page > 0 && sliceHeight < pageHeightPx * 0.03) break; // resztka kilku pikseli – bez pustej strony
      pageCanvas.height = sliceHeight;
      const ctx = pageCanvas.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, pageCanvas.width, sliceHeight);
      ctx.drawImage(canvas, 0, y, canvas.width, sliceHeight, 0, 0, canvas.width, sliceHeight);
      if (page > 0) pdf.addPage();
      pdf.addImage(pageCanvas.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, A4_WIDTH_MM, sliceHeight * (A4_WIDTH_MM / canvas.width));
    }

    return pdf.output('blob');
  } finally {
    iframe.remove();
  }
}
