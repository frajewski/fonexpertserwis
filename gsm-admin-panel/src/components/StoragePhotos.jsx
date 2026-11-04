// Miniatury zdjęć z Firebase Storage (zdjęcia przesłane przez klienta z formularzy)
import { useEffect, useState } from 'react';
import { getDownloadURL, ref as storageRef } from 'firebase/storage';
import { storage } from '../firebase/firebaseConfig';

export async function storagePhotoUrls(paths) {
  const list = (paths || []).slice(0, 5);
  const urls = await Promise.all(list.map((p) => getDownloadURL(storageRef(storage, p)).catch(() => null)));
  return urls.filter(Boolean);
}

export default function StoragePhotos({ paths }) {
  const [urls, setUrls] = useState(null);
  const key = (paths || []).join('|');
  useEffect(() => {
    let alive = true;
    storagePhotoUrls(paths).then((u) => { if (alive) setUrls(u); });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  if (!urls) return <span className="bk-muted">Ładowanie…</span>;
  if (!urls.length) return <span className="bk-muted">Nie udało się wczytać zdjęć</span>;
  return (
    <div className="bk-photos">
      {urls.map((u) => (
        <a key={u} href={u} target="_blank" rel="noreferrer"><img src={u} alt="Zdjęcie od klienta" loading="lazy" /></a>
      ))}
    </div>
  );
}
