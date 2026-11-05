// Stałe dane serwisu używane w wiadomościach do klientów.
// blikPhone – numer telefonu podpięty pod BLIK („przelew na telefon”) do wpłat zadatków.
export const SHOP = {
  name: 'Fonexpert',
  blikPhone: '739 696 665',
  // Adres panelu klienta (linki śledzenia w SMS, QR na potwierdzeniu, B2B).
  // Zmieniasz host → zmień TYLKO tę linię (i WEB_PANEL_URL w packages/shared-core/src/firestoreDb.js).
  clientUrl: 'https://gsm-serwis-klient.web.app',
};
// Stare adresy panelu klienta – skaner dalej rozpoznaje wydrukowane wcześniej kody QR
export const LEGACY_CLIENT_HOSTS = ['gsm-serwis-klient.web.app'];
export default SHOP;
