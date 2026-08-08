// Typ dokumentu sprzedaży wybierany podczas przyjęcia zlecenia
// Jeśli klient chce fakturę – NIP jest wymagany, paragon nie wymaga NIP

export const DOCUMENT_TYPE = {
  RECEIPT: 'Paragon',
  INVOICE: 'Faktura',
};

export const documentTypeList = Object.values(DOCUMENT_TYPE);
