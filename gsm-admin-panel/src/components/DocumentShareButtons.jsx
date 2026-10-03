// ============================================================
//  DocumentShareButtons.jsx – „Udostępnij” / „Pobierz PDF” przy dokumencie
//
//  Dodatek do istniejących przycisków „Drukuj” (te zostają bez zmian).
//    • aplikacja natywna → „Udostępnij” (Share Sheet: Gmail, Drive, WhatsApp…)
//    • przeglądarka      → „Pobierz PDF” + „Udostępnij”, jeśli przeglądarka
//                          potrafi udostępniać pliki (Web Share API)
//
//  buildHtml – funkcja zwracająca HTML dokumentu (ta sama co przy drukowaniu)
// ============================================================

import { useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { shareHtmlDocument, downloadHtmlDocument } from '../documents/shareDocument';

const webCanShareFiles = () => {
  try {
    const probe = new File(['x'], 'test.pdf', { type: 'application/pdf' });
    return typeof navigator !== 'undefined' && !!navigator.canShare && navigator.canShare({ files: [probe] });
  } catch {
    return false;
  }
};

export default function DocumentShareButtons({ buildHtml, fileName, title, text, className, docLabel = '' }) {
  const [busy, setBusy] = useState(null); // null | 'share' | 'download'
  const native = Capacitor.isNativePlatform();
  const showShare = native || webCanShareFiles();
  const showDownload = !native;

  const run = async (kind) => {
    if (busy) return;
    setBusy(kind);
    try {
      const html = buildHtml();
      if (!html) throw new Error('Brak danych dokumentu.');
      if (kind === 'share') await shareHtmlDocument({ html, fileName, title, text });
      else await downloadHtmlDocument({ html, fileName });
      // 'cancelled' (zamknięty Share Sheet) – celowo bez komunikatu
    } catch (err) {
      alert(err?.message || 'Nie udało się przygotować dokumentu.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <>
      {showShare && (
        <button type="button" className={className} disabled={!!busy} onClick={() => run('share')}>
          {busy === 'share' ? 'Przygotowuję PDF…' : `📤 Udostępnij${docLabel ? ` ${docLabel}` : ''}`}
        </button>
      )}
      {showDownload && (
        <button type="button" className={className} disabled={!!busy} onClick={() => run('download')}>
          {busy === 'download' ? 'Przygotowuję PDF…' : `⬇️ Pobierz${docLabel ? ` ${docLabel}` : ''} PDF`}
        </button>
      )}
    </>
  );
}
