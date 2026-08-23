import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useStore from '../store/useStore';
import STATUS, { terminalStatuses } from '../constants/statuses';
import { getStaleRepairs, filterDeliveredToday, filterDeliveredThisMonth, calcProfit, calcRevenue } from '../utils/calcProfit';
import { getTradeProfitToday, getTradeProfitThisMonth } from '../utils/calcTradeStats';
import './DashboardPage.css';

const currentYearMonth = () => new Date().toISOString().slice(0, 7);

export default function DashboardPage() {
  const navigate = useNavigate();
  const currentUser = useStore((s) => s.currentUser);
  const repairs = useStore((s) => s.getVisibleRepairs());
  const phones = useStore((s) => s.phones);
  const parts = useStore((s) => s.parts);
  const expenses = useStore((s) => s.expenses);
  const tasks = useStore((s) => s.tasks);
  const addTask = useStore((s) => s.addTask);
  const toggleTaskDone = useStore((s) => s.toggleTaskDone);
  const deleteTask = useStore((s) => s.deleteTask);

  const [newTaskText, setNewTaskText] = useState('');
  const [newTaskDate, setNewTaskDate] = useState(() => new Date().toISOString().slice(0, 10));

  const isAdmin = currentUser?.role === 'admin';
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Dzień dobry' : hour < 18 ? 'Dzień dobry' : 'Dobry wieczór';

  // Alerty - dokładnie ta sama logika co banery na liście Zleceń, tylko
  // zebrana w jednym miejscu, żeby nie trzeba było wchodzić na kilka
  // podstron, żeby zobaczyć "co wymaga uwagi dzisiaj"
  const lowStockParts = parts.filter((p) => (p.quantity || 0) <= (p.minQuantity || 0));
  const repairsToOrder = repairs.filter((r) => r.status === STATUS.ORDER_PARTS);
  const staleRepairs = getStaleRepairs(repairs, terminalStatuses, 5);
  const todayDay = new Date().getDay();
  const isWeekend = todayDay === 0 || todayDay === 6;

  // Dzisiejszy zysk (naprawy + skup) - bez kosztów firmy, bo te liczą się
  // per-miesiąc, nie per-dzień (tak samo jak w kartach Statystyk)
  const todayCompleted = filterDeliveredToday(repairs);
  const todayRepairProfit = calcProfit(todayCompleted);
  const todayTradeProfit = isAdmin ? getTradeProfitToday(phones) : 0;
  const todayProfit = todayRepairProfit + todayTradeProfit;

  // Ten miesiąc - po kosztach, ten sam sposób liczenia co w Statystykach
  const monthCompleted = filterDeliveredThisMonth(repairs);
  const monthRevenue = calcRevenue(monthCompleted);
  const monthRepairProfit = calcProfit(monthCompleted);
  const monthTradeProfit = isAdmin ? getTradeProfitThisMonth(phones) : 0;
  const currentYM = currentYearMonth();
  const monthExpenses = isAdmin ? expenses.filter((e) => e.month === currentYM).reduce((s, e) => s + (e.amount || 0), 0) : 0;
  const monthNetProfit = monthRepairProfit + monthTradeProfit - monthExpenses;

  const alertsCount = lowStockParts.length + repairsToOrder.length + staleRepairs.length;

  const todayISO = new Date().toISOString().slice(0, 10);
  const tomorrowISO = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const overdueTasks = tasks.filter((t) => !t.done && t.dueDate < todayISO);
  const todayTasks = tasks.filter((t) => !t.done && t.dueDate === todayISO);
  const tomorrowTasks = tasks.filter((t) => !t.done && t.dueDate === tomorrowISO);

  const handleAddTask = async (e) => {
    e.preventDefault();
    if (!newTaskText.trim()) return;
    await addTask({ text: newTaskText.trim(), dueDate: newTaskDate });
    setNewTaskText('');
  };

  return (
    <div className="db-page">
      <h1 className="db-title">{greeting}, {currentUser?.name?.split(' ')[0] || ''}</h1>

      <div className="db-today-card">
        <div className="db-today-main">
          <span className="db-today-label">Dzisiejsze naprawy</span>
          <span className="db-today-value">{todayCompleted.length}</span>
        </div>
        {isAdmin && (
          <div className="db-today-main">
            <span className="db-today-label">Zysk dzisiaj</span>
            <span className={`db-today-value ${todayProfit >= 0 ? 'db-good' : 'db-bad'}`}>
              {todayProfit >= 0 ? '+' : ''}{todayProfit} zł
            </span>
          </div>
        )}
        {repairsToOrder.length === 0 && staleRepairs.length === 0 && lowStockParts.length === 0 && (
          <div className="db-today-main">
            <span className="db-today-label">Status</span>
            <span className="db-today-value db-good">✓ Wszystko pod kontrolą</span>
          </div>
        )}
      </div>

      <div className="db-tasks">
        <h2 className="db-section-title">Zadania</h2>

        <form className="db-task-add" onSubmit={handleAddTask}>
          <input
            className="db-task-input"
            placeholder="Co trzeba zrobić…"
            value={newTaskText}
            onChange={(e) => setNewTaskText(e.target.value)}
          />
          <div className="db-task-date-toggle">
            <button
              type="button"
              className={`db-task-date-btn ${newTaskDate === todayISO ? 'db-task-date-active' : ''}`}
              onClick={() => setNewTaskDate(todayISO)}
            >
              Dziś
            </button>
            <button
              type="button"
              className={`db-task-date-btn ${newTaskDate === tomorrowISO ? 'db-task-date-active' : ''}`}
              onClick={() => setNewTaskDate(tomorrowISO)}
            >
              Jutro
            </button>
          </div>
          <button className="db-task-submit" type="submit">Dodaj</button>
        </form>

        {overdueTasks.length > 0 && (
          <div className="db-task-group">
            <span className="db-task-group-label db-bad">⚠️ Zaległe</span>
            {overdueTasks.map((t) => (
              <div key={t.id} className="db-task-row">
                <input type="checkbox" checked={false} onChange={() => toggleTaskDone(t.id, true)} />
                <span className="db-task-text">{t.text}</span>
                <span className="db-task-due db-bad">{t.dueDate}</span>
                <button className="db-task-delete" onClick={() => deleteTask(t.id)}>✕</button>
              </div>
            ))}
          </div>
        )}

        {todayTasks.length > 0 && (
          <div className="db-task-group">
            <span className="db-task-group-label">Dziś</span>
            {todayTasks.map((t) => (
              <div key={t.id} className="db-task-row">
                <input type="checkbox" checked={false} onChange={() => toggleTaskDone(t.id, true)} />
                <span className="db-task-text">{t.text}</span>
                <button className="db-task-delete" onClick={() => deleteTask(t.id)}>✕</button>
              </div>
            ))}
          </div>
        )}

        {tomorrowTasks.length > 0 && (
          <div className="db-task-group">
            <span className="db-task-group-label">Jutro</span>
            {tomorrowTasks.map((t) => (
              <div key={t.id} className="db-task-row">
                <input type="checkbox" checked={false} onChange={() => toggleTaskDone(t.id, true)} />
                <span className="db-task-text">{t.text}</span>
                <button className="db-task-delete" onClick={() => deleteTask(t.id)}>✕</button>
              </div>
            ))}
          </div>
        )}

        {overdueTasks.length === 0 && todayTasks.length === 0 && tomorrowTasks.length === 0 && (
          <p className="db-empty">Brak zadań na dziś/jutro.</p>
        )}
      </div>

      {alertsCount > 0 && (
        <div className="db-alerts">
          <h2 className="db-section-title">Wymaga uwagi ({alertsCount})</h2>

          {lowStockParts.length > 0 && (
            <button className="db-alert-row" onClick={() => navigate('/magazyn')}>
              <span className="db-alert-icon">📦</span>
              <span className="db-alert-text">
                <strong>{lowStockParts.length} {lowStockParts.length === 1 ? 'część kończy się' : 'części kończy się'}</strong> w magazynie
              </span>
              <span className="db-alert-arrow">→</span>
            </button>
          )}

          {repairsToOrder.length > 0 && (
            <button className="db-alert-row" onClick={() => navigate('/')}>
              <span className="db-alert-icon">📞</span>
              <span className="db-alert-text">
                <strong>{repairsToOrder.length} {repairsToOrder.length === 1 ? 'zlecenie czeka' : 'zleceń czeka'} na zamówienie części</strong>
                {isWeekend ? ' — hurtownie w weekend zwykle nie pracują' : ' — dziś dzień roboczy, dobra okazja żeby zadzwonić'}
              </span>
              <span className="db-alert-arrow">→</span>
            </button>
          )}

          {staleRepairs.length > 0 && (
            <button className="db-alert-row" onClick={() => navigate('/')}>
              <span className="db-alert-icon">⏳</span>
              <span className="db-alert-text">
                <strong>{staleRepairs.length} {staleRepairs.length === 1 ? 'zlecenie stoi' : 'zleceń stoi'}</strong> bez zmiany statusu od ponad 5 dni
              </span>
              <span className="db-alert-arrow">→</span>
            </button>
          )}
        </div>
      )}

      <div className="db-actions">
        <h2 className="db-section-title">Szybkie akcje</h2>
        <div className="db-actions-grid">
          <button className="db-action-btn" onClick={() => navigate('/zlecenia/nowe')}>
            <span className="db-action-icon">📥</span>
            <span>Nowe zlecenie</span>
          </button>
          <button className="db-action-btn" onClick={() => navigate('/skup/nowy')}>
            <span className="db-action-icon">📱</span>
            <span>Dodaj telefon</span>
          </button>
          <button className="db-action-btn" onClick={() => navigate('/klienci')}>
            <span className="db-action-icon">👤</span>
            <span>Klienci</span>
          </button>
          {isAdmin && (
            <button className="db-action-btn" onClick={() => navigate('/koszty')}>
              <span className="db-action-icon">💸</span>
              <span>Dodaj koszt</span>
            </button>
          )}
        </div>
      </div>

      {isAdmin && (
        <button className="db-month-card" onClick={() => navigate('/statystyki')}>
          <div>
            <h2 className="db-section-title" style={{ marginBottom: 4 }}>Ten miesiąc</h2>
            <span className="db-month-sub">{monthCompleted.length} napraw · {monthRevenue} zł przychodu</span>
          </div>
          <div className="db-month-profit">
            <span className={monthNetProfit >= 0 ? 'db-good' : 'db-bad'}>
              {monthNetProfit >= 0 ? '+' : ''}{monthNetProfit} zł
            </span>
            <span className="db-month-profit-label">zysk po kosztach →</span>
          </div>
        </button>
      )}
    </div>
  );
}
