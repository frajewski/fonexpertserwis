// ============================================================
//  ModelPhotosPage.jsx – biblioteka zdjęć poglądowych modeli
//  Zdjęcie dodane raz dla modelu (albo modelu w danym kolorze) pokazuje
//  się automatycznie przy każdym wystawionym na stronie telefonie tego
//  modelu, który nie ma własnego zdjęcia.
// ============================================================
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useStore from '../store/useStore';
import { subscribeToModelPhotos, saveModelPhoto, deleteModelPhoto, modelPhotoKey } from '../firebase/modelPhotos';
import { failMessage } from '../utils/friendlyError';
import { triggerHaptic } from '../native/haptics';
import './ModelPhotosPage.css';

const SOLD = 'Sprzedany';

export default function ModelPhotosPage() {
  const navigate = useNavigate();
  const phones = useStore((s) => s.phones);
  const [library, setLibrary] = useState(null);
  const [busyKey, setBusyKey] = useState(null);
  const [manual, setManual] = useState({ brand: '', model: '', color: '' });
  const fileRef = useRef(null);
  const pending = useRef(null); // { brand, model, color } czekające na wybór pliku

  useEffect(() => subscribeToModelPhotos(setLibrary, (e) => { console.error(e); setLibrary([]); }), []);

  const byKey = useMemo(() => new Map((library || []).map((e) => [e.key, e])), [library]);

  // Modele telefonów w magazynie (niesprzedane), z kolorami i liczbą sztuk
  const models = useMemo(() => {
    const map = new Map();
    phones.filter((p) => p.status !== SOLD && p.brand && p.model).forEach((p) => {
      const k = modelPhotoKey(p.brand, p.model);
      if (!map.has(k)) map.set(k, { key: k, brand: p.brand, model: p.model, colors: new Map(), web: 0, count: 0 });
      const m = map.get(k);
      m.count += 1;
      if (p.webListed) m.web += 1;
      if (p.color) {
        const ck = modelPhotoKey(p.brand, p.model, p.color);
        const c = m.colors.get(ck) || { key: ck, color: p.color, count: 0, ownPhotos: 0 };
        c.count += 1;
        if (p.photo) c.ownPhotos += 1;
        m.colors.set(ck, c);
      }
    });
    return [...map.values()].sort((a, b) => b.web - a.web || a.brand.localeCompare(b.brand, 'pl') || a.model.localeCompare(b.model, 'pl'));
  }, [phones]);

  const pick = (target) => { pending.current = target; fileRef.current?.click(); };

  const onFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    const target = pending.current;
    if (!file || !target) return;
    const key = modelPhotoKey(target.brand, target.model, target.color);
    setBusyKey(key);
    try {
      await saveModelPhoto(target, file, byKey.get(key));
      triggerHaptic('success');
    } catch (err) {
      alert(failMessage('Nie udało się zapisać zdjęcia', err));
    } finally {
      setBusyKey(null);
    }
  };

  const remove = async (entry) => {
    if (!window.confirm(`Usunąć zdjęcie: ${entry.brand} ${entry.model}${entry.color ? ` (${entry.color})` : ''}?`)) return;
    setBusyKey(entry.key);
    try { await deleteModelPhoto(entry); } catch (err) { alert(failMessage('Nie udało się usunąć zdjęcia', err)); } finally { setBusyKey(null); }
  };

  const Slot = ({ target, label, sub }) => {
    const key = modelPhotoKey(target.brand, target.model, target.color);
    const entry = byKey.get(key);
    const busy = busyKey === key;
    return (
      <div className={`mp-slot ${entry ? 'mp-slot-on' : ''}`}>
        <div className="mp-thumb">{entry ? <img src={entry.url} alt="" /> : <span>brak</span>}</div>
        <div className="mp-slot-text"><strong>{label}</strong>{sub && <small>{sub}</small>}</div>
        <div className="mp-slot-actions">
          <button type="button" className="mp-btn" disabled={busy} onClick={() => pick(target)}>{busy ? 'Wgrywam…' : entry ? 'Zmień' : '+ Dodaj'}</button>
          {entry && <button type="button" className="mp-btn mp-btn-ghost" disabled={busy} onClick={() => remove(entry)}>Usuń</button>}
        </div>
      </div>
    );
  };

  const known = new Set(models.flatMap((m) => [m.key, ...[...m.colors.keys()]]));
  const others = (library || []).filter((e) => !known.has(e.key));

  return (
    <div className="mp-page">
      <input ref={fileRef} type="file" accept="image/*" hidden onChange={onFile} />
      <button type="button" className="mp-back" onClick={() => navigate('/skup')}>← Skup</button>
      <h1 className="mp-title">Zdjęcia modeli</h1>
      <p className="mp-lead">
        Zdjęcie dodajesz raz na model. Każdy telefon tego modelu wystawiony na stronie, który nie ma własnego zdjęcia,
        pokaże je automatycznie (z dopiskiem „zdjęcie poglądowe”). Zdjęcie dla koloru ma pierwszeństwo przed zdjęciem modelu.
        Najlepiej: zdjęcie samego telefonu na białym lub przezroczystym tle, zrobione przez Ciebie albo od hurtowni.
      </p>

      {library === null ? <p className="mp-empty">Wczytuję…</p> : (
        <>
          <h2 className="mp-h2">Modele w magazynie</h2>
          {models.length === 0 && <p className="mp-empty">Brak niesprzedanych telefonów w magazynie.</p>}
          <div className="mp-list">
            {models.map((m) => (
              <section key={m.key} className="mp-model">
                <header className="mp-model-head">
                  <h3>{m.brand} {m.model}</h3>
                  <span>{m.count} szt.{m.web ? ` · 🌐 ${m.web} na stronie` : ''}</span>
                </header>
                <Slot target={{ brand: m.brand, model: m.model, color: '' }} label="Dla całego modelu" sub="gdy nie ma zdjęcia w danym kolorze" />
                {[...m.colors.values()].map((c) => (
                  <Slot key={c.key} target={{ brand: m.brand, model: m.model, color: c.color }} label={`Kolor: ${c.color}`}
                    sub={`${c.count} szt.${c.ownPhotos ? ` · ${c.ownPhotos} z własnym zdjęciem` : ''}`} />
                ))}
              </section>
            ))}
          </div>

          <h2 className="mp-h2">Dodaj zdjęcie na zapas</h2>
          <p className="mp-hint">Dla modelu, którego jeszcze nie masz w magazynie. Wpisz markę i model dokładnie tak, jak wpisujesz je w Skupie.</p>
          <div className="mp-manual">
            <input className="mp-input" placeholder="Marka (np. Apple)" value={manual.brand} onChange={(e) => setManual({ ...manual, brand: e.target.value })} />
            <input className="mp-input" placeholder="Model (np. iPhone 15)" value={manual.model} onChange={(e) => setManual({ ...manual, model: e.target.value })} />
            <input className="mp-input" placeholder="Kolor (opcjonalnie)" value={manual.color} onChange={(e) => setManual({ ...manual, color: e.target.value })} />
            <button type="button" className="mp-btn" disabled={!manual.brand.trim() || !manual.model.trim()} onClick={() => pick({ ...manual })}>+ Wybierz zdjęcie</button>
          </div>

          {others.length > 0 && (
            <>
              <h2 className="mp-h2">Pozostałe zdjęcia w bibliotece</h2>
              <div className="mp-model">
                {others.map((e) => (
                  <Slot key={e.key} target={{ brand: e.brand, model: e.model, color: e.color }} label={`${e.brand} ${e.model}`} sub={e.color ? `Kolor: ${e.color}` : 'Cały model'} />
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
