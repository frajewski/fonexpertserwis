# 🔧 Fonexpert — System zarządzania serwisem GSM

Kompletny system do zarządzania serwisem napraw telefonów, skupem używanych urządzeń, magazynem części i kontaktem z klientami — dwie aplikacje webowe (jedna z nich instalowalna jako PWA), współdzielące jedną, żywą bazę danych.

```
┌──────────────────────┐     ┌─────────────────┐
│  🖥️ Panel admina       │     │  🌐 Panel klienta │
│  (web + PWA)          │     │  (web)            │
│  (gsm-admin-panel)    │     │  (gsmw/)          │
│                       │     │                   │
│  Admin/Pracownik      │     │  Klient bez konta │
│  na komputerze LUB    │     │  (numer + telefon)│
│  zainstalowany na     │     │                   │
│  telefonie jak apka   │     │                   │
└───────────┬───────────┘     └─────────┬─────────┘
            │                           │
            └─────────────┬─────────────┘
                           │
             ┌─────────────▼─────────────┐
             │   🔥 Firebase              │
             │   (gsmserviceapp-ff8f6)    │
             │                            │
             │  • Authentication          │
             │  • Firestore (baza danych) │
             │  • Storage (zdjęcia)       │
             │  • Cloud Functions         │
             └────────────────────────────┘
```

**Kluczowa zasada architektury:** obie aplikacje czytają i zapisują do **tej samej** bazy Firestore, w czasie rzeczywistym. Zlecenie dodane w panelu admina jest natychmiast widoczne w panelu klienta; status zmieniony przez pracownika widzi klient bez odświeżania strony.

---

## Spis treści

1. [Dwie aplikacje](#dwie-aplikacje)
2. [Kluczowe funkcje panelu admina](#kluczowe-funkcje-panelu-admina)
3. [Architektura danych](#architektura-danych)
4. [Role i uprawnienia](#role-i-uprawnienia)
5. [Instalacja i uruchomienie](#instalacja-i-uruchomienie)
6. [Konfiguracja Firebase](#konfiguracja-firebase)
7. [Struktura repozytorium](#struktura-repozytorium)
8. [Znane ograniczenia](#znane-ograniczenia)

---

## Dwie aplikacje

### 🖥️ `gsm-admin-panel/` — Panel administracyjny (web + PWA, React + Vite)

Główne narzędzie pracy — dla Admina i Pracownika. Działa jako zwykła strona w przeglądarce **oraz** jako instalowalna aplikacja (PWA — "Dodaj do ekranu głównego" na telefonie, otwiera się bez paska adresu, jak natywna apka). Jeden kod, dwa sposoby użycia — bez osobnej, natywnej aplikacji mobilnej.

Pełen zakres funkcji:

- **Zlecenia naprawy** — przyjęcie, zmiana statusu (z automatycznym śledzeniem daty przyjęcia/wykonania/wydania), kosztorys z auto-wyliczaniem usługi (Łącznie − Części), priorytet ("pilne"), wykonana usługa i użyte części (powiązane z magazynem), dokument sprzedaży (Paragon/Faktura), zdjęcia, drukowanie potwierdzeń i naklejek na sprzęt
- **Filtry i wyszukiwanie** — modal z filtrami (marka, model, typ dokumentu, priorytet, zakres dat) niezależnie od szybkich chipów statusu
- **Przypomnienia** — banner o zleceniach czekających na zamówienie części (z uwzględnieniem dni roboczych), o zleceniach "zawieszonych" bez zmiany statusu, o kończących się częściach w magazynie
- **Skup telefonów** — przyjęcie z rozbudowaną skalą stanu (Grade A+ do D), status nowy/używany, filtry (dostawca, daty, cena, itd.), kalkulator wyceny (sugeruje cenę zakupu na podstawie historii podobnych transakcji), import z arkusza Excel/Sheets
- **Magazyn części zamiennych** — osobna ewidencja od Skupu, z alertem przy niskim stanie
- **Klienci** — karta klienta z historią, wyszukiwanie po telefonie
- **Statystyki** — okresy (dziś/miesiąc/rok) oraz szczegółowy widok dowolnego miesiąca z historii, top marki/modele, marża wg marki, wykres roczny
- **Moje konto** — zmiana własnego hasła, weryfikacja email
- **Zarządzanie użytkownikami** (tylko Admin) — role, dostęp

Logowanie: Firebase Authentication (email + hasło). **Pierwsza** osoba, która się zarejestruje w świeżej instalacji, automatycznie staje się Administratorem.

### 🌐 `gsmw/` — Panel klienta (web, React + Vite)

Dla klientów, bez logowania — dostęp przez numer zlecenia + numer telefonu, jak śledzenie przesyłki kurierskiej. Bezpieczeństwo: panel loguje klienta anonimowo (Firebase Anonymous Auth) tylko po to, by mógł wywoływać Cloud Functions — cała faktyczna weryfikacja dzieje się **po stronie serwera**, nie w regułach Firestore udostępnionych klientowi.

---

## Kluczowe funkcje panelu admina

Kilka rzeczy wartych podkreślenia, bo nie są oczywiste z samej nazwy ekranu:

- **Auto-wyliczanie kosztorysu** — wpisujesz Cenę zakupu części i Cenę całości dla klienta, Usługa wylicza się sama (i to na niej liczony jest zysk, nie na różnicy Usługa−Części, żeby uniknąć podwójnego odjęcia kosztu części).
- **Zysk liczony po dacie WYDANIA, nie przyjęcia** — klient może odebrać urządzenie kilka dni po zakończeniu naprawy; zysk "wpada" do statystyk w dniu faktycznego wydania, nie w dniu przyjęcia zlecenia.
- **Zużycie części z magazynu** — przy zleceniu i przy telefonie w skupie można wybrać część z Magazynu (stan automatycznie się zmniejsza) albo wpisać część spoza magazynu (tylko do historii, bez ruszania stanu).
- **Marża ukryta przed Pracownikiem** — widzi sumę do zapłaty, nigdy rozbicia na koszt części/usługi czy zysk.

---

## Architektura danych

### Współdzielone kolekcje Firestore

| Kolekcja | Co przechowuje |
|---|---|
| `users` | Profile (rola, telefon, email) — admin/pracownik/klient |
| `repairs` | Zlecenia naprawy, ze zdjęciami jako URL do Firebase Storage |
| `phones` | Telefony w skupie |
| `parts` | Magazyn części zamiennych |
| `bookingRequests` | Zgłoszenia rezerwacji terminu |
| `counters` | Liczniki do generowania czytelnych numerów zleceń (`N/ROK`) |
| `meta` | Wewnętrzny stan systemowy (np. czy admin został już przypisany) |

### Real-time (Firestore `onSnapshot`)

Panel admina nasłuchuje zmian w bazie na żywo — `repairs`, `phones`, `parts`, `bookingRequests`, `users` aktualizują się automatycznie, bez odświeżania ekranu.

### Custom Claims (role)

Rola użytkownika (`admin` / `worker` / `customer`) żyje jako **custom claim** w tokenie Firebase Auth, nie tylko jako pole w dokumencie Firestore. Cloud Functions (`decideInitialRole`, `setUserRoleClaim`, `syncOwnRoleClaim`) zarządzają tym po stronie serwera.

### Firebase Storage (zdjęcia)

Zdjęcia urządzeń wgrywane są do Firebase Storage — widoczne z każdego urządzenia/przeglądarki.

---

## Role i uprawnienia

| Rola | Panel admina | Panel klienta |
|---|---|---|
| 👑 **Admin** | Pełen dostęp + zarządzanie użytkownikami, widzi marże/finanse, Magazyn, Statystyki | — |
| 🔧 **Pracownik** | Zlecenia, Skup, Klienci, Magazyn — **bez** wglądu w marże/finanse/Statystyki | — |
| 👤 **Klient** | — (brak dostępu) | Status, kosztorys, historia — po numerze zlecenia + telefonie |

---

## Instalacja i uruchomienie

### 🖥️ Panel admina

```bash
cd gsm-admin-panel
npm install
npm run dev
```

Otworzy się na `http://localhost:5174`. Zaloguj się kontem Admina lub Pracownika.

**Instalacja jako PWA:** wejdź na wdrożony link (np. `gsm-serwis-admin.web.app`) na telefonie w Chrome/Safari → "Dodaj do ekranu głównego" — apka instaluje się bez App Store/Play Store.

### 🌐 Panel klienta

```bash
cd gsmw
npm install
npm run dev
```

Otworzy się na `http://localhost:5173`. Możesz mieć oba panele webowe uruchomione naraz — działają na różnych portach.

---

## Konfiguracja Firebase

Obie aplikacje webowe wskazują na ten sam projekt Firebase (`gsmserviceapp-ff8f6`) w swoich plikach `firebaseConfig.js`. Backend (reguły bezpieczeństwa i Cloud Functions) żyje w **osobnym folderze `firebase/`** i jest z niego wdrażany dla całego projektu:

```bash
cd firebase
firebase login
firebase deploy --only firestore:rules,firestore:indexes,functions,storage --project gsmserviceapp-ff8f6
```

To wdraża jednocześnie: reguły Firestore, indeksy, Cloud Functions (logika ról) i reguły Firebase Storage (zdjęcia) — wspólne dla obu aplikacji klienckich.

---

## Struktura repozytorium

```
pro/
├── firebase/                🔥 Backend (reguły, funkcje) — nie apka
│   ├── functions/           ← Cloud Functions (role, scalanie kont)
│   ├── firestore.rules
│   ├── storage.rules
│   └── firebase.json        ← konfiguracja wdrożenia backendu
│
├── gsm-admin-panel/          🖥️ Panel administracyjny (web + PWA, React + Vite)
│   ├── src/
│   │   ├── pages/            ← ekrany (zlecenia, skup, magazyn, statystyki…)
│   │   ├── layouts/          ← AppLayout z sidebarem + wersją mobilną
│   │   ├── store/            ← useStore.js (Zustand + real-time Firestore)
│   │   └── firebase/         ← firestoreDb.js, Auth, Storage
│   ├── vite.config.js        ← konfiguracja vite-plugin-pwa
│   └── public/                ← ikony PWA
│
├── gsmw/                     🌐 Panel klienta (web, React + Vite)
│   ├── src/
│   │   ├── pages/             ← LookupPage, RepairStatusPage, BookingPage
│   │   ├── components/        ← RepairProgress (pasek statusu)
│   │   └── firebase/           ← firestoreApi.js (przez Cloud Functions)
│   └── ...
│
└── packages/
    └── shared-core/           📦 Współdzielona logika (Zustand store, Firestore,
                                   stałe, kalkulacje) — reeksportowana przez obie
                                   aplikacje webowe, żeby nie utrzymywać dwóch kopii
```

---

## Znane ograniczenia

- **Panel klienta (`gsmw`)** nie ma jeszcze pola na zdjęcia w formularzu "Umów naprawę" (klient nie może dołączyć zdjęcia usterki przy zgłaszaniu online).
- **Powiązanie magazynu ze zleceniem** działa (można wybrać zużytą część z listy), ale nie ma jeszcze automatycznych sugestii "typowych części do tego modelu" — to ręczny wybór za każdym razem.
- **iOS PWA** ma nieco inne ograniczenia niż Android (m.in. brak powiadomień push) — instalacja i podstawowe działanie są takie same, ale warto to mieć na uwadze przy planowaniu funkcji zależnych od powiadomień.
