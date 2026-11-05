// Kopia zapasowa bazy: lista kopii w Storage (backups/) + „Zrób kopię teraz”.
// Kopie robi Cloud Function (backup.js) – co tydzień automatycznie i na żądanie.
import { useCallback, useEffect, useState } from 'react';
import { getDownloadURL, listAll, ref } from 'firebase/storage';
import { httpsCallable } from 'firebase/functions';
import { functions, storage } from '../firebase/firebaseConfig';
import './SmsGateway.css';

const label = (name) => {
  const m = name.match(/firestore-(\d{4})-(\d{2})-(\d{2})-(\d{2})(\d{2})/);
  return m ? `${m[3]}.${m[2]}.${m[1]} ${m[4]}:${m[5]} UTC` : name;
};

export default function BackupCard() {
  const [files, setFiles] = useState(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  const load = useCallback(async () => {
    try {
      const res = await listAll(ref(storage, 'backups'));
      setFiles(res.items.map((i) => i.fullPath).sort().reverse());
    } catch (err) {
      console.warn('backups', err?.code);
      setFiles([]);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const runNow = async () => {
    setBusy(true); setMsg('');
    try {
      const { data } = await httpsCallable(functions, 'runBackupNow')();
      const total = Object.values(data?.counts || {}).reduce((a, b) => a + b, 0);
      setMsg(`Kopia zapisana: ${total} dokumentów, ${Math.round((data?.bytes || 0) / 1024)} KB.`);
      await load();
    } catch (err) {
      setMsg(err?.message || 'Nie udało się zrobić kopii.');
    } finally {
      setBusy(false);
    }
  };

  const download = async (path) => {
    try {
      const url = await getDownloadURL(ref(storage, path));
      window.open(url, '_blank', 'noopener');
    } catch {
      alert('Nie udało się pobrać kopii.');
    }
  };

  return (
    <div className="sg-card">
      <div className="sg-head">
        <h2 className="sg-title">Kopia zapasowa bazy</h2>
        <button type="button" className="sg-btn" onClick={runNow} disabled={busy}>{busy ? 'Robię kopię…' : 'Zrób kopię teraz'}</button>
      </div>
      {msg && <p className="sg-muted">{msg}</p>}
      {files === null ? <p className="sg-muted">Wczytuję…</p> : files.length === 0 ? (
        <p className="sg-muted">Brak kopii. Automatyczna kopia powstaje co niedzielę o 3:00.</p>
      ) : (
        <ul className="sg-list">
          {files.slice(0, 6).map((f) => (
            <li key={f}><span>{label(f)}</span><button type="button" className="sg-btn" onClick={() => download(f)}>Pobierz JSON</button></li>
          ))}
        </ul>
      )}
      <p className="sg-muted">Kopia zawiera wszystkie zlecenia, klientów, skup, magazyn, rezerwacje, koszty i ustawienia (bez zdjęć). Co niedzielę o 3:00 robi się automatycznie, trzymamy 12 ostatnich. Raz na jakiś czas pobierz kopię na komputer albo dysk.</p>
    </div>
  );
}
