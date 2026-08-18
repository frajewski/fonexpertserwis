// Szablony wiadomości do klienta – teksty identyczne z apką mobilną
// (new/src/services/smsService.js), ale bez logiki wysyłki natywnej (panel
// webowy nie ma dostępu do SIM-a, więc tu tylko generujemy treść do
// skopiowania / otwarcia w aplikacji SMS/e-mail).

export const messageTemplates = (repair, customerName) => {
  const total = (repair.partsCost || 0) + (repair.serviceCost || 0);
  // Ten sam mechanizm co QR na wydruku – budujemy link na nowo z tokena,
  // żeby działało też dla starszych zleceń niezależnie od zapisanego
  // (czasem błędnego) pola trackingUrl w bazie.
  const trackingUrl = repair.trackingToken
    ? `https://gsm-serwis-klient.web.app/?token=${repair.trackingToken}`
    : null;
  const trackingLine = trackingUrl ? ` Status online: ${trackingUrl}` : '';

  return [
    {
      id: 'accepted',
      label: '📥 Przyjęcie do serwisu',
      body: `Dzień dobry ${customerName}! Przyjęliśmy Państwa urządzenie (${repair.brand} ${repair.model}) do serwisu. Numer zlecenia: ${repair.displayNumber || repair.id}.${trackingLine} Fonexpert`,
    },
    {
      id: 'estimate',
      label: '💰 Kosztorys gotowy',
      body: `Dzień dobry ${customerName}! Kosztorys naprawy Państwa urządzenia ${repair.brand} ${repair.model}: ${total} zł.${trackingLine} Fonexpert`,
    },
    {
      id: 'ready',
      label: '✅ Gotowe do odbioru',
      body: `Dzień dobry ${customerName}! Urządzenie ${repair.brand} ${repair.model} jest gotowe do odbioru. Zapraszamy pon-sob 9-21.${trackingLine} Fonexpert`,
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
