import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import useStore from '../store/useStore';
import { calcRevenue } from '../utils/calcProfit';
import { formatDateShort } from '../utils/formatDate';
import STATUS, { statusIcons } from '../constants/statuses';
import './CustomerCardPage.css';

const STATUS_TONE = {
  [STATUS.ACCEPTED]: 'wait', [STATUS.DIAGNOSIS]: 'wait', [STATUS.REPAIR]: 'info',
  [STATUS.PARTS]: 'info', [STATUS.READY]: 'good', [STATUS.DELIVERED]: 'neutral', [STATUS.CANCELLED]: 'warn',
};

export default function CustomerCardPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const currentUser = useStore((s) => s.currentUser);
  const customer = useStore((s) => s.getUserById(id));
  const repairs = useStore((s) => s.getRepairsByCustomer(id));
  const deleteUser = useStore((s) => s.deleteUser);

  const isAdmin = currentUser?.role === 'admin';
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleDelete = async () => {
    try {
      await deleteUser(id);
      navigate('/klienci');
    } catch (error) {
      alert('Nie udało się usunąć klienta: ' + error.message);
    }
  };

  if (!customer) {
    return (
      <div className="cc-page">
        <div className="cc-notfound">
          <p>Nie znaleziono klienta.</p>
          <button className="cc-btn-ghost" onClick={() => navigate('/klienci')}>← Wróć do listy klientów</button>
        </div>
      </div>
    );
  }

  const completed  = repairs.filter((r) => r.status === STATUS.DELIVERED);
  const active     = repairs.filter((r) => ![STATUS.DELIVERED, STATUS.CANCELLED].includes(r.status));
  const totalValue = calcRevenue(completed);

  const sortedRepairs = [...repairs].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  return (
    <div className="cc-page">
      <button className="cc-back" onClick={() => navigate(-1)}>← Wróć</button>

      <div className="cc-header-card">
        <div className="cc-avatar">{customer.name?.[0]?.toUpperCase() || '?'}</div>
        <div>
          <h1 className="cc-name">{customer.name}</h1>
          <p className="cc-meta">{customer.phone || 'Brak numeru'} {customer.email ? `· ${customer.email}` : ''}</p>
        </div>
      </div>

      <div className="cc-stats">
        <div className="cc-stat"><span className="cc-stat-value">{repairs.length}</span><span className="cc-stat-label">Łącznie zleceń</span></div>
        <div className="cc-stat"><span className="cc-stat-value">{active.length}</span><span className="cc-stat-label">Aktywne</span></div>
        <div className="cc-stat"><span className="cc-stat-value">{completed.length}</span><span className="cc-stat-label">Zakończone</span></div>
        {isAdmin && (
          <div className="cc-stat"><span className="cc-stat-value">{totalValue} zł</span><span className="cc-stat-label">Wartość</span></div>
        )}
      </div>

      <h2 className="cc-section-title">Historia zleceń</h2>
      <div className="cc-table-wrap">
        {sortedRepairs.length === 0 ? (
          <div className="cc-empty">Brak zleceń tego klienta</div>
        ) : (
          <table className="cc-table">
            <tbody>
              {sortedRepairs.map((r) => {
                const tone = STATUS_TONE[r.status] || 'neutral';
                return (
                  <tr key={r.id} className="cc-row" onClick={() => navigate(`/zlecenia/${r.id}`)}>
                    <td className="cc-td-mono">#{r.displayNumber || r.id}</td>
                    <td>
                      <div className="cc-device">{r.brand} {r.model}</div>
                      <div className="cc-desc">{r.description}</div>
                    </td>
                    <td><span className={`cc-badge cc-badge-${tone}`}>{statusIcons[r.status]} {r.status}</span></td>
                    <td className="cc-td-mono cc-td-muted">{formatDateShort(r.createdAt)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {isAdmin && (
        <div className="cc-card cc-danger-card">
          {!confirmDelete ? (
            <button className="cc-btn-danger-ghost" onClick={() => setConfirmDelete(true)}>
              Usuń klienta
            </button>
          ) : (
            <>
              <p className="cc-danger-text">
                Tej operacji nie da się cofnąć. Historia zleceń zostanie zachowana,
                ale nie będzie już przypisana do żadnego klienta.
                {active.length > 0 && ' Ten klient ma aktywne, niezakończone zlecenia!'}
              </p>
              <div className="cc-danger-actions">
                <button className="cc-btn-ghost" onClick={() => setConfirmDelete(false)}>Anuluj</button>
                <button className="cc-btn-danger" onClick={handleDelete}>Usuń trwale</button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
