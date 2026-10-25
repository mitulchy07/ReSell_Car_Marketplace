import ProfileAvatar from '../components/UI/ProfileAvatar';
import React, { useContext, useEffect, useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { AuthContext } from '../Context/AuthProvider/AuthProvider';
import Header from '../Pages/Shared/Header/Header';
import Footer from '../Pages/Shared/Footer/Footer';
import '../styles/resell-dashboard.css';

const glyphs = {
  grid: (
    <>
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </>
  ),
  receipt: (
    <>
      <path d="M5 3h14v18l-3-2-4 2-4-2-3 2V3Z" />
      <path d="M9 8h6M9 12h6" />
    </>
  ),
  car: (
    <>
      <path d="m5 15 2-6a3 3 0 0 1 3-2h4a3 3 0 0 1 3 2l2 6" />
      <path d="M4 15h16v4H4v-4ZM6 19v2m12-2v2M7 16h2m6 0h2" />
    </>
  ),
  compass: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="m16 8-2.5 5.5L8 16l2.5-5.5L16 8Z" />
    </>
  ),
  lock: (
    <>
      <rect x="4" y="10" width="16" height="11" rx="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
    </>
  ),
  arrow: <path d="M5 12h14m-6-6 6 6-6 6" />,
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  x: <path d="M5 5l14 14M19 5 5 19" />,
};
function Icon({ name }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="19"
      height="19"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {glyphs[name]}
    </svg>
  );
}

export default function DashboardLayout() {
  const { user } = useContext(AuthContext);
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const accountPath = `/dashboard/${encodeURIComponent(user?.email || '')}`;
  const sellerPreview = new URLSearchParams(location.search).get('tab') === 'seller';
  const onOverview = location.pathname.startsWith('/dashboard/') && !sellerPreview;
  const onOrders = location.pathname === '/myorders';

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname, location.search]);

  return (
    <div className="rs-dashboard-frame">
      <Header />
      <div className="rs-dash-shell">
        <div className="rs-dash-mobile-bar">
          <span>
            <Icon name="grid" /> Your workspace
          </span>
          <button
            type="button"
            onClick={() => setMobileOpen((v) => !v)}
            aria-expanded={mobileOpen}
            aria-controls="rs-dashboard-navigation"
            aria-label={mobileOpen ? 'Close dashboard navigation' : 'Open dashboard navigation'}
          >
            <Icon name={mobileOpen ? 'x' : 'menu'} />
          </button>
        </div>
        {mobileOpen && (
          <button
            type="button"
            className="rs-dash-backdrop"
            onClick={() => setMobileOpen(false)}
            aria-label="Close dashboard navigation"
          />
        )}
        <aside
          id="rs-dashboard-navigation"
          className={`rs-dash-sidebar ${mobileOpen ? 'is-open' : ''}`}
          aria-label="Dashboard navigation"
        >
          <div className="rs-dash-sidebar-head">
            <span className="rs-dash-side-eyebrow">YOUR SPACE</span>
            <h2>
              Dashboard<span>.</span>
            </h2>
            <p>Everything for your next drive, all in one place.</p>
          </div>
          <nav className="rs-dash-side-nav">
            <span className="rs-dash-nav-label">WORKSPACE</span>
            <Link className="rs-dash-side-link" to="/seller/orders">
              <Icon name="receipt" /> Incoming reservations <Icon name="arrow" />
            </Link>
            <Link
              className={`rs-dash-side-link ${onOverview ? 'is-current' : ''}`}
              to={accountPath}
              aria-current={onOverview ? 'page' : undefined}
            >
              <Icon name="grid" /> Overview <Icon name="arrow" />
            </Link>
            <Link
              className={`rs-dash-side-link ${onOrders ? 'is-current' : ''}`}
              to="/myorders"
              aria-current={onOrders ? 'page' : undefined}
            >
              <Icon name="receipt" /> My reservations <Icon name="arrow" />
            </Link>
            <Link
              className={`rs-dash-side-link ${sellerPreview ? 'is-current' : ''}`}
              to={`${accountPath}?tab=seller`}
              aria-current={sellerPreview ? 'page' : undefined}
            >
              <Icon name="car" /> Seller workspace <Icon name="arrow" />
            </Link>
            <Link
              className={`rs-dash-side-link ${location.pathname === '/profile' ? 'is-current' : ''}`}
              to="/profile"
            >
              <Icon name="grid" /> My profile <Icon name="arrow" />
            </Link>
            <span className="rs-dash-nav-label rs-dash-nav-label-spaced">EXPLORE</span>
            <Link className="rs-dash-side-link" to="/#brands">
              <Icon name="compass" /> Browse vehicles <Icon name="arrow" />
            </Link>
            <Link
              className={`rs-dash-side-link ${location.pathname === '/additem' ? 'is-current' : ''}`}
              to="/additem"
            >
              <Icon name="car" /> Create listing <Icon name="arrow" />
            </Link>
            <Link
              className={`rs-dash-side-link ${location.pathname.startsWith('/myitems/') ? 'is-current' : ''}`}
              to={`/myitems/${encodeURIComponent(user?.email || '')}`}
            >
              <Icon name="receipt" /> My listings <Icon name="arrow" />
            </Link>
          </nav>
          <div className="rs-dash-sidebar-bottom">
            <ProfileAvatar user={user} size="md" className="rs-dash-user-avatar-icon" />
            <div className="rs-dash-user-info">
              <strong>{user?.displayName || 'Your account'}</strong>
              <small title={user?.email}>{user?.email || 'Signed in'}</small>
            </div>
            <span className="rs-dash-user-dot" title="Firebase signed in" />
          </div>
        </aside>
        <main className="rs-dash-content" id="rs-dashboard-main">
          <Outlet />
        </main>
      </div>
      <Footer />
    </div>
  );
}
