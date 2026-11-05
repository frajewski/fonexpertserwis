// Dane serwisu pokazywane klientom (nagłówek, stopka, FAQ)
export const SHOP = {
  name: 'Fonexpert',
  tagline: 'Serwis GSM',
  phone: '739 696 665',
  phoneHref: 'tel:+48739696665',
  email: 'kontaktfonexpert@gmail.com',
  addressLine1: 'ul. Żołnierzy Wyklętych 16 (Pasaż Kaufland)',
  addressLine2: '09-100 Płońsk',
  // Dane rejestrowe (klauzule RODO) – zgodne z COMPANY w gsm-admin-panel/src/constants/shopInfo.js
  legalName: 'Fonexpert Filip Rajewski',
  legalAddress: 'Bogusławice 29A, 09-100 Płońsk',
  nip: '5671935602',
  // Wizytówka Google (link do profilu / opinii) i zapytanie do mapy
  googleProfileUrl: 'https://share.google/1dMB0IYSYe855J5sk',
  mapsUrl: 'https://maps.app.goo.gl/DZZ1CN5Srx1c7DKSA',
  mapsName: 'Telefony i Akcesoria GSM',
  mapsLat: 52.6298634,
  mapsLng: 20.3822619,
  hours: [
    ['Pon. – Sob.', '9:00 – 21:00'],
    ['Niedziele handlowe', '9:00 – 19:00'],
  ],
};
export default SHOP;
