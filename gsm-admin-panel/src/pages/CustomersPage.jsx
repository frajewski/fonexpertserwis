import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import useStore from '../store/useStore';
import './CustomersPage.css';

// Usuwa wszystko poza cyframi i wiodące "48" (kod kraju), żeby "+48 600 123 456",
// "600-123-456" i "600123456" trafiały na siebie niezależnie od formatowania.
const normalizePhone = (v) => (v || '').replace(/\D/g, '').replace(/^48/, '');

export default function CustomersPage() {
  const navigate = useNavigate();
  const customers = useStore((s) => s.getCustomers());
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    const qPhone = normalizePhone(search);
    return [...customers]
      .filter((c) =>
        !q ||
        c.name?.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q) ||
        (qPhone.length >= 3 && normalizePhone(c.phone).includes(qPhone))
      )
      .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }, [customers, search]);

  return (
    <div className="cl-page">
      <header className="cl-header">
        <h1 className="cl-title">Klienci</h1>
        <p className="cl-count">{filtered.length} z {customers.length}</p>
      </header>

      <div className="cl-search">
        <span className="cl-search-icon">⌕</span>
        <input
          className="cl-search-input"
          placeholder="Szukaj: imię, telefon, email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="cl-table-wrap">
        <table className="cl-table">
          <thead>
            <tr><th>Klient</th><th>Telefon</th><th>Email</th><th>Typ</th></tr>
          </thead>
          <tbody>
            {filtered.map((c) => (
              <tr key={c.id} className="cl-row" onClick={() => navigate(`/klienci/${c.id}`)}>
                <td className="cl-name">{c.name}</td>
                <td className="cl-td-mono">{c.phone || '—'}</td>
                <td className="cl-td-muted">{c.email || '—'}</td>
                <td>
                  {c.isWalkIn
                    ? <span className="cl-badge cl-badge-wait">Bez konta</span>
                    : <span className="cl-badge cl-badge-good">Konto w apce</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <div className="cl-empty">Brak klientów spełniających kryteria</div>}
      </div>
    </div>
  );
}
