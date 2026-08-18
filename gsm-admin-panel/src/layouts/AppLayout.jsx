import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import useStore from '../store/useStore';
import './AppLayout.css';

const NAV_ITEMS = [
  { to: '/pulpit',     label: 'Pulpit',       icon: '⌂', roles: ['admin', 'worker'] },
  { to: '/',          label: 'Zlecenia',     icon: '◆', roles: ['admin', 'worker'] },
  { to: '/magazyn',    label: 'Magazyn',      icon: '▤', roles: ['admin', 'worker'] },
  { to: '/skup',       label: 'Skup',         icon: '◈', roles: ['admin'] },
  { to: '/klienci',    label: 'Klienci',      icon: '◎', roles: ['admin', 'worker'] },
  { to: '/statystyki', label: 'Statystyki',   icon: '◬', roles: ['admin'] },
  { to: '/koszty',     label: 'Koszty firmy', icon: '💸', roles: ['admin'] },
  { to: '/uzytkownicy', label: 'Użytkownicy', icon: '◐', roles: ['admin'] },
  { to: '/ustawienia', label: 'Ustawienia',   icon: '◑', roles: ['admin'] },
];

export default function AppLayout({ children }) {
  const currentUser = useStore((s) => s.currentUser);
  const logout = useStore((s) => s.logout);
  const resendVerification = useStore((s) => s.resendVerification);
  const navigate = useNavigate();

  const [verifySent, setVerifySent] = useState(false);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const role = currentUser?.role;
  const visibleItems = NAV_ITEMS.filter((item) => item.roles.includes(role));

  const handleLogout = async () => {
    await logout();
    navigate('/logowanie');
  };

  const handleResendVerification = async () => {
    setVerifyLoading(true);
    const result = await resendVerification();
    setVerifyLoading(false);
    if (result.success) setVerifySent(true);
  };

  return (
    <div className="layout">
      <header className="mobile-topbar">
        <button className="mobile-menu-btn" onClick={() => setMobileMenuOpen(true)} aria-label="Menu">
          ☰
        </button>
        <span className="mobile-topbar-brand">Fonexpert</span>
        <button className="mobile-topbar-avatar" onClick={() => navigate('/moje-konto')} title="Moje konto">
          {currentUser?.name?.[0]?.toUpperCase() || '?'}
        </button>
      </header>

      {mobileMenuOpen && (
        <div className="sidebar-backdrop" onClick={() => setMobileMenuOpen(false)} />
      )}

      <aside className={`sidebar ${mobileMenuOpen ? 'sidebar-mobile-open' : ''}`}>
        <div className="sidebar-brand">
          <span className="sidebar-brand-mark">F</span>
          <span className="sidebar-brand-text">Fonexpert</span>
          <button className="sidebar-close-btn" onClick={() => setMobileMenuOpen(false)} aria-label="Zamknij menu">✕</button>
        </div>

        <nav className="sidebar-nav">
          {visibleItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => setMobileMenuOpen(false)}
              className={({ isActive }) => `sidebar-link ${isActive ? 'sidebar-link-active' : ''}`}
            >
              <span className="sidebar-link-icon">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <button
            className="sidebar-user sidebar-user-link"
            onClick={() => { setMobileMenuOpen(false); navigate('/moje-konto'); }}
            title="Moje konto"
          >
            <div className="sidebar-user-avatar">{currentUser?.name?.[0]?.toUpperCase() || '?'}</div>
            <div className="sidebar-user-info">
              <div className="sidebar-user-name">{currentUser?.name}</div>
              {role === 'admin' && <div className="sidebar-user-role">Administrator</div>}
            </div>
          </button>
          <button className="sidebar-logout" onClick={handleLogout} title="Wyloguj się">
            ⏻
          </button>
        </div>
      </aside>

      <main className="content">
        {currentUser && currentUser.emailVerified === false && (
          <div className="verify-banner">
            {verifySent ? (
              <span>✓ Wysłaliśmy link weryfikacyjny ponownie — sprawdź skrzynkę (i spam).</span>
            ) : (
              <>
                <span>⚠️ Twój adres email nie jest zweryfikowany.</span>
                <button onClick={handleResendVerification} disabled={verifyLoading}>
                  {verifyLoading ? 'Wysyłanie…' : 'Wyślij link ponownie'}
                </button>
              </>
            )}
          </div>
        )}
        {children}
      </main>
    </div>
  );
}
