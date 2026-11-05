// Formularz „Sprawdź status naprawy” – numer zlecenia + telefon.
// Używany na stronie głównej (wariant „glass” na ciemnym tle) i na /status.
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import friendlyError, { isValidPlPhone } from '../utils/friendlyError';
import { IconTag, IconPhone, IconArrow, IconInfo } from '../layout/icons';
import './StatusLookupForm.css';

export default function StatusLookupForm({ variant = 'card', title = 'Sprawdź status naprawy', showTitle = true }) {
  const navigate = useNavigate();
  const [nr, setNr] = useState('');
  const [phone, setPhone] = useState('');
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!nr.trim()) errs.nr = 'Wpisz numer zlecenia, np. 14/2026.';
    else if (/^\s*r/i.test(nr)) errs.nr = 'To numer rezerwacji z SMS-a. Status sprawdzisz po oddaniu telefonu — numer zlecenia jest na potwierdzeniu przyjęcia.';
    if (!phone.trim()) errs.phone = 'Wpisz numer telefonu.';
    else if (!isValidPlPhone(phone)) errs.phone = 'Numer telefonu powinien mieć 9 cyfr.';
    setErrors(errs);
    setFormError('');
    if (Object.keys(errs).length) return;

    setLoading(true);
    try {
      // Firebase ładowany dopiero przy wyszukiwaniu – strona główna startuje szybciej
      const { findRepairByLookup, normalizeDisplayNumber, normalizePhone } = await import('../firebase/firestoreApi');
      const cleanPhone = normalizePhone(phone);
      const repair = await findRepairByLookup(normalizeDisplayNumber(nr), cleanPhone);
      if (!repair) {
        setFormError('Nie znaleźliśmy zlecenia o tym numerze i telefonie. Sprawdź dane z potwierdzenia przyjęcia.');
        return;
      }
      navigate(`/zlecenie/${repair.id}`, { state: { phone: cleanPhone } });
    } catch (err) {
      console.error('Błąd wyszukiwania zlecenia:', err);
      setFormError(friendlyError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className={`slf slf-${variant}`} onSubmit={submit} noValidate aria-busy={loading}>
      {showTitle && (
        <div className="slf-head">
          <h2 className="slf-title">{title}</h2>
          <p className="slf-sub">Numer zlecenia znajdziesz na potwierdzeniu przyjęcia i w SMS-ie od nas.</p>
        </div>
      )}
      <div className={`ui-field ${errors.nr ? 'ui-field-error' : ''}`}>
        <label className="ui-label" htmlFor={`slf-nr-${variant}`}>Numer zlecenia</label>
        <div className="ui-input-icon">
          <IconTag size={18} />
          <input id={`slf-nr-${variant}`} className="ui-input ui-input-mono" placeholder="np. 14/2026" value={nr} autoComplete="off"
            onChange={(e) => { setNr(e.target.value); if (errors.nr) setErrors((x) => ({ ...x, nr: '' })); }}
            aria-invalid={!!errors.nr} aria-describedby={errors.nr ? `slf-nr-err-${variant}` : undefined} />
        </div>
        {errors.nr && <span className="ui-field-msg" id={`slf-nr-err-${variant}`}>{errors.nr}</span>}
      </div>
      <div className={`ui-field ${errors.phone ? 'ui-field-error' : ''}`}>
        <label className="ui-label" htmlFor={`slf-ph-${variant}`}>Telefon podany przy przyjęciu</label>
        <div className="ui-input-icon">
          <IconPhone size={18} />
          <input id={`slf-ph-${variant}`} className="ui-input" type="tel" inputMode="tel" placeholder="500 000 000" value={phone} autoComplete="tel"
            onChange={(e) => { setPhone(e.target.value); if (errors.phone) setErrors((x) => ({ ...x, phone: '' })); }}
            aria-invalid={!!errors.phone} aria-describedby={errors.phone ? `slf-ph-err-${variant}` : undefined} />
        </div>
        {errors.phone && <span className="ui-field-msg" id={`slf-ph-err-${variant}`}>{errors.phone}</span>}
      </div>
      {formError && (
        <div className="ui-alert ui-alert-error" role="alert"><IconInfo size={18} /><span>{formError}</span></div>
      )}
      <button type="submit" className="ui-btn ui-btn-primary ui-btn-block" disabled={loading} aria-busy={loading}>
        {loading ? <><span className="ui-spinner" aria-hidden="true" /> Szukam zlecenia…</> : <>Sprawdź status <IconArrow size={18} /></>}
      </button>
    </form>
  );
}
