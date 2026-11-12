// ============================================================
//  regulamin.js – Regulamin serwisu stacjonarnego fonexpert.
//  Treść 1:1 z dokumentu Regulamin_serwisu_fonexpert.docx
//  (zaakceptowanego przez prawnika 11.2026). NIE zmieniaj treści
//  bez konsultacji – zmiana = nowa wersja (TERMS.version w panelu).
// ============================================================

export const REGULAMIN_VERSION = '26.10.2026';
export const REGULAMIN_DATE_LABEL = '26 października 2026 r.';

// Kluczowe opłaty z regulaminu (§3 ust. 3, §6 ust. 4–5) – pokazywane przy akceptacji
export const REGULAMIN_FEES = { diagnosisFee: 123, storageDays: 30, storageFeePerDay: 5 };

// Regulamin w skrócie – streszczenie dla klienta (NIE zastępuje pełnej treści).
// Każdy punkt odsyła do paragrafu. Zmieniasz regulamin → sprawdź też skrót.
export const REGULAMIN_SHORT = [
  { par: 2, title: 'Przyjęcie', text: 'Dostajesz zlecenie z numerem (SMS lub wydruk) — na jego podstawie odbierasz urządzenie. Wyjmij kartę SIM, kartę pamięci i etui: za akcesoria niewpisane do zlecenia nie odpowiadamy.' },
  { par: 2, title: 'Kod blokady', text: 'Podaj kod lub wyłącz blokadę ekranu — bez tego nie sprawdzimy w pełni działania telefonu po naprawie.' },
  { par: 3, title: 'Wycena', text: 'Cena przy przyjęciu jest orientacyjna. Jeśli naprawa ma kosztować więcej, najpierw pytamy Cię o zgodę. Brak odpowiedzi przez 14 dni oznacza rezygnację z naprawy.' },
  { par: 3, title: 'Diagnoza', text: 'Bezpłatna, jeśli zlecisz naprawę. Gdy zrezygnujesz po diagnozie — 123 zł.' },
  { par: 4, title: 'Czas naprawy', text: 'Do 14 dni roboczych, proste naprawy (szybka, bateria, gniazdo) zwykle tego samego dnia. Dłużej, jeśli czekamy na części — wtedy dajemy znać.' },
  { par: 4, title: 'Części', text: 'Rodzaj części (oryginał, oryginał z odzysku, zamiennik) ustalamy z Tobą. Po wymianie poza serwisem producenta telefon może pokazywać komunikat o „nieznanej części” lub stracić np. wodoszczelność, a gwarancja producenta może wygasnąć.' },
  { par: 5, title: 'Twoje dane', text: 'Zrób kopię zapasową — niektóre naprawy wymagają przywrócenia ustawień fabrycznych. Nie przeglądamy Twoich danych.' },
  { par: 6, title: 'Odbiór', text: 'Odbierz urządzenie w ciągu 30 dni od SMS-a o gotowości. Później naliczamy 5 zł za każdy dzień przechowania.' },
  { par: 7, title: 'Płatność', text: 'Przy odbiorze: gotówka, karta lub BLIK. Na życzenie wystawiamy fakturę.' },
  { par: 8, title: 'Gwarancja', text: 'Od 1 do 6 miesięcy na naprawę i wymienione części (okres wpisujemy do zlecenia). Nie obejmuje późniejszych uszkodzeń mechanicznych i zalania.' },
  { par: 9, title: 'Reklamacje', text: 'Osobiście w punkcie lub e-mailem — odpowiadamy w ciągu 14 dni.' },
];

export const REGULAMIN = [
  {
    "title": "§1. Postanowienia ogólne",
    "items": [
      {
        "t": "Regulamin określa zasady świadczenia usług serwisowych telefonów komórkowych, tabletów i innych urządzeń elektronicznych w punkcie stacjonarnym fonexpert."
      },
      {
        "t": "Usługodawcą jest fonexpert, z siedzibą pod adresem: Bogusławice 29a, 09-100 Płońsk, NIP: 5671935602."
      },
      {
        "t": "Punkt serwisowy: CH Kaufland, ul. Żołnierzy Wyklętych 16, 09-100 Płońsk."
      },
      {
        "t": "Kontakt: tel. 739 696 665, e-mail: kontaktfonexpert@gmail.com."
      },
      {
        "t": "Definicje użyte w Regulaminie:",
        "sub": [
          "Serwis – fonexpert, świadczący usługi naprawy i diagnostyki.",
          "Klient – osoba fizyczna, osoba prawna lub jednostka organizacyjna zlecająca usługę.",
          "Konsument – Klient będący konsumentem w rozumieniu art. 22¹ Kodeksu cywilnego.",
          "Urządzenie – sprzęt przekazany do Serwisu w celu diagnozy lub naprawy.",
          "Zlecenie – dokument przyjęcia Urządzenia, wydawany Klientowi przy przyjęciu."
        ]
      },
      {
        "t": "Złożenie Zlecenia oznacza akceptację Regulaminu. Regulamin jest dostępny w punkcie serwisowym i przekazywany Klientowi na życzenie."
      }
    ]
  },
  {
    "title": "§2. Przyjęcie urządzenia do serwisu",
    "items": [
      {
        "t": "Przyjęcie Urządzenia potwierdzane jest Zleceniem zawierającym: dane Klienta, model i numer IMEI/seryjny, opis usterki deklarowanej przez Klienta, opis stanu wizualnego oraz przekazane akcesoria."
      },
      {
        "t": "Klient otrzymuje kopię Zlecenia, która jest podstawą do odbioru Urządzenia."
      },
      {
        "t": "Serwis nie odpowiada za akcesoria niewpisane do Zlecenia (etui, karty SIM i pamięci, ładowarki). Klient powinien wyjąć je przed oddaniem Urządzenia."
      },
      {
        "t": "Klient podaje kod blokady ekranu lub wyłącza blokadę, jeśli jest to niezbędne do diagnozy i sprawdzenia działania po naprawie. Odmowa może uniemożliwić pełne przetestowanie Urządzenia."
      },
      {
        "t": "Klient oświadcza, że jest właścicielem Urządzenia lub jest uprawniony do zlecenia naprawy."
      },
      {
        "t": "Serwis może odmówić przyjęcia Urządzenia, w szczególności gdy jest ono zablokowane na koncie (np. iCloud, Google FRP) bez możliwości odblokowania przez Klienta, pochodzi z niewiadomego źródła lub naprawa jest technicznie niemożliwa."
      }
    ]
  },
  {
    "title": "§3. Diagnoza, wycena i akceptacja kosztów",
    "items": [
      {
        "t": "Wstępna wycena podana przy przyjęciu jest orientacyjna i opiera się na opisie usterki podanym przez Klienta."
      },
      {
        "t": "Jeśli po diagnozie koszt naprawy przekroczy wycenę wstępną, Serwis kontaktuje się z Klientem telefonicznie, SMS lub e-mailem. Naprawa jest kontynuowana dopiero po akceptacji nowego kosztu."
      },
      {
        "t": "Diagnoza jest bezpłatna, jeśli Klient zleci naprawę. W razie rezygnacji z naprawy po diagnozie Serwis może pobrać opłatę za diagnozę w wysokości 123 zł brutto, o czym informuje przy przyjęciu."
      },
      {
        "t": "Brak odpowiedzi Klienta na wycenę w ciągu 14 dni traktowany jest jako rezygnacja z naprawy."
      },
      {
        "t": "W trakcie naprawy mogą ujawnić się usterki ukryte, niewidoczne przy przyjęciu (np. po zalaniu lub upadku). Serwis informuje o nich Klienta przed dalszymi pracami."
      }
    ]
  },
  {
    "title": "§4. Realizacja naprawy, terminy i części",
    "items": [
      {
        "t": "Standardowy czas naprawy wynosi do 14 dni roboczych od przyjęcia Urządzenia. Proste naprawy (np. wymiana szkła, baterii, gniazda) wykonywane są w miarę możliwości tego samego dnia."
      },
      {
        "t": "Termin może się wydłużyć przy oczekiwaniu na części od dostawcy. Serwis informuje o tym Klienta."
      },
      {
        "t": "Serwis stosuje części oryginalne, oryginalne z odzysku lub zamienniki wysokiej jakości. Rodzaj części ustalany jest z Klientem i wpisywany do Zlecenia."
      },
      {
        "t": "Wymiana niektórych podzespołów poza autoryzowanym serwisem producenta może powodować komunikaty systemowe (np. „nieznana część” w iPhone) lub utratę niektórych funkcji (np. True Tone, Face ID, wodoszczelność). Klient przyjmuje to do wiadomości przy zleceniu."
      },
      {
        "t": "Ingerencja w Urządzenie może spowodować utratę gwarancji producenta. Klient decyduje o naprawie świadomie."
      },
      {
        "t": "Wymienione części pozostają w Serwisie do utylizacji, chyba że Klient zażąda ich zwrotu przy przyjęciu."
      }
    ]
  },
  {
    "title": "§5. Dane w urządzeniu i odpowiedzialność Serwisu",
    "items": [
      {
        "t": "Przed oddaniem Urządzenia Klient powinien wykonać kopię zapasową danych. Niektóre naprawy (np. płyty głównej, aktualizacja oprogramowania) mogą wymagać przywrócenia ustawień fabrycznych."
      },
      {
        "t": "Serwis nie odpowiada za utratę danych, chyba że wynika ona z umyślnego działania lub rażącego niedbalstwa Serwisu."
      },
      {
        "t": "Serwis nie przegląda, nie kopiuje i nie udostępnia danych Klienta poza czynnościami niezbędnymi do naprawy."
      },
      {
        "t": "Serwis nie odpowiada za usterki, które ujawnią się w Urządzeniach zalanych, mechanicznie uszkodzonych lub wcześniej naprawianych przez osoby trzecie, jeśli nie są związane z wykonaną naprawą."
      },
      {
        "t": "Przy naprawie Urządzeń zalanych lub silnie uszkodzonych istnieje ryzyko całkowitego unieruchomienia Urządzenia. Klient jest o tym informowany przed naprawą."
      },
      {
        "t": "Odpowiedzialność Serwisu wobec Klientów niebędących Konsumentami ogranicza się do wartości wykonanej usługi."
      }
    ]
  },
  {
    "title": "§6. Odbiór urządzenia",
    "items": [
      {
        "t": "Serwis informuje Klienta o zakończeniu naprawy telefonicznie lub SMS."
      },
      {
        "t": "Urządzenie wydawane jest osobie okazującej kopię Zlecenia. W razie jej utraty – po okazaniu dokumentu tożsamości osoby wpisanej do Zlecenia."
      },
      {
        "t": "Przy odbiorze Klient powinien sprawdzić Urządzenie i stan wizualny w obecności pracownika Serwisu."
      },
      {
        "t": "Klient powinien odebrać Urządzenie w ciągu 30 dni od powiadomienia o zakończeniu naprawy lub rezygnacji z niej."
      },
      {
        "t": "Po upływie 30 dni Serwis może naliczyć opłatę za przechowanie w wysokości 5 zł za każdy dzień zwłoki, o czym Klient jest informowany przy przyjęciu."
      },
      {
        "t": "Jeśli Klient nie odbierze Urządzenia mimo wezwania wysłanego na podany adres, numer telefonu lub e-mail, Serwis postępuje zgodnie z ustawą z dnia 18 października 2006 r. o likwidacji niepodjętych depozytów, a po upływie ustawowych terminów może zlikwidować Urządzenie."
      }
    ]
  },
  {
    "title": "§7. Płatności",
    "items": [
      {
        "t": "Opłata za usługę płatna jest przy odbiorze Urządzenia gotówką, kartą lub BLIK. Stali Klienci biznesowi (firmy korzystające z usług Serwisu po raz kolejny) oraz instytucje mogą, po uzgodnieniu z Serwisem, zapłacić przelewem na podstawie faktury VAT z terminem płatności nie dłuższym niż 7 dni od daty jej wystawienia."
      },
      {
        "t": "Przy naprawach wymagających zamówienia części Serwis może pobrać zaliczkę do wysokości kosztu części. Zaliczka jest zwracana, jeśli naprawa nie dojdzie do skutku z przyczyn leżących po stronie Serwisu."
      },
      {
        "t": "Serwis wydaje paragon fiskalny, a na życzenie Klienta fakturę VAT."
      },
      {
        "t": "Serwis może wstrzymać się z wydaniem Urządzenia do czasu uregulowania należności (prawo zatrzymania, art. 461 Kodeksu cywilnego)."
      }
    ]
  },
  {
    "title": "§8. Gwarancja na naprawę",
    "items": [
      {
        "t": "Serwis udziela gwarancji na wykonaną naprawę i wymienione części na okres od 1 do 6 miesięcy od dnia odbioru Urządzenia. Długość gwarancji zależy od rodzaju naprawy i zastosowanej części (oryginał lub zamiennik) i jest wpisywana do Zlecenia oraz na dowód odbioru."
      },
      {
        "t": "Gwarancja obejmuje wyłącznie zakres wykonanej naprawy i wymienione podzespoły."
      },
      {
        "t": "Gwarancja nie obejmuje:",
        "sub": [
          "uszkodzeń mechanicznych powstałych po odbiorze (pęknięcia, wgniecenia, ślady upadku),",
          "zalania lub zawilgocenia Urządzenia,",
          "ingerencji osób trzecich w Urządzenie po naprawie,",
          "naturalnego zużycia (np. spadku pojemności baterii zgodnego z jej eksploatacją),",
          "usterek oprogramowania niezwiązanych z naprawą."
        ]
      },
      {
        "t": "Gwarancja nie wyłącza, nie ogranicza ani nie zawiesza uprawnień Konsumenta wynikających z przepisów prawa."
      }
    ]
  },
  {
    "title": "§9. Reklamacje",
    "items": [
      {
        "t": "Reklamację można złożyć osobiście w punkcie serwisowym lub e-mailem na adres kontaktfonexpert@gmail.com."
      },
      {
        "t": "Reklamacja powinna zawierać: numer Zlecenia, dane Klienta, opis wady i żądanie Klienta. Do reklamacji należy dostarczyć Urządzenie."
      },
      {
        "t": "Serwis rozpatruje reklamację w ciągu 14 dni od jej otrzymania i informuje Klienta o decyzji w sposób, w jaki reklamacja została złożona, lub na wskazany kontakt."
      },
      {
        "t": "Konsument może skorzystać z pozasądowych sposobów rozwiązywania sporów, m.in. pomocy Miejskiego lub Powiatowego Rzecznika Konsumentów oraz Wojewódzkiego Inspektoratu Inspekcji Handlowej."
      }
    ]
  },
  {
    "title": "§10. Ochrona danych osobowych (RODO)",
    "items": [
      {
        "t": "Administratorem danych osobowych Klienta jest Fonexpert Filip Rajewski, Bogusławice 29a, 09-100 Płońsk, NIP 5671935602, kontakt: kontaktfonexpert@gmail.com."
      },
      {
        "t": "Dane przetwarzane są w celu realizacji Zlecenia (art. 6 ust. 1 lit. b RODO), wystawienia dokumentów księgowych (art. 6 ust. 1 lit. c RODO) oraz obrony przed roszczeniami (art. 6 ust. 1 lit. f RODO)."
      },
      {
        "t": "Podanie danych jest dobrowolne, ale niezbędne do przyjęcia Urządzenia."
      },
      {
        "t": "Dane przechowywane są przez okres realizacji Zlecenia i gwarancji, a następnie przez okres przedawnienia roszczeń i wymagany przepisami podatkowymi."
      },
      {
        "t": "Dane mogą być przekazywane wyłącznie podmiotom wspierającym Serwis (księgowość, dostawcy systemów IT, firmy kurierskie)."
      },
      {
        "t": "Klient ma prawo dostępu do danych, ich sprostowania, usunięcia, ograniczenia przetwarzania, przeniesienia, wniesienia sprzeciwu oraz skargi do Prezesa UODO."
      }
    ]
  },
  {
    "title": "§11. Postanowienia końcowe",
    "items": [
      {
        "t": "W sprawach nieuregulowanych Regulaminem stosuje się przepisy Kodeksu cywilnego, ustawy o prawach konsumenta oraz RODO."
      },
      {
        "t": "Postanowienia Regulaminu nie ograniczają praw Konsumentów wynikających z bezwzględnie obowiązujących przepisów prawa."
      },
      {
        "t": "Spory z Klientami niebędącymi Konsumentami rozstrzyga sąd właściwy dla siedziby Serwisu."
      },
      {
        "t": "Serwis może zmienić Regulamin. Do Zleceń przyjętych przed zmianą stosuje się Regulamin w dotychczasowym brzmieniu."
      },
      {
        "t": "Regulamin wchodzi w życie z dniem wskazanym na początku dokumentu."
      }
    ]
  }
];
