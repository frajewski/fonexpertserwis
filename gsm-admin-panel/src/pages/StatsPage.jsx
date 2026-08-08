import { useState } from 'react';
import useStore from '../store/useStore';
import { getStatsByPeriod, getTopBrands, getTopFaults, filterByMonth, filterDeliveredByMonth, calcRevenue, calcProfit } from '../utils/calcProfit';
import { getTopSellingModels, getAvgProfitByBrand, getStalePhones, getMonthlyTradeData, getTradeStatsForMonth } from '../utils/calcTradeStats';
import STATUS from '../constants/statuses';
import './StatsPage.css';

const fmtDate = (iso) => iso ? new Date(iso).toLocaleDateString('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' }) : '—';
const daysSince = (iso) => Math.floor((Date.now() - new Date(iso).getTime()) / (24 * 60 * 60 * 1000));

const MONTH_NAMES_FULL = [
  'Styczeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec',
  'Lipiec', 'Sierpień', 'Wrzesień', 'Październik', 'Listopad', 'Grudzień',
];

export default function StatsPage() {
  const repairs = useStore((s) => s.getVisibleRepairs());
  const phones = useStore((s) => s.phones);

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
  const monthTopModels = getTopSellingModels(monthTrade.soldPhones, 5);
  const monthAvgMargin = getAvgProfitByBrand(monthTrade.soldPhones);

  const completed = repairs.filter((r) => r.status === STATUS.DELIVERED);
  const stats = getStatsByPeriod(completed);
  const topBrands = getTopBrands(completed).slice(0, 5);
  const topFaults = getTopFaults(completed);

  const soldPhones = phones.filter((p) => p.status === 'Sprzedany');
  const tradeProfit = soldPhones.reduce((sum, p) => sum + ((p.sellPrice || 0) - (p.buyPrice || 0)), 0);

  const topSellingModels = getTopSellingModels(phones, 5);
  const avgProfitByBrand = getAvgProfitByBrand(phones);
  const stalePhones = getStalePhones(phones, 30);
  const monthlyTradeData = getMonthlyTradeData(phones);
  const maxMonthlyProfit = Math.max(1, ...monthlyTradeData.map((m) => Math.abs(m.profit)));

  return (
    <div className="st-page">
      <h1 className="st-title">Statystyki</h1>

      <div className="st-periods">
        <PeriodCard label="Dziś" data={stats.today} />
        <PeriodCard label="Ten miesiąc" data={stats.thisMonth} />
        <PeriodCard label="Ten rok" data={stats.thisYear} />
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

        <div className="st-trade-stats st-month-summary">
          <div><span className="st-trade-value">{monthCompleted.length}</span><span className="st-trade-label">Napraw ukończonych</span></div>
          <div><span className="st-trade-value">{monthRevenue} zł</span><span className="st-trade-label">Przychód z napraw</span></div>
          <div><span className={`st-trade-value ${monthProfit >= 0 ? 'st-good' : 'st-bad'}`}>{monthProfit >= 0 ? '+' : ''}{monthProfit} zł</span><span className="st-trade-label">Zysk z napraw</span></div>
        </div>
        <div className="st-trade-stats st-month-summary">
          <div><span className="st-trade-value">{monthTrade.boughtCount}</span><span className="st-trade-label">Telefonów kupionych</span></div>
          <div><span className="st-trade-value">{monthTrade.soldCount}</span><span className="st-trade-label">Telefonów sprzedanych</span></div>
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

function PeriodCard({ label, data }) {
  return (
    <div className="st-period-card">
      <h3 className="st-period-label">{label}</h3>
      <div className="st-period-grid">
        <div><span className="st-period-value">{data.count}</span><span className="st-period-sub">napraw</span></div>
        <div><span className="st-period-value">{data.revenue} zł</span><span className="st-period-sub">przychód</span></div>
        <div><span className="st-period-value st-good">{data.profit} zł</span><span className="st-period-sub">zysk</span></div>
      </div>
    </div>
  );
}
