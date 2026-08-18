import { useState, useMemo } from 'react';
import useStore from '../store/useStore';
import expenseCategories, { expenseCategoryLabels } from '../constants/expenseCategories';
import './CostsPage.css';

const currentYearMonth = () => new Date().toISOString().slice(0, 7);

const MONTH_NAMES = [
  'Styczeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec',
  'Lipiec', 'Sierpień', 'Wrzesień', 'Październik', 'Listopad', 'Grudzień',
];

const fmtMonthLabel = (yearMonth) => {
  const [year, month] = yearMonth.split('-').map(Number);
  return `${MONTH_NAMES[month - 1]} ${year}`;
};

const shiftMonth = (yearMonth, delta) => {
  const [year, month] = yearMonth.split('-').map(Number);
  const d = new Date(year, month - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

export default function CostsPage() {
  const expenses = useStore((s) => s.expenses);
  const addExpense = useStore((s) => s.addExpense);
  const updateExpense = useStore((s) => s.updateExpense);
  const deleteExpense = useStore((s) => s.deleteExpense);

  const [selectedMonth, setSelectedMonth] = useState(currentYearMonth());
  const [showAddForm, setShowAddForm] = useState(false);

  const [newCategory, setNewCategory] = useState('accounting');
  const [newName, setNewName] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [newNotes, setNewNotes] = useState('');

  const [editingId, setEditingId] = useState(null);
  const [editAmount, setEditAmount] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  const isCurrentMonth = selectedMonth === currentYearMonth();

  const monthExpenses = useMemo(
    () => expenses.filter((e) => e.month === selectedMonth).sort((a, b) => (b.amount || 0) - (a.amount || 0)),
    [expenses, selectedMonth]
  );

  const monthTotal = monthExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);

  const byCategory = useMemo(() => {
    const totals = {};
    monthExpenses.forEach((e) => {
      totals[e.category] = (totals[e.category] || 0) + (e.amount || 0);
    });
    return Object.entries(totals).sort((a, b) => b[1] - a[1]);
  }, [monthExpenses]);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!newName.trim() || !newAmount) return;
    await addExpense({
      category: newCategory,
      name: newName.trim(),
      amount: parseFloat(newAmount) || 0,
      month: selectedMonth,
      notes: newNotes.trim(),
    });
    setNewName(''); setNewAmount(''); setNewNotes('');
    setShowAddForm(false);
  };

  const handleStartEdit = (expense) => {
    setEditingId(expense.id);
    setEditAmount(String(expense.amount || 0));
  };

  const handleSaveEdit = async (id) => {
    await updateExpense(id, { amount: parseFloat(editAmount) || 0 });
    setEditingId(null);
  };

  const handleDelete = async (id) => {
    await deleteExpense(id);
    setConfirmDeleteId(null);
  };

  return (
    <div className="ex-page">
      <header className="ex-header">
        <div>
          <h1 className="ex-title">Koszty utrzymania firmy</h1>
          <p className="ex-count">Księgowość, ZUS, VAT, PIT, reklama, materiały eksploatacyjne — wpisz tu, żeby zysk w Statystykach był rzeczywisty, nie tylko z napraw i skupu.</p>
        </div>
        <button className="ex-new-btn" onClick={() => setShowAddForm((v) => !v)}>
          {showAddForm ? '✕ Anuluj' : '+ Dodaj koszt'}
        </button>
      </header>

      <div className="ex-month-nav">
        <button className="ex-month-btn" onClick={() => setSelectedMonth((m) => shiftMonth(m, -1))}>←</button>
        <h2 className="ex-month-label">
          {fmtMonthLabel(selectedMonth)}
          {isCurrentMonth && <span className="ex-month-badge">bieżący</span>}
        </h2>
        <button className="ex-month-btn" onClick={() => setSelectedMonth((m) => shiftMonth(m, 1))} disabled={isCurrentMonth}>→</button>
      </div>

      {showAddForm && (
        <form className="ex-add-form" onSubmit={handleAdd}>
          <select className="ex-input ex-input-sm" value={newCategory} onChange={(e) => setNewCategory(e.target.value)}>
            {expenseCategories.map((c) => <option key={c.value} value={c.value}>{c.emoji} {c.label}</option>)}
          </select>
          <input className="ex-input" placeholder="Nazwa / opis (np. Faktura za księgowość - lipiec)" value={newName} onChange={(e) => setNewName(e.target.value)} required />
          <input className="ex-input ex-input-sm" type="number" placeholder="Kwota (zł)" value={newAmount} onChange={(e) => setNewAmount(e.target.value)} required />
          <input className="ex-input" placeholder="Notatki (opcjonalnie)" value={newNotes} onChange={(e) => setNewNotes(e.target.value)} />
          <button className="ex-new-btn" type="submit">Zapisz — do {fmtMonthLabel(selectedMonth)}</button>
        </form>
      )}

      <div className="ex-summary">
        <div className="ex-summary-total">
          <span className="ex-summary-value">{monthTotal} zł</span>
          <span className="ex-summary-label">Suma kosztów w tym miesiącu</span>
        </div>
        {byCategory.length > 0 && (
          <div className="ex-summary-breakdown">
            {byCategory.map(([cat, amount]) => (
              <span key={cat} className="ex-summary-chip">
                {expenseCategoryLabels[cat] || cat}: <strong>{amount} zł</strong>
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="ex-table-wrap">
        <table className="ex-table">
          <thead>
            <tr>
              <th>Kategoria</th>
              <th>Nazwa</th>
              <th>Kwota</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {monthExpenses.map((e) => {
              const editing = editingId === e.id;
              return (
                <tr key={e.id}>
                  <td>{expenseCategoryLabels[e.category] || e.category}</td>
                  <td>
                    <div className="ex-expense-name">{e.name}</div>
                    {e.notes && <div className="ex-expense-notes">{e.notes}</div>}
                  </td>
                  <td>
                    {editing ? (
                      <input className="ex-input ex-input-sm" type="number" value={editAmount} onChange={(ev) => setEditAmount(ev.target.value)} />
                    ) : `${e.amount || 0} zł`}
                  </td>
                  <td className="ex-actions">
                    {editing ? (
                      <>
                        <button className="ex-link-btn" onClick={() => handleSaveEdit(e.id)}>Zapisz</button>
                        <button className="ex-link-btn" onClick={() => setEditingId(null)}>Anuluj</button>
                      </>
                    ) : (
                      <>
                        <button className="ex-link-btn" onClick={() => handleStartEdit(e)}>Edytuj</button>
                        {confirmDeleteId === e.id ? (
                          <>
                            <button className="ex-link-btn ex-link-danger" onClick={() => handleDelete(e.id)}>Na pewno</button>
                            <button className="ex-link-btn" onClick={() => setConfirmDeleteId(null)}>Anuluj</button>
                          </>
                        ) : (
                          <button className="ex-link-btn ex-link-danger" onClick={() => setConfirmDeleteId(e.id)}>Usuń</button>
                        )}
                      </>
                    )}
                  </td>
                </tr>
              );
            })}
            {monthExpenses.length === 0 && (
              <tr><td colSpan={4} className="ex-empty">Brak kosztów w tym miesiącu</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
