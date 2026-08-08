import { useState } from 'react';
import useStore from '../store/useStore';
import { ROLES } from '../constants/roles';
import './UsersPage.css';

const ROLE_LABELS = { [ROLES.ADMIN]: 'Administrator', [ROLES.WORKER]: 'Pracownik', [ROLES.CUSTOMER]: 'Klient' };

export default function UsersPage() {
  const currentUser = useStore((s) => s.currentUser);
  const allUsers = useStore((s) => s.getAllUsers()).filter((u) => u.id !== currentUser?.id);
  const updateUserRole = useStore((s) => s.updateUserRole);

  const [filter, setFilter] = useState(null);
  const filtered = filter ? allUsers.filter((u) => u.role === filter) : allUsers;

  const handleRoleChange = async (user, newRole) => {
    if (newRole === user.role) return;
    if (!confirm(`Zmienić rolę ${user.name} na "${ROLE_LABELS[newRole]}"?`)) return;
    await updateUserRole(user.id, newRole);
  };

  return (
    <div className="us-page">
      <header className="us-header">
        <h1 className="us-title">Użytkownicy</h1>
        <p className="us-count">{filtered.length} z {allUsers.length}</p>
      </header>

      <div className="us-chips">
        <button className={`us-chip ${!filter ? 'us-chip-active' : ''}`} onClick={() => setFilter(null)}>Wszyscy</button>
        {Object.values(ROLES).map((r) => (
          <button key={r} className={`us-chip ${filter === r ? 'us-chip-active' : ''}`} onClick={() => setFilter(filter === r ? null : r)}>
            {ROLE_LABELS[r]}
          </button>
        ))}
      </div>

      <div className="us-table-wrap">
        <table className="us-table">
          <thead><tr><th>Użytkownik</th><th>Kontakt</th><th>Rola</th></tr></thead>
          <tbody>
            {filtered.map((u) => (
              <tr key={u.id} className="us-row">
                <td className="us-name">{u.name}{u.isWalkIn && <span className="us-walkin"> · bez konta</span>}</td>
                <td className="us-td-muted">{u.phone || '—'} {u.email ? `· ${u.email}` : ''}</td>
                <td>
                  <select className="us-select" value={u.role} onChange={(e) => handleRoleChange(u, e.target.value)} disabled={u.isWalkIn}>
                    {Object.values(ROLES).filter((r) => r !== ROLES.ADMIN).map((r) => (
                      <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                    ))}
                    {u.role === ROLES.ADMIN && <option value={ROLES.ADMIN}>{ROLE_LABELS[ROLES.ADMIN]}</option>}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <div className="us-empty">Brak użytkowników</div>}
      </div>
    </div>
  );
}
