import SellerWorkspace from '../SellerWorkspace/SellerWorkspace';
import React, { useContext, useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import { AuthContext } from '../../../Context/AuthProvider/AuthProvider';
import useDashboardBookings, { DASHBOARD_API } from '../../../hooks/useDashboardBookings';
import '../../../styles/resell-dashboard.css';

const FAVORITES_KEY = 'resell-market-saved-cars-v1';
const shapes = {
  arrow: <path d="M5 12h14m-6-6 6 6-6 6" />,
  receipt: (
    <>
      <path d="M5 3h14v18l-3-2-4 2-4-2-3 2V3Z" />
      <path d="M9 8h6M9 12h6" />
    </>
  ),
  heart: (
    <path d="M20.8 4.6a5.4 5.4 0 0 0-7.7 0L12 5.7l-1.1-1.1a5.4 5.4 0 0 0-7.7 7.7L12 21l8.8-8.7a5.4 5.4 0 0 0 0-7.7Z" />
  ),
  car: (
    <>
      <path d="m5 15 2-6a3 3 0 0 1 3-2h4a3 3 0 0 1 3 2l2 6" />
      <path d="M4 15h16v4H4v-4ZM6 19v2m12-2v2M7 16h2m6 0h2" />
    </>
  ),
  pin: (
    <>
      <path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" />
      <circle cx="12" cy="10" r="2.6" />
    </>
  ),
  shield: (
    <>
      <path d="m12 2 8 4v6c0 5-3.5 8-8 10-4.5-1.5-8-5-8-10V6l8-4Z" />
      <path d="m9 12 2 2 4-4" />
    </>
  ),
  spark: <path d="m12 3 2.4 6.6L21 12l-6.6 2.4L12 21l-2.4-6.6L3 12l6.6-2.4L12 3Z" />,
  calendar: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M16 3v4M8 3v4M3 10h18" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
};
function Icon({ name, size = 20 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {shapes[name]}
    </svg>
  );
}
function savedCarsCount() {
  try {
    const value = JSON.parse(window.localStorage.getItem(FAVORITES_KEY) || '[]');
    return Array.isArray(value) ? value.length : 0;
  } catch (_) {
    return 0;
  }
}
function formatPrice(price) {
  const n = Number(String(price || '').replace(/,/g, ''));
  if (!Number.isFinite(n)) return price ? String(price) : 'Price on request';
  const code = process.env.REACT_APP_LISTING_CURRENCY || 'USD';
  try {
    return new Intl.NumberFormat(code === 'EUR' ? 'fr-FR' : 'en-US', {
      style: 'currency',
      currency: code,
      maximumFractionDigits: 0,
    }).format(n);
  } catch (_) {
    return String(price);
  }
}
function formattedDate(value) {
  if (!value) return '';
  const d = new Date(value);
  return Number.isNaN(d.getTime())
    ? ''
    : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}
function Illustration() {
  return (
    <img className="rs-dash-hero-car" src="/resell-dashboard-car.svg" alt="" aria-hidden="true" />
  );
}
function SellerPreview() {
  return <SellerWorkspace />;
}

export default function DashboardOverview() {
  const { user } = useContext(AuthContext);
  const [params] = useSearchParams();
  const [savedCount, setSavedCount] = useState(savedCarsCount);
  const bookings = useDashboardBookings(user);
  const brands = useQuery({
    queryKey: ['dashboard-brands'],
    staleTime: 60 * 1000,
    retry: false,
    queryFn: async () => {
      const response = await fetch(`${DASHBOARD_API}/categories`);
      if (!response.ok) throw new Error('Brand information unavailable');
      const data = await response.json();
      if (!Array.isArray(data)) throw new Error('Brand information unavailable');
      return data;
    },
  });
  const featured = useQuery({
    queryKey: ['dashboard-featured'],
    staleTime: 60 * 1000,
    retry: false,
    queryFn: async () => {
      const response = await fetch(`${DASHBOARD_API}/advertised`);
      if (!response.ok) throw new Error('Featured vehicles unavailable');
      const data = await response.json();
      if (!Array.isArray(data)) throw new Error('Featured vehicles unavailable');
      return data;
    },
  });
  useEffect(() => {
    const sync = () => setSavedCount(savedCarsCount());
    window.addEventListener('storage', sync);
    window.addEventListener('focus', sync);
    return () => {
      window.removeEventListener('storage', sync);
      window.removeEventListener('focus', sync);
    };
  }, []);

  if (params.get('tab') === 'seller') return <SellerPreview />;

  const firstName = (user?.displayName || user?.email?.split('@')[0] || 'there')
    .trim()
    .split(/\s+/)[0];
  const allOrders = bookings.data || [];
  const brandList = brands.data || [];
  const featuredList = featured.data || [];
  const dateLabel = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
  const statValue = (query, fn) =>
    query.isLoading ? '…' : query.error ? '—' : fn(query.data || []);
  const stats = [
    {
      label: 'Your reservations',
      value: statValue(bookings, (orders) => orders.length),
      icon: 'receipt',
      note: 'Confirmed booking requests',
    },
    { label: 'Saved vehicles', value: savedCount, icon: 'heart', note: 'Saved on this browser' },
    {
      label: 'Available brands',
      value: statValue(brands, (list) => list.length),
      icon: 'car',
      note: 'From the live marketplace',
    },
  ];
  const sorted = [...allOrders].sort((a, b) =>
    String(b.bookedAt || b.postdate || '').localeCompare(String(a.bookedAt || a.postdate || '')),
  );

  return (
    <div className="rs-dash-overview">
      <div className="rs-dash-topline">
        <span className="rs-dash-eyebrow">ACCOUNT OVERVIEW</span>
        <span className="rs-dash-today">
          <Icon name="calendar" size={15} /> {dateLabel}
        </span>
      </div>
      <div className="rs-dash-greeting">
        <h1>
          Good to see you, <em>{firstName}.</em>
        </h1>
        <p>Find your next drive, keep track of reservations and pick up where you left off.</p>
      </div>

      <div className="rs-dash-welcome">
        <div className="rs-dash-welcome-copy">
          <span className="rs-dash-welcome-label">
            <span /> YOUR NEXT DRIVE STARTS HERE
          </span>
          <h2>
            Find something <em>extraordinary.</em>
          </h2>
          <p>
            Explore handpicked listings from the ReSell marketplace. Save a favourite or reserve a
            car in just a few steps.
          </p>
          <Link to="/#brands" className="rs-dash-lime-action">
            Explore cars <Icon name="arrow" size={19} />
          </Link>
        </div>
        <Illustration />
        <div className="rs-dash-welcome-glow" aria-hidden="true" />
      </div>

      <div className="rs-dash-stat-grid">
        {stats.map((item) => (
          <div className="rs-dash-stat" key={item.label}>
            <span className="rs-dash-stat-icon">
              <Icon name={item.icon} />
            </span>
            <div className="rs-dash-stat-number">{item.value}</div>
            <h3>{item.label}</h3>
            <p>{item.note}</p>
          </div>
        ))}
      </div>

      <div className="rs-dash-two-col">
        <section className="rs-dash-panel" aria-labelledby="rs-dash-reservations-title">
          <div className="rs-dash-panel-heading">
            <div>
              <span className="rs-dash-eyebrow">YOUR ACTIVITY</span>
              <h2 id="rs-dash-reservations-title">Recent reservations</h2>
            </div>
            <Link to="/myorders" className="rs-dash-textlink">
              See all <Icon name="arrow" size={15} />
            </Link>
          </div>
          {bookings.isLoading ? (
            <div className="rs-dash-loading" role="status">
              Loading your reservations…
            </div>
          ) : bookings.error ? (
            <div className="rs-dash-state">
              <strong>Reservations unavailable</strong>
              <p>{bookings.error.message}</p>
              <button type="button" onClick={() => bookings.refetch()}>
                Try again
              </button>
            </div>
          ) : sorted.length ? (
            <div className="rs-dash-activity-list">
              {sorted.slice(0, 3).map((item, i) => (
                <div className="rs-dash-activity-row" key={item._id || `${item.carId}-${i}`}>
                  <div className="rs-dash-activity-picture">
                    <img
                      src={
                        item.image && !String(item.image).includes('logo192.png')
                          ? item.image
                          : '/resell-dashboard-car.svg'
                      }
                      alt=""
                      onError={(e) => {
                        if (!e.currentTarget.src.endsWith('/resell-dashboard-car.svg'))
                          e.currentTarget.src = '/resell-dashboard-car.svg';
                      }}
                    />
                  </div>
                  <div className="rs-dash-activity-main">
                    <strong>{item.model || 'Vehicle reservation'}</strong>
                    <span>
                      {formattedDate(item.bookedAt || item.postdate) || 'Booking recorded'}
                    </span>
                  </div>
                  <div className="rs-dash-activity-end">
                    <strong>{formatPrice(item.price)}</strong>
                    <span className="rs-dash-status">Reserved</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rs-dash-empty">
              <span className="rs-dash-empty-icon">
                <Icon name="receipt" size={24} />
              </span>
              <strong>No reservations yet</strong>
              <p>Found something you like? Reserve a vehicle and it will appear here.</p>
              <Link to="/#brands">
                Explore vehicles <Icon name="arrow" size={16} />
              </Link>
            </div>
          )}
        </section>

        <section
          className="rs-dash-panel rs-dash-explore-panel"
          aria-labelledby="rs-dash-discover-title"
        >
          <div className="rs-dash-panel-heading">
            <div>
              <span className="rs-dash-eyebrow">DISCOVER</span>
              <h2 id="rs-dash-discover-title">Explore by brand</h2>
            </div>
          </div>
          <p className="rs-dash-panel-text">Discover what's available across the marketplace.</p>
          {brands.isLoading ? (
            <div className="rs-dash-loading">Loading brands…</div>
          ) : brands.error ? (
            <p className="rs-dash-small-error">Brands are temporarily unavailable.</p>
          ) : brandList.length ? (
            <div className="rs-dash-brand-list">
              {brandList.slice(0, 5).map((brand, i) => {
                const name = brand.name || brand.category || brand._id;
                return (
                  <Link
                    to={`/category/${encodeURIComponent(name)}`}
                    key={brand._id || `${name}-${i}`}
                    className="rs-dash-brand-item"
                  >
                    <span className="rs-dash-brand-letter">
                      {String(name).slice(0, 1).toUpperCase()}
                    </span>
                    <strong>{String(name).charAt(0).toUpperCase() + String(name).slice(1)}</strong>
                    <Icon name="arrow" size={16} />
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="rs-dash-empty rs-dash-empty-small">
              <strong>No brands listed yet</strong>
              <p>Check back for new vehicles.</p>
            </div>
          )}
        </section>
      </div>

      <section className="rs-dash-featured-strip" aria-labelledby="rs-dash-featured-title">
        <div>
          <span className="rs-dash-eyebrow">MARKETPLACE PICKS</span>
          <h2 id="rs-dash-featured-title">Featured right now</h2>
          <p>
            {featured.error
              ? 'The featured feed is temporarily unavailable.'
              : featured.isLoading
                ? 'Checking the latest listings…'
                : featuredList.length
                  ? `${featuredList.length} vehicle${featuredList.length === 1 ? '' : 's'} currently featured.`
                  : 'No featured listings at the moment. You can still browse by brand.'}
          </p>
        </div>
        <Link to="/#brands" className="rs-dash-outline-action">
          Browse marketplace <Icon name="arrow" size={17} />
        </Link>
      </section>
      <div className="rs-dash-footnote">
        <Icon name="shield" size={16} />
        <span>
          Booking is a reservation request, not a payment. Your saved-car count is stored on this
          device only.
        </span>
      </div>
    </div>
  );
}
