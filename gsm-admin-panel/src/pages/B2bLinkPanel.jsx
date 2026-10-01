import { useState } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase/firebaseConfig';

const CLIENT_BASE = 'https://gsm-serwis-klient.web.app';

export default function B2bLinkPanel() {
  const [open, setOpen] = useState(false);
  const [token, setToken] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const link = token ? `${CLIENT_BASE}/oferta/${token}` : '';

  const callFn = async (name) => {
    setBusy(true);
    setError('');
    try {
      const res = await httpsCallable(functions, name)();
      setToken(res.data.token);
    } catch (e) {
      setError('Nie udało się: ' + (e.message || e));
    } finally {
      setBusy(false);
    }
  };

  const handleOpen = () => {
    setOpen(true);
    setCopied(false);
    if (!token) callFn('getB2bLink');
  };

  const handleRegenerate = () => {
    if (window.confirm('Stary link przestanie działać, a klient dostanie nowy. Kontynuować?')) {
      callFn('regenerateB2bLink');
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(link).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <>
      <button className="tr-import-btn" onClick={handleOpen}>🔗 Link B2B</button>

      {open && (
        <div className="tr-modal-backdrop" onClick={() => setOpen(false)}>
          <div className="tr-modal" onClick={(e) => e.stopPropagation()}>
            <h2 className="tr-modal-title">Katalog dla klienta B2B</h2>
            <p style={{ fontSize: 13, color: 'var(--ink-soft)', lineHeight: 1.5, margin: '0 0 14px' }}>
              Klient zobaczy telefony oznaczone „W ofercie B2B” z ceną B2B, bez cen zakupu i marż.
              Lista odświeża się na żywo.
            </p>

            {error && <p style={{ color: 'var(--warn)', fontSize: 13 }}>{error}</p>}

            {token ? (
              <input
                className="tr-filter-select"
                readOnly
                value={link}
                onFocus={(e) => e.target.select()}
              />
            ) : (
              !error && <p style={{ fontSize: 13 }}>Ładuję…</p>
            )}

            <div className="tr-modal-actions">
              <button className="tr-select-all-btn" onClick={handleRegenerate} disabled={busy}>
                Wygeneruj nowy link
              </button>
              <button className="tr-new-btn" onClick={handleCopy} disabled={!token}>
                {copied ? '✓ Skopiowano' : 'Kopiuj link'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
