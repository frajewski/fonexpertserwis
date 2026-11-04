import { Routes, Route, useLocation } from 'react-router-dom';
import LookupPage from './pages/LookupPage';
import BookingPage from './pages/BookingPage';
import B2bCatalogPage from './pages/B2bCatalogPage';
import RepairStatusPage from './pages/RepairStatusPage';
import ContactPage from './pages/ContactPage';
import SiteLayout from './layout/SiteLayout';

// Linki śledzenia z potwierdzeń (QR) mają postać /?token=… – muszą dalej
// otwierać status zlecenia. Bez tokenu „/” to strona główna z formularzem.
function HomeRoute() {
  const location = useLocation();
  const token = new URLSearchParams(location.search).get('token');
  return token ? <RepairStatusPage /> : <BookingPage />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/oferta/:token" element={<B2bCatalogPage />} />
      <Route path="/" element={<SiteLayout><HomeRoute /></SiteLayout>} />
      <Route path="/umow-naprawe" element={<SiteLayout><BookingPage /></SiteLayout>} />
      <Route path="/status" element={<SiteLayout><LookupPage /></SiteLayout>} />
      <Route path="/kontakt" element={<SiteLayout><ContactPage /></SiteLayout>} />
      <Route path="/zlecenie/:id" element={<SiteLayout><RepairStatusPage /></SiteLayout>} />
    </Routes>
  );
}
