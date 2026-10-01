import { Routes, Route, useLocation } from 'react-router-dom';
import LookupPage from './pages/LookupPage';
import BookingPage from './pages/BookingPage';
import B2bCatalogPage from './pages/B2bCatalogPage';
import RepairStatusPage from './pages/RepairStatusPage';

function HomeRoute() {
  const location = useLocation();
  const token = new URLSearchParams(location.search).get('token');


  if (token) {
    return <RepairStatusPage />;
  }

  return <LookupPage />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomeRoute />} />
      <Route path="/zlecenie/:id" element={<RepairStatusPage />} />
      <Route path="/umow-naprawe" element={<BookingPage />} />
      <Route path="/oferta/:token" element={<B2bCatalogPage />} />
    </Routes>
  );
}