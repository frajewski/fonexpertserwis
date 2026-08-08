import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import useStore from '../store/useStore';
import brands from '../constants/brands';
import grades from '../constants/grades';
import './CalculatorPage.css';

export default function CalculatorPage() {
  const navigate = useNavigate();
  const phones = useStore((s) => s.phones);
  const currentUser = useStore((s) => s.currentUser);

  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [grade, setGrade] = useState('');
  const [marketSellPrice, setMarketSellPrice] = useState('');
  const [targetMargin, setTargetMargin] = useState('');
  const [marginTouched, setMarginTouched] = useState(false);

  const soldPhones = useMemo(() => phones.filter((p) => p.status === 'Sprzedany'), [phones]);

  // Statystyki dla DOKŁADNIE tego modelu (ta sama marka + model, bez uwzględniania
  // koloru/pojemności w nazwie – to i tak zwykle wpisane w polu "model")
  const modelStats = useMemo(() => {
    if (!brand || !model.trim()) return null;
    const modelLower = model.trim().toLowerCase();
    const matches = soldPhones.filter(
      (p) => p.brand === brand && (p.model || '').toLowerCase().includes(modelLower)
    );
    if (matches.length === 0) return null;
    const avgBuy = matches.reduce((s, p) => s + (p.buyPrice || 0), 0) / matches.length;
    const avgSell = matches.reduce((s, p) => s + (p.sellPrice || 0), 0) / matches.length;
    const avgProfit = avgSell - avgBuy;
    return { count: matches.length, avgBuy: Math.round(avgBuy), avgSell: Math.round(avgSell), avgProfit: Math.round(avgProfit) };
  }, [brand, model, soldPhones]);

  // Fallback: statystyki dla całej marki, gdy nie ma historii dla konkretnego modelu
  const brandStats = useMemo(() => {
    if (!brand) return null;
    const matches = soldPhones.filter((p) => p.brand === brand);
    if (matches.length === 0) return null;
    const avgProfit = matches.reduce((s, p) => s + ((p.sellPrice || 0) - (p.buyPrice || 0)), 0) / matches.length;
    return { count: matches.length, avgProfit: Math.round(avgProfit) };
  }, [brand, soldPhones]);

  const suggestedMargin = modelStats?.avgProfit ?? brandStats?.avgProfit ?? 300;

  // Dane finansowe (marże) – dostępne tylko dla Admina. Sprawdzane PO wszystkich
  // hookach, żeby nie łamać kolejności wywołań hooków w React.
  if (currentUser?.role !== 'admin') {
    return (
      <div className="cl-page">
        <p className="cl-hint">Kalkulator wyceny pokazuje dane finansowe — dostępny tylko dla Admina.</p>
      </div>
    );
  }

  // Marża do wyliczenia: to co user wpisał ręcznie, albo domyślna sugerowana –
  // ale tylko dopóki user nie zaczął jej sam edytować (marginTouched)
  const effectiveMargin = marginTouched && targetMargin !== '' ? parseFloat(targetMargin) || 0 : suggestedMargin;

  const sellNum = parseFloat(marketSellPrice) || 0;
  const suggestedBuyPrice = sellNum > 0 ? Math.max(0, Math.round(sellNum - effectiveMargin)) : null;

  return (
    <div className="cl-page">
      <button className="cl-back" onClick={() => navigate('/skup')}>← Skup telefonów</button>
      <h1 className="cl-title">Kalkulator wyceny skupu</h1>
      <p className="cl-hint">
        Wpisz markę, model i szacowaną cenę sprzedaży — kalkulator podpowie cenę zakupu na
        podstawie Twoich dotychczasowych transakcji tym samym modelem (albo marką, jeśli nie masz
        jeszcze historii tego modelu).
      </p>

      <div className="cl-card">
        <label className="cl-field">
          <span>Marka</span>
          <select className="cl-input" value={brand} onChange={(e) => setBrand(e.target.value)}>
            <option value="">— wybierz —</option>
            {brands.map((b) => <option key={b.value} value={b.value}>{b.label || b.value}</option>)}
          </select>
        </label>

        <label className="cl-field">
          <span>Model</span>
          <input
            className="cl-input"
            value={model}
            onChange={(e) => setModel(e.target.value)}
            placeholder="np. iPhone 13 128GB"
          />
        </label>

        <label className="cl-field">
          <span>Stan (grade)</span>
          <div className="cl-grade-chips">
            {grades.map((g) => (
              <button
                key={g.value}
                type="button"
                className={`cl-grade-chip ${grade === g.value ? 'cl-grade-chip-active' : ''}`}
                style={grade === g.value ? { background: g.color, borderColor: g.color, color: '#fff' } : {}}
                onClick={() => setGrade(grade === g.value ? '' : g.value)}
              >
                {g.emoji} {g.value}
              </button>
            ))}
          </div>
        </label>

        {(modelStats || brandStats) && (
          <div className="cl-history">
            {modelStats ? (
              <>
                <div className="cl-history-title">📊 Historia tego modelu ({modelStats.count} {modelStats.count === 1 ? 'transakcja' : 'transakcji'})</div>
                <div className="cl-history-row"><span>Średnia cena zakupu</span><span>{modelStats.avgBuy} zł</span></div>
                <div className="cl-history-row"><span>Średnia cena sprzedaży</span><span>{modelStats.avgSell} zł</span></div>
                <div className="cl-history-row"><span>Średni zysk</span><span className={modelStats.avgProfit >= 0 ? 'cl-good' : 'cl-bad'}>{modelStats.avgProfit >= 0 ? '+' : ''}{modelStats.avgProfit} zł</span></div>
              </>
            ) : (
              <>
                <div className="cl-history-title">📊 Brak historii tego dokładnego modelu — pokazuję średnią dla marki {brand} ({brandStats.count} transakcji)</div>
                <div className="cl-history-row"><span>Średni zysk (cała marka)</span><span className={brandStats.avgProfit >= 0 ? 'cl-good' : 'cl-bad'}>{brandStats.avgProfit >= 0 ? '+' : ''}{brandStats.avgProfit} zł</span></div>
              </>
            )}
          </div>
        )}

        <label className="cl-field">
          <span>Szacowana cena sprzedaży (za ile realnie sprzedasz)</span>
          <input
            className="cl-input"
            type="number"
            value={marketSellPrice}
            onChange={(e) => setMarketSellPrice(e.target.value)}
            placeholder="np. 1800"
          />
        </label>

        <label className="cl-field">
          <span>Docelowa marża (zł) {!marginTouched && '— podpowiedź z historii, edytuj jeśli chcesz inną'}</span>
          <input
            className="cl-input"
            type="number"
            value={marginTouched ? targetMargin : suggestedMargin}
            onChange={(e) => { setMarginTouched(true); setTargetMargin(e.target.value); }}
          />
        </label>

        {suggestedBuyPrice !== null && (
          <div className="cl-result">
            <span className="cl-result-label">Sugerowana cena zakupu</span>
            <span className="cl-result-value">{suggestedBuyPrice} zł</span>
          </div>
        )}

        <button
          type="button"
          className="cl-btn-primary"
          disabled={suggestedBuyPrice === null}
          onClick={() => navigate('/skup/nowy', {
            state: { prefill: { brand, model, grade, buyPrice: suggestedBuyPrice } },
          })}
        >
          Dodaj telefon z tą wyceną →
        </button>
      </div>
    </div>
  );
}
