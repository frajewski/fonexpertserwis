import { useState, useMemo } from 'react';
import useStore from '../store/useStore';
import './PartsPage.css';

export default function PartsPage() {
  const currentUser = useStore((s) => s.currentUser);
  const parts = useStore((s) => s.parts);
  const addPart = useStore((s) => s.addPart);
  const updatePart = useStore((s) => s.updatePart);
  const adjustPartQuantity = useStore((s) => s.adjustPartQuantity);
  const deletePart = useStore((s) => s.deletePart);

  const isAdmin = currentUser?.role === 'admin';

  const [search, setSearch] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newQuantity, setNewQuantity] = useState('');
  const [newMinQuantity, setNewMinQuantity] = useState('');
  const [newUnitCost, setNewUnitCost] = useState('');
  const [newNotes, setNewNotes] = useState('');

  const [editingId, setEditingId] = useState(null);
  const [editQuantity, setEditQuantity] = useState('');
  const [editMinQuantity, setEditMinQuantity] = useState('');
  const [editUnitCost, setEditUnitCost] = useState('');

  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return [...parts]
      .filter((p) => !q || p.name?.toLowerCase().includes(q) || p.notes?.toLowerCase().includes(q))
      .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }, [parts, search]);

  const lowStock = parts.filter((p) => (p.quantity || 0) <= (p.minQuantity || 0));

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!newName.trim()) return;
    await addPart({
      name: newName.trim(),
      quantity: parseInt(newQuantity) || 0,
      minQuantity: parseInt(newMinQuantity) || 0,
      unitCost: parseFloat(newUnitCost) || 0,
      notes: newNotes.trim(),
    });
    setNewName(''); setNewQuantity(''); setNewMinQuantity(''); setNewUnitCost(''); setNewNotes('');
    setShowAddForm(false);
  };

  const handleStartEdit = (part) => {
    setEditingId(part.id);
    setEditQuantity(String(part.quantity || 0));
    setEditMinQuantity(String(part.minQuantity || 0));
    setEditUnitCost(String(part.unitCost || 0));
  };

  const handleSaveEdit = async (id) => {
    await updatePart(id, {
      quantity: parseInt(editQuantity) || 0,
      minQuantity: parseInt(editMinQuantity) || 0,
      unitCost: parseFloat(editUnitCost) || 0,
    });
    setEditingId(null);
  };

  const handleDelete = async (id) => {
    await deletePart(id);
    setConfirmDeleteId(null);
  };

  return (
    <div className="pt-page">
      <header className="pt-header">
        <div>
          <h1 className="pt-title">Magazyn części</h1>
          <p className="pt-count">{filtered.length} z {parts.length} pozycji</p>
        </div>
        <button className="pt-new-btn" onClick={() => setShowAddForm((v) => !v)}>
          {showAddForm ? '✕ Anuluj' : '+ Dodaj część'}
        </button>
      </header>

      {lowStock.length > 0 && (
        <div className="pt-low-banner">
          <span className="pt-low-icon">⚠️</span>
          <span><strong>{lowStock.length} {lowStock.length === 1 ? 'pozycja kończy się' : 'pozycji kończy się'} na stanie</strong> — sprawdź listę poniżej (podświetlone na czerwono).</span>
        </div>
      )}

      {showAddForm && (
        <form className="pt-add-form" onSubmit={handleAdd}>
          <input className="pt-input" placeholder="Nazwa części (np. Wyświetlacz iPhone 12)" value={newName} onChange={(e) => setNewName(e.target.value)} required />
          <input className="pt-input pt-input-sm" type="number" placeholder="Ilość" value={newQuantity} onChange={(e) => setNewQuantity(e.target.value)} />
          <input className="pt-input pt-input-sm" type="number" placeholder="Próg alertu" value={newMinQuantity} onChange={(e) => setNewMinQuantity(e.target.value)} />
          {isAdmin && (
            <input className="pt-input pt-input-sm" type="number" placeholder="Cena jedn. (zł)" value={newUnitCost} onChange={(e) => setNewUnitCost(e.target.value)} />
          )}
          <input className="pt-input" placeholder="Notatki (opcjonalnie)" value={newNotes} onChange={(e) => setNewNotes(e.target.value)} />
          <button className="pt-new-btn" type="submit">Zapisz</button>
        </form>
      )}

      <div className="pt-search">
        <input className="pt-search-input" placeholder="Szukaj części…" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <div className="pt-table-wrap">
        <table className="pt-table">
          <thead>
            <tr>
              <th>Nazwa</th>
              <th>Ilość</th>
              <th>Próg alertu</th>
              {isAdmin && <th>Cena jedn.</th>}
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => {
              const isLow = (p.quantity || 0) <= (p.minQuantity || 0);
              const editing = editingId === p.id;
              return (
                <tr key={p.id} className={isLow ? 'pt-row-low' : ''}>
                  <td>
                    <div className="pt-part-name">{p.name}</div>
                    {p.notes && <div className="pt-part-notes">{p.notes}</div>}
                  </td>
                  <td>
                    {editing ? (
                      <input className="pt-input pt-input-sm" type="number" value={editQuantity} onChange={(e) => setEditQuantity(e.target.value)} />
                    ) : (
                      <div className="pt-qty-control">
                        <button className="pt-qty-btn" onClick={() => adjustPartQuantity(p.id, -1)}>−</button>
                        <span className={`pt-qty-value ${isLow ? 'pt-qty-low' : ''}`}>{p.quantity || 0}</span>
                        <button className="pt-qty-btn" onClick={() => adjustPartQuantity(p.id, 1)}>+</button>
                      </div>
                    )}
                  </td>
                  <td>
                    {editing ? (
                      <input className="pt-input pt-input-sm" type="number" value={editMinQuantity} onChange={(e) => setEditMinQuantity(e.target.value)} />
                    ) : (p.minQuantity || 0)}
                  </td>
                  {isAdmin && (
                    <td>
                      {editing ? (
                        <input className="pt-input pt-input-sm" type="number" value={editUnitCost} onChange={(e) => setEditUnitCost(e.target.value)} />
                      ) : `${p.unitCost || 0} zł`}
                    </td>
                  )}
                  <td className="pt-actions">
                    {editing ? (
                      <>
                        <button className="pt-link-btn" onClick={() => handleSaveEdit(p.id)}>Zapisz</button>
                        <button className="pt-link-btn" onClick={() => setEditingId(null)}>Anuluj</button>
                      </>
                    ) : (
                      <>
                        <button className="pt-link-btn" onClick={() => handleStartEdit(p)}>Edytuj</button>
                        {isAdmin && (
                          confirmDeleteId === p.id ? (
                            <>
                              <button className="pt-link-btn pt-link-danger" onClick={() => handleDelete(p.id)}>Na pewno</button>
                              <button className="pt-link-btn" onClick={() => setConfirmDeleteId(null)}>Anuluj</button>
                            </>
                          ) : (
                            <button className="pt-link-btn pt-link-danger" onClick={() => setConfirmDeleteId(p.id)}>Usuń</button>
                          )
                        )}
                      </>
                    )}
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr><td colSpan={isAdmin ? 5 : 4} className="pt-empty">Brak części spełniających kryteria</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
