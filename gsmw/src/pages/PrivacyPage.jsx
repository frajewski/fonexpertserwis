// Polityka prywatności – zebrane w jednym miejscu informacje RODO z formularzy.
import { Link } from 'react-router-dom';
import SHOP from '../shop';
import { usePageMeta } from '../utils/seo';
import './InfoPages.css';

export default function PrivacyPage() {
  usePageMeta({ title: 'Polityka prywatności', description: 'Jak Fonexpert przetwarza dane osobowe klientów: zgłoszenia napraw, wyceny skupu, SMS-y i status naprawy.', path: '/polityka-prywatnosci' });
  return (
    <main className="ip">
      <section className="ui-hero ui-hero-compact">
        <div className="ui-wrap ui-hero-inner">
          <p className="ui-eyebrow">Dokumenty</p>
          <h1 className="ui-h1">Polityka prywatności</h1>
          <p className="ui-lead">Jakie dane zbieramy na tej stronie i w serwisie, po co i jak długo je przechowujemy.</p>
        </div>
      </section>
      <article className="ui-wrap ui-wrap-narrow ip-body ip-doc">
        <h2>1. Administrator danych</h2>
        <p>Administratorem danych jest {SHOP.legalName}, {SHOP.legalAddress}, NIP {SHOP.nip}. Kontakt: tel. <a href={SHOP.phoneHref}>{SHOP.phone}</a>, e-mail <a href={`mailto:${SHOP.email}`}>{SHOP.email}</a>, punkt serwisowy: {SHOP.addressLine1}, {SHOP.addressLine2}.</p>

        <h2>2. Jakie dane i w jakim celu</h2>
        <ul>
          <li><strong>Zgłoszenie naprawy online</strong> — imię i nazwisko, telefon, nazwa firmy (opcjonalnie), dane urządzenia, opis usterki, zdjęcia, preferowany termin: obsługa zgłoszenia, kontakt telefoniczny i SMS, wykonanie naprawy (art. 6 ust. 1 lit. b RODO).</li>
          <li><strong>Wycena do skupu</strong> — imię, telefon, dane i zdjęcia urządzenia: przygotowanie wyceny i kontakt (art. 6 ust. 1 lit. b RODO). Przy zakupie urządzenia sporządzamy umowę z danymi z dokumentu tożsamości — obowiązki podatkowe i rachunkowe (lit. c).</li>
          <li><strong>Naprawa w serwisie</strong> — dane podane przy przyjęciu urządzenia: wykonanie usługi, gwarancja, rozliczenia podatkowe (lit. b i c) oraz ewentualne roszczenia (lit. f).</li>
          <li><strong>Sprawdzanie statusu</strong> — numer zlecenia i telefon służą wyłącznie do odnalezienia zlecenia i nie są zapisywane osobno.</li>
          <li><strong>SMS-y</strong> — wysyłamy informacje o zgłoszeniu i naprawie oraz jednorazową prośbę o opinię po odbiorze (prawnie uzasadniony interes, lit. f). Odpowiedzi na nasze SMS-y zapisujemy, żeby na nie odpowiedzieć. Odpisz „STOP”, a nie wyślemy Ci więcej próśb o opinię.</li>
        </ul>

        <h2>3. Jak długo przechowujemy dane</h2>
        <p>Zgłoszenia i wyceny, które nie zakończyły się naprawą ani zakupem — do 12 miesięcy. Dane związane z wykonaną naprawą lub zakupem — przez okres wymagany przepisami podatkowymi (5 lat od końca roku podatkowego) i do przedawnienia roszczeń.</p>

        <h2>4. Komu przekazujemy dane</h2>
        <p>Dostawcom usług informatycznych, z których korzystamy: Google (Firebase — hosting strony, baza danych, przechowywanie zdjęć, funkcje serwera) oraz usłudze wysyłki SMS przez telefon serwisu (SMS Gateway for Android). Przy rozliczeniach — biuru rachunkowemu, a gdy wymagają tego przepisy — uprawnionym organom. Dane mogą być przetwarzane poza Europejskim Obszarem Gospodarczym na podstawie standardowych klauzul umownych.</p>

        <h2>5. Ciasteczka i pamięć przeglądarki</h2>
        <p>Strona nie używa ciasteczek reklamowych ani analitycznych. Do działania formularzy i sprawdzania statusu przeglądarka zapisuje identyfikator anonimowej sesji Firebase (pamięć przeglądarki). Mapa Google na stronie <Link to="/kontakt">Kontakt</Link> ładuje się dopiero po kliknięciu — wtedy Google może zapisać własne ciasteczka zgodnie ze swoją polityką.</p>

        <h2>6. Twoje prawa</h2>
        <p>Masz prawo dostępu do danych, ich sprostowania, usunięcia lub ograniczenia przetwarzania, przeniesienia, sprzeciwu oraz skargi do Prezesa Urzędu Ochrony Danych Osobowych. Podanie danych jest dobrowolne, ale bez nich nie obsłużymy zgłoszenia ani wyceny. W sprawie danych napisz na <a href={`mailto:${SHOP.email}`}>{SHOP.email}</a> albo zadzwoń.</p>
      </article>
    </main>
  );
}
