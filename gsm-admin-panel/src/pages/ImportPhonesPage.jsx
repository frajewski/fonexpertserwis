import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useStore from '../store/useStore';
import brands from '../constants/brands';
import grades from '../constants/grades';
import tradeSources from '../constants/tradeSources';
import TRADE_STATUS from '../constants/tradeStatuses';
import './ImportPhonesPage.css';

// Pola systemu, na które mapujemy kolumny z arkusza. "skip" = kolumna ignorowana.
const SYSTEM_FIELDS = [
  { value: 'skip',       label: '— pomiń tę kolumnę —' },
  { value: 'brandModel', label: 'Marka + Model (jedna kolumna, np. "PHONE 14 PRO 128GB BLACK")' },
  { value: 'brand',      label: 'Marka (osobna kolumna)' },
  { value: 'model',      label: 'Model (osobna kolumna)' },
  { value: 'imei',       label: 'IMEI / nr seryjny' },
  { value: 'color',      label: 'Kolor' },
  { value: 'storage',    label: 'Pojemność' },
  { value: 'grade',      label: 'Stan (grade A-D)' },
  { value: 'buyPrice',   label: 'Cena zakupu' },
  { value: 'sellPrice',  label: 'Cena sprzedaży' },
  { value: 'boughtDate', label: 'Data zakupu' },
  { value: 'soldDate',   label: 'Data sprzedaży' },
  { value: 'sourceText', label: 'Dostawca / klient (tekst)' },
  { value: 'warranty',   label: 'Okres gwarancji' },
  { value: 'extraNotes', label: 'Dodatkowe uwagi (np. wymienione elementy)' },
];

// Rozpoznawanie kolumn po nagłówku z arkusza – dopasowanie po polskich/angielskich
// nazwach, żeby przy typowych nazwach kolumn (Marka, Model, IMEI, Cena zakupu...)
// mapowanie ustawiło się samo i admin tylko to zatwierdzał, zamiast klikać ręcznie
// za każdym razem od zera.
const HEADER_GUESSES = {
  brandModel: ['marka/model', 'marka / model'],
  brand: ['marka', 'brand', 'producent'],
  model: ['model', 'nazwa'],
  imei: ['imei', 'sn', 'nr seryjny', 'numer seryjny', 'serial'],
  color: ['kolor', 'color'],
  storage: ['pojemność', 'pojemnosc', 'pamięć', 'pamiec', 'storage', 'gb'],
  grade: ['stan', 'grade', 'jakość', 'jakosc'],
  buyPrice: ['cena zakupu', 'zakup', 'cena skupu', 'koszt zakupu', 'buy'],
  sellPrice: ['cena sprzedaży', 'cena sprzedazy', 'sprzedaż', 'sprzedaz', 'sell'],
  boughtDate: ['data zakupu'],
  soldDate: ['data sprzedaży', 'data sprzedazy'],
  sourceText: ['dostawca', 'klient', 'źródło', 'zrodlo'],
  warranty: ['gwarancj'],
  extraNotes: ['wymienione', 'notatki', 'uwagi', 'notes', 'komentarz'],
};

function guessFieldForHeader(header) {
  const h = header.toLowerCase().trim();
  for (const [field, patterns] of Object.entries(HEADER_GUESSES)) {
    if (patterns.some((p) => h.includes(p))) return field;
  }
  return 'skip';
}

// Dopasowuje dowolny tekst (np. "iphone", "Apple ", "APPLE") do wartości enuma
// (np. brands -> 'Apple'). Dzięki temu arkusz nie musi mieć wartości zapisanych
// dokładnie tak samo jak w systemie.
function fuzzyMatch(text, options) {
  if (!text) return '';
  const t = text.toLowerCase().trim();
  const exact = options.find((o) => o.value.toLowerCase() === t || o.label.toLowerCase() === t);
  if (exact) return exact.value;
  const partial = options.find((o) => t.includes(o.value.toLowerCase()) || o.label.toLowerCase().includes(t));
  return partial ? partial.value : '';
}

// Rozbija połączoną kolumnę "Marka/Model" (np. "PHONE 14 PRO 128GB BLACK",
// "SAMSUNG A54 5G BLACK") na markę + resztę jako model. "PHONE"/"IPHONE" bez
// innej rozpoznanej marki traktujemy jako iPhone – tak zwykle skraca się to
// w arkuszach serwisów GSM.
function parseBrandModel(text) {
  const t = (text || '').trim();
  const upper = t.toUpperCase();
  if (upper.startsWith('PHONE') || upper.startsWith('IPHONE')) {
    return { brand: 'Apple', model: t.replace(/^i?phone\s*/i, 'iPhone ').trim() };
  }
  const matched = brands.find((b) => b.value !== 'Other' && upper.startsWith(b.value.toUpperCase()));
  if (matched) return { brand: matched.value, model: t.slice(matched.value.length).trim() };
  return { brand: 'Other', model: t };
}

// Dopasowuje wolny tekst dostawcy (np. "Z ULICY", "KOMIS MOTAK") do najbliższego
// źródła z listy – jeśli nic nie pasuje, ląduje jako "Inne" z oryginalnym
// tekstem zachowanym w sourceNote, więc informacja i tak nie ginie.
function guessSource(text) {
  const t = (text || '').toLowerCase();
  if (!t) return 'other';
  if (t.includes('olx') || t.includes('allegro')) return 'olx';
  if (t.includes('komis') || t.includes('lombard')) return 'lombard';
  if (t.includes('serwis')) return 'service';
  if (t.includes('ulic') || /^[a-ząćęłńóśźż]+ [a-ząćęłńóśźż]+$/.test(t.trim())) return 'private'; // "Imię Nazwisko"
  return 'other';
}

// Arkusze bywają w formacie "2026-06-23" (już ISO-podobny) albo "23.06.2026" –
// próbujemy oba, i jeśli się nie uda, zwracamy null zamiast błędnej daty.
function parseSheetDate(text) {
  const t = (text || '').trim();
  if (!t) return null;
  const iso = new Date(t);
  if (!isNaN(iso.getTime())) return iso.toISOString();
  const dmy = t.match(/^(\d{1,2})[.\/](\d{1,2})[.\/](\d{4})$/);
  if (dmy) {
    const d = new Date(`${dmy[3]}-${dmy[2].padStart(2, '0')}-${dmy[1].padStart(2, '0')}`);
    if (!isNaN(d.getTime())) return d.toISOString();
  }
  return null;
}

function parsePastedData(raw) {
  const lines = raw.trim().split('\n').filter((l) => l.trim() !== '');
  if (lines.length === 0) return { headers: [], rows: [] };

  // Arkusze Google przy Ctrl+C/Ctrl+V wklejają dane rozdzielone tabulatorami (TSV)
  const headers = lines[0].split('\t').map((h) => h.trim());
  const rows = lines.slice(1).map((line) => line.split('\t').map((c) => c.trim()));
  return { headers, rows };
}

export default function ImportPhonesPage() {
  const navigate = useNavigate();
  const addPhone = useStore((s) => s.addPhone);
  const existingPhones = useStore((s) => s.phones);

  const [rawData, setRawData] = useState('');
  const [headers, setHeaders] = useState([]);
  const [rows, setRows] = useState([]);
  const [mapping, setMapping] = useState({});
  const [step, setStep] = useState('paste'); // paste | map | importing | done
  const [results, setResults] = useState({ ok: 0, failed: [], duplicates: [] });

  const handleParse = () => {
    const { headers: h, rows: r } = parsePastedData(rawData);
    if (h.length === 0 || r.length === 0) {
      alert('Nie udało się odczytać danych. Upewnij się, że pierwszy wiersz to nagłówki kolumn.');
      return;
    }
    const guessedMapping = {};
    h.forEach((header, i) => { guessedMapping[i] = guessFieldForHeader(header); });
    setHeaders(h);
    setRows(r);
    setMapping(guessedMapping);
    setStep('map');
  };

  const buildPhoneFromRow = (row) => {
    const data = {};
    headers.forEach((_, i) => {
      const field = mapping[i];
      if (field && field !== 'skip') data[field] = row[i] || '';
    });

    let brandValue = '';
    let modelValue = '';
    if (data.brandModel) {
      const parsed = parseBrandModel(data.brandModel);
      brandValue = parsed.brand;
      modelValue = parsed.model;
    } else {
      brandValue = fuzzyMatch(data.brand, brands) || data.brand || '';
      modelValue = data.model || '';
    }

    const gradeValue = fuzzyMatch(data.grade, grades) || '';
    const sellPriceNum = parseFloat((data.sellPrice || '0').replace(',', '.')) || 0;
    const soldDateIso = parseSheetDate(data.soldDate);
    // Telefon uznajemy za sprzedany, jeśli arkusz ma cenę sprzedaży LUB datę
    // sprzedaży wypełnioną – tak jak w Twoim arkuszu (puste = wciąż w magazynie)
    const isSold = sellPriceNum > 0 || !!soldDateIso;

    const notesParts = [];
    if (data.warranty) notesParts.push(`Gwarancja: ${data.warranty}`);
    if (data.extraNotes) notesParts.push(data.extraNotes);

    return {
      brand: brandValue,
      model: modelValue,
      imei: data.imei || '',
      color: data.color || '',
      storage: data.storage || '',
      grade: gradeValue,
      source: guessSource(data.sourceText),
      sourceNote: data.sourceText || 'Import z arkusza',
      buyPrice: parseFloat((data.buyPrice || '0').replace(',', '.')) || 0,
      sellPrice: sellPriceNum,
      boughtAt: parseSheetDate(data.boughtDate),
      soldAt: soldDateIso,
      status: isSold ? TRADE_STATUS.SOLD : TRADE_STATUS.BOUGHT,
      hasIcloudLock: false,
      hasCarrierLock: false,
      isReported: false,
      notes: notesParts.join(' | '),
    };
  };

  const handleImport = async () => {
    setStep('importing');
    let ok = 0;
    const failed = [];
    const duplicates = [];

    // IMEI, które już są w bazie SPRZED tego importu – nie blokuje importu
    // (bo u Filipa zdarzają się prawdziwe ponowne odkupy tego samego telefonu),
    // ale zapisujemy do przeglądu po zakończeniu, żeby dało się złapać pomyłkę.
    const existingImeis = new Set(
      existingPhones.map((p) => (p.imei || '').replace(/\s/g, '')).filter(Boolean)
    );

    for (let i = 0; i < rows.length; i++) {
      const phone = buildPhoneFromRow(rows[i]);
      if (!phone.model) {
        failed.push({ row: i + 2, reason: 'Brak modelu' });
        continue;
      }
      const normalizedImei = (phone.imei || '').replace(/\s/g, '');
      if (normalizedImei && existingImeis.has(normalizedImei)) {
        duplicates.push({ row: i + 2, label: `${phone.brand} ${phone.model}`, imei: normalizedImei });
      }
      try {
        await addPhone(phone);
        ok++;
      } catch (err) {
        failed.push({ row: i + 2, reason: err.message });
      }
    }
    setResults({ ok, failed, duplicates });
    setStep('done');
  };

  return (
    <div className="ip-page">
      <button className="ip-back" onClick={() => navigate('/skup')}>← Skup telefonów</button>
      <h1 className="ip-title">Import telefonów z arkusza</h1>

      {step === 'paste' && (
        <div className="ip-card">
          <p className="ip-hint">
            W Google Sheets zaznacz komórki razem z wierszem nagłówków (Marka, Model, IMEI, itd.),
            skopiuj (Ctrl+C / Cmd+C), i wklej poniżej.
          </p>
          <textarea
            className="ip-textarea"
            placeholder="Wklej tutaj dane z arkusza (Ctrl+V)…"
            value={rawData}
            onChange={(e) => setRawData(e.target.value)}
            rows={12}
          />
          <button className="ip-btn-primary" onClick={handleParse} disabled={!rawData.trim()}>
            Dalej — sprawdź kolumny
          </button>
        </div>
      )}

      {step === 'map' && (
        <div className="ip-card">
          <p className="ip-hint">
            Wykryto {rows.length} wierszy. Sprawdź, czy kolumny są dobrze dopasowane —
            system zgadł to sam, popraw jeśli trzeba.
          </p>
          <table className="ip-map-table">
            <thead>
              <tr>
                <th>Kolumna z arkusza</th>
                <th>Przykładowa wartość</th>
                <th>Mapuj na pole</th>
              </tr>
            </thead>
            <tbody>
              {headers.map((h, i) => (
                <tr key={i}>
                  <td className="ip-map-header">{h || `(kolumna ${i + 1})`}</td>
                  <td className="ip-map-example">{rows[0]?.[i] || '—'}</td>
                  <td>
                    <select
                      className="ip-map-select"
                      value={mapping[i] || 'skip'}
                      onChange={(e) => setMapping({ ...mapping, [i]: e.target.value })}
                    >
                      {SYSTEM_FIELDS.map((f) => (
                        <option key={f.value} value={f.value}>{f.label}</option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <p className="ip-note">
            ℹ️ Telefon z wypełnioną Ceną sprzedaży lub Datą sprzedaży zostanie oznaczony jako
            „Sprzedany" — inaczej trafi jako „Skupiony" (nadal w magazynie).
            Źródło (Dostawca/Klient) jest zgadywane automatycznie; jeśli się pomyli,
            popraw je pojedynczo w karcie telefonu po imporcie.
          </p>

          <div className="ip-actions">
            <button className="ip-btn-ghost" onClick={() => setStep('paste')}>← Wróć</button>
            <button className="ip-btn-primary" onClick={handleImport}>
              Importuj {rows.length} telefonów
            </button>
          </div>
        </div>
      )}

      {step === 'importing' && (
        <div className="ip-card">
          <p className="ip-hint">Importuję, chwila…</p>
        </div>
      )}

      {step === 'done' && (
        <div className="ip-card">
          <p className="ip-result-ok">✓ Zaimportowano {results.ok} z {rows.length} telefonów.</p>
          {results.failed.length > 0 && (
            <>
              <p className="ip-result-warn">
                {results.failed.length} wierszy pominięto — dodaj je ręcznie:
              </p>
              <ul className="ip-fail-list">
                {results.failed.map((f, i) => (
                  <li key={i}>Wiersz {f.row}: {f.reason}</li>
                ))}
              </ul>
            </>
          )}
          {results.duplicates.length > 0 && (
            <>
              <p className="ip-result-warn">
                ⚠️ {results.duplicates.length} zaimportowanych telefonów ma IMEI, który już był w bazie
                (mogło to być zamierzone — ponowny odkup — sprawdź, żeby się upewnić):
              </p>
              <ul className="ip-fail-list">
                {results.duplicates.map((d, i) => (
                  <li key={i}>Wiersz {d.row}: {d.label} (IMEI {d.imei})</li>
                ))}
              </ul>
            </>
          )}
          <div className="ip-actions">
            <button className="ip-btn-ghost" onClick={() => { setStep('paste'); setRawData(''); }}>
              Importuj kolejny arkusz
            </button>
            <button className="ip-btn-primary" onClick={() => navigate('/skup')}>
              Przejdź do listy →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
