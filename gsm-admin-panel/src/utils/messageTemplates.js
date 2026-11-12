// Szablony wiadomości do klienta (SMS/e-mail) z linkiem śledzenia.
// Wysyłka SMS idzie przez bramkę (Cloud Function sendSmsToCustomer);
// treść można też skopiować albo otworzyć w aplikacji SMS/e-mail.
// Szablony 'partsArrived' i 'ready' są wysyłane automatycznie przy zmianie
// statusu (RepairDetailPage, AUTO_SMS).

import SHOP from '../constants/shopInfo';
export const messageTemplates = (repair, customerName) => {
  const total = (repair.partsCost || 0) + (repair.serviceCost || 0);
  // Ten sam mechanizm co QR na wydruku – budujemy link na nowo z tokena,
  // żeby działało też dla starszych zleceń niezależnie od zapisanego
  // (czasem błędnego) pola trackingUrl w bazie.
  const trackingUrl = repair.trackingToken
    ? `${SHOP.clientUrl}/?token=${repair.trackingToken}`
    : null;
  const trackingLine = trackingUrl ? ` Status online: ${trackingUrl}` : '';
  // Przy przyjęciu: jeśli klient nie zaakceptował jeszcze regulaminu (np. podpisem
  // na ekranie), link prowadzi do statusu z ramką akceptacji regulaminu.
  const intakeLine = trackingUrl
    ? (repair.termsAccepted ? trackingLine : ` Status i akceptacja regulaminu: ${trackingUrl}`)
    : '';

  return [
    {
      id: 'accepted',
      label: '📥 Przyjęcie do serwisu',
      body: `Dzień dobry ${customerName}! Przyjęliśmy Państwa urządzenie (${repair.brand} ${repair.model}) do serwisu. Numer zlecenia: ${repair.displayNumber || repair.id}.${intakeLine} Fonexpert`,
    },
    {
      id: 'estimate',
      label: '💰 Kosztorys gotowy',
      body: `Dzień dobry ${customerName}! Kosztorys naprawy Państwa urządzenia ${repair.brand} ${repair.model}: ${total} zł.${trackingLine} Fonexpert`,
    },
    {
      id: 'partsArrived',
      label: '📦 Części dotarły',
      body: `Dzień dobry ${customerName}! Zamówione części do Państwa urządzenia ${repair.brand} ${repair.model} dotarły. Zapraszamy z urządzeniem, naprawimy od ręki. Godziny otwarcia: pon-sob 9-21.${trackingLine} Fonexpert`,
    },
    {
      id: 'ready',
      label: '✅ Gotowe do odbioru',
      body: `Dzień dobry ${customerName}! Urządzenie ${repair.brand} ${repair.model} jest gotowe do odbioru. Zapraszamy pon-sob 9-21.${trackingLine} Fonexpert`,
    },
    {
  id: 'pickupReminder',
  label: '⏰ Przypomnienie o odbiorze',
  body: `Dzień dobry ${customerName}. Przypominamy, że urządzenie ${repair.brand} ${repair.model} jest gotowe do odbioru i nadal oczekuje w naszym serwisie. Prosimy o odbiór w najbliższym możliwym terminie. Zapraszamy pon-sob 9-21.${trackingLine} Fonexpert`,
},

{
      id: 'delay',
      label: '⏳ Opóźnienie naprawy',
      body: `Dzień dobry ${customerName}. Naprawa ${repair.brand} ${repair.model} wymaga więcej czasu. Przepraszamy za opóźnienie.${trackingLine} Fonexpert`,
    },
    {
      id: 'cancelled',
      label: '❌ Anulowanie zlecenia',
      body: `Dzień dobry ${customerName}. Zlecenie ${repair.brand} ${repair.model} zostało anulowane. Zapraszamy po odbiór. Fonexpert`,
    },
  ];
};
