import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import useStore from '../store/useStore';
import STATUS, { terminalStatuses } from '../constants/statuses';
import { DOCUMENT_TYPE, documentTypeList } from '../constants/documentTypes';
import { getStaleRepairs } from '../utils/calcProfit';
import './RepairsPage.css';

const STATUS_TONE = {
  [STATUS.ACCEPTED]:  'wait',
  [STATUS.DIAGNOSIS]: 'wait',
  [STATUS.ORDER_PARTS]: 'warn',
  [STATUS.REPAIR]:    'info',
  [STATUS.PARTS]:     'info',
  [STATUS.READY]:     'good',
  [STATUS.DELIVERED]: 'neutral',
  [STATUS.CANCELLED]: 'warn',
};

const fmtDate = (iso) => iso ? new Date(iso).toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—';

const EMPTY_FILTERS = {
  brand: '', model: '', documentType: '', priorityOnly: false,
  createdFrom: '', createdTo: '', issuedFrom: '', issuedTo: '',
};

export default function RepairsPage() {
  const navigate = useNavigate();
  const currentUser = useStore((s) => s.currentUser);
  const repairs = useStore((s) => s.getVisibleRepairs());
  const getUserById = useStore((s) => s.getUserById);
  const parts = useStore((s) => s.parts);

  const isAdmin = currentUser?.role === 'admin';

  const repairsToOrder = repairs.filter((r) => r.status === STATUS.ORDER_PARTS);
  const staleRepairs = getStaleRepairs(repairs, terminalStatuses, 5);
  const lowStockParts = parts.filter((p) => (p.quantity || 0) <= (p.minQuantity || 0));
  const todayDay = new Date().getDay();
  const isWeekend = todayDay === 0 || todayDay === 6;

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState(null);

  const [showFilterModal, setShowFilterModal] = useState(false);
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [draftFilters, setDraftFilters] = useState(EMPTY_FILTERS);

  const availableBrands = useMemo(
    () => [...new Set(repairs.map((r) => r.brand).filter(Boolean))].sort(),
    [repairs]
  );

  const activeFilterCount = Object.entries(filters).filter(([k, v]) => v !== '' && v !== false).length;

  const openFilterModal = () => {
    setDraftFilters(filters);
    setShowFilterModal(true);
  };
  const applyFilters = () => {
    setFilters(draftFilters);
    setShowFilterModal(false);
  };
  const clearAllFilters = () => {
    setDraftFilters(EMPTY_FILTERS);
    setFilters(EMPTY_FILTERS);
    setShowFilterModal(false);
  };

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return [...repairs]
      .filter((r) => {
        const matchSearch = !q
          || r.brand?.toLowerCase().includes(q)
          || r.model?.toLowerCase().includes(q)
          || r.imei?.includes(q)
          || (r.displayNumber || '').includes(q)
          || (r.partsInvoiceNumber || '').toLowerCase().includes(q)
          || getUserById(r.customerId)?.name?.toLowerCase().includes(q);
        const matchStatus = !statusFilter || r.status === statusFilter;
        const matchBrand = !filters.brand || r.brand === filters.brand;
        const matchModel = !filters.model || (r.model || '').toLowerCase().includes(filters.model.toLowerCase());
        const matchDocType = !filters.documentType || r.documentType === filters.documentType;
        const matchPriority = !filters.priorityOnly || !!r.priority;

        const createdTime = r.createdAt ? new Date(r.createdAt).getTime() : null;
        const matchCreatedFrom = !filters.createdFrom || (createdTime !== null && createdTime >= new Date(filters.createdFrom).getTime());
        const matchCreatedTo = !filters.createdTo || (createdTime !== null && createdTime <= new Date(filters.createdTo).getTime() + 86399999);

        const issuedTime = r.issuedAt ? new Date(r.issuedAt).getTime() : null;
        const matchIssuedFrom = !filters.issuedFrom || (issuedTime !== null && issuedTime >= new Date(filters.issuedFrom).getTime());
        const matchIssuedTo = !filters.issuedTo || (issuedTime !== null && issuedTime <= new Date(filters.issuedTo).getTime() + 86399999);

        return matchSearch && matchStatus && matchBrand && matchModel && matchDocType
          && matchPriority && matchCreatedFrom && matchCreatedTo && matchIssuedFrom && matchIssuedTo;
      })
      .sort((a, b) => {
        if (!!b.priority !== !!a.priority) return b.priority ? 1 : -1;
        // Sortujemy po numerze zlecenia (np. "42/2026"), NIE po dacie
        // przyjęcia – bo datę przyjęcia można ręcznie cofnąć (zaległe
        // zlecenia), co miesza kolejność na liście. Numer zawsze rośnie
        // po kolei, więc jest stabilnym, przewidywalnym źródłem sortowania.
        const parseNum = (displayNumber) => {
          const [num, year] = (displayNumber || '0/0').split('/');
          return { num: parseInt(num) || 0, year: parseInt(year) || 0 };
        };
        const bNum = parseNum(b.displayNumber);
        const aNum = parseNum(a.displayNumber);
        if (bNum.year !== aNum.year) return bNum.year - aNum.year;
        return bNum.num - aNum.num;
      });
  }, [repairs, search, statusFilter, filters, getUserById]);

  // Liczniki przy chipach statusów – liczone z tego samego zestawu co lista
  // (uwzględniają wyszukiwarkę i filtry z modala), tylko BEZ samego filtra
  // statusu – inaczej "Wszystkie" zawsze pokazywałoby całą bazę, ignorując
  // resztę filtrów, i myliłoby się z liczbą faktycznie widocznych wierszy.
  const repairsMatchingFiltersOnly = useMemo(() => {
    const q = search.toLowerCase().trim();
    return repairs.filter((r) => {
      const matchSearch = !q
        || r.brand?.toLowerCase().includes(q)
        || r.model?.toLowerCase().includes(q)
        || r.imei?.includes(q)
        || (r.displayNumber || '').includes(q)
        || (r.partsInvoiceNumber || '').toLowerCase().includes(q)
        || getUserById(r.customerId)?.name?.toLowerCase().includes(q);
      const matchBrand = !filters.brand || r.brand === filters.brand;
      const matchModel = !filters.model || (r.model || '').toLowerCase().includes(filters.model.toLowerCase());
      const matchDocType = !filters.documentType || r.documentType === filters.documentType;
      const matchPriority = !filters.priorityOnly || !!r.priority;
      const createdTime = r.createdAt ? new Date(r.createdAt).getTime() : null;
      const matchCreatedFrom = !filters.createdFrom || (createdTime !== null && createdTime >= new Date(filters.createdFrom).getTime());
      const matchCreatedTo = !filters.createdTo || (createdTime !== null && createdTime <= new Date(filters.createdTo).getTime() + 86399999);
      const issuedTime = r.issuedAt ? new Date(r.issuedAt).getTime() : null;
      const matchIssuedFrom = !filters.issuedFrom || (issuedTime !== null && issuedTime >= new Date(filters.issuedFrom).getTime());
      const matchIssuedTo = !filters.issuedTo || (issuedTime !== null && issuedTime <= new Date(filters.issuedTo).getTime() + 86399999);
      return matchSearch && matchBrand && matchModel && matchDocType && matchPriority
        && matchCreatedFrom && matchCreatedTo && matchIssuedFrom && matchIssuedTo;
    });
  }, [repairs, search, filters, getUserById]);

  const statusCounts = useMemo(() => {
    const counts = {};
    repairsMatchingFiltersOnly.forEach((r) => { counts[r.status] = (counts[r.status] || 0) + 1; });
    return counts;
  }, [repairsMatchingFiltersOnly]);

  return (
    <div className="rp-page">
      <header className="rp-header">
        <div>
          <h1 className="rp-title">Zlecenia</h1>
          <p className="rp-count">{filtered.length} z {repairs.length} zleceń</p>
        </div>
        <button className="rp-new-btn" onClick={() => navigate('/zlecenia/nowe')}>
          + Nowe zlecenie
        </button>
      </header>

      {lowStockParts.length > 0 && (
        <button className="rp-order-banner" onClick={() => navigate('/magazyn')}>
          <span className="rp-order-banner-icon">📦</span>
          <span>
            <strong>{lowStockParts.length} {lowStockParts.length === 1 ? 'część kończy się' : 'części kończy się'} w magazynie.</strong>{' '}
            Sprawdź stan i uzupełnij.
          </span>
        </button>
      )}

      {repairsToOrder.length > 0 && (
        <button className="rp-order-banner" onClick={() => setStatusFilter(STATUS.ORDER_PARTS)}>
          <span className="rp-order-banner-icon">📞</span>
          <span>
            <strong>{repairsToOrder.length} {repairsToOrder.length === 1 ? 'zlecenie czeka' : 'zleceń czeka'} na zamówienie części.</strong>{' '}
            {isWeekend
              ? 'Hurtownie w weekend zwykle nie pracują — pamiętaj zadzwonić w poniedziałek.'
              : 'Dziś dzień roboczy — dobra okazja żeby zadzwonić do hurtowni.'}
          </span>
        </button>
      )}

      {staleRepairs.length > 0 && (
        <div className="rp-stale-banner">
          <div className="rp-stale-banner-header">
            <span className="rp-stale-banner-icon">⏳</span>
            <strong>{staleRepairs.length} {staleRepairs.length === 1 ? 'zlecenie stoi' : 'zleceń stoi'} bez zmiany statusu od ponad 5 dni.</strong>
          </div>
          <div className="rp-stale-list">
            {staleRepairs.slice(0, 5).map((r) => {
              const daysStuck = Math.floor((Date.now() - new Date(r.statusUpdatedAt || r.createdAt).getTime()) / (24 * 60 * 60 * 1000));
              return (
                <button key={r.id} className="rp-stale-item" onClick={() => navigate(`/zlecenia/${r.id}`)}>
                  <span>#{r.displayNumber || r.id} — {r.brand} {r.model} <span className="rp-stale-status">({r.status})</span></span>
                  <span className="rp-stale-days">{daysStuck} dni</span>
                </button>
              );
            })}
            {staleRepairs.length > 5 && <div className="rp-stale-more">+ {staleRepairs.length - 5} więcej</div>}
          </div>
        </div>
      )}

      <div className="rp-toolbar">
        <div className="rp-toolbar-row">
          <div className="rp-search">
            <span className="rp-search-icon">⌕</span>
            <input
              className="rp-search-input"
              placeholder="Szukaj: marka, model, IMEI, klient, numer, faktura…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <button className="rp-filters-btn" onClick={openFilterModal}>
            🔍 Filtry{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
          </button>
          {activeFilterCount > 0 && (
            <button className="rp-chip rp-chip-clear" onClick={clearAllFilters}>✕ Wyczyść filtry</button>
          )}
        </div>

        <div className="rp-status-chips">
          <button
            className={`rp-chip ${!statusFilter ? 'rp-chip-active' : ''}`}
            onClick={() => setStatusFilter(null)}
          >
            Wszystkie ({repairsMatchingFiltersOnly.length})
          </button>
          {Object.values(STATUS).map((st) => (
            statusCounts[st] ? (
              <button
                key={st}
                className={`rp-chip ${statusFilter === st ? 'rp-chip-active' : ''}`}
                onClick={() => setStatusFilter(statusFilter === st ? null : st)}
              >
                {st} ({statusCounts[st]})
              </button>
            ) : null
          ))}
        </div>
      </div>

      {showFilterModal && (
        <div className="rp-modal-backdrop" onClick={() => setShowFilterModal(false)}>
          <div className="rp-modal" onClick={(e) => e.stopPropagation()}>
            <h2 className="rp-modal-title">Filtry</h2>

            <div className="rp-modal-grid">
              <label className="rp-modal-field">
                <span>Marka</span>
                <select className="rp-filter-select" value={draftFilters.brand} onChange={(e) => setDraftFilters({ ...draftFilters, brand: e.target.value })}>
                  <option value="">Wszystkie</option>
                  {availableBrands.map((b) => <option key={b} value={b}>{b}</option>)}
                </select>
              </label>

              <label className="rp-modal-field">
                <span>Model</span>
                <input className="rp-filter-select" placeholder="np. iPhone 13" value={draftFilters.model} onChange={(e) => setDraftFilters({ ...draftFilters, model: e.target.value })} />
              </label>

              <label className="rp-modal-field">
                <span>Typ dokumentu</span>
                <select className="rp-filter-select" value={draftFilters.documentType} onChange={(e) => setDraftFilters({ ...draftFilters, documentType: e.target.value })}>
                  <option value="">Wszystkie</option>
                  {documentTypeList.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              </label>

              <label className="rp-modal-field rp-modal-checkbox">
                <input type="checkbox" checked={draftFilters.priorityOnly} onChange={(e) => setDraftFilters({ ...draftFilters, priorityOnly: e.target.checked })} />
                <span>🔥 Tylko pilne</span>
              </label>

              <label className="rp-modal-field">
                <span>Data przyjęcia od</span>
                <input type="date" className="rp-filter-select" value={draftFilters.createdFrom} onChange={(e) => setDraftFilters({ ...draftFilters, createdFrom: e.target.value })} />
              </label>
              <label className="rp-modal-field">
                <span>Data przyjęcia do</span>
                <input type="date" className="rp-filter-select" value={draftFilters.createdTo} onChange={(e) => setDraftFilters({ ...draftFilters, createdTo: e.target.value })} />
              </label>

              <label className="rp-modal-field">
                <span>Data wydania od</span>
                <input type="date" className="rp-filter-select" value={draftFilters.issuedFrom} onChange={(e) => setDraftFilters({ ...draftFilters, issuedFrom: e.target.value })} />
              </label>
              <label className="rp-modal-field">
                <span>Data wydania do</span>
                <input type="date" className="rp-filter-select" value={draftFilters.issuedTo} onChange={(e) => setDraftFilters({ ...draftFilters, issuedTo: e.target.value })} />
              </label>
            </div>

            <div className="rp-modal-actions">
              <button className="rp-select-all-btn" onClick={() => setDraftFilters(EMPTY_FILTERS)}>Wyczyść</button>
              <button className="rp-new-btn" onClick={applyFilters}>Zastosuj filtry</button>
            </div>
          </div>
        </div>
      )}

      <div className="rp-table-wrap">
        <table className="rp-table">
          <thead>
            <tr>
              <th>Nr</th>
              <th>Urządzenie</th>
              <th>Klient</th>
              <th>Status</th>
              <th>Przyjęto</th>
              {isAdmin && <th className="rp-th-right">Wartość</th>}
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => {
              const total = (r.partsCost || 0) + (r.serviceCost || 0);
              const tone = STATUS_TONE[r.status] || 'neutral';
              const customer = getUserById(r.customerId);
              return (
                <tr key={r.id} className={`rp-row ${r.priority ? 'rp-row-priority' : ''}`} onClick={() => navigate(`/zlecenia/${r.id}`)}>
                  <td className="rp-td-mono">#{r.displayNumber || r.id}</td>
                  <td>
                    <div className="rp-device">{r.priority && <span title="Pilne">🔥 </span>}{r.brand} {r.model}</div>
                    <div className="rp-desc">{r.description}</div>
                  </td>
                  <td>{customer?.name || '—'}</td>
                  <td>
                    <span className={`rp-badge rp-badge-${tone}`}>{r.status}</span>
                  </td>
                  <td className="rp-td-mono rp-td-muted">{fmtDate(r.createdAt)}</td>
                  {isAdmin && (
                    <td className="rp-td-right rp-td-mono">
                      {total > 0 ? `${total} zł` : '—'}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>

        {filtered.length === 0 && (
          <div className="rp-empty">
            <span className="rp-empty-icon">◇</span>
            <p>Brak zleceń spełniających kryteria</p>
          </div>
        )}
      </div>
    </div>
  );
}
