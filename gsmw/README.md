# 🌐 GSM Serwis — Panel klienta (web)

Lekka aplikacja webowa dla klientów, którzy nie chcą instalować apki mobilnej.
Bez logowania — klient wpisuje numer zlecenia i numer telefonu, dokładnie jak przy śledzeniu przesyłki kurierskiej.

## Co umożliwia

- **Sprawdzenie statusu naprawy** — wizualny pasek postępu (Przyjęte → Diagnoza → Naprawa → Gotowe → Odebrane)
- **Akceptacja / odrzucenie kosztorysu** — bez dzwonienia do serwisu
- **Historia poprzednich zleceń** tego samego numeru telefonu
- **Umówienie nowej naprawy** — formularz bez konieczności logowania, też dla zgłoszeń B2B

## ✅ Stan projektu — podłączony do prawdziwych danych

Ta wersja używa **prawdziwego Firestore**, tego samego projektu Firebase co aplikacja mobilna (`gsmserviceapp-ff8f6`). Panel webowy nie loguje klienta prawdziwym kontem — używa anonimowego logowania Firebase (`signInAnonymously`) tylko po to, żeby wywołania Cloud Functions miały kontekst uwierzytelnienia.

**Cała logika dostępu do danych przechodzi przez Cloud Functions** (`functions/index.js` w głównym projekcie): `lookupRepair`, `lookupRepairsByPhone`, `acceptEstimateWeb`, `rejectEstimateWeb`, `createBookingRequestWeb`. To jest świadoma decyzja architektoniczna — anonimowe tokeny Firebase można wygenerować przez REST API niezależnie od naszej apki, więc weryfikacja "ten numer zlecenia + ten telefon" musi się dziać po stronie serwera (Cloud Function z uprawnieniami Admin SDK), nie w regułach Firestore klienckich.

`src/firebase/firestoreApi.js` zastępuje wcześniejszy `mockData.js` — identyczne nazwy eksportowanych funkcji, więc komponenty UI (`LookupPage`, `RepairStatusPage`, `BookingPage`) nie wymagały zmian, poza dodaniem parametru `phone` do `acceptEstimate`/`rejectEstimate` (wymagane do weryfikacji po stronie serwera).

## Jak przetestować

Dane są teraz prawdziwe — żeby przetestować panel, potrzebujesz **realnego** zlecenia w bazie. Najprościej:

1. Zaloguj się do apki mobilnej jako Admin
2. Dodaj nowe zlecenie naprawy dla jakiegoś klienta z numerem telefonu, który zapamiętasz
3. Zanotuj wygenerowany numer zlecenia (np. `5/2026`)
4. W panelu webowym wpisz ten numer + ten sam telefon

Jeśli chcesz przetestować "Akceptuj kosztorys", ustaw też cenę usługi przy tym zleceniu (przez `EstimateScreen` w apce mobilnej) — bez kosztorysu panel webowy pokaże tylko pasek statusu, bez przycisków akcji.

## Instalacja i uruchomienie

```bash
npm install
npm run dev
```

Aplikacja wystartuje na `http://localhost:5173`.

## Stos technologiczny

| Biblioteka | Do czego |
|---|---|
| **React + Vite** | framework + szybki dev server |
| **react-router-dom** | routing między ekranami |
| Czysty CSS (zmienne) | bez frameworka UI — pełna kontrola nad designem dopasowanym do marki |

## Struktura

```
src/
├── components/
│   ├── RepairProgress.jsx    ← pasek statusu naprawy (signature element)
│   └── RepairProgress.css
├── pages/
│   ├── LookupPage.jsx        ← ekran startowy (wpisanie numeru zlecenia)
│   ├── RepairStatusPage.jsx  ← szczegóły zlecenia + akcje + historia
│   └── BookingPage.jsx       ← formularz umówienia nowej naprawy
├── firebase/
│   ├── firebaseConfig.js     ← konfiguracja Firebase (nieużywana jeszcze)
│   └── mockData.js           ← TYMCZASOWE dane testowe — do podmiany na Firestore
├── styles/
│   └── tokens.css            ← zmienne kolorów, typografii, odstępów
├── App.jsx                   ← routing
└── main.jsx                  ← punkt wejścia
```

## Design

Paleta nawiązuje do aplikacji mobilnej (granat + fiolet), z własnym charakterem dopasowanym do kontekstu "diagnostyki" — pasek statusu naprawy w stylu schematu elektronicznego/płyty głównej jest głównym elementem wizualnym całej aplikacji. Typografia: Space Grotesk (nagłówki), Inter (treść), JetBrains Mono (etykiety, numery zleceń).
