// Routing panelu klienta. Strony ładowane osobno (React.lazy), żeby strona
// główna, FAQ czy kontakt nie pobierały kodu formularzy i Firebase.
import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import SiteLayout from './layout/SiteLayout';

const HomePage = lazy(() => import('./pages/HomePage'));
const BookingPage = lazy(() => import('./pages/BookingPage'));
const LookupPage = lazy(() => import('./pages/LookupPage'));
const RepairStatusPage = lazy(() => import('./pages/RepairStatusPage'));
const DevicesPage = lazy(() => import('./pages/DevicesPage'));
const FaqPage = lazy(() => import('./pages/FaqPage'));
const ContactPage = lazy(() => import('./pages/ContactPage'));
const PrivacyPage = lazy(() => import('./pages/PrivacyPage'));
const RulesPage = lazy(() => import('./pages/RulesPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));
const B2bCatalogPage = lazy(() => import('./pages/B2bCatalogPage'));

function PageLoader() {
  return <div className="ui-page-loader" role="status" aria-label="Wczytywanie"><span className="ui-spinner" /></div>;
}

// Linki śledzenia z potwierdzeń (QR) mają postać /?token=… – muszą dalej
// otwierać status zlecenia. Bez tokenu „/” to strona główna.
function HomeRoute() {
  const location = useLocation();
  const token = new URLSearchParams(location.search).get('token');
  return token ? <RepairStatusPage /> : <HomePage />;
}

const withLayout = (el) => <SiteLayout><Suspense fallback={<PageLoader />}>{el}</Suspense></SiteLayout>;

export default function App() {
  return (
    <Routes>
      <Route path="/oferta/:token" element={<Suspense fallback={<PageLoader />}><B2bCatalogPage /></Suspense>} />
      <Route path="/" element={withLayout(<HomeRoute />)} />
      <Route path="/umow-naprawe" element={withLayout(<BookingPage />)} />
      <Route path="/status" element={withLayout(<LookupPage />)} />
      <Route path="/zlecenie/:id" element={withLayout(<RepairStatusPage />)} />
      <Route path="/skup-i-sprzedaz" element={withLayout(<DevicesPage />)} />
      <Route path="/urzadzenia" element={<Navigate to="/skup-i-sprzedaz" replace />} />
      <Route path="/faq" element={withLayout(<FaqPage />)} />
      <Route path="/kontakt" element={withLayout(<ContactPage />)} />
      <Route path="/polityka-prywatnosci" element={withLayout(<PrivacyPage />)} />
      <Route path="/zasady-rezerwacji" element={withLayout(<RulesPage />)} />
      <Route path="*" element={withLayout(<NotFoundPage />)} />
    </Routes>
  );
}
