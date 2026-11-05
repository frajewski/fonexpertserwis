import { useState, useEffect, useMemo } from 'react';
import useStore from '../store/useStore';
import { getStatsByPeriod, getTopBrands, getTopFaults, filterByMonth, filterDeliveredByMonth, calcRevenue, calcProfit, getRepairPriceStats } from '../utils/calcProfit';
import { getTopSellingModels, getAvgProfitByBrand, getStalePhones, getMonthlyTradeData, getTradeStatsForMonth, getTradeProfitToday, getTradeProfitThisMonth, getTradeProfitThisYear } from '../utils/calcTradeStats';
import STATUS from '../constants/statuses';
import './StatsPage.css';

const fmtDate = (iso) => iso ? new Date(iso).toLocaleDateString('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' }) : '—';
const daysSince = (iso) => Math.floor((Date.now() - new Date(iso).getTime()) / (24 * 60 * 60 * 1000));

const MONTH_NAMES_FULL = [
  'Styczeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec',
  'Lipiec', 'Sierpień', 'Wrzesień', 'Październik', 'Listopad', 'Grudzień',
];

export default function StatsPage() {
  const recentRepairs = useStore((s) => s.getVisibleRepairs());
  const getRepairsHistoryPage = useStore((s) => s.getRepairsHistoryPage);

  // Store trzyma w czasie rzeczywistym tylko ostatnie ~30 dni zleceń. Statystyki
  // starszych miesięcy (np. sierpnia) muszą więc doczytać historię – jednorazowo,
  // po wejściu na stronę.
  const [historyRepairs, setHistoryRepairs] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const all = [];
        let lastDoc = null;
        for (let i = 0; i < 40; i++) { // zabezpieczenie: max 20 000 zleceń
          const page = await getRepairsHistoryPage(500, lastDoc);
          all.push(...page.repairs);
          lastDoc = page.lastDoc;
          if (!page.hasMore) break;
        }
        if (!cancelled) setHistoryRepairs(all);
      } catch (e) {
        console.error('Nie udało się wczytać historii zleceń do statystyk', e);
        if (!cancelled) setHistoryError(true);
      } finally {
        if (!cancelled) setHistoryLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [getRepairsHistoryPage]);

  const repairs = useMemo(() => {
    const byId = new Map(historyRepairs.map((r) => [r.id, r]));
    recentRepairs.forEach((r) => byId.set(r.id, r)); // świeże dane z live mają pierwszeństwo
    return [...byId.values()];
  }, [historyRepairs, recentRepairs]);
  const phones = useStore((s) => s.phones);
  const expenses = useStore((s) => s.expenses);

  const [selectedDate, setSelectedDate] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });

  const goToPrevMonth = () => setSelectedDate(({ year, month }) =>
    month === 0 ? { year: year - 1, month: 11 } : { year, month: month - 1 }
  );
  const goToNextMonth = () => setSelectedDate(({ year, month }) =>
    month === 11 ? { year: year + 1, month: 0 } : { year, month: month + 1 }
  );
  const isCurrentMonth = (() => {
    const now = new Date();
    return selectedDate.year === now.getFullYear() && selectedDate.month === now.getMonth();
  })();

  const monthRepairs = filterByMonth(repairs, selectedDate.year, selectedDate.month);
  const monthCompleted = filterDeliveredByMonth(repairs, selectedDate.year, selectedDate.month);
  const monthRevenue = calcRevenue(monthCompleted);
  const monthProfit = calcProfit(monthCompleted);
  const monthTopBrands = getTopBrands(monthCompleted).slice(0, 5);
  const monthTopFaults = getTopFaults(monthCompleted);
  const monthTrade = getTradeStatsForMonth(phones, selectedDate.year, selectedDate.month);

  // Koszty firmy – liczone TYLKO dla "Ten miesiąc"/"Ten rok"/wybranego
  // miesiąca (nie dla "Dziś", bo koszty stałe wpisywane są per-miesiąc,
  // więc odjęcie całego miesięcznego ZUS-u od zysku jednego dnia
  // wyglądałoby myląco).
  const currentYM = new Date().toISOString().slice(0, 7);
  const currentYear = new Date().getFullYear();
  const selectedYM = `${selectedDate.year}-${String(selectedDate.month + 1).padStart(2, '0')}`;

  const expensesThisMonth = expenses.filter((e) => e.month === currentYM).reduce((s, e) => s + (e.amount || 0), 0);
  const expensesThisYear = expenses.filter((e) => (e.month || '').startsWith(String(currentYear))).reduce((s, e) => s + (e.amount || 0), 0);
  const expensesSelectedMonth = expenses.filter((e) => e.month === selectedYM).reduce((s, e) => s + (e.amount || 0), 0);
  const monthTopModels = getTopSellingModels(monthTrade.soldPhones, 5);
  const monthAvgMargin = getAvgProfitByBrand(monthTrade.soldPhones);

  const completed = repairs.filter((r) => r.status === STATUS.DELIVERED);
  const stats = getStatsByPeriod(completed);
  const tradeProfitToday = getTradeProfitToday(phones);
  const tradeProfitThisMonth = getTradeProfitThisMonth(phones);
  const tradeProfitThisYear = getTradeProfitThisYear(phones);
  const topBrands = getTopBrands(completed).slice(0, 5);
  const topFaults = getTopFaults(completed);

  const soldPhones = phones.filter((p) => p.status === 'Sprzedany');
  const tradeProfit = soldPhones.reduce((sum, p) => sum + ((p.sellPrice || 0) - (p.buyPrice || 0)), 0);
  const tradeRevenue = soldPhones.reduce((sum, p) => sum + (p.sellPrice || 0), 0);

  const topSellingModels = getTopSellingModels(phones, 5);
  const avgProfitByBrand = getAvgProfitByBrand(phones);
  const stalePhones = getStalePhones(phones, 30);
  const monthlyTradeData = getMonthlyTradeData(phones);
  const maxMonthlyProfit = Math.max(1, ...monthlyTradeData.map((m) => Math.abs(m.profit)));

  return (
    <div className="st-page">
      <h1 className="st-title">Statystyki</h1>

      <div className="st-periods">
        <PeriodCard label="Dziś" data={stats.today} tradeProfit={tradeProfitToday} />
        <PeriodCard label="Ten miesiąc" data={stats.thisMonth} tradeProfit={tradeProfitThisMonth} expenses={expensesThisMonth} />
        <PeriodCard label="Ten rok" data={stats.thisYear} tradeProfit={tradeProfitThisYear} expenses={expensesThisYear} />
      </div>

      <div className="st-card st-month-detail">
        <div className="st-month-header">
          <button className="st-month-nav" onClick={goToPrevMonth}>←</button>
          <h2 className="st-month-title">
            Szczegóły miesiąca: {MONTH_NAMES_FULL[selectedDate.month]} {selectedDate.year}
            {isCurrentMonth && <span className="st-month-current-badge">bieżący</span>}
          </h2>
          <button className="st-month-nav" onClick={goToNextMonth} disabled={isCurrentMonth}>→</button>
        </div>

        {historyLoading && <p className="st-empty">⏳ Wczytuję starszą historię zleceń…</p>}
        {historyError && <p className="st-empty">⚠️ Nie udało się wczytać starszych zleceń – dane starszych miesięcy mogą być niepełne.</p>}
        <div className="st-trade-stats st-month-summary">
          <div><span className="st-trade-value">{monthCompleted.length}</span><span className="st-trade-label">Napraw ukończonych</span></div>
          <div><span className="st-trade-value">{monthRevenue} zł</span><span className="st-trade-label">Przychód z napraw</span></div>
          <div><span className={`st-trade-value ${monthProfit >= 0 ? 'st-good' : 'st-bad'}`}>{monthProfit >= 0 ? '+' : ''}{monthProfit} zł</span><span className="st-trade-label">Zysk z napraw</span></div>
          <div><span className="st-trade-value st-bad">{expensesSelectedMonth} zł</span><span className="st-trade-label">Koszty firmy</span></div>
        </div>
        <div className="st-trade-stats st-month-summary">
          <div><span className="st-trade-value">{monthTrade.boughtCount}</span><span className="st-trade-label">Telefonów kupionych</span></div>
          <div><span className="st-trade-value">{monthTrade.boughtCost} zł</span><span className="st-trade-label">Kwota zakupu telefonów</span></div>
          <div><span className="st-trade-value">{monthTrade.soldCount}</span><span className="st-trade-label">Telefonów sprzedanych</span></div>
          <div><span className="st-trade-value">{monthTrade.revenue} zł</span><span className="st-trade-label">Przychód ze sprzedaży</span></div>
          <div><span className={`st-trade-value ${monthTrade.profit >= 0 ? 'st-good' : 'st-bad'}`}>{monthTrade.profit >= 0 ? '+' : ''}{monthTrade.profit} zł</span><span className="st-trade-label">Zysk ze skupu</span></div>
        </div>

        <div className="st-row">
          <div className="st-month-sub">
            <h3 className="st-month-sub-title">Top marki (naprawy)</h3>
            {monthTopBrands.length === 0 ? <p className="st-empty">Brak danych w tym miesiącu</p> : (
              <div className="st-ranking">
                {monthTopBrands.map((b, i) => (
                  <div key={b.name} className="st-ranking-row">
                    <span className="st-ranking-pos">{i + 1}</span>
                    <span className="st-ranking-name">{b.name}</span>
                    <span className="st-ranking-count">{b.count}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="st-month-sub">
            <h3 className="st-month-sub-title">Najczęstsze usterki</h3>
            {monthTopFaults.length === 0 ? <p className="st-empty">Brak danych w tym miesiącu</p> : (
              <div className="st-ranking">
                {monthTopFaults.map((f, i) => (
                  <div key={f.name} className="st-ranking-row">
                    <span className="st-ranking-pos">{i + 1}</span>
                    <span className="st-ranking-name">{f.name}</span>
                    <span className="st-ranking-count">{f.count}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="st-row">
          <div className="st-month-sub">
            <h3 className="st-month-sub-title">Najlepiej sprzedające się modele</h3>
            {monthTopModels.length === 0 ? <p className="st-empty">Brak sprzedanych w tym miesiącu</p> : (
              <div className="st-ranking">
                {monthTopModels.map((m, i) => (
                  <div key={m.name} className="st-ranking-row">
                    <span className="st-ranking-pos">{i + 1}</span>
                    <span className="st-ranking-name">{m.name}</span>
                    <span className="st-ranking-count">{m.count} szt.</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="st-month-sub">
            <h3 className="st-month-sub-title">Średnia marża wg marki</h3>
            {monthAvgMargin.length === 0 ? <p className="st-empty">Brak sprzedanych w tym miesiącu</p> : (
              <div className="st-ranking">
                {monthAvgMargin.map((b, i) => (
                  <div key={b.brand} className="st-ranking-row">
                    <span className="st-ranking-pos">{i + 1}</span>
                    <span className="st-ranking-name">{b.brand} <span className="st-ranking-sub">({b.count} szt.)</span></span>
                    <span className={`st-ranking-count ${b.avgProfit >= 0 ? 'st-good' : 'st-bad'}`}>{b.avgProfit >= 0 ? '+' : ''}{b.avgProfit} zł</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <RepairPriceStats repairs={completed} selectedDate={selectedDate} monthLabel={`${MONTH_NAMES_FULL[selectedDate.month]} ${selectedDate.year}`} />

      <div className="st-row">
        <div className="st-card">
          <h2 className="st-section-title">Top 5 marek</h2>
          {topBrands.length === 0 ? <p className="st-empty">Brak danych</p> : (
            <div className="st-ranking">
              {topBrands.map((b, i) => (
                <div key={b.name} className="st-ranking-row">
                  <span className="st-ranking-pos">{i + 1}</span>
                  <span className="st-ranking-name">{b.name}</span>
                  <span className="st-ranking-count">{b.count}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="st-card">
          <h2 className="st-section-title">Najczęstsze usterki</h2>
          {topFaults.length === 0 ? <p className="st-empty">Brak danych</p> : (
            <div className="st-ranking">
              {topFaults.map((f, i) => (
                <div key={f.name} className="st-ranking-row">
                  <span className="st-ranking-pos">{i + 1}</span>
                  <span className="st-ranking-name">{f.name}</span>
                  <span className="st-ranking-count">{f.count}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="st-card">
        <h2 className="st-section-title">Skup telefonów</h2>
        <div className="st-trade-stats">
          <div><span className="st-trade-value">{soldPhones.length}</span><span className="st-trade-label">Sprzedanych</span></div>
          <div><span className="st-trade-value">{phones.length - soldPhones.length}</span><span className="st-trade-label">W magazynie</span></div>
          <div><span className="st-trade-value">{tradeRevenue} zł</span><span className="st-trade-label">Przychód ze sprzedaży</span></div>
          <div><span className={`st-trade-value ${tradeProfit >= 0 ? 'st-good' : 'st-bad'}`}>{tradeProfit >= 0 ? '+' : ''}{tradeProfit} zł</span><span className="st-trade-label">Zysk ze sprzedaży</span></div>
        </div>
      </div>

      <div className="st-row">
        <div className="st-card">
          <h2 className="st-section-title">Najlepiej sprzedające się modele</h2>
          {topSellingModels.length === 0 ? <p className="st-empty">Brak danych</p> : (
            <div className="st-ranking">
              {topSellingModels.map((m, i) => (
                <div key={m.name} className="st-ranking-row">
                  <span className="st-ranking-pos">{i + 1}</span>
                  <span className="st-ranking-name">{m.name}</span>
                  <span className="st-ranking-count">{m.count} szt.</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="st-card">
          <h2 className="st-section-title">Średnia marża wg marki</h2>
          {avgProfitByBrand.length === 0 ? <p className="st-empty">Brak danych</p> : (
            <div className="st-ranking">
              {avgProfitByBrand.map((b, i) => (
                <div key={b.brand} className="st-ranking-row">
                  <span className="st-ranking-pos">{i + 1}</span>
                  <span className="st-ranking-name">{b.brand} <span className="st-ranking-sub">({b.count} szt.)</span></span>
                  <span className={`st-ranking-count ${b.avgProfit >= 0 ? 'st-good' : 'st-bad'}`}>{b.avgProfit >= 0 ? '+' : ''}{b.avgProfit} zł</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="st-card">
        <h2 className="st-section-title">Zysk ze skupu miesiąc po miesiącu ({new Date().getFullYear()})</h2>
        <div className="st-bars">
          {monthlyTradeData.map((m) => (
            <div key={m.month} className="st-bar-col" title={`${m.month}: ${m.profit} zł, ${m.count} sprzedanych`}>
              <div
                className={`st-bar ${m.profit >= 0 ? 'st-bar-good' : 'st-bar-bad'}`}
                style={{ height: `${Math.max(4, (Math.abs(m.profit) / maxMonthlyProfit) * 100)}px` }}
              />
              <span className="st-bar-label">{m.month.slice(0, 3)}</span>
            </div>
          ))}
        </div>
      </div>

      {stalePhones.length > 0 && (
        <div className="st-card st-stale-card">
          <h2 className="st-section-title">⚠️ Zalegające w magazynie (ponad 30 dni bez ruchu)</h2>
          <div className="st-stale-list">
            {stalePhones.map((p) => (
              <div key={p.id} className="st-stale-row">
                <span className="st-stale-name">{p.brand} {p.model}</span>
                <span className="st-stale-days">{daysSince(p.boughtAt)} dni · kupiony {fmtDate(p.boughtAt)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function PeriodCard({ label, data, tradeProfit = 0, expenses = 0 }) {
  const netProfit = data.profit + tradeProfit - expenses;
  return (
    <div className="st-period-card">
      <h3 className="st-period-label">{label}</h3>
      <div className="st-period-grid">
        <div><span className="st-period-value">{data.count}</span><span className="st-period-sub">napraw</span></div>
        <div><span className="st-period-value">{data.revenue} zł</span><span className="st-period-sub">przychód</span></div>
        <div><span className="st-period-value st-good">{data.profit} zł</span><span className="st-period-sub">zysk napraw</span></div>
      </div>
      <div className="st-period-combined">
        <span className={netProfit >= 0 ? 'st-good' : 'st-bad'}>{netProfit >= 0 ? '+' : ''}{netProfit} zł</span>
        <span className="st-period-combined-label">
          {expenses > 0 ? `zysk netto (+ skup, − koszty ${expenses} zł)` : 'łączny zysk (+ skup)'}
        </span>
      </div>
    </div>
  );
}

// ---- Ceny i marże wg rodzaju naprawy ----

const PRICE_PERIODS = [
  { id: '3m', label: 'Ostatnie 3 mies.', months: 3 },
  { id: '12m', label: 'Ostatnie 12 mies.', months: 12 },
  { id: 'all', label: 'Cała historia' },
  { id: 'month', label: 'Wybrany miesiąc' },
];

const issuedAt = (r) => new Date(r.issuedAt || r.statusUpdatedAt || r.createdAt);

function RepairPriceStats({ repairs, selectedDate, monthLabel }) {
  const [period, setPeriod] = useState('12m');
  const [open, setOpen] = useState(null);

  const rows = useMemo(() => {
    const def = PRICE_PERIODS.find((p) => p.id === period);
    let list = repairs;
    if (def.months) {
      const from = new Date();
      from.setMonth(from.getMonth() - def.months);
      list = repairs.filter((r) => issuedAt(r) >= from);
    } else if (period === 'month') {
      list = repairs.filter((r) => {
        const d = issuedAt(r);
        return d.getFullYear() === selectedDate.year && d.getMonth() === selectedDate.month;
      });
    }
    return getRepairPriceStats(list);
  }, [repairs, period, selectedDate]);

  const zl = (n) => `${n} zł`;
  const margin = (r) => (r.withPartsCount
    ? <><span className={r.avgMargin >= 0 ? 'st-good' : 'st-bad'}>{zl(r.avgMargin)}</span> <span className="st-ranking-sub">({r.avgMarginPct}%, z {r.withPartsCount})</span></>
    : <span className="st-ranking-sub">brak kosztów części</span>);

  return (
    <div className="st-card st-price-card">
      <div className="st-price-head">
        <h2 className="st-section-title">Ceny i marże wg rodzaju naprawy</h2>
        <div className="st-price-periods" role="group" aria-label="Okres">
          {PRICE_PERIODS.map((p) => (
            <button key={p.id} type="button" className={`st-chip ${period === p.id ? 'st-chip-on' : ''}`} onClick={() => setPeriod(p.id)}>
              {p.id === 'month' ? monthLabel : p.label}
            </button>
          ))}
        </div>
      </div>
      <p className="st-price-note">
        Tylko zlecenia wydane klientowi. Cena = ile zapłacił klient (bez napraw za 0 zł). Marża liczona tylko ze zleceń,
        w których wpisano koszt części. Rodzaj naprawy rozpoznawany jest z opisu usterki — kliknij wiersz, żeby zobaczyć marki i przykładowe opisy.
      </p>
      {rows.length === 0 ? <p className="st-empty">Brak wydanych napraw w tym okresie</p> : (
        <div className="st-price-scroll">
          <table className="st-price-table">
            <thead>
              <tr>
                <th>Rodzaj naprawy</th>
                <th>Ile</th>
                <th>Najniższa</th>
                <th title="Co czwarta naprawa była tańsza – dobra podstawa do ceny „od”">Typowo od</th>
                <th>Mediana</th>
                <th>Średnia</th>
                <th>Śr. koszt części</th>
                <th>Śr. marża</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <FragmentRow key={r.id} r={r} isOpen={open === r.id} onToggle={() => setOpen(open === r.id ? null : r.id)} zl={zl} margin={margin} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function FragmentRow({ r, isOpen, onToggle, zl, margin }) {
  return (
    <>
      <tr className={`st-price-row ${isOpen ? 'is-open' : ''}`} onClick={onToggle} tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggle(); } }} aria-expanded={isOpen}>
        <td className="st-price-name"><span className="st-price-caret">{isOpen ? '▾' : '▸'}</span>{r.label}</td>
        <td>{r.count}</td>
        <td>{r.pricedCount ? zl(r.minPrice) : '—'}</td>
        <td>{r.pricedCount ? zl(r.p25Price) : '—'}</td>
        <td><strong>{r.pricedCount ? zl(r.medianPrice) : '—'}</strong></td>
        <td>{r.pricedCount ? zl(r.avgPrice) : '—'}</td>
        <td>{r.withPartsCount ? zl(r.avgParts) : '—'}</td>
        <td>{margin(r)}</td>
      </tr>
      {isOpen && r.brands.map((b) => (
        <tr key={b.brand} className="st-price-sub">
          <td className="st-price-name">{b.brand}</td>
          <td>{b.count}</td>
          <td>{b.pricedCount ? zl(b.minPrice) : '—'}</td>
          <td>{b.pricedCount ? zl(b.p25Price) : '—'}</td>
          <td>{b.pricedCount ? zl(b.medianPrice) : '—'}</td>
          <td>{b.pricedCount ? zl(b.avgPrice) : '—'}</td>
          <td>{b.withPartsCount ? zl(b.avgParts) : '—'}</td>
          <td>{margin(b)}</td>
        </tr>
      ))}
      {isOpen && r.examples.length > 0 && (
        <tr className="st-price-sub st-price-examples">
          <td colSpan={8}>Przykładowe opisy: {r.examples.map((e) => `„${e}”`).join(', ')}</td>
        </tr>
      )}
    </>
  );
}
