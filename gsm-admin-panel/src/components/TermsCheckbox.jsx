// Pole akceptacji regulaminu serwisu (przyjęcie) albo warunków gwarancji
// (odbiór). Zaznacza je KLIENT – najlepiej przed podpisem na ekranie.
// Zapis: { version, at } → na wydruku ☒ z datą; puste → ☐ do ręcznego zaznaczenia.
import { TERMS } from '../constants/shopInfo';
import './TermsCheckbox.css';

const TEXT = {
  service: <>Klient zapoznał się z <a href={TERMS.url} target="_blank" rel="noreferrer">Regulaminem serwisu</a> (obowiązującym od {TERMS.version}) i akceptuje jego treść, w tym informacje o danych osobowych.</>,
  warranty: <>Klient odebrał urządzenie, sprawdził jego działanie i akceptuje warunki gwarancji (§8 <a href={TERMS.url} target="_blank" rel="noreferrer">Regulaminu serwisu</a>).</>,
};

export default function TermsCheckbox({ checked, onChange, disabled, acceptedAt, variant = 'service' }) {
  const when = acceptedAt ? new Date(acceptedAt).toLocaleString('pl-PL', { dateStyle: 'short', timeStyle: 'short' }) : null;
  return (
    <label className={`tc ${checked ? 'tc-on' : ''}`}>
      <input type="checkbox" checked={!!checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
      <span className="tc-text">
        {TEXT[variant]}
        {when && <small>Zaznaczono {when}</small>}
      </span>
    </label>
  );
}
