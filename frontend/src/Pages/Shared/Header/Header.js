import ConfirmDialog from '../../../components/UI/ConfirmDialog';
import ProfileAvatar from '../../../components/UI/ProfileAvatar';
import AdminNavLink from '../../../components/Marketplace/AdminNavLink';
import React, { useContext, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../../../Context/AuthProvider/AuthProvider';

const Arrow = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
    <path d="M5 12h14m-6-6 6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const Header = () => {
  const { user, logout } = useContext(AuthContext);
  const [menuOpen, setMenuOpen] = useState(false);
  const [signOutOpen, setSignOutOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState('');
  const navigate = useNavigate();

  const closeMenu = () => setMenuOpen(false);
  // rs-ui-header-signout — modal confirms before Firebase signOut.
  const confirmSignOut = async () => {
    if (signingOut) return;
    setSigningOut(true);
    setSignOutError('');
    try {
      await logout();
      setSignOutOpen(false);
      closeMenu();
      navigate('/');
    } catch (err) {
      setSignOutError(err.message || 'Sign out failed. Please try again.');
    } finally {
      setSigningOut(false);
    }
  };

  const dashboardPath = `/dashboard/${encodeURIComponent(user?.email || '')}`;
  return (
    <header className="rs-site-header">
      <div className="rs-shell rs-nav-wrap">
        <Link className="rs-brand" to="/" onClick={closeMenu} aria-label="ReSell Market home">
          <span className="rs-brand-icon" aria-hidden="true">
            <svg viewBox="0 0 32 32" fill="none">
              <path
                d="m5 19 3.2-8.4a3 3 0 0 1 2.8-1.9h10a3 3 0 0 1 2.8 1.9L27 19M5 19h22v5a2 2 0 0 1-2 2h-2v-3H9v3H7a2 2 0 0 1-2-2v-5Z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinejoin="round"
              />
              <path
                d="M5 18h22M9 21h3m8 0h3"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </span>
          <span>
            re<span className="rs-brand-accent">sell</span>
            <span className="rs-brand-dot">.</span>
          </span>
        </Link>

        <button
          type="button"
          className={`rs-menu-toggle ${menuOpen ? 'is-open' : ''}`}
          aria-label={menuOpen ? 'Close navigation' : 'Open navigation'}
          aria-expanded={menuOpen}
          aria-controls="rs-primary-navigation"
          onClick={() => setMenuOpen((current) => !current)}
        >
          <span />
          <span />
          <span />
        </button>

        <nav
          id="rs-primary-navigation"
          className={`rs-navigation ${menuOpen ? 'is-open' : ''}`}
          aria-label="Main navigation"
        >
          <div className="rs-nav-links">
            <Link to="/" onClick={closeMenu}>
              Home
            </Link>
            <Link to="/cars" onClick={closeMenu}>
              Explore cars
            </Link>
            <Link to="/blog" onClick={closeMenu}>
              Blog
            </Link>
            <Link to="/faq" onClick={closeMenu}>
              FAQ
            </Link>
          </div>
          <div className="rs-nav-actions">
            <AdminNavLink onClick={closeMenu} />
            {user?.email ? (
              <>
                <Link to="/additem" onClick={closeMenu} className="rs-nav-signin">
                  Sell a car
                </Link>
                <Link
                  to="/profile"
                  onClick={closeMenu}
                  className="rs-nav-account rs-nav-profile"
                  title="My profile"
                >
                  <ProfileAvatar user={user} size="sm" />
                  <span>Profile</span>
                </Link>
                <Link
                  to={dashboardPath}
                  onClick={closeMenu}
                  className="rs-nav-account"
                  title="Dashboard"
                >
                  <span>Dashboard</span>
                </Link>
                <button
                  type="button"
                  className="rs-nav-logout"
                  onClick={() => {
                    setSignOutError('');
                    setSignOutOpen(true);
                    closeMenu();
                  }}
                >
                  Sign out
                </button>
              </>
            ) : (
              <>
                <Link to="/login" onClick={closeMenu} className="rs-nav-signin">
                  Log in
                </Link>
                <Link
                  to="/register"
                  onClick={closeMenu}
                  className="rs-btn rs-btn-primary rs-nav-join"
                >
                  Get started <Arrow />
                </Link>
              </>
            )}
          </div>
        </nav>
      </div>
      <ConfirmDialog
        open={signOutOpen}
        title="Sign out of ReSell?"
        description="You can still browse cars, but you will need to sign in again to manage your listings or reservations."
        confirmLabel="Yes, sign out"
        cancelLabel="Stay signed in"
        tone="signout"
        busy={signingOut}
        error={signOutError}
        onCancel={() => {
          if (!signingOut) setSignOutOpen(false);
        }}
        onConfirm={confirmSignOut}
      />
    </header>
  );
};

export default Header;
