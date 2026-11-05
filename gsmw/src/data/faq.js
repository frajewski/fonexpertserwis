// FAQ dla klientów — treść od Filipa, pogrupowana w kategorie
export const FAQ_GROUPS = [
  {
    id: 'zgloszenie',
    title: 'Zgłoszenie i koszty',
    items: [
      ['Jak zgłosić telefon do naprawy?', 'Wypełnij formularz na naszej stronie. Wybierz markę i model telefonu, opisz problem oraz podaj dane kontaktowe. Po otrzymaniu zgłoszenia skontaktujemy się z Tobą, żeby ustalić szczegóły. Samo wysłanie formularza nie oznacza jeszcze rozpoczęcia naprawy.'],
      ['Czy muszę wiedzieć, co dokładnie zepsuło się w telefonie?', 'Nie. Wystarczy, że opiszesz, co się dzieje, np. „telefon nie ładuje” albo „ekran jest czarny, ale słychać powiadomienia”. Dokładną przyczynę ustalimy podczas diagnostyki.'],
      ['Ile będzie kosztowała naprawa?', 'Cena zależy od modelu, uszkodzenia i potrzebnych części. Przy typowych naprawach często możemy podać orientacyjny koszt od razu. Jeśli potrzebna jest diagnostyka, przedstawimy wycenę po sprawdzeniu urządzenia. Nie rozpoczynamy dodatkowych płatnych prac bez Twojej zgody.'],
      ['Czy samo zgłoszenie naprawy jest płatne?', 'Wysłanie formularza jest bezpłatne. Ewentualny koszt diagnostyki zależy od rodzaju usterki i zasad przyjęcia urządzenia. O opłacie poinformujemy Cię przed wykonaniem diagnostyki.'],
      ['Co jeśli naprawa okaże się za droga?', 'Nie musisz decydować się na naprawę. Wyjaśnimy koszt i zakres prac. Jeśli zrezygnujesz, ustalimy sposób odbioru urządzenia. Ewentualna opłata za wcześniej uzgodnioną diagnostykę pozostaje zgodna z warunkami przyjęcia.'],
      ['Czy mogę przynieść telefon bez wcześniejszego zgłoszenia?', 'Oczywiście — zapraszamy! Telefon przyjmiemy od ręki, bez umawiania: od poniedziałku do soboty w godz. 9:00–21:00 (w niedziele handlowe 9:00–19:00) w Pasażu Kaufland w Płońsku. Na miejscu sprawdzimy urządzenie i podamy wycenę, a proste naprawy, jak wymiana baterii czy ekranu, często wykonujemy tego samego dnia. Chcesz mieć pewność, że część będzie już czekać? Zgłoś naprawę online albo zadzwoń przed wizytą.'],
      ['Co powinienem przygotować przed oddaniem telefonu?', 'Jeśli telefon działa, wykonaj kopię zapasową ważnych danych. Zabierz urządzenie; ładowarkę lub inne akcesoria przynieś, jeśli mogą mieć związek z problemem. Warto też pokazać, kiedy usterka występuje.'],
    ],
  },
  {
    id: 'naprawa',
    title: 'Naprawa i części',
    items: [
      ['Jak długo trwa naprawa telefonu?', 'Proste naprawy, takie jak wymiana baterii czy ekranu, w wielu przypadkach można wykonać tego samego dnia, jeśli część jest dostępna. Bardziej złożone usterki mogą potrwać dłużej. Termin podamy po ocenie telefonu; o opóźnieniu poinformujemy.'],
      ['Czy używacie oryginalnych części?', 'Korzystamy przede wszystkim z części oryginalnych, a w uzasadnionych przypadkach proponujemy sprawdzone zamienniki. Przed naprawą wyjaśnimy, jaki rodzaj części zastosujemy i jakie są dostępne opcje.'],
      ['Czy zamiennik jest gorszy od oryginału?', 'Zamienniki różnią się jakością. Niektóre działają bardzo dobrze, ale mogą występować różnice np. w jasności i kolorach ekranu, zużyciu energii czy dostępności funkcji. Przed wyborem przedstawimy istotne różnice.'],
      ['Czy po wymianie ekranu telefon będzie działał tak jak wcześniej?', 'Celem naprawy jest przywrócenie prawidłowego działania. Po wymianie sprawdzamy funkcje związane z naprawą. W niektórych modelach mogą wystąpić komunikaty systemowe lub ograniczenia funkcji; o znanym ryzyku uprzedzimy wcześniej.'],
      ['Czy po naprawie telefon nadal będzie wodoodporny?', 'Po otwarciu telefonu nie możemy zagwarantować fabrycznej odporności na wodę i pył. Stosujemy odpowiednie materiały montażowe, ale nie oznacza to przywrócenia fabrycznego certyfikatu szczelności. Zalecamy unikanie kontaktu z wodą.'],
      ['Co jeśli telefon został zalany?', 'Nie ładuj go ani nie próbuj ponownie uruchamiać. Jeśli możesz, wyłącz urządzenie i jak najszybciej dostarcz je do serwisu. Zalanie może wywołać korozję i opóźnione uszkodzenia. Po oględzinach ocenimy możliwości naprawy.'],
      ['Czy naprawiacie telefony, które w ogóle się nie włączają?', 'Takie telefony można zgłosić do diagnostyki. Przyczyną może być bateria, ekran, układ ładowania albo płyta główna. Bez sprawdzenia nie da się tego jednoznacznie określić. Po diagnostyce przedstawimy możliwości i koszty.'],
    ],
  },
  {
    id: 'dane',
    title: 'Dane i prywatność',
    items: [
      ['Czy stracę zdjęcia, kontakty i inne dane?', 'Przy wielu standardowych naprawach dane zazwyczaj pozostają na telefonie. Nie możemy jednak zagwarantować tego w każdej sytuacji. Jeśli urządzenie działa, zalecamy wykonanie kopii zapasowej przed oddaniem go do serwisu.'],
      ['Czy muszę podawać PIN lub hasło do telefonu?', 'Nie zawsze. Dostęp może być potrzebny do przetestowania np. dotyku, aparatu czy głośników. Wyjaśnimy, dlaczego go potrzebujemy. Możemy ustalić testowanie bez przekazania kodu, choć nie wszystkie funkcje da się wtedy sprawdzić.'],
      ['Czy będziecie przeglądać moje zdjęcia i wiadomości?', 'Nie przeglądamy prywatnych danych bez potrzeby. Dostęp do urządzenia wykorzystujemy tylko w zakresie koniecznym do diagnostyki i testów. Jeśli usterka wymaga sprawdzenia funkcji związanej z danymi, wyjaśnimy to wcześniej.'],
    ],
  },
  {
    id: 'gwarancja',
    title: 'Gwarancja i status',
    items: [
      ['Czy dostanę gwarancję na naprawę?', 'Warunki gwarancji serwisowej zależą od usługi i części. Przy odbiorze otrzymasz informację o jej zakresie i okresie, jeśli jest udzielana. Gwarancja na wymieniony element nie oznacza objęcia nią całego telefonu ani późniejszych uszkodzeń.'],
      ['Co jeśli telefon ponownie się zepsuje?', 'Skontaktuj się z nami i opisz problem. Sprawdzimy urządzenie i ustalimy, czy usterka ma związek z wykonaną naprawą. Zgłoszenie rozpatrzymy zgodnie z warunkami gwarancji, jeśli została udzielona, oraz przysługującymi Ci prawami reklamacyjnymi.'],
      ['Czy mogę sprawdzić, co dzieje się z moim telefonem?', 'Tak. W zakładce „Sprawdź status” wpisz numer zlecenia i numer telefonu podany przy przyjęciu — zobaczysz, na jakim etapie jest naprawa. O ważnych zmianach (np. gotowości do odbioru) poinformujemy Cię też SMS-em.'],
    ],
  },
];
export default FAQ_GROUPS;
