// Zasady rezerwacji i zadatku – te same co w formularzu „Umów naprawę”.
import { Link } from 'react-router-dom';
import SHOP from '../shop';
import { usePageMeta } from '../utils/seo';
import './InfoPages.css';

export default function RulesPage() {
  usePageMeta({ title: 'Zasady rezerwacji i zadatku', description: 'Jak działa rezerwacja naprawy online w Fonexpert, kiedy pobieramy zadatek i kiedy przepada.', path: '/zasady-rezerwacji' });
  return (
    <main className="ip">
      <section className="ui-hero ui-hero-compact">
        <div className="ui-wrap ui-hero-inner">
          <p className="ui-eyebrow">Dokumenty</p>
          <h1 className="ui-h1">Zasady rezerwacji i zadatku</h1>
          <p className="ui-lead">Jak przebiega zgłoszenie naprawy online i kiedy prosimy o zadatek.</p>
        </div>
      </section>
      <article className="ui-wrap ui-wrap-narrow ip-body ip-doc">
        <h2>Jak to działa</h2>
        <ol>
          <li>Wysyłasz <Link to="/umow-naprawe">zgłoszenie online</Link> — to jeszcze nie jest rezerwacja.</li>
          <li>Po przejrzeniu zgłoszenia wysyłamy SMS z <strong>numerem rezerwacji</strong> (np. R001/2026), terminem i wstępną wyceną.</li>
          <li>Gdy oddajesz urządzenie w serwisie, dostajesz potwierdzenie przyjęcia z <strong>numerem zlecenia</strong> (np. 14/2026) — nim sprawdzasz <Link to="/status">status naprawy</Link>.</li>
        </ol>

        <h2>Zadatek</h2>
        <ul>
          <li>Przy poważniejszych naprawach, zwłaszcza wymagających zamówienia części, możemy poprosić o <strong>zadatek</strong> BLIK-iem na numer telefonu {SHOP.phone} — w tytule wpisz numer rezerwacji. Rezerwacja jest potwierdzona po wpłacie.</li>
          <li>Zadatek zaliczamy na poczet ceny naprawy.</li>
          <li><strong>Jeśli zrezygnujesz z naprawy albo nie zgłosisz się w umówionym terminie bez wcześniejszego powiadomienia serwisu, zadatek przepada</strong> (art. 394 Kodeksu cywilnego).</li>
          <li>Jeśli naprawy nie wykonamy z naszej winy, zwracamy zadatek w podwójnej wysokości.</li>
        </ul>

        <h2>Zmiana terminu</h2>
        <p>Nie możesz przyjść? Daj nam znać wcześniej telefonicznie (<a href={SHOP.phoneHref}>{SHOP.phone}</a>) albo SMS-em — ustalimy nowy termin, a zadatek nie przepada. Termin zaproponowany przez serwis możesz też potwierdzić lub zmienić na stronie statusu naprawy.</p>

        <p className="ip-note">Dane osobowe przetwarzamy zgodnie z <Link to="/polityka-prywatnosci">polityką prywatności</Link>.</p>
      </article>
    </main>
  );
}
