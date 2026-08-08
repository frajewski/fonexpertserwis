// ============================================================
//  formatDate.js – narzędzia do formatowania dat w języku polskim
//  Użycie: import { formatDate, formatDateShort } from '../utils/formatDate'
// ============================================================

// Pełna data i czas: "12 czerwca 2025, 14:30"
export const formatDate = (isoString) => {
  if (!isoString) return '—';
  const date = new Date(isoString);
  return date.toLocaleDateString('pl-PL', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

// Skrócona data: "12.06.2025"
export const formatDateShort = (isoString) => {
  if (!isoString) return '—';
  const date = new Date(isoString);
  return date.toLocaleDateString('pl-PL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

// Tylko czas: "14:30"
export const formatTime = (isoString) => {
  if (!isoString) return '—';
  const date = new Date(isoString);
  return date.toLocaleTimeString('pl-PL', {
    hour: '2-digit',
    minute: '2-digit',
  });
};

// Relatywny czas: "2 dni temu", "przed chwilą" itp.
export const formatRelative = (isoString) => {
  if (!isoString) return '—';
  const now = new Date();
  const date = new Date(isoString);
  const diffMs = now - date;
  const diffMin = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMin < 1)    return 'przed chwilą';
  if (diffMin < 60)   return `${diffMin} min temu`;
  if (diffHours < 24) return `${diffHours} godz. temu`;
  if (diffDays === 1) return 'wczoraj';
  if (diffDays < 30)  return `${diffDays} dni temu`;
  return formatDateShort(isoString); // starsze – pokaż datę
};

// Zwróć nazwę miesiąca po polsku: getMonthName(0) → "Styczeń"
export const getMonthName = (monthIndex) => {
  const months = [
    'Styczeń','Luty','Marzec','Kwiecień','Maj','Czerwiec',
    'Lipiec','Sierpień','Wrzesień','Październik','Listopad','Grudzień',
  ];
  return months[monthIndex] || '—';
};

// Sprawdź czy data jest dzisiaj
export const isToday = (isoString) => {
  if (!isoString) return false;
  const today = new Date();
  const date = new Date(isoString);
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  );
};
