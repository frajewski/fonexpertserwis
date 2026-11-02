// ============================================================
//  AssignCustomer.jsx – przypisanie klienta do zlecenia, które go nie ma
//  (np. zlecenie utworzone z rezerwacji online starszą wersją panelu).
//  Szuka wśród istniejących klientów (nazwisko / telefon) albo zakłada
//  nowego – z podpowiedzią imienia i telefonu z rezerwacji, jeśli jest.
// ============================================================

import { useMemo, useState } from 'react';
import useStore from '../store/useStore';

const digits = (v) => (v || '').replace(/\D/g, '').replace(/^48/, '');

export default function AssignCustomer({ repair, onAssign }) {
  const customers = useStore((s) => s.getCustomers());
  const bookings = useStore((s) => s.bookings || []);
  const addWalkInCustomer = useStore((s) => s.addWalkInCustomer);

  const booking = bookings.find((b) => b.linkedRepairId === repair.id);
  const [query, setQuery] = useState(booking?.customerPhone || repair.customerPhone || '');
  const [name, setName] = useState(booking?.customerName || repair.customerName || '');
  const [phone, setPhone] = useState(booking?.customerPhone || repair.customerPhone || '');
  const [busy, setBusy] = useState(false);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    const qd = digits(query);
    if (!q) return [];
    return customers
      .filter((c) => (c.name || '').toLowerCase().includes(q) || (qd.length >= 3 && digits(c.phone).includes(qd)))
      .slice(0, 6);
  }, [customers, query]);

  const assign = async (customerId) => {
    setBusy(true);
    try { await onAssign(customerId); } catch (e) { alert(e?.message || 'Nie udało się przypisać klienta.'); } finally { setBusy(false); }
  };

  const createAndAssign = async () => {
    if (!name.trim()) { alert('Podaj imię i nazwisko klienta.'); return; }
    setBusy(true);
    try {
      const created = await addWalkInCustomer({ name: name.trim(), phone: phone.trim(), email: '' });
      await onAssign(created.id);
    } catch (e) {
      alert(e?.message || 'Nie udało się dodać klienta.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="ac-assign">
      <p className="ac-assign-warn">To zlecenie nie ma przypisanego klienta.{booking ? ` Z rezerwacji: ${booking.customerName || '—'}, ${booking.customerPhone || '—'}.` : ''}</p>
      <input className="ac-assign-input" placeholder="Szukaj klienta: nazwisko lub telefon" value={query} onChange={(e) => setQuery(e.target.value)} />
      {matches.length > 0 && (
        <div className="ac-assign-list">
          {matches.map((c) => (
            <button key={c.id} type="button" className="ac-assign-item" disabled={busy} onClick={() => assign(c.id)}>
              <strong>{c.name}</strong> <span>{c.phone || 'brak numeru'}</span>
            </button>
          ))}
        </div>
      )}
      <div className="ac-assign-new">
        <input className="ac-assign-input" placeholder="Imię i nazwisko" value={name} onChange={(e) => setName(e.target.value)} />
        <input className="ac-assign-input" placeholder="Telefon" value={phone} onChange={(e) => setPhone(e.target.value)} />
        <button type="button" className="rd-btn-primary" disabled={busy} onClick={createAndAssign}>
          {busy ? 'Zapisuję…' : '+ Dodaj nowego klienta i przypisz'}
        </button>
      </div>
    </div>
  );
}
