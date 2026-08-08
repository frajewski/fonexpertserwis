// Standardowe okresy gwarancji na naprawę – wybierane przy wydaniu urządzenia klientowi

export const warrantyPeriods = [
  { label: 'Brak gwarancji', months: 0 },
  { label: '1 miesiąc',      months: 1 },
  { label: '3 miesiące',     months: 3 },
  { label: '6 miesięcy',     months: 6 },
  { label: '12 miesięcy',    months: 12 },
];

// Oblicz datę końca gwarancji na podstawie daty wydania i liczby miesięcy
export const calcWarrantyEndDate = (issueDateIso, months) => {
  if (!months || months === 0) return null;
  const date = new Date(issueDateIso);
  date.setMonth(date.getMonth() + months);
  return date.toISOString();
};
