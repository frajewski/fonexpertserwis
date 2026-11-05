# 🌐 Fonexpert — panel klienta (`gsmw`)

Publiczna strona serwisu: https://gsm-serwis-klient.web.app

- Strona główna, zgłoszenie naprawy online (`/umow-naprawe`), status naprawy (`/status`, link z SMS / QR), skup i sprzedaż z formularzem wyceny, FAQ, kontakt z mapą oraz prywatny katalog B2B (`/oferta/:token`).
- Klient nie ma konta: panel loguje go anonimowo, a dane zleceń dostaje wyłącznie przez Cloud Functions (`firebase/functions/index.js`), które sprawdzają token z linku albo numer zlecenia + telefon.

Pełny opis stron, plików z treściami (`src/shop.js`, `src/data/faq.js`) i komponentów (`src/styles/ui.css`): [`../README.md`](../README.md#-panel-klienta-gsmw).

```bash
cd ~/Desktop/pro && npm install && npm run client      # lokalnie, http://localhost:5173
cd ~/Desktop/pro/gsmw && npm run build && firebase deploy --only hosting:klient   # produkcja
```
