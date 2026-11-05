// Podpowiedzi modeli w formularzach (datalist) – klient i tak może wpisać dowolny model.
// Dopisuj nowe modele na górze listy danej marki.
const MODELS = {
  Apple: [
    'iPhone 17 Pro Max', 'iPhone 17 Pro', 'iPhone Air', 'iPhone 17', 'iPhone 16e',
    'iPhone 16 Pro Max', 'iPhone 16 Pro', 'iPhone 16 Plus', 'iPhone 16',
    'iPhone 15 Pro Max', 'iPhone 15 Pro', 'iPhone 15 Plus', 'iPhone 15',
    'iPhone 14 Pro Max', 'iPhone 14 Pro', 'iPhone 14 Plus', 'iPhone 14',
    'iPhone 13 Pro Max', 'iPhone 13 Pro', 'iPhone 13', 'iPhone 13 mini',
    'iPhone 12 Pro Max', 'iPhone 12 Pro', 'iPhone 12', 'iPhone 12 mini',
    'iPhone 11 Pro Max', 'iPhone 11 Pro', 'iPhone 11', 'iPhone SE (2022)', 'iPhone SE (2020)',
    'iPhone XS Max', 'iPhone XS', 'iPhone XR', 'iPhone X',
    'iPad Pro', 'iPad Air', 'iPad', 'iPad mini', 'MacBook Air', 'MacBook Pro',
  ],
  Samsung: [
    'Galaxy S25 Ultra', 'Galaxy S25+', 'Galaxy S25', 'Galaxy S25 FE', 'Galaxy S24 Ultra', 'Galaxy S24+', 'Galaxy S24', 'Galaxy S24 FE',
    'Galaxy S23 Ultra', 'Galaxy S23+', 'Galaxy S23', 'Galaxy S23 FE', 'Galaxy S22 Ultra', 'Galaxy S22', 'Galaxy S21', 'Galaxy S20 FE',
    'Galaxy A56', 'Galaxy A55', 'Galaxy A54', 'Galaxy A53', 'Galaxy A52s', 'Galaxy A36', 'Galaxy A35', 'Galaxy A34',
    'Galaxy A26', 'Galaxy A25', 'Galaxy A16', 'Galaxy A15', 'Galaxy A14', 'Galaxy A13', 'Galaxy A12',
    'Galaxy Z Fold6', 'Galaxy Z Flip6', 'Galaxy Z Fold5', 'Galaxy Z Flip5', 'Galaxy Tab S9', 'Galaxy Tab A9',
  ],
  Xiaomi: [
    'Xiaomi 15', 'Xiaomi 14T Pro', 'Xiaomi 14T', 'Xiaomi 14', 'Xiaomi 13T', 'Redmi Note 14 Pro', 'Redmi Note 14',
    'Redmi Note 13 Pro', 'Redmi Note 13', 'Redmi Note 12', 'Redmi 14C', 'Redmi 13C', 'Redmi 12', 'POCO X7 Pro', 'POCO X6 Pro', 'POCO F6',
  ],
  Motorola: ['Edge 50 Pro', 'Edge 50', 'Edge 40', 'Moto G85', 'Moto G84', 'Moto G55', 'Moto G54', 'Moto G35', 'Moto G24', 'Moto G14', 'razr 50'],
  Google: ['Pixel 10 Pro', 'Pixel 10', 'Pixel 9 Pro', 'Pixel 9', 'Pixel 9a', 'Pixel 8 Pro', 'Pixel 8', 'Pixel 8a', 'Pixel 7a', 'Pixel 7'],
  Huawei: ['P60 Pro', 'P30 Pro', 'P30 Lite', 'Nova 12', 'Nova 11', 'Mate 20 Pro'],
  Honor: ['Honor 400', 'Honor 200', 'Honor Magic6 Lite', 'Honor X8b', 'Honor 90'],
  OnePlus: ['OnePlus 13', 'OnePlus 12', 'OnePlus Nord 4', 'OnePlus Nord CE4'],
  Oppo: ['Reno12', 'Reno11', 'A98', 'A79', 'A60'],
  Realme: ['Realme 13 Pro', 'Realme 12', 'Realme C67', 'Realme C55'],
  Lenovo: ['Tab P12', 'Tab M11', 'Tab M10', 'IdeaPad', 'ThinkPad', 'Legion'],
};
export const modelsFor = (brand) => MODELS[brand] || [];
export default MODELS;
