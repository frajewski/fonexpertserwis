# 🔧 Fonexpert — System zarządzania serwisem GSM

Kompletny system do zarządzania serwisem napraw telefonów, skupem/komisem używanych urządzeń, magazynem części, sprzedażą hurtową B2B i kontaktem z klientami — dwie aplikacje webowe (panel admina instalowalny jako PWA na telefonie), współdzielące jedną, żywą bazę danych.

Repo: **github.com/frajewski/fonexpertserwis**

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
- **Śledzenie zlecenia** — bez logowania, przez numer zlecenia + telefon albo link/QR z potwierdzenia. Status naprawy, akceptacja kosztorysu, historia.
- **Katalog B2B** (`/oferta/:token`) — prywatna, niezaindeksowana strona z ofertą hurtową dla stałego klienta biznesowego, patrz niżej.

---

## Funkcje panelu admina

### 🏠 Pulpit (`/pulpit`) — ekran startowy po zalogowaniu
Zysk dzisiaj, wszystkie alerty w jednym miejscu, lista zadań na dziś/jutro (wspólna dla zespołu), szybkie skróty, podgląd bieżącego miesiąca.

### 🔧 Zlecenia
Przyjęcie z edytowalną datą, priorytet, zadatek wpłacony z osobną linią "Do zapłaty" w kosztorysie, kosztorys z auto-wyliczaniem usługi (Łącznie − Części), wykonana usługa i zużyte części z Magazynu (automatyczne odjęcie stanu i doliczenie kosztu, blokada przy zerowym stanie), dokument sprzedaży (Paragon/Faktura), zdjęcia, **druk potwierdzenia przyjęcia z kodem QR** do śledzenia statusu online, **druk potwierdzenia wydania** ze skróconymi warunkami gwarancji, druk naklejki na sprzęt, filtry (marka, model, typ dokumentu, priorytet, zakres dat) zapamiętywane między odświeżeniami strony, historia starsza niż 30 dni doładowywana na żądanie, szablony SMS z linkiem śledzenia (w tym przypomnienie o odbiorze i "części dotarły").

### 📱 Skup / sprzedaż telefonów
Dwa tryby: **kupno** i **komis**. Skala stanu Grade A+ do D, nowy/używany. Dane sprzedającego (imię, adres, dowód/PESEL) + **generator umów do druku** (kupna-sprzedaży i komisu). Gwarancja wybierana przy oznaczaniu jako sprzedany (te same okresy co w naprawach) + **karta gwarancyjna do druku**, dołączana do paragonu. Zdjęcie telefonu (wgrywane, podmieniane, usuwalne). Filtry (marka, model, pamięć, dostawca, sprzedawca, zakres dat, cena) zapamiętywane między odświeżeniami. Kalkulator wyceny na bazie historii transakcji. Pole "W ofercie B2B" + cena hurtowa, pojedynczo lub hurtem dla zaznaczonych.

### 📦 Magazyn części zamiennych
Osobna ewidencja od Skupu, alert przy niskim stanie, blokada dodania części jeśli brak na stanie.

### 💸 Koszty utrzymania firmy
Księgowość, ZUS, VAT, PIT, reklama, materiały eksploatacyjne — odejmowane od zysku w Statystykach ("zysk po kosztach").

### 📊 Statystyki
Okresy (dziś/miesiąc/rok) z łącznym zyskiem (naprawy + skup, po kosztach), przychód ze sprzedaży telefonów osobno od zysku, szczegółowy widok dowolnego miesiąca z historii, top marki/modele, marża wg marki, wykres roczny.

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
Subskrypcja na żywo obejmuje ostatnie 30 dni zleceń — starsze dociągane ręcznie, stronami.

### Custom Claims (role)
Rola (`admin`/`worker`/`customer`) żyje jako custom claim w tokenie Firebase Auth.

---

## Role i uprawnienia

| Rola | Dostęp |
|---|---|
| 👑 **Admin** | Wszystko — finanse, Magazyn, Koszty, Statystyki, Użytkownicy, link B2B |
| 🔧 **Pracownik** | Zlecenia, Skup, Klienci, Magazyn, Pulpit, Zadania — **bez** wglądu w marże/finanse/Koszty/Statystyki/B2B |
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
`http://localhost:5174`

### 🌐 Panel klienta

```bash
cd gsmw
npm install
npm run dev
```
`http://localhost:5173`

---

## Konfiguracja Firebase

Backend żyje w **osobnym folderze `firebase/`**:

```bash
cd firebase
firebase login
firebase deploy --only firestore:rules,firestore:indexes,functions,storage --project gsmserviceapp-ff8f6
```

Funkcje B2B (`syncB2bCatalog`, `getB2bLink`, `regenerateB2bLink`) mieszkają w `firebase/functions/b2b.js`, dociągane do głównego `index.js` przez `Object.assign(exports, require('./b2b'))`.

---

## Struktura repozytorium

```
pro/
├── firebase/                🔥 Backend — reguły, Cloud Functions
│   ├── functions/
│   │   ├── index.js
│   │   └── b2b.js            ← katalog B2B (sync, generowanie linku)
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
