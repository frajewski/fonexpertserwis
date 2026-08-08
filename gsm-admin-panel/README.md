# 🖥️ GSM Serwis — Panel administracyjny (web)

Panel do zarządzania serwisem z komputera — dla Admina i Pracowników. Te same konta logowania (Firebase Auth) i ta sama baza danych (Firestore) co aplikacja mobilna — zmiana zrobiona tutaj jest natychmiast widoczna w apce na telefonie, i odwrotnie.

## Stan projektu — KOMPLETNY

✅ Logowanie (Firebase Auth, prawdziwe konta — admin/pracownik)
✅ Sidebar z nawigacją, dopasowaną do roli (Admin widzi więcej niż Pracownik)
✅ **Zlecenia** — lista (wyszukiwanie, filtrowanie po statusie), szczegóły (zmiana statusu, gwarancja, kosztorys), dodawanie nowego
✅ **Klienci** — lista, karta klienta z historią i statystykami
✅ **Rezerwacje** — lista zgłoszeń, akceptacja/odrzucenie, konwersja na zlecenie
✅ **Skup telefonów** — lista (karty z gradem/blokadami), szczegóły, dodawanie, oznaczanie jako sprzedany
✅ **Statystyki** — przychód/zysk dziś/miesiąc/rok, top marki, najczęstsze usterki, podsumowanie skupu
✅ **Użytkownicy** — zmiana ról (tylko Admin)
✅ **Ustawienia** — dane serwisu (na razie lokalne, nie zsynchronizowane z apką mobilną)
✅ Ukrywanie wartości finansowej przed pracownikiem — konsekwentnie we wszystkich ekranach, ta sama zasada co w apce mobilnej
✅ Real-time (Firestore `onSnapshot`) — zmiana w apce mobilnej widoczna tu natychmiast, i odwrotnie

## Znane ograniczenia / do rozważenia później

- **Ustawienia** (`useSettings.js`) są lokalne dla każdej platformy — zmiana w panelu webowym nie synchronizuje się z apką mobilną. Wymagałoby przeniesienia do Firestore.
- **Zdjęcia** (urządzenia, umowy zakupu w skupie) nie są jeszcze obsługiwane w panelu webowym — formularze nie mają pola na wgrywanie plików.
- **Propozycja innego terminu** rezerwacji (reschedule) nie jest zaimplementowana w panelu webowym — tylko akceptacja/odrzucenie/konwersja.
- Statystyki nie mają jeszcze wykresów (tylko liczby) — można rozbudować o `recharts` czy podobną bibliotekę.

## Instalacja i uruchomienie

```bash
npm install
npm run dev
```

Wystartuje na `http://localhost:5174` (inny port niż panel klienta, żeby móc mieć oba otwarte naraz).

## Logowanie

Użyj tych samych danych logowania co w apce mobilnej — np. Twoje konto admina. Konta z rolą "customer" (klient) nie mają dostępu do tego panelu — zostaną poproszone o zalogowanie się kontem pracownika/admina.

## Architektura — współdzielona warstwa danych

`src/store/useStore.js` i `src/firebase/firestoreDb.js` są **dosłownie identyczne** z plikami w aplikacji mobilnej — cała logika Firestore, real-time listenery i Firebase Auth jest platformowo niezależna (ten sam `firebase` SDK działa identycznie w React Native i w przeglądarce). To oznacza, że każda poprawka w logice danych zrobiona w jednym projekcie, powinna zostać przeniesiona też do drugiego, żeby oba pozostały zsynchronizowane.

## Stos technologiczny

| Biblioteka | Do czego |
|---|---|
| **React + Vite** | framework + dev server |
| **react-router-dom** | routing |
| **zustand** | stan globalny (ta sama logika co w apce mobilnej) |
| **firebase** | Auth + Firestore + Functions |
| Czysty CSS | design dopasowany do pracy na dużym ekranie — stały sidebar, gęste tabele |

## Design

Ta sama paleta kolorów co panel klienta (konsekwencja marki: granat + fiolet), ale inny charakter — to narzędzie pracy używane godzinami, nie jednorazowy, ciepły kontakt. Stały, ciemny sidebar nawigacyjny, gęstsza informacja w tabelach, mono-spacing dla liczb i dat.
