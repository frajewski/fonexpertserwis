import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import useStore from '../store/useStore';
import TRADE_STATUS, { tradeStatusIcons } from '../constants/tradeStatuses';
import grades from '../constants/grades';
import tradeSources from '../constants/tradeSources';
import './TradePage.css';

const TONE = {
  [TRADE_STATUS.BOUGHT]: 'wait', [TRADE_STATUS.REPAIR]: 'info', [TRADE_STATUS.READY]: 'good', [TRADE_STATUS.SOLD]: 'neutral',
};

const EMPTY_FILTERS = {
  brand: '', model: '', storage: '', grade: '', source: '',
  boughtFrom: '', boughtTo: '', priceMin: '', priceMax: '',
};

export default function TradePage() {
  const navigate = useNavigate();
  const currentUser = useStore((s) => s.currentUser);
  const phones = useStore((s) => s.phones);
  const updatePhone = useStore((s) => s.updatePhone);

  const isAdmin = currentUser?.role === 'admin';
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState(null);
  const [sortBy, setSortBy] = useState('boughtAt');
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);

  const [showFilterModal, setShowFilterModal] = useState(false);
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [draftFilters, setDraftFilters] = useState(EMPTY_FILTERS);

  const availableBrands = useMemo(
    () => [...new Set(phones.map((p) => p.brand).filter(Boolean))].sort(),
    [phones]
  );
  const availableStorages = useMemo(
    () => [...new Set(phones.map((p) => p.storage).filter(Boolean))].sort(),
    [phones]
  );

  const activeFilterCount = Object.values(filters).filter((v) => v !== '').length;

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

  const SORTERS = {
    boughtAt: (a, b) => new Date(b.boughtAt || 0) - new Date(a.boughtAt || 0),
    soldAt: (a, b) => new Date(b.soldAt || 0) - new Date(a.soldAt || 0),
    buyPrice: (a, b) => (b.buyPrice || 0) - (a.buyPrice || 0),
    profit: (a, b) => ((b.sellPrice || 0) - (b.buyPrice || 0)) - ((a.sellPrice || 0) - (a.buyPrice || 0)),
  };

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return [...phones]
      .filter((p) => {
        const matchSearch = !q || p.brand?.toLowerCase().includes(q) || p.model?.toLowerCase().includes(q) || p.imei?.includes(q);
        const matchStatus = !statusFilter || p.status === statusFilter;
        const matchBrand = !filters.brand || p.brand === filters.brand;
        const matchModel = !filters.model || (p.model || '').toLowerCase().includes(filters.model.toLowerCase());
        const matchStorage = !filters.storage || p.storage === filters.storage;
        const matchGrade = !filters.grade || p.grade === filters.grade;
        const matchSource = !filters.source || p.source === filters.source;
        const boughtTime = p.boughtAt ? new Date(p.boughtAt).getTime() : null;
        const matchBoughtFrom = !filters.boughtFrom || (boughtTime !== null && boughtTime >= new Date(filters.boughtFrom).getTime());
        const matchBoughtTo = !filters.boughtTo || (boughtTime !== null && boughtTime <= new Date(filters.boughtTo).getTime() + 86399999);
        const matchPriceMin = !filters.priceMin || (p.buyPrice || 0) >= parseFloat(filters.priceMin);
        const matchPriceMax = !filters.priceMax || (p.buyPrice || 0) <= parseFloat(filters.priceMax);
        return matchSearch && matchStatus && matchBrand && matchModel && matchStorage
          && matchGrade && matchSource && matchBoughtFrom && matchBoughtTo && matchPriceMin && matchPriceMax;
      })
      .sort(SORTERS[sortBy] || SORTERS.boughtAt);
  }, [phones, search, statusFilter, filters, sortBy]);

  const totalProfit = useMemo(() => {
    if (!isAdmin) return 0;
    return filtered
      .filter((p) => p.status === TRADE_STATUS.SOLD)
      .reduce((sum, p) => sum + ((p.sellPrice || 0) - (p.buyPrice || 0)), 0);
  }, [filtered, isAdmin]);

  const handleExport = () => {
    const header = ['IMEI', 'Marka', 'Model', 'Cena zakupu', 'Cena sprzedaży', 'Zysk', 'Status'].join('\t');
    const lines = filtered.map((p) => [
      p.imei || '',
      p.brand || '',
      p.model || '',
      p.buyPrice || 0,
      p.sellPrice || 0,
      (p.sellPrice || 0) - (p.buyPrice || 0),
      p.status || '',
    ].join('\t'));
    navigator.clipboard.writeText([header, ...lines].join('\n'))
      .then(() => alert(`Skopiowano ${lines.length} telefonów do schowka.`))
      .catch(() => alert('Nie udało się skopiować do schowka.'));
  };

  const toggleSelect = (id, e) => {
    e.stopPropagation();
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const clearSelection = () => setSelectedIds(new Set());

  const handleBulkStatusChange = async (newStatus) => {
    setBulkBusy(true);
    try {
      await Promise.all([...selectedIds].map((id) => updatePhone(id, { status: newStatus })));
      clearSelection();
    } catch (err) {
      alert('Nie udało się zmienić statusu części telefonów: ' + err.message);
    } finally {
      setBulkBusy(false);
    }
  };

  const allVisibleSelected = filtered.length > 0 && filtered.every((p) => selectedIds.has(p.id));

  const toggleSelectAll = () => {
    if (allVisibleSelected) {
      clearSelection();
    } else {
      setSelectedIds(new Set(filtered.map((p) => p.id)));
    }
  };

  return (
    <div className="tr-page">
      <header className="tr-header">
        <div>
          <h1 className="tr-title">Skup telefonów</h1>
          <p className="tr-count">{filtered.length} z {phones.length} telefonów{isAdmin ? ` · zysk ze sprzedanych: ${totalProfit} zł` : ''}</p>
        </div>
        <div className="tr-header-actions">
          {isAdmin && (
            <button className="tr-import-btn" onClick={handleExport}>📤 Eksportuj (schowek)</button>
          )}
          {isAdmin && (
            <button className="tr-import-btn" onClick={() => navigate('/skup/kalkulator')}>🧮 Kalkulator wyceny</button>
          )}
          <button className="tr-import-btn" onClick={() => navigate('/skup/import')}>📋 Importuj z arkusza</button>
          <button className="tr-new-btn" onClick={() => navigate('/skup/nowy')}>+ Dodaj telefon</button>
        </div>
      </header>

      <div className="tr-toolbar">
        <div className="tr-search">
          <span className="tr-search-icon">⌕</span>
          <input className="tr-search-input" placeholder="Szukaj: marka, model, IMEI…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="tr-chips">
          <button className={`tr-chip ${!statusFilter ? 'tr-chip-active' : ''}`} onClick={() => setStatusFilter(null)}>Wszystkie</button>
          {Object.values(TRADE_STATUS).map((st) => (
            <button key={st} className={`tr-chip ${statusFilter === st ? 'tr-chip-active' : ''}`} onClick={() => setStatusFilter(statusFilter === st ? null : st)}>
              {tradeStatusIcons[st]} {st}
            </button>
          ))}
        </div>
      </div>

      <div className="tr-toolbar tr-toolbar-secondary">
        {isAdmin && (
          <button className="tr-select-all-btn" onClick={toggleSelectAll}>
            {allVisibleSelected ? '☑' : '☐'} Zaznacz wszystkie widoczne ({filtered.length})
          </button>
        )}
        <select className="tr-filter-select" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
          <option value="boughtAt">Sortuj: data zakupu (najnowsze)</option>
          <option value="soldAt">Sortuj: data sprzedaży (najnowsze)</option>
          {isAdmin && <option value="buyPrice">Sortuj: cena zakupu (najwyższa)</option>}
          {isAdmin && <option value="profit">Sortuj: zysk (najwyższy)</option>}
        </select>
        <button className="tr-filters-btn" onClick={openFilterModal}>
          🔍 Filtry{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
        </button>
        {activeFilterCount > 0 && (
          <button className="tr-chip tr-chip-clear" onClick={clearAllFilters}>✕ Wyczyść filtry</button>
        )}
      </div>

      {showFilterModal && (
        <div className="tr-modal-backdrop" onClick={() => setShowFilterModal(false)}>
          <div className="tr-modal" onClick={(e) => e.stopPropagation()}>
            <h2 className="tr-modal-title">Filtry</h2>

            <div className="tr-modal-grid">
              <label className="tr-modal-field">
                <span>Marka</span>
                <select className="tr-filter-select" value={draftFilters.brand} onChange={(e) => setDraftFilters({ ...draftFilters, brand: e.target.value })}>
                  <option value="">Wszystkie</option>
                  {availableBrands.map((b) => <option key={b} value={b}>{b}</option>)}
                </select>
              </label>

              <label className="tr-modal-field">
                <span>Model</span>
                <input className="tr-filter-select" placeholder="np. iPhone 13" value={draftFilters.model} onChange={(e) => setDraftFilters({ ...draftFilters, model: e.target.value })} />
              </label>

              <label className="tr-modal-field">
                <span>Pamięć</span>
                <select className="tr-filter-select" value={draftFilters.storage} onChange={(e) => setDraftFilters({ ...draftFilters, storage: e.target.value })}>
                  <option value="">Wszystkie</option>
                  {availableStorages.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </label>

              <label className="tr-modal-field">
                <span>Od kogo kupiony</span>
                <select className="tr-filter-select" value={draftFilters.source} onChange={(e) => setDraftFilters({ ...draftFilters, source: e.target.value })}>
                  <option value="">Wszyscy</option>
                  {tradeSources.map((s) => <option key={s.value} value={s.value}>{s.emoji} {s.label}</option>)}
                </select>
              </label>

              <label className="tr-modal-field">
                <span>Data zakupu od</span>
                <input type="date" className="tr-filter-select" value={draftFilters.boughtFrom} onChange={(e) => setDraftFilters({ ...draftFilters, boughtFrom: e.target.value })} />
              </label>

              <label className="tr-modal-field">
                <span>Data zakupu do</span>
                <input type="date" className="tr-filter-select" value={draftFilters.boughtTo} onChange={(e) => setDraftFilters({ ...draftFilters, boughtTo: e.target.value })} />
              </label>

              {isAdmin && (
                <>
                  <label className="tr-modal-field">
                    <span>Cena zakupu min (zł)</span>
                    <input type="number" className="tr-filter-select" value={draftFilters.priceMin} onChange={(e) => setDraftFilters({ ...draftFilters, priceMin: e.target.value })} />
                  </label>
                  <label className="tr-modal-field">
                    <span>Cena zakupu max (zł)</span>
                    <input type="number" className="tr-filter-select" value={draftFilters.priceMax} onChange={(e) => setDraftFilters({ ...draftFilters, priceMax: e.target.value })} />
                  </label>
                </>
              )}
            </div>

            <div className="tr-modal-field" style={{ marginTop: 4 }}>
              <span>Stan (grade)</span>
              <div className="tr-chips">
                {grades.map((g) => (
                  <button
                    key={g.value}
                    className={`tr-chip ${draftFilters.grade === g.value ? 'tr-chip-active' : ''}`}
                    onClick={() => setDraftFilters({ ...draftFilters, grade: draftFilters.grade === g.value ? '' : g.value })}
                    style={draftFilters.grade === g.value ? { background: g.color, color: '#fff', borderColor: g.color } : {}}
                  >
                    {g.emoji} {g.value}
                  </button>
                ))}
              </div>
            </div>

            <div className="tr-modal-actions">
              <button className="tr-select-all-btn" onClick={() => setDraftFilters(EMPTY_FILTERS)}>Wyczyść</button>
              <button className="tr-new-btn" onClick={applyFilters}>Zastosuj filtry</button>
            </div>
          </div>
        </div>
      )}

      <div className="tr-grid">
        {filtered.map((p) => {
          const tone = TONE[p.status] || 'neutral';
          const grade = grades.find((g) => g.value === p.grade);
          const profit = (p.sellPrice || 0) - (p.buyPrice || 0);
          return (
            <div key={p.id} className={`tr-card ${selectedIds.has(p.id) ? 'tr-card-selected' : ''}`} onClick={() => navigate(`/skup/${p.id}`)}>
              <div className="tr-card-top">
                <div className="tr-card-top-left">
                  {isAdmin && (
                    <input
                      type="checkbox"
                      className="tr-checkbox"
                      checked={selectedIds.has(p.id)}
                      onClick={(e) => toggleSelect(p.id, e)}
                      onChange={() => {}}
                    />
                  )}
                  <div className="tr-device">{p.brand} {p.model}</div>
                </div>
                <span className={`tr-badge tr-badge-${tone}`}>{tradeStatusIcons[p.status]}</span>
              </div>
              <div className="tr-meta">
                {grade && <span className="tr-grade" style={{ color: grade.color }}>{grade.emoji} {p.grade}</span>}
                {p.storage && <span className="tr-storage">{p.storage}</span>}
                {p.color && <span className="tr-color">{p.color}</span>}
              </div>

              {(p.hasIcloudLock || p.hasCarrierLock || p.isReported) && (
                <div className="tr-locks">
                  {p.hasIcloudLock && <span className="tr-lock-tag">🔒 iCloud</span>}
                  {p.hasCarrierLock && <span className="tr-lock-tag">📡 Simlock</span>}
                  {p.isReported && <span className="tr-lock-tag tr-lock-tag-warn">⚠️ Zgłoszony</span>}
                </div>
              )}
              {isAdmin && (
                <div className="tr-prices">
                  <span>Kupno: {p.buyPrice || 0} zł</span>
                  {p.status === TRADE_STATUS.SOLD && (
                    <span className={profit >= 0 ? 'tr-profit-good' : 'tr-profit-bad'}>
                      Zysk: {profit >= 0 ? '+' : ''}{profit} zł
                    </span>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {filtered.length === 0 && <div className="tr-empty">Brak telefonów spełniających kryteria</div>}
      </div>

      {selectedIds.size > 0 && (
        <div className="tr-bulk-bar">
          <span className="tr-bulk-count">Zaznaczono: {selectedIds.size}</span>
          <div className="tr-bulk-actions">
            {Object.values(TRADE_STATUS).map((st) => (
              <button
                key={st}
                className="tr-bulk-status-btn"
                disabled={bulkBusy}
                onClick={() => handleBulkStatusChange(st)}
              >
                {tradeStatusIcons[st]} {st}
              </button>
            ))}
            <button className="tr-bulk-cancel" disabled={bulkBusy} onClick={clearSelection}>Anuluj zaznaczenie</button>
          </div>
        </div>
      )}
    </div>
  );
}
