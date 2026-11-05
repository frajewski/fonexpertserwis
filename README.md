# 🔧 Fonexpert — system serwisu GSM

System dla serwisu **Fonexpert** (Pasaż Kaufland, Płońsk): zlecenia napraw, rezerwacje online, skup i komis telefonów, magazyn części, kasa, statystyki, katalog B2B i SMS-y do klientów. Dwie aplikacje webowe na jednej bazie Firebase, a panel admina działa też jako PWA i aplikacja Android.

| | |
|---|---|
| Panel klienta | https://gsm-serwis-klient.web.app |
| Panel admina | https://gsm-serwis-admin.web.app (+ APK `pl.fonexpert.serwis`) |
| Projekt Firebase | `gsmserviceapp-ff8f6` |
| Repozytorium | github.com/frajewski/fonexpertserwis |

```
 🌐 Panel klienta (gsmw)            🖥️ Panel admina (gsm-admin-panel)
 strona serwisu, zgłoszenia,        web + PWA + Android (Capacitor)
 status naprawy, skup, B2B          zlecenia, rezerwacje, skup, kasa…
            │                                   │
            └──────────────┬────────────────────┘
                           ▼
              🔥 Firebase (firebase/)
              Auth · Firestore · Storage · Cloud Functions · FCM
                           │
                           ▼
              📲 Bramka SMS (Android + SMS Gateway, Cloud Server)
```

## Spis treści
1. [Panel klienta (`gsmw`)](#-panel-klienta-gsmw)
2. [Panel admina (`gsm-admin-panel`)](#-panel-admina-gsm-admin-panel)
3. [Najważniejsze procesy](#-najważniejsze-procesy)
4. [Bramka SMS](#-bramka-sms)
5. [Backend: funkcje, dane, bezpieczeństwo](#-backend-funkcje-dane-bezpieczeństwo)
6. [Role](#-role)
7. [Uruchomienie i wdrożenie](#-uruchomienie-i-wdrożenie)
8. [Struktura repozytorium](#-struktura-repozytorium)
9. [Znane ograniczenia](#-znane-ograniczenia)

---

## 🌐 Panel klienta (`gsmw`)

Publiczna strona serwisu. Klient **nie zakłada konta** — panel loguje go anonimowo w Firebase, a dane zlecenia dostaje tylko przez Cloud Functions (link z tokenem albo numer zlecenia + telefon).

| Adres | Co jest na stronie |
|---|---|
| `/` | Strona główna: hero z przyciskiem zgłoszenia i szybkim sprawdzeniem statusu, usługi, najczęstsze naprawy (link otwiera formularz z zaznaczoną usterką), „jak to działa”, FAQ, dojazd |
| `/umow-naprawe` | Zgłoszenie naprawy w 2 krokach: urządzenie i usterka → dane kontaktowe; opcjonalnie opis, do 5 zdjęć, preferowany termin (nie wcześniej niż dziś), firma; akceptacja zasad zadatku i RODO. Parametry `?usterka=<usterka>|diagnoza`, `?typ=Tablet|Laptop|Inne` |
| `/status` | Wyszukanie zlecenia po numerze (np. `14/2026`) i telefonie |
| `/?token=…`, `/zlecenie/:id` | Status naprawy: 5 etapów, komunikat dla każdego statusu, historia zmian z datami, potwierdzenie albo zmiana proponowanego terminu, akceptacja/odrzucenie kosztorysu, gwarancja po odbiorze, kontakt |
| `/skup-i-sprzedaz` | Sprzedaż nowych (gwarancja 12–24 mies.) i używanych (1–6 mies.) urządzeń, lista testów, formularz bezpłatnej wyceny do skupu (stan, opcjonalnie pamięć, bateria, zestaw, zdjęcia) |
| `/faq` | 20 pytań w 4 kategoriach, wyszukiwarka, dane strukturalne FAQPage dla Google |
| `/kontakt` | Wizytówka (status „otwarte/zamknięte” wg czasu w Polsce), mapa Google, trasa, link do opinii |
| `/oferta/:token` | Prywatny katalog B2B (bez nagłówka strony, `noindex`) |

**Gdzie zmieniać treści:** dane kontaktowe, godziny, dane rejestrowe do klauzul RODO, link do wizytówki i pinezka mapy — `gsmw/src/shop.js`; FAQ — `gsmw/src/data/faq.js`; lista testów urządzeń — `TESTS` w `pages/DevicesPage.jsx`; najczęstsze naprawy na stronie głównej — `POPULAR` w `pages/HomePage.jsx`.

**Wydajność i SEO:** podstrony ładowane osobno (`React.lazy` w `App.jsx`), Firebase pobierany dopiero przy formularzach i statusie; fonty hostowane lokalnie (`@fontsource/*`, bez Google Fonts); `index.html` zawiera dane firmy dla Google (JSON-LD `MobilePhoneStore`), podgląd linku (`og-image.jpg`), favicon i manifest; `public/robots.txt` i `sitemap.xml`; tytuł i opis każdej podstrony ustawia `utils/seo.js` (`usePageMeta`). Na telefonie dolny pasek „Zadzwoń / Zgłoś naprawę” (bez niego na stronach z formularzem), strona 404, `/polityka-prywatnosci`, `/zasady-rezerwacji`, mapa Google ładowana po kliknięciu, podpowiedzi modeli w `data/models.js`.

**Wygląd:** wspólne komponenty w `gsmw/src/styles/ui.css` (kontener `ui-wrap` = `--wrap` 1200 px, hero, sekcje, karty, przyciski, pola, komunikaty, stany ładowania i sukcesu), kolory w `styles/tokens.css`. Hierarchia przycisków: jeden gradientowy `ui-btn-cta` na ekran, potem `ui-btn-primary`, `ui-btn-secondary`, `ui-link`. Błędy pokazywane klientowi przechodzą przez `utils/friendlyError.js` (bez technicznych komunikatów Firebase).

---

## 🖥️ Panel admina (`gsm-admin-panel`)

React 19 + Vite, ten sam kod jako strona, PWA i aplikacja Android (Capacitor, szczegóły w [`gsm-admin-panel/HYBRID_APP.md`](gsm-admin-panel/HYBRID_APP.md)). Jasny/ciemny motyw (przełącznik w menu, `src/theme/theme.js`).

| Menu | Kto | Co robi |
|---|---|---|
| **Pulpit** `/pulpit` | admin, pracownik | Zysk dziś, alerty (w tym „bramka SMS offline”), odpowiedzi SMS od klientów, wspólna lista zadań, skróty |
| **Zlecenia** `/` | admin, pracownik | Lista z filtrami i wyszukiwaniem po telefonie; karta zlecenia (szczegóły niżej) |
| **Rezerwacje** `/rezerwacje` | admin, pracownik | Zgłoszenia ze strony: szczegóły, zdjęcia, akceptacja z numerem `R001/2026` i SMS-em, zadatek BLIK, zamiana na zlecenie; usuwanie tylko admin |
| **Kalendarz** `/kalendarz` | admin, pracownik | Tydzień: proponowane/potwierdzone terminy napraw i preferowane terminy z rezerwacji |
| **Kasa** `/kasa` | admin | Raport dnia wg sposobu płatności (gotówka/karta/BLIK/przelew), zadatki, wydruk A4 |
| **Magazyn** `/magazyn` | admin, pracownik | Części w kategoriach (wyświetlacze, baterie, gniazda…), alert niskiego stanu, zużycie w zleceniach |
| **Skup** `/skup` | admin | Telefony kupione i w komisie, grade A+–D, zdjęcia, filtry, sprzedaż z gwarancją i kartą gwarancyjną, kalkulator wyceny, oferta B2B |
| **Wyceny skupu** `/wyceny` | admin | Zapytania z formularza na stronie: dane, zdjęcia, cena → SMS z wyceną, „Kupione”/„Odrzuć” |
| **Umowa skupu** `/umowa` | admin | Umowa kupna od osoby prywatnej (PESEL, dowód, stan, IMEI, podpis) na jednej kartce A4; zapis dodaje telefon do Skupu |
| **U komisantów** `/komisanci` | admin | Telefony oddane innym w komis: protokół przekazania, „Zapłacił”, zwrot |
| **Klienci** `/klienci` | admin, pracownik | Karta klienta z historią zleceń |
| **Statystyki** `/statystyki` | admin | Zysk naprawy + skup po kosztach, dowolny miesiąc z historii, marki, marże, wykres roczny |
| **Koszty firmy** `/koszty` | admin | Księgowość, ZUS, podatki, reklama… odejmowane od zysku |
| **Użytkownicy**, **Ustawienia** | admin | Role kont; dane serwisu (`meta/settings`); stan bramki SMS, podłączenie odbioru odpowiedzi, lista wypisanych (STOP); kopie zapasowe bazy |

**Karta zlecenia:**
- Kosztorys (łącznie − części = usługa), zadatek i „do zapłaty”, części z magazynu, typ dokumentu (paragon/faktura), zdjęcia i podpisy.
- Wydruki: potwierdzenie przyjęcia z kodem QR do śledzenia, potwierdzenie wydania z warunkami gwarancji, naklejka.
- Sposób płatności przy wydaniu.
- Proponowany termin naprawy (SMS z linkiem; klient akceptuje albo proponuje inny, który przyjmujesz jednym przyciskiem).
- Ręczne SMS-y z szablonów, historia SMS-ów, przełącznik prośby o opinię.
- Przypisanie klienta, jeśli zlecenie go nie ma.

**Statusy zlecenia:** Przyjęte → W diagnozie → Zamów części → W naprawie → Oczekuje na części → Czeka na klienta → Gotowe do odbioru → Odebrane (albo Anulowane). Przy „Czeka na klienta” i „Gotowe do odbioru” panel proponuje SMS („części dotarły”, „gotowe do odbioru”), każdy najwyżej raz na zlecenie. Statusy są w `packages/shared-core/src/constants/statuses.js`; każda zmiana trafia do `history` zlecenia (data, status, kto).

**Pracownik** nie widzi cen zakupu ani wartości finansowych: nie ma dostępu do Skupu, Wycen, Umowy, Komisantów, Kasy, Statystyk, Kosztów, Użytkowników i Ustawień. Blokują to też reguły bazy — kolekcje `phones`, `buybackRequests` i `expenses` czyta tylko admin.

---

## 🔁 Najważniejsze procesy

**Rezerwacja → zlecenie**
1. Klient wysyła formularz `/umow-naprawe` (funkcja `createBookingRequestWeb`; zdjęcia w Storage `bookingUploads/<uid>/`).
2. Push do personelu, licznik w menu „Rezerwacje”.
3. Akceptacja nadaje numer `R001/ROK` (`counters/bookings-ROK`) i wysyła SMS (do edycji przed wysłaniem) z terminem, ceną i ewentualnym zadatkiem BLIK na numer z `src/constants/shopInfo.js` — w tytule numer rezerwacji. Zadatek przepada przy rezygnacji albo nieprzyjściu bez uprzedzenia.
4. „Zadatek wpłacony” → „Utwórz zlecenie”: klient dopasowany po telefonie (albo założony), zadatek i zdjęcia przechodzą do zlecenia.

**Śledzenie naprawy:** każde zlecenie ma `trackingToken`; link `https://gsm-serwis-klient.web.app/?token=…` jest w SMS-ach i w kodzie QR na potwierdzeniu. Klient widzi tylko pola z `repairToPublicData` (bez notatek wewnętrznych i autorów zmian).

**Skup online:** formularz `/skup-i-sprzedaz` → `createBuybackRequestWeb` (maks. 5 zapytań na sesję na dobę) → push do admina → „Wyceny skupu”: cena i SMS → klient przychodzi z dowodem → „Umowa skupu”.

**Katalog B2B:** kafelki marek mają stałe grafiki (kolor marki + nazwa), niezależne od zdjęć telefonów. Telefon oznaczony „W ofercie B2B” z ceną hurtową trafia przez `syncB2bCatalog` do publicznej kolekcji `b2bCatalog/{token}/items` (tylko marka, model, pamięć, kolor, grade, cena, zdjęcie). Link generujesz w Skupie („🔗 Link B2B”) i możesz go unieważnić. Klient widzi listę na żywo i rezerwuje przez WhatsApp.

---

## 📲 Bramka SMS

SMS-y wychodzą z numeru właściciela przez telefon z Androidem i aplikacją **SMS Gateway for Android** ([sms-gate.app](https://sms-gate.app)) w trybie **Cloud Server**. Funkcje wołają `https://api.sms-gate.app/3rdparty/v1/messages` (Basic Auth).

| Funkcja (`firebase/functions/reviewSms.js`) | Do czego |
|---|---|
| `sendSmsToCustomer` (callable, admin i pracownik) | Wszystkie SMS-y z panelu: zlecenia, rezerwacje, wyceny skupu (te tylko admin). Wpis trafia do `smsLog` dokumentu |
| `sendReviewRequests` (codziennie 11:00 czasu polskiego) | Jednorazowa prośba o opinię Google 3–6 dni po odbiorze; pomija zlecenia z `noReviewSms` i numery wypisane (STOP) |
| `smsGatewayStatus` (callable, personel) | Kiedy telefon z bramką był online, ile SMS-ów czeka i ile się nie udało (24 h) — Pulpit pokazuje ostrzeżenie, gdy telefon jest offline > 30 min |
| `registerSmsInbound` (callable, admin) | Jednorazowo rejestruje w bramce webhook `sms:received` (przycisk w Ustawieniach) |
| `smsInboundWebhook` (HTTP, chroniony kluczem z `meta/smsWebhook`) | Odbiera SMS-y od klientów → `smsInbox` (Pulpit + push); „STOP”/„wypisz” → `smsOptOut` |

**Konfiguracja:**
```bash
cd ~/Desktop/pro/firebase
printf '%s' 'LOGIN' | firebase functions:secrets:set SMSGATE_USER --data-file -
printf '%s' 'HASLO' | firebase functions:secrets:set SMSGATE_PASS --data-file -
```
`REVIEW_URL` i `REVIEW_SMS_MODE` (`off` / `dry` / `live`) są w `firebase/functions/.env.gsmserviceapp-ff8f6` — ten plik ma pierwszeństwo przed `.env` i **nie może trafić do gita**.

**Odpowiedzi klientów i STOP:** po kliknięciu „Podłącz odbiór odpowiedzi SMS” w Ustawieniach każda odpowiedź klienta trafia na Pulpit (z nazwiskiem, jeśli numer jest w bazie) i jako push. Odpowiedź zaczynająca się od „STOP”, „wypisz”, „rezygnuję” dopisuje numer do listy wypisanych — taki klient nie dostaje próśb o opinię (SMS-y o jego naprawie wysyłasz dalej ręcznie). Numer usuniesz z listy w Ustawieniach.

**Telefon z bramką:** aplikacja uruchomiona z włączonym Cloud Server, internet, bateria „Bez ograniczeń”, „Start on boot” włączone. Wysłanych SMS-ów nie widać w Wiadomościach Google — status jest w zakładce MESSAGES aplikacji bramki.

---

## 🔥 Backend: funkcje, dane, bezpieczeństwo

**Cloud Functions** (`firebase/functions/`, region `us-central1`; `b2b.js`, `push.js`, `reviewSms.js` są dołączane do `index.js`):

| Grupa | Funkcje |
|---|---|
| Panel klienta | `lookupRepair` (numer + telefon), `lookupRepairsByPhone`, `lookupRepairByToken`, `acceptEstimateWeb`, `rejectEstimateWeb`, `respondToSlotWeb`, `createBookingRequestWeb`, `createBuybackRequestWeb` |
| Role | `decideInitialRole`, `syncOwnRoleClaim`, `setUserRoleClaim` |
| Push (FCM) | `registerPushDevice`, `unregisterPushDevice`, `sendTestPush`, `pushOnRepairCreated`, `pushOnRepairUpdated`, `pushOnBookingCreated`, `pushOnBuybackCreated`, `pushOnSmsReceived`, `pushOnLowStock`, `pushOnTaskCreated`, `pushOnTaskAssigned` |
| B2B | `syncB2bCatalog`, `getB2bLink`, `regenerateB2bLink` |
| SMS | `sendSmsToCustomer`, `sendReviewRequests`, `smsGatewayStatus`, `registerSmsInbound`, `smsInboundWebhook` |
| Kopie | `weeklyBackup` (niedziela 3:00), `runBackupNow` (admin) |

**Firestore:**

| Kolekcja | Zawartość | Dostęp |
|---|---|---|
| `repairs` | Zlecenia (z `history`, `smsLog`, `proposedSlot`, `trackingToken`) | personel |
| `phones` | Skup i komis (ceny zakupu, dane sprzedających) | tylko admin |
| `parts` | Magazyn części | personel |
| `bookingRequests` | Rezerwacje ze strony | personel; usuwa admin |
| `buybackRequests` | Zapytania o wycenę | tylko admin; zapis tylko przez funkcję |
| `users`, `tasks`, `expenses` | Konta i role, zadania, koszty | wg reguł |
| `counters` | Numery zleceń `N/ROK` i rezerwacji | personel |
| `meta/settings` | Ustawienia serwisu | personel |
| `smsInbox`, `smsOptOut` | SMS-y od klientów, numery wypisane (STOP) | zapis tylko funkcja; inbox czyta personel, listę STOP admin |
| `b2bConfig`, `b2bCatalog/{token}/items` | Token B2B, okrojony katalog | zapis tylko funkcje; katalog czyta każdy z losowym tokenem w ścieżce |

**Storage:** `repairs/` (zdjęcia zleceń), `trade/` (zdjęcia skupu), `bookingUploads/<uid>/` (zdjęcia od klientów: zapis tylko do własnego folderu sesji, odczyt tylko personel), `backups/` (kopie bazy, odczyt tylko admin).

**Kopie zapasowe:** funkcja `backup.js` zapisuje wszystkie kolekcje (bez `b2bCatalog` i tokenów push) do `backups/firestore-RRRR-MM-DD-GGMM.json` co niedzielę o 3:00 i na żądanie („Zrób kopię teraz” w Ustawieniach); trzymanych jest 12 ostatnich. Zdjęcia nie wchodzą do kopii (zostają w Storage).

**Zasady bezpieczeństwa:** rola jest custom claimem w tokenie Auth; panel klienta nie czyta Firestore bezpośrednio, tylko przez funkcje, które sprawdzają token albo zgodność telefonu i zwracają okrojone dane; sam numer zlecenia nie wystarcza do podglądu.

**Liczba danych w panelu admina:** na żywo subskrybowane są zlecenia z ostatnich 30 dni; starsze są doczytywane na żądanie (lista, Statystyki, Kasa).

---

## 👥 Role

| Rola | Dostęp |
|---|---|
| 👑 Admin | Wszystko |
| 🔧 Pracownik | Pulpit, Zlecenia, Rezerwacje, Kalendarz, Magazyn, Klienci, SMS-y — bez finansów, skupu i ustawień |
| 🌐 Klient | Bez konta (sesja anonimowa) — tylko własne zlecenie przez link z tokenem albo numer + telefon |
| 🤝 Klient B2B | Bez konta — tylko katalog z jednego aktywnego linku |

---

## 🚀 Uruchomienie i wdrożenie

**Lokalnie:**
```bash
cd ~/Desktop/pro && npm install    # workspaces: gsm-admin-panel, gsmw, packages/shared-core
npm run admin                      # panel admina (vite)
npm run client                     # panel klienta (vite)
```

**Wdrożenie (zawsze z właściwego folderu):**
```bash
# backend: reguły, indeksy, Storage, funkcje
cd ~/Desktop/pro/firebase && firebase deploy --only firestore:rules,firestore:indexes,storage,functions

# panel klienta
cd ~/Desktop/pro/gsmw && npm run build && firebase deploy --only hosting:klient

# panel admina (web + PWA)
cd ~/Desktop/pro/gsm-admin-panel && npm run build && firebase deploy --only hosting
```
Po wdrożeniu odśwież panel w przeglądarce (Cmd+Shift+R), bo PWA trzyma starą wersję w cache.

**Aktualizacja aplikacji na telefonie (Android, przez kabel USB):**
```bash
cd ~/Desktop/pro/gsm-admin-panel && npm version patch && npm run build && npx cap sync android \
  && cd android && ./gradlew assembleRelease \
  && ~/Library/Android/sdk/platform-tools/adb install -r app/build/outputs/apk/release/app-release.apk
```

**Adres panelu klienta** jest w dwóch miejscach: `clientUrl` w `gsm-admin-panel/src/constants/shopInfo.js` i `WEB_PANEL_URL` w `packages/shared-core/src/firestoreDb.js`. Przy zmianie hostingu (np. własnej domenie) zmień oba; stare kody QR rozpoznaje skaner dzięki `LEGACY_CLIENT_HOSTS`.

---

## 🗂 Struktura repozytorium

```
pro/
├── firebase/                   🔥 backend
│   ├── functions/              index.js, b2b.js, push.js, reviewSms.js (SMS), backup.js (+ .env.* poza gitem)
│   ├── firestore.rules, firestore.indexes.json, storage.rules
│   └── firebase.json
├── gsm-admin-panel/            🖥️ panel admina (web, PWA, Android)
│   ├── src/pages/              ekrany z menu (Repairs, Bookings, Calendar, CashReport, Trade, BuybackRequests…)
│   ├── src/components/         m.in. PurchaseContractCard, AssignCustomer, StoragePhotos
│   ├── src/utils/              wydruki (print*.js), szablony SMS, statusy
│   ├── src/constants/          shopInfo (adres panelu klienta, BLIK), kategorie części, płatności
│   ├── android/, capacitor.config.ts, HYBRID_APP.md
│   └── vite.config.js          PWA
├── gsmw/                       🌐 panel klienta
│   ├── src/pages/              HomePage, BookingPage, LookupPage, RepairStatusPage, DevicesPage, FaqPage, ContactPage, B2bCatalogPage
│   ├── src/components/         StatusLookupForm
│   ├── src/styles/             tokens.css, ui.css
│   ├── src/data/faq.js, src/shop.js, src/utils/friendlyError.js
│   └── public/                 hero-dark.jpg
└── packages/shared-core/       📦 src/: wspólny store (Zustand), dostęp do Firestore, stałe (statusy, gwarancje…)
```

---

## ⚠️ Znane ograniczenia

- **Dokumenty prawne** (umowy kupna i komisu, karta gwarancyjna, zasady zadatku, klauzule RODO) nie były przeglądane przez prawnika.
- **SMS-y idą przez jeden telefon z bramką** — gdy jest offline, wiadomości czekają w kolejce (panel pokazuje to na Pulpicie, ale nie wyśle SMS-a inną drogą).
- **Brak powiadomień push na iPhonie** — push działa w aplikacji Android; w PWA na iOS i w przeglądarce na komputerze nie jest włączony.
- **Zdjęcie w hero panelu klienta** (`gsmw/public/hero-dark.jpg`) ma niską rozdzielczość — do podmiany na własne zdjęcie z serwisu.

### Rozwiązane (listopad 2026)

- Dane rejestrowe firmy na wydrukach są w jednym miejscu: `COMPANY` w `gsm-admin-panel/src/constants/shopInfo.js` (strona klienta: `gsmw/src/shop.js` — przy zmianie adresu albo NIP-u popraw oba).
- Bramka SMS: status telefonu i kolejki w panelu, ostrzeżenie na Pulpicie, odbiór odpowiedzi klientów i obsługa „STOP”.
- Kafelki marek w katalogu B2B mają stałe grafiki — nie znikają po sprzedaży telefonu.
- Kopie zapasowe bazy: automatycznie co tydzień i na żądanie w Ustawieniach (warto czasem pobrać kopię na komputer, bo leży w tym samym projekcie Firebase).
- Ceny zakupu i dane sprzedających (`phones`) są zablokowane dla pracownika w regułach bazy, nie tylko w interfejsie.
