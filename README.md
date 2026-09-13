# 🔧 Fonexpert — System zarządzania serwisem GSM

Kompletny system do zarządzania serwisem napraw telefonów, skupem/komisem używanych urządzeń, magazynem części i kontaktem z klientami — dwie aplikacje webowe (panel admina instalowalny jako PWA na telefonie), współdzielące jedną, żywą bazę danych.

Repo: **github.com/frajewski/fonexpertserwis**

```
┌──────────────────────┐     ┌─────────────────┐
│  🖥️ Panel admina       │     │  🌐 Panel klienta │
│  (web + PWA)          │     │  (web)            │
│  (gsm-admin-panel)    │     │  (gsmw/)          │
└───────────┬───────────┘     └─────────┬─────────┘
            │                           │
            └─────────────┬─────────────┘
                           │
             ┌─────────────▼─────────────┐
             │   🔥 Firebase (backend/)   │
             │   (gsmserviceapp-ff8f6)    │
             │  Auth · Firestore ·        │
             │  Storage · Cloud Functions │
             └────────────────────────────┘
```

---

## Spis treści

1. [Dwie aplikacje](#dwie-aplikacje)
2. [Funkcje panelu admina](#funkcje-panelu-admina)
3. [Architektura danych](#architektura-danych)
4. [Role i uprawnienia](#role-i-uprawnienia)
5. [Instalacja i uruchomienie](#instalacja-i-uruchomienie)
6. [Konfiguracja Firebase](#konfiguracja-firebase)
7. [Struktura repozytorium](#struktura-repozytorium)
8. [Znane ograniczenia](#znane-ograniczenia)

---

## Dwie aplikacje

### 🖥️ `gsm-admin-panel/` — Panel administracyjny (web + PWA)

Działa jako strona w przeglądarce **oraz** jako instalowalna aplikacja na telefonie (PWA — "Dodaj do ekranu głównego", otwiera się bez paska adresu). Dla Admina i Pracownika.

### 🌐 `gsmw/` — Panel klienta (web)

Bez logowania — dostęp przez numer zlecenia + telefon, jak śledzenie przesyłki. Status naprawy, akceptacja kosztorysu, historia zleceń.

---

## Funkcje panelu admina

### 🏠 Pulpit (`/pulpit`) — ekran startowy po zalogowaniu
Zysk dzisiaj, wszystkie alerty w jednym miejscu (kończące się części, zlecenia czekające na zamówienie części, zawieszone bez ruchu), lista zadań na dziś/jutro (wspólna dla całego zespołu), szybkie skróty, podgląd bieżącego miesiąca.

### 🔧 Zlecenia
Przyjęcie z datą (edytowalną — do wpisania zaległych), priorytet ("pilne"), kosztorys z auto-wyliczaniem usługi (Łącznie − Części), wykonana usługa i zużyte części (wybór z Magazynu z automatycznym odjęciem stanu i doliczeniem kosztu do kosztorysu), dokument sprzedaży (Paragon/Faktura), zdjęcia, druk potwierdzenia z **kodem QR do śledzenia statusu online**, druk naklejki na sprzęt, filtry (marka, model, typ dokumentu, priorytet, zakres dat przyjęcia/wydania), historia starsza niż 30 dni doładowywana na żądanie (przycisk "Pokaż starsze zlecenia"), szablony SMS z linkiem śledzenia (w tym przypomnienie o odbiorze dla klientów zwlekających).

### 📱 Skup telefonów
Dwa tryby: **kupno** (płatność od razu) i **komis** (zero wkładu własnego, prowizja od różnicy cen). Skala stanu Grade A+ do D. Dane sprzedającego (imię, adres, dowód/PESEL) + **generator umów do druku** (kupna-sprzedaży i komisu, z zahardkodowanymi danymi firmy jako strony kupującej/komisanta). Filtry (marka, model, pamięć, dostawca, sprzedawca, zakres dat, cena). Kalkulator wyceny na bazie historii transakcji.

### 📦 Magazyn części zamiennych
Osobna ewidencja od Skupu, alert przy niskim stanie, blokada dodania części do zlecenia/skupu jeśli brak na stanie.

### 💸 Koszty utrzymania firmy
Księgowość, ZUS, VAT, PIT, reklama, materiały eksploatacyjne — kategoryzowane wydatki miesięczne, odejmowane od zysku w Statystykach ("zysk po kosztach").

### 📊 Statystyki
Okresy (dziś/miesiąc/rok) z łącznym zyskiem (naprawy + skup, po kosztach), szczegółowy widok dowolnego miesiąca z historii (z nawigacją strzałkami), przychód ze sprzedaży telefonów osobno od zysku (marży), top marki/modele, marża wg marki, wykres roczny.

### 👤 Klienci
Karta z historią zleceń, edycja danych kontaktowych (poprawa literówek po dodaniu).

### 🔐 Moje konto
Zmiana własnego hasła, weryfikacja email, reset hasła przez link.

---

## Architektura danych

### Współdzielone kolekcje Firestore

| Kolekcja | Co przechowuje |
|---|---|
| `users` | Profile (rola, telefon, email) — admin/pracownik/klient |
| `repairs` | Zlecenia naprawy |
| `phones` | Telefony w skupie/komisie |
| `parts` | Magazyn części zamiennych |
| `expenses` | Koszty utrzymania firmy |
| `tasks` | Wspólna lista zadań zespołu |
| `bookingRequests` | Zgłoszenia rezerwacji terminu |
| `counters` | Liczniki numerów zleceń (`N/ROK`) |

### Real-time + historia na żądanie
Subskrypcja na żywo (`onSnapshot`) obejmuje ostatnie 30 dni zleceń (wydajność) — starsze dociągane ręcznie, stronami, przyciskiem "Pokaż starsze zlecenia".

### Custom Claims (role)
Rola (`admin`/`worker`/`customer`) żyje jako custom claim w tokenie Firebase Auth, zarządzana przez Cloud Functions.

---

## Role i uprawnienia

| Rola | Dostęp |
|---|---|
| 👑 **Admin** | Wszystko — finanse, Magazyn, Koszty, Statystyki, Użytkownicy |
| 🔧 **Pracownik** | Zlecenia, Skup, Klienci, Magazyn, Pulpit, Zadania — **bez** wglądu w marże/finanse/Koszty/Statystyki |
| 👤 **Klient** | Tylko panel klienta (`gsmw`) — status, kosztorys, historia |

---

## Instalacja i uruchomienie

### 🖥️ Panel admina

**Produkcja:** https://gsm-serwis-admin.web.app/ — zaloguj się kontem Admina/Pracownika. Na telefonie: "Dodaj do ekranu głównego" (PWA).

**Lokalnie (deweloperka):**
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

Backend (reguły, Cloud Functions) żyje w **osobnym folderze `firebase/`** (nie w apce):

```bash
cd firebase
firebase login
firebase deploy --only firestore:rules,firestore:indexes,functions,storage --project gsmserviceapp-ff8f6
```

---

## Struktura repozytorium

```
pro/
├── firebase/                🔥 Backend — reguły, Cloud Functions
│   ├── functions/
│   ├── firestore.rules
│   ├── storage.rules
│   └── firebase.json
│
├── gsm-admin-panel/          🖥️ Panel administracyjny (web + PWA)
│   ├── src/pages/            ← Pulpit, Zlecenia, Skup, Magazyn, Koszty, Statystyki…
│   ├── src/utils/            ← generatory PDF-do-druku (potwierdzenia, umowy, naklejki)
│   ├── vite.config.js        ← konfiguracja PWA
│   └── public/                ← ikony PWA
│
├── gsmw/                     🌐 Panel klienta
│
└── packages/shared-core/     📦 Współdzielona logika (store, Firestore, kalkulacje)
```

---

## Znane ograniczenia

- **Umowy kupna-sprzedaży/komisu i regulamin serwisu** to szkice przygotowane bez udziału prawnika — przed faktycznym użyciem z klientami wymagają przeglądu prawnego (zwłaszcza klauzule własności, RODO).
- **Panel klienta (`gsmw`)** nie ma pola na zdjęcia w formularzu "Umów naprawę".
- **iOS PWA** ma ograniczenia względem Androida (m.in. brak powiadomień push).
- **Backup bazy** — brak jeszcze jednoprzyciskowego eksportu całej bazy na wypadek awarii.
