// Stałe dane serwisu używane w wiadomościach do klientów.
// blikPhone – numer telefonu podpięty pod BLIK („przelew na telefon”) do wpłat zadatków.
export const SHOP = {
  name: 'Fonexpert',
  blikPhone: '739 696 665',
  // Adres panelu klienta (linki śledzenia w SMS, QR na potwierdzeniu, B2B).
  // Zmieniasz host → zmień TYLKO tę linię (i WEB_PANEL_URL w packages/shared-core/src/firestoreDb.js).
  clientUrl: 'https://gsm-serwis-klient.web.app',
};
// Dane rejestrowe firmy – JEDNO źródło dla wszystkich wydruków
// (umowy kupna i komisu, protokół przekazania, karta gwarancyjna) i klauzul RODO.
// Zmiana adresu/NIP-u = zmiana tylko tutaj (i w gsmw/src/shop.js dla strony klienta).
export const COMPANY = {
  name: 'Fonexpert Filip Rajewski',
  address: 'Bogusławice 29A, 09-100 Płońsk',
  nip: '5671935602',
  regon: '542082892',
  phone: '739 696 665',
  email: 'kontaktfonexpert@gmail.com',
  shopAddress: 'ul. Żołnierzy Wyklętych 16 (Pasaż Kaufland), 09-100 Płońsk',
};

// Stare adresy panelu klienta – skaner dalej rozpoznaje wydrukowane wcześniej kody QR
export const LEGACY_CLIENT_HOSTS = ['gsm-serwis-klient.web.app'];
export default SHOP;
