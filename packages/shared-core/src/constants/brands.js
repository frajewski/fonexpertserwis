// Lista marek urządzeń mobilnych obsługiwanych w serwisie
// Używana w AddRepairScreen jako dropdown (Picker)
// Dodaj nową markę po prostu dopisując kolejny obiekt do tablicy

const brands = [
  { label: 'Apple (iPhone)',  value: 'Apple' },
  { label: 'Samsung',         value: 'Samsung' },
  { label: 'Xiaomi',          value: 'Xiaomi' },
  { label: 'Huawei',          value: 'Huawei' },
  { label: 'Motorola',        value: 'Motorola' },
  { label: 'OnePlus',         value: 'OnePlus' },
  { label: 'Realme',          value: 'Realme' },
  { label: 'OPPO',            value: 'OPPO' },
  { label: 'Nokia',           value: 'Nokia' },
  { label: 'Sony',            value: 'Sony' },
  { label: 'LG',              value: 'LG' },
  { label: 'Google (Pixel)',  value: 'Google' },
  { label: 'Nothing',         value: 'Nothing' },
  { label: 'Inna marka',      value: 'Other' },
];

// Lista popularnych typów usterek – do statystyk i opisu zgłoszenia
export const faultTypes = [
  'Rozbity ekran',
  'Wymiana baterii',
  'Uszkodzony port ładowania',
  'Brak dźwięku / głośnik',
  'Aparat nie działa',
  'Mokry telefon / zalanie',
  'Problem z oprogramowaniem',
  'Brak zasięgu / moduł sieciowy',
  'Przycisk home / power nie działa',
  'Inne',
];

export default brands;
