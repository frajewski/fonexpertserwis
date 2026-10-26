# 🔧 Fonexpert — System zarządzania serwisem GSM

Kompletny system do zarządzania serwisem napraw telefonów, skupem/komisem używanych urządzeń, magazynem części, sprzedażą hurtową B2B i kontaktem z klientami — dwie aplikacje webowe (panel admina instalowalny jako PWA na telefonie), współdzielące jedną, żywą bazę danych.

Repo: **github.com/frajewski/fonexpertserwis**

> 📱 Panel admina jako **PWA i aplikacja hybrydowa Android (Capacitor)**: architektura, pluginy, build APK/AAB, testy i scenariusz prezentacji są w [`gsm-admin-panel/HYBRID_APP.md`](gsm-admin-panel/HYBRID_APP.md).

```
┌──────────────────────┐     ┌─────────────────────────┐
│  🖥️ Panel admina       │     │  🌐 Panel klienta         │
│  (web + PWA)          │     │  (web)                    │
│  (gsm-admin-panel)    │     │  (gsmw)                   │
│                       │     │  • śledzenie zleceń       │
│                       │     │  • katalog B2B (/oferta)  │
└───────────┬───────────┘     └─────────┬─────────────────┘
            │                           │
            └─────────────┬─────────────┘
                           │
             ┌─────────────▼─────────────┐
             │   🔥 Firebase (firebase/)  │
             │   (gsmserviceapp-ff8f6)    │
             │  Auth · Firestore ·        │
             │  Storage · Cloud Functions │
             └────────────────────────────┘
```

---

## Spis treści

1. [Dwie aplikacje](#dwie-aplikacje)
2. [Funkcje panelu admina](#funkcje-panelu-admina)
3. [Katalog B2B](#katalog-b2b)
   - [Bramka SMS](#bramka-sms)
4. [Architektura danych](#architektura-danych)
5. [Role i uprawnienia](#role-i-uprawnienia)
6. [Instalacja i uruchomienie](#instalacja-i-uruchomienie)
7. [Konfiguracja Firebase](#konfiguracja-firebase)
8. [Struktura repozytorium](#struktura-repozytorium)
9. [Znane ograniczenia](#znane-ograniczenia)

---

## Dwie aplikacje

### 🖥️ `gsm-admin-panel/` — Panel administracyjny (web + PWA)

Działa jako strona w przeglądarce **oraz** jako instalowalna aplikacja na telefonie (PWA — "Dodaj do ekranu głównego", otwiera się bez paska adresu). Dla Admina i Pracownika.

### 🌐 `gsmw/` — Panel klienta (web)

Dwie role w jednym miejscu:
- **Śledzenie zlecenia** — bez logowania, przez numer zlecenia + telefon albo link/QR z potwierdzenia. Status naprawy, historia oraz **akceptacja / odrzucenie kosztorysu bezpośrednio z linku** (token w linku wystarcza, bez wpisywania numeru i telefonu).
- **Katalog B2B** (`/oferta/:token`) — prywatna, niezaindeksowana strona z ofertą hurtową dla stałego klienta biznesowego, patrz niżej.

---

## Funkcje panelu admina

### 🏠 Pulpit (`/pulpit`) — ekran startowy po zalogowaniu
Zysk dzisiaj, wszystkie alerty w jednym miejscu, lista zadań na dziś/jutro (wspólna dla zespołu), szybkie skróty, podgląd bieżącego miesiąca.

### 🔧 Zlecenia
Przyjęcie z edytowalną datą, priorytet, zadatek wpłacony z osobną linią "Do zapłaty" w kosztorysie, kosztorys z auto-wyliczaniem usługi (Łącznie − Części), wykonana usługa i zużyte części z Magazynu (automatyczne odjęcie stanu i doliczenie kosztu, blokada przy zerowym stanie), dokument sprzedaży (Paragon/Faktura), zdjęcia, **druk potwierdzenia przyjęcia z kodem QR** do śledzenia statusu online, **druk potwierdzenia wydania** ze skróconymi warunkami gwarancji, druk naklejki na sprzęt, filtry (marka, model, typ dokumentu, priorytet, zakres dat) zapamiętywane między odświeżeniami strony, historia starsza niż 30 dni doładowywana na żądanie, historia wysłanych SMS-ów w zleceniu (ręczne, automatyczne i prośby o opinię), szablony SMS z linkiem śledzenia (w tym przypomnienie o odbiorze i "części dotarły"), **wysyłka SMS jednym kliknięciem z komputera** przez bramkę SMS (patrz niżej), **wyszukiwanie po numerze telefonu klienta**.

**Statusy:** Przyjęte → W diagnozie → Zamów części → W naprawie → Oczekuje na części → **Czeka na klienta** (części dotarły, klient powiadomiony — zmiana statusu proponuje wysłanie SMS „części dotarły”, raz na zlecenie) → Gotowe do odbioru → Odebrane / Anulowane.

**Karta zlecenia:** zwijane sekcje (Powiadom klienta, Zdjęcia, Podpisy), statusy jako kompaktowe „pigułki”, typ dokumentu / NIP / PIN jako plakietki w nagłówku, w wydanych zleceniach podgląd i przełącznik SMS-a z prośbą o opinię.

### 📱 Skup / sprzedaż telefonów
Dwa tryby: **kupno** i **komis**. Skala stanu Grade A+ do D, nowy/używany. Dane sprzedającego (imię, adres, dowód/PESEL) + **umowy do druku**: umowa kupna od osoby prywatnej powstaje w osobnej zakładce **📝 Umowa skupu** (`/umowa`) — jeden formularz (sprzedawca z PESEL i dowodem, urządzenie, checkboxy stanu/wyposażenia/blokad, weryfikacja IMEI, sposób zapłaty, cena, podpis na ekranie) → „Generuj umowę” dodaje telefon do Skupu i od razu otwiera wydruk (jedna kartka A4, kwota także słownie; papier dla klienta i biura rachunkowego). Ponowny wydruk: „📄 Drukuj umowę” w karcie telefonu. Umowa komisu nadal z formularza „Dodaj telefon” (tryb Komis). Gwarancja wybierana przy oznaczaniu jako sprzedany (te same okresy co w naprawach) + **karta gwarancyjna do druku**, dołączana do paragonu. Zdjęcie telefonu (wgrywane, podmieniane, usuwalne). Filtry (marka, model, pamięć, dostawca, sprzedawca, zakres dat, cena) zapamiętywane między odświeżeniami. Kalkulator wyceny na bazie historii transakcji. Pole "W ofercie B2B" + cena hurtowa, pojedynczo lub hurtem dla zaznaczonych.

### 🤝 U komisantów (`/komisanci`, tylko Admin)
Własne telefony oddane innym osobom w komis (status `U komisanta`). Komisant zatrzymuje nadwyżkę, a Ty ustalasz kwotę, którą chcesz uzyskać („Cena dla komisanta”, ustawiana też w karcie telefonu). Lista grupowana po komisantach, formularz przekazania z wieloma telefonami, **druk protokołu przekazania**, „💰 Zapłacił” (rejestruje sprzedaż), „↩ Zwrot”, edycja danych komisanta i przenoszenie telefonu między komisantami, alert przy ≥30 dniach. Telefony u komisantów nie trafiają do katalogu B2B.

### 📅 Rezerwacje (`/rezerwacje`)
Zgłoszenia ze strony klienta („Umów naprawę” w `gsmw`) z licznikiem nowych w menu. Akceptacja/odrzucenie z wiadomością dla klienta i propozycją wysłania jej SMS-em przez bramkę, preferowany termin klienta, „Utwórz zlecenie” — dopasowuje klienta po numerze telefonu albo zakłada nowego i tworzy zlecenie. Historia SMS przy zgłoszeniu.

### 💰 Kasa (`/kasa`)
Raport dowolnego dnia: zlecenia wydane i telefony sprzedane z podziałem na sposób płatności (gotówka/karta/BLIK/przelew — wybierany przy „Potwierdź wydanie” i „Oznacz jako sprzedany”), zadatki przyjęte tego dnia, wydruk raportu na A4. Dane czytane z bazy dla wybranego dnia (nie tylko z 30-dniowego okna).

### 📦 Magazyn części zamiennych
Osobna ewidencja od Skupu, alert przy niskim stanie, blokada dodania części jeśli brak na stanie.

### 💸 Koszty utrzymania firmy
Księgowość, ZUS, VAT, PIT, reklama, materiały eksploatacyjne — odejmowane od zysku w Statystykach ("zysk po kosztach").

### 📊 Statystyki
Okresy (dziś/miesiąc/rok) z łącznym zyskiem (naprawy + skup, po kosztach), przychód ze sprzedaży telefonów osobno od zysku, szczegółowy widok dowolnego miesiąca z historii (strona sama doczytuje starsze zlecenia spoza 30-dniowego okna), top marki/modele, marża wg marki, wykres roczny.

### 👤 Klienci
Karta z historią zleceń, edycja danych kontaktowych.

### 🔐 Moje konto
Zmiana własnego hasła, weryfikacja email, reset hasła przez link.

---

## Katalog B2B

Prywatna, niezaindeksowana (`noindex`) strona ofertowa dla klienta hurtowego — link z tokenem w ścieżce, bez logowania po stronie klienta.

**Jak działa:**
1. Admin oznacza telefony jako "W ofercie B2B" z ceną hurtową (pojedynczo w karcie telefonu albo hurtem przez zaznaczenie wielu na liście Skupu).
2. Cloud Function (`syncB2bCatalog`) nasłuchuje zmian w `phones/` i utrzymuje osobną, publicznie-czytelną kolekcję `b2bCatalog/{token}/items/` zawierającą **wyłącznie białą listę bezpiecznych pól** (marka, model, pamięć, kolor, grade, cena B2B, zdjęcie) — cena zakupu, marża, dane sprzedającego, notatki nigdy tam nie trafiają. Telefon znika z katalogu automatycznie po sprzedaży, odznaczeniu checkboxa albo wyzerowaniu ceny.
3. Admin generuje/odświeża link w panelu (Skup → "🔗 Link B2B"), z opcją unieważnienia starego i wygenerowania nowego tokena.
4. Klient otwiera link — widzi kafelki marek z liczbą sztuk i widełkami cenowymi, klika w markę, widzi listę modeli z ceną i przyciskiem **"Rezerwuj →"**, który otwiera WhatsApp z gotową wiadomością.
5. Lista aktualizuje się na żywo (`onSnapshot`) — klient widzi zmiany bez odświeżania strony.

---

## Bramka SMS

SMS-y wychodzą z własnego numeru właściciela, przez telefon z Androidem z kartą SIM i aplikacją **SMS Gateway for Android** ([sms-gate.app](https://sms-gate.app)) w trybie **Cloud Server**. Cloud Functions wywołują API bramki (`https://api.sms-gate.app/3rdparty/v1/messages`, Basic Auth), a bramka przekazuje wiadomość do telefonu.

| Funkcja (`firebase/functions/reviewSms.js`) | Do czego |
|---|---|
| `sendSmsToCustomer` (callable, tylko Admin/Pracownik) | Przycisk „📲 Wyślij SMS” w karcie zlecenia i SMS „części dotarły” przy statusie „Czeka na klienta” |
| `sendReviewRequests` (codziennie 11:00, Europa/Warszawa) | Jednorazowa prośba o opinię Google dla zleceń „Odebrane” 3–6 dni po wydaniu |

**Prośba o opinię:** po wysłaniu zapisuje `reviewRequestSentAt` (każde zlecenie dostaje SMS najwyżej raz), pomija zlecenia z `noReviewSms: true` (przełącznik w karcie zlecenia), jeden SMS na numer na przebieg. Treść bez polskich znaków (jeden SMS = 160 znaków). Tryby parametru `REVIEW_SMS_MODE`: `off`, `dry` (tylko log, domyślny), `live`.

**Konfiguracja:**
```bash
cd firebase
printf '%s' 'LOGIN' | firebase functions:secrets:set SMSGATE_USER --data-file -
printf '%s' 'HASLO'  | firebase functions:secrets:set SMSGATE_PASS --data-file -
firebase deploy --only functions:sendReviewRequests,functions:sendSmsToCustomer
```
Parametry `REVIEW_URL` (link do opinii Google) i `REVIEW_SMS_MODE` Firebase pyta przy deployu albo czyta z `firebase/functions/.env.*`.

**Wymagania po stronie telefonu:** aplikacja musi być uruchomiona z włączonym Cloud Server, internet, bateria ustawiona na „Nieograniczone”, wyłączone „Wstrzymaj aktywność w aplikacji, jeśli nie jest używana”, włączone „Start on boot”. Wysłane SMS-y nie pojawiają się w Wiadomościach Google — status widać w zakładce MESSAGES aplikacji bramki albo przez API (`GET /3rdparty/v1/messages`).

---

## Architektura danych

### Współdzielone kolekcje Firestore

| Kolekcja | Co przechowuje |
|---|---|
| `users` | Profile (rola, telefon, email) |
| `repairs` | Zlecenia naprawy |
| `phones` | Telefony w skupie/komisie |
| `parts` | Magazyn części zamiennych |
| `expenses` | Koszty utrzymania firmy |
| `tasks` | Wspólna lista zadań zespołu |
| `bookingRequests` | Zgłoszenia rezerwacji terminu |
| `b2bConfig` | Token aktywnego linku B2B (niedostępne klientowi bezpośrednio) |
| `b2bCatalog/{token}/items` | Publiczny, okrojony katalog dla klienta B2B |
| `counters` | Liczniki numerów zleceń (`N/ROK`) |

### Real-time + historia na żądanie
Subskrypcja na żywo obejmuje ostatnie 30 dni zleceń — starsze dociągane ręcznie, stronami (lista zleceń) albo automatycznie przy wejściu w Statystyki.

### Custom Claims (role)
Rola (`admin`/`worker`/`customer`) żyje jako custom claim w tokenie Firebase Auth.

---

## Role i uprawnienia

| Rola | Dostęp |
|---|---|
| 👑 **Admin** | Wszystko — finanse, Magazyn, Koszty, Statystyki, Użytkownicy, link B2B |
| 🔧 **Pracownik** | Pulpit, Zlecenia, Magazyn, Klienci, Zadania, wysyłka SMS — **bez** Skupu, U komisantów, Kosztów, Statystyk, Użytkowników, Ustawień i B2B |
| 👤 **Klient** | Tylko panel klienta (`gsmw`) — status, kosztorys, historia |
| — **Klient B2B** | Bez konta — token w linku, dostęp tylko do `b2bCatalog` tej jednej instancji |

---

## Instalacja i uruchomienie

### 🖥️ Panel admina

**Produkcja:** https://gsm-serwis-admin.web.app/

**Lokalnie:**
```bash
cd gsm-admin-panel
npm install
npm run dev
```

### 🌐 Panel klienta

```bash
cd gsmw
npm install
npm run dev
```

---

## Konfiguracja Firebase

Backend żyje w **osobnym folderze `firebase/`**:

```bash
cd firebase
firebase login
firebase deploy --only firestore:rules,firestore:indexes,functions,storage --project gsmserviceapp-ff8f6
```

Funkcje B2B (`syncB2bCatalog`, `getB2bLink`, `regenerateB2bLink`) mieszkają w `firebase/functions/b2b.js`, push w `push.js`, a bramka SMS w `reviewSms.js` — wszystkie dociągane do głównego `index.js` przez `Object.assign(exports, require('./…'))`. Projekt Firebase ma dwa hostingi (`admin`, `klient`): `firebase deploy --only hosting:admin` w `gsm-admin-panel/` i `hosting:klient` w `gsmw/`.

---

## Struktura repozytorium

```
pro/
├── firebase/                🔥 Backend — reguły, Cloud Functions
│   ├── functions/
│   │   ├── index.js
│   │   ├── b2b.js            ← katalog B2B (sync, generowanie linku)
│   │   ├── push.js           ← powiadomienia push (FCM)
│   │   └── reviewSms.js      ← bramka SMS: ręczna wysyłka + prośby o opinię
│   ├── firestore.rules
│   ├── storage.rules
│   └── firebase.json
│
├── gsm-admin-panel/          🖥️ Panel administracyjny (web + PWA)
│   ├── src/pages/            ← Pulpit, Zlecenia, Skup, Magazyn, Koszty, Statystyki…
│   ├── src/utils/            ← generatory PDF-do-druku (potwierdzenia, umowy, karta gwarancyjna, naklejki)
│   ├── vite.config.js        ← konfiguracja PWA
│   └── public/                ← ikony PWA
│
├── gsmw/                     🌐 Panel klienta
│   └── src/pages/
│       ├── RepairStatusPage.jsx
│       └── B2bCatalogPage.jsx  ← katalog hurtowy
│
└── packages/shared-core/     📦 Współdzielona logika (store, Firestore, kalkulacje)
```

---

## Znane ograniczenia

- **Umowy kupna-sprzedaży/komisu, karta gwarancyjna i regulamin serwisu** to szkice przygotowane bez udziału prawnika — przed użyciem z klientami wymagają przeglądu prawnego.
- **Dane firmy (nazwa, adres, NIP, telefon) są zahardkodowane** w kilku plikach `utils/print*.js` zamiast czytane z jednego miejsca — przy zmianie trzeba poprawić każdy plik osobno.
- **Zdjęcia na kafelkach katalogu B2B** biorą pierwsze dostępne zdjęcie telefonu danej marki — znika, jeśli ten konkretny telefon zostanie sprzedany. Zahardkodowane, stałe obrazki per marka — w planach.
- **Panel klienta (`gsmw`)** nie ma pola na zdjęcia w formularzu "Umów naprawę".
- **iOS PWA** ma ograniczenia względem Androida (brak powiadomień push).
- **Backup bazy** — brak jeszcze jednoprzyciskowego eksportu całej bazy.
- **Bramka SMS zależy od telefonu** — gdy Android uśpi aplikację lub telefon straci internet, wiadomości czekają w kolejce („Pending”) i wychodzą z opóźnieniem. Nie obsługuje odpowiedzi „STOP”; rezygnację z SMS-a o opinię ustawia się ręcznie w zleceniu.
