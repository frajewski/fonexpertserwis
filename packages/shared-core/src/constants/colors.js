// ============================================================
//  colors.js – paleta kolorów GSM Service App
//  Eksportuje dwa zestawy: lightColors i darkColors.
//  W komponentach używaj hooka useColors() z ThemeContext,
//  NIE importuj colors bezpośrednio – inaczej ciemny motyw
//  nie zadziała. Wyjątek: komponenty, które i tak nie mogą
//  użyć hooków (np. StyleSheet poza komponentem), mogą użyć
//  lightColors jako fallback.
// ============================================================

export const lightColors = {
  // Kolory główne
  primary:         '#243B55',
  accent:          '#6465FF',

  // Tło i powierzchnie
  background:      '#F7F7F7',
  surface:         '#FFFFFF',
  surfaceElevated: '#FFFFFF',

  // Stany akcji
  success:         '#1DB954',
  danger:          '#FF4C4C',
  warning:         '#F59E0B',
  info:            '#3B82F6',

  // Tekst
  textPrimary:     '#1A1A2E',
  textSecondary:   '#6B7280',
  textInverse:     '#FFFFFF',

  // Obramowania i separatory
  border:          '#E5E7EB',
  divider:         '#F3F4F6',

  // Cień
  shadow:          'rgba(0, 0, 0, 0.10)',

  // Statusy napraw
  statusAccepted:  '#6B7280',
  statusDiagnosis: '#F59E0B',
  statusOrderParts: '#F97316',
  statusRepair:    '#3B82F6',
  statusParts:     '#8B5CF6',
  statusReady:     '#1DB954',
  statusDelivered: '#243B55',
  statusCancelled: '#FF4C4C',
};

export const darkColors = {
  // Kolory główne
  primary:         '#7C9CBF',   // rozjaśniony, żeby był czytelny na ciemnym tle
  accent:          '#8B8CFF',

  // Tło i powierzchnie
  background:      '#0F1117',   // bardzo ciemny – prawie czarny
  surface:         '#1C1F2E',   // karta na ciemnym tle
  surfaceElevated: '#252839',   // modal, dropdown – trochę jaśniejszy

  // Stany akcji – te same, dobrze wyglądają na ciemnym tle
  success:         '#1DB954',
  danger:          '#FF4C4C',
  warning:         '#F59E0B',
  info:            '#3B82F6',

  // Tekst
  textPrimary:     '#E8EAF0',   // prawie biały, łatwiejszy dla oczu niż czysty biały
  textSecondary:   '#9CA3AF',
  textInverse:     '#1A1A2E',

  // Obramowania i separatory
  border:          '#2D3148',
  divider:         '#1E2133',

  // Cień (na ciemnym tle mniej widoczny – wystarczy subtelny)
  shadow:          'rgba(0, 0, 0, 0.40)',

  // Statusy napraw – te same kolory, dobrze kontrastują z ciemnym tłem
  statusAccepted:  '#6B7280',
  statusDiagnosis: '#F59E0B',
  statusOrderParts: '#F97316',
  statusRepair:    '#3B82F6',
  statusParts:     '#8B5CF6',
  statusReady:     '#1DB954',
  statusDelivered: '#7C9CBF',
  statusCancelled: '#FF4C4C',
};

// Fallback dla miejsc, które nie mogą użyć hooka (np. FAB, StatusBadge)
// – na start zawsze jasny, zostanie nadpisany przez ThemeContext
const colors = lightColors;
export default colors;
