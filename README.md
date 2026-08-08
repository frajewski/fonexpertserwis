# 🔧 GSM Serwis — System zarządzania serwisem GSM

Kompletny system do zarządzania serwisem napraw telefonów, skupem używanych urządzeń i kontaktem z klientami — w trzech częściach, współdzielących jedną, żywą bazę danych.

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   📱 Apka        │     │  🖥️ Panel admina  │     │  🌐 Panel klienta │
│   mobilna        │     │  (web)            │     │  (web)            │
│   (new/)         │     │  (gsm-admin-panel)│     │  (gsmw/)          │
│                  │     │                   │     │                   │
│  Admin/Pracownik │     │  Admin/Pracownik  │     │  Klient bez konta │
│  w terenie       │     │  na komputerze    │     │  (numer + telefon)│
└────────┬─────────┘     └─────────┬─────────┘     └─────────┬─────────┘
         │                         │                         │
         └─────────────────────────┼─────────────────────────┘
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

**Kluczowa zasada architektury:** wszystkie trzy części czytają i zapisują do **tej samej** bazy Firestore, w czasie rzeczywistym. Zlecenie dodane w apce mobilnej pojawia się natychmiast w panelu admina; status zmieniony w panelu admina widzi klient w swoim panelu webowym; zdjęcie zrobione telefonem jest widoczne na komputerze. Żadna z trzech części nie działa w oderwaniu od pozostałych.

---

## Spis treści

1. [Trzy części systemu](#trzy-części-systemu)
2. [Architektura danych](#architektura-danych)
3. [Role i uprawnienia](#role-i-uprawnienia)
4. [Instalacja i uruchomienie](#instalacja-i-uruchomienie)
5. [Konfiguracja Firebase](#konfiguracja-firebase)
6. [Struktura repozytorium](#struktura-repozytorium)
7. [Znane ograniczenia](#znane-ograniczenia)

---

## Trzy części systemu

### 📱 `new/` — Aplikacja mobilna (React Native + Expo)

Główne narzędzie pracy w terenie — dla Admina i Pracowników. Pełen zakres funkcji:

- **Zlecenia naprawy** — przyjęcie, zmiana statusu, kosztorys, gwarancja, zdjęcia przed/po naprawie, dokument sprzedaży (Paragon/Faktura)
- **Rezerwacje** — klient umawia termin, admin/pracownik akceptuje/odrzuca/konwertuje na zlecenie
- **Skup telefonów** — przyjęcie, ocena (grade), blokady (iCloud/simlock/zastrzeżenie), sprzedaż, zdjęcie umowy zakupu
- **Klienci** — karta klienta z historią, konta "papierowe" (bez logowania) dla klientów bez apki
- **SMS** — szablony wiadomości do klienta, z automatycznym fallbackiem między dwoma metodami wysyłki (różne urządzenia Android różnie obsługują wysyłanie SMS z aplikacji)
- **Drukowanie potwierdzeń** — PDF do wydruku/udostępnienia
- **Statystyki finansowe**, **zarządzanie rolami użytkowników**

Logowanie: Firebase Authentication (email + hasło). **Pierwsza** osoba, która się zarejestruje w świeżej instalacji, automatycznie staje się Administratorem — to pozwala tej samej aplikacji być wdrażanej w wielu niezależnych serwisach bez zmiany kodu.

### 🖥️ `gsm-admin-panel/` — Panel administracyjny (web, React + Vite)

Te same funkcje co w apce mobilnej, ale zaprojektowane do pracy na komputerze — stały sidebar nawigacyjny, gęste tabele, dwukolumnowe widoki szczegółów. Dla Admina i Pracownika, logowanie tymi samymi kontami co w apce mobilnej.

Dodatkowo: **drukowanie potwierdzeń przez natywny dialog przeglądarki** (przycisk "🖨️ Drukuj potwierdzenie" na ekranie szczegółów zlecenia) — przydatne, gdy klient prosi o papierowe potwierdzenie, a wygodniej jest to wydrukować z komputera niż z telefonu.

### 🌐 `gsmw/` — Panel klienta (web, React + Vite)

Dla klientów, którzy nie chcą instalować aplikacji mobilnej. **Bez logowania** — dostęp przez numer zlecenia + numer telefonu, dokładnie jak śledzenie przesyłki kurierskiej. Klient może:

- sprawdzić status naprawy (wizualny pasek postępu)
- zaakceptować albo odrzucić kosztorys
- zobaczyć historię swoich poprzednich zleceń
- umówić nową naprawę (też jako zgłoszenie B2B, z polem "Firma")

Bezpieczeństwo: panel loguje klienta anonimowo (Firebase Anonymous Auth) tylko po to, by mógł wywoływać Cloud Functions — cała faktyczna weryfikacja "ten numer zlecenia + ten telefon" dzieje się **po stronie serwera** (Cloud Functions z uprawnieniami administracyjnymi), nie w regułach Firestore udostępnionych klientowi.

---

## Architektura danych

### Współdzielone kolekcje Firestore

| Kolekcja | Co przechowuje |
|---|---|
| `users` | Profile (rola, telefon, email) — admin/pracownik/klient |
| `repairs` | Zlecenia naprawy, ze zdjęciami jako URL do Firebase Storage |
| `phones` | Telefony w skupie |
| `bookingRequests` | Zgłoszenia rezerwacji terminu (z apki mobilnej i z panelu klienta) |
| `counters` | Liczniki do generowania czytelnych numerów zleceń (`N/ROK`) |
| `meta` | Wewnętrzny stan systemowy (np. czy admin został już przypisany) |

### Real-time (Firestore `onSnapshot`)

Apka mobilna i panel admina nasłuchują zmian w bazie na żywo — `repairs`, `phones`, `bookingRequests`, `users` aktualizują się automatycznie, bez odświeżania ekranu, niezależnie z którego urządzenia/platformy pochodzi zmiana.

### Custom Claims (role)

Rola użytkownika (`admin` / `worker` / `customer`) żyje jako **custom claim** w tokenie Firebase Auth, nie tylko jako pole w dokumencie Firestore — to pozwala regułom bezpieczeństwa sprawdzać uprawnienia bez kosztownych odczytów bazy przy każdym zapytaniu. Cloud Functions (`decideInitialRole`, `setUserRoleClaim`, `syncOwnRoleClaim`) zarządzają tym bezpiecznie po stronie serwera.

### Firebase Storage (zdjęcia)

Zdjęcia urządzeń i umów zakupu są wgrywane do Firebase Storage (nie zapisywane jako lokalne pliki) — to gwarantuje, że zdjęcie zrobione na jednym urządzeniu jest widoczne na każdym innym, w tym w obu panelach webowych.

---

## Role i uprawnienia

| Rola | Apka mobilna | Panel admina | Panel klienta |
|---|---|---|---|
| 👑 **Admin** | Pełen dostęp + zarządzanie użytkownikami, widzi marże/finanse | Pełen dostęp | — |
| 🔧 **Pracownik** | Zlecenia, skup, rezerwacje — **bez** wglądu w marże/finanse | To samo co w apce mobilnej | — |
| 👤 **Klient** | Tylko własne zlecenia, sumę kosztorysu (bez rozbicia) | — (brak dostępu) | Status, kosztorys, historia — po numerze zlecenia + telefonie |

Zasada ukrywania marży przed Pracownikiem jest konsekwentna w obu miejscach, gdzie Pracownik ma dostęp (apka mobilna, panel admina) — widzi sumę do zapłaty, nigdy rozbicia na koszt części/usługi czy zysk ze skupu.

---

## Instalacja i uruchomienie

Każda część to osobny projekt z własnymi zależnościami — instalujesz i uruchamiasz każdą niezależnie.

### 📱 Apka mobilna

```bash
cd new
npm install --legacy-peer-deps
npx expo start
```

Zeskanuj kod QR aplikacją **Expo Go** na telefonie.

### 🖥️ Panel admina

```bash
cd gsm-admin-panel
npm install
npm run dev
```

Otworzy się na `http://localhost:5174`. Zaloguj się kontem Admina lub Pracownika (te same dane co w apce mobilnej).

### 🌐 Panel klienta

```bash
cd gsmw
npm install
npm run dev
```

Otworzy się na `http://localhost:5173`. Możesz mieć oba panele webowe uruchomione naraz — działają na różnych portach.

---

## Konfiguracja Firebase

Wszystkie trzy części wskazują na ten sam projekt Firebase (`gsmserviceapp-ff8f6`) w swoich plikach `firebaseConfig.js`. Backend (reguły bezpieczeństwa i Cloud Functions) żyje w folderze `new/` i jest z niego wdrażany dla całego projektu:

```bash
cd new
npx firebase-tools login
npx firebase-tools deploy --only firestore:rules,firestore:indexes,functions,storage --project gsmserviceapp-ff8f6
```

To wdraża jednocześnie: reguły Firestore, indeksy, Cloud Functions (logika ról) i reguły Firebase Storage (zdjęcia) — wspólne dla wszystkich trzech aplikacji klienckich.

---

## Struktura repozytorium

```
gsm/
├── new/                    📱 Aplikacja mobilna (React Native + Expo)
│   ├── src/
│   │   ├── screens/        ← 20 ekranów (zlecenia, skup, rezerwacje, klienci…)
│   │   ├── store/          ← useStore.js (Zustand + real-time Firestore)
│   │   ├── firebase/       ← firestoreDb.js, Auth, Storage
│   │   └── ...
│   ├── functions/          ← Cloud Functions (role, scalanie kont)
│   ├── firestore.rules
│   ├── storage.rules
│   └── firebase.json       ← konfiguracja wdrożenia backendu
│
├── gsm-admin-panel/        🖥️ Panel administracyjny (React + Vite)
│   ├── src/
│   │   ├── pages/          ← 13 ekranów (zlecenia, skup, statystyki…)
│   │   ├── layouts/        ← AppLayout z sidebarem
│   │   ├── store/          ← useStore.js (identyczny z apką mobilną)
│   │   └── firebase/       ← firestoreDb.js (identyczny z apką mobilną)
│   └── ...
│
└── gsmw/                   🌐 Panel klienta (React + Vite)
    ├── src/
    │   ├── pages/           ← LookupPage, RepairStatusPage, BookingPage
    │   ├── components/      ← RepairProgress (pasek statusu)
    │   └── firebase/        ← firestoreApi.js (przez Cloud Functions, nie bezpośredni dostęp)
    └── ...
```

**Ważna uwaga dla dalszego rozwoju:** `useStore.js` i `firestoreDb.js` są **identyczne** (kopiowane 1:1) między `new/` i `gsm-admin-panel/` — to ten sam, platformowo-niezależny kod logiki danych. Jeśli poprawiasz coś w jednym z tych plików, pamiętaj o przeniesieniu tej samej poprawki do drugiego projektu, inaczej obie wersje się rozjedą.

---

## Znane ograniczenia

- **Ustawienia serwisu** (nazwa, adres, telefon używane na potwierdzeniach) są **lokalne** dla apki mobilnej i panelu admina osobno — zmiana w jednym miejscu nie synchronizuje się z drugim. Wymagałoby przeniesienia do Firestore.
- **SMS na różnych urządzeniach Android** — `expo-sms` na części urządzeń/wersji systemu błędnie zgłasza niedostępność (znany, niezałatany problem pakietu). Apka mobilna ma wbudowany fallback (`Linking`), ale w rzadkich przypadkach może to wciąż wymagać ręcznej wysyłki SMS przez standardową aplikację telefonu.
- **Zdjęcia w panelu klienta** — formularz "Umów naprawę" w `gsmw/` nie ma jeszcze pola na zdjęcia (klient nie może dołączyć zdjęcia usterki przy zgłaszaniu online).
- **Propozycja innego terminu** rezerwacji (reschedule) jest dostępna w apce mobilnej, ale nie w panelu admina — tam dostępne są tylko akceptacja/odrzucenie/konwersja na zlecenie.
