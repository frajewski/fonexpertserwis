// Kategorie kosztów utrzymania firmy – używane w formularzu dodawania
// wydatku i do grupowania w statystykach

const expenseCategories = [
  { value: 'accounting', label: 'Obsługa księgowa', emoji: '📊' },
  { value: 'vat',        label: 'VAT',              emoji: '🧾' },
  { value: 'pit',        label: 'PIT',               emoji: '🧾' },
  { value: 'zus',        label: 'ZUS',               emoji: '🏥' },
  { value: 'ads',        label: 'Reklama / ogłoszenia', emoji: '📢' },
  { value: 'supplies',   label: 'Materiały eksploatacyjne', emoji: '📦' },
  { value: 'rent',       label: 'Czynsz / media',    emoji: '🏠' },
  { value: 'other',      label: 'Inne',              emoji: '💼' },
];

export const expenseCategoryLabels = expenseCategories.reduce((acc, c) => {
  acc[c.value] = c.label;
  return acc;
}, {});

export default expenseCategories;
