import '../../../styles/resell-button-clarity-v4.css';
import '../../../styles/resell-admin-users-tab.css';
import AdminUsers from './AdminUsers';
import AdminOperationsPanel from './AdminOperationsPanel';
import React, { useContext, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../../../Context/AuthProvider/AuthProvider';
import { API, currency, invalidateInventory, prettyName } from '../../../services/inventory';
import ConfirmDialog from '../../../components/UI/ConfirmDialog';

function contribution(car) {
  return {
    active: Number(!car.hidden && !car.sold && !car.booked),
    featured: Number(car.advertise === true && !car.hidden),
    hidden: Number(car.hidden === true),
    reserved: Number(car.booked === true && !car.sold),
    sold: Number(car.sold === true),
  };
}
function updateListingState(current, id, updates) {
  if (!current) return current;
  const previous = current.listings.find((car) => car._id === id);
  if (!previous) return current;
  const changed = { ...previous, ...updates };
  const before = contribution(previous);
  const after = contribution(changed);
  const stats = { ...current.stats };
  Object.keys(before).forEach((key) => {
    stats[key] = (stats[key] || 0) + after[key] - before[key];
  });
  return {
    ...current,
    stats,
    listings: current.listings.map((car) => (car._id === id ? changed : car)),
  };
}
function updateOrderState(current, order, action) {
  if (!current) return current;
  const updates =
    action === 'cancel' ? { booked: false } : { booked: true, sold: true, advertise: false };
  const withListing = updateListingState(current, order.carId, updates);
  const status = action === 'cancel' ? 'cancelled' : 'completed';
  return {
    ...withListing,
    reservations: withListing.reservations.map((item) =>
      item._id === order._id ? { ...item, status, booked: action === 'complete' } : item,
    ),
    // If the corresponding vehicle is outside the 250 recently-loaded rows, refresh can reconcile the totals.
  };
}

export default function AdminDashboard() {
  const { user } = useContext(AuthContext);
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [pending, setPending] = useState('');
  const [choice, setChoice] = useState(null);
  const [tab, setTab] = useState('listings');
  const [showUserDirectory, setShowUserDirectory] = useState(false);
  const [query, setQuery] = useState('');
  const [stateFilter, setStateFilter] = useState('all');

  async function authorizedRequest(path, method = 'GET', payload) {
    if (!user) throw new Error('Sign in to use the admin console.');
    const token = await user.getIdToken();
    const result = await fetch(`${API}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      ...(payload ? { body: JSON.stringify(payload) } : {}),
    });
    const data = await result.json().catch(() => ({}));
    if (!result.ok) {
      if (result.status === 403)
        throw new Error(
          'Admin access denied. Add your Firebase UID to the server ADMIN_UIDS setting.',
        );
      throw new Error(data.error || `Request failed (${result.status})`);
    }
    return data;
  }

  async function refresh() {
    if (refreshing || loading || pending) return;
    setRefreshing(true);
    setError('');
    try {
      setOverview(await authorizedRequest('/admin/overview'));
    } catch (err) {
      setError(err.message);
    } finally {
      setRefreshing(false);
    }
  }
  useEffect(() => {
    let cancelled = false;
    if (!user) {
      setLoading(false);
      setOverview(null);
      return undefined;
    }
    setLoading(true);
    setOverview(null);
    setError('');
    const tokenUser = user;
    tokenUser
      .getIdToken()
      .then((token) =>
        fetch(`${API}/admin/overview`, { headers: { Authorization: `Bearer ${token}` } }),
      )
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok)
          throw new Error(
            response.status === 403
              ? 'Admin access denied. Set your UID in ADMIN_UIDS.'
              : data.error || `HTTP ${response.status}`,
          );
        return data;
      })
      .then((data) => {
        if (!cancelled) setOverview(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  function askListing(car, field, value) {
    if (pending) return;
    const isHide = field === 'hidden';
    const action = isHide
      ? value
        ? 'Hide listing'
        : 'Restore listing'
      : value
        ? 'Feature listing'
        : 'Remove from featured';
    setError('');
    setChoice({
      kind: 'listing',
      id: car._id,
      car,
      field,
      value,
      title: action + '?',
      confirmLabel: action,
      description: isHide
        ? value
          ? 'This vehicle will disappear from public search and cannot be booked while hidden.'
          : 'This vehicle will become visible again in the public marketplace.'
        : value
          ? 'This vehicle will appear higher in Explore Cars and featured sections.'
          : 'This vehicle will stay public, but lose its featured position.',
      subject: car.model || car._id,
      tone: isHide && value ? 'danger' : 'normal',
    });
  }
  function askOrder(order, action) {
    if (pending) return;
    setError('');
    setChoice({
      kind: 'order',
      id: order._id,
      order,
      action,
      title: action === 'cancel' ? 'Cancel reservation?' : 'Mark vehicle as sold?',
      description:
        action === 'cancel'
          ? 'The reservation will be cancelled, and the vehicle will become available again. No refund is processed automatically.'
          : 'The vehicle will be marked sold and removed from available listings. No payment is collected by this action.',
      confirmLabel: action === 'cancel' ? 'Cancel booking' : 'Mark as sold',
      subject: order.model || order.carId,
      tone: action === 'cancel' ? 'danger' : 'normal',
    });
  }
  async function confirmAction() {
    if (!choice || pending) return;
    const selected = choice;
    setPending(selected.id);
    setError('');
    setMessage('');
    try {
      if (selected.kind === 'listing') {
        await authorizedRequest(`/admin/listings/${encodeURIComponent(selected.id)}`, 'PATCH', {
          [selected.field]: selected.value,
        });
        setOverview((current) =>
          updateListingState(current, selected.id, { [selected.field]: selected.value }),
        );
        setMessage(`${selected.car.model || 'Listing'} updated successfully.`);
      } else {
        await authorizedRequest(`/admin/orders/${encodeURIComponent(selected.id)}`, 'PATCH', {
          action: selected.action,
        });
        setOverview((current) => updateOrderState(current, selected.order, selected.action));
        setMessage(
          selected.action === 'cancel'
            ? 'Reservation cancelled; vehicle released.'
            : 'Vehicle marked sold.',
        );
      }
      invalidateInventory();
      setChoice(null); // Only update React state: no window.reload and no clearing the entire table.
    } catch (err) {
      setChoice((current) => (current ? { ...current, error: err.message } : null));
    } finally {
      setPending('');
    }
  }
  const listings = useMemo(
    () =>
      (overview?.listings || []).filter((car) => {
        if (
          query &&
          !`${car.model || ''} ${car.category || ''} ${car.location || ''} ${car._id}`
            .toLowerCase()
            .includes(query.toLowerCase())
        )
          return false;
        if (stateFilter === 'hidden') return car.hidden === true;
        if (stateFilter === 'featured') return car.advertise === true && car.hidden !== true;
        if (stateFilter === 'reserved') return car.booked === true && !car.sold;
        return true;
      }),
    [overview, query, stateFilter],
  );

  if (!user)
    return (
      <main className="rs-shell rs-v2-admin">
        <h1>Admin console</h1>
        <p>Please sign in with an authorized administrator account.</p>
        <Link className="rs-mkt-book" to="/login" state={{ from: { pathname: '/admin' } }}>
          Sign in
        </Link>
      </main>
    );
  return (
    <main className="rs-shell rs-v2-admin">
      <div className="rs-v2-admin-title">
        <div>
          <span className="rs-section-kicker">MARKETPLACE OPERATIONS</span>
          <h1>
            Admin console<span className="rs-title-dot">.</span>
          </h1>
          <p>Manage vehicles and reservations without leaving this page.</p>
        </div>
        <button
          type="button"
          className="rs-v2-admin-refresh"
          onClick={refresh}
          disabled={loading || refreshing || !!pending}
        >
          {refreshing ? 'Refreshing…' : '↻ Refresh data'}
        </button>
      </div>
      <div className="rs-admin-root-tabs" role="tablist" aria-label="Admin console sections">
        <button
          type="button"
          role="tab"
          aria-selected={!showUserDirectory}
          onClick={() => setShowUserDirectory(false)}
        >
          Listings & reservations
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={showUserDirectory}
          onClick={() => setShowUserDirectory(true)}
        >
          All users
        </button>
      </div>
      {showUserDirectory ? (
        <AdminUsers embedded />
      ) : (
        <>
          {error && (
            <div className="rs-v2-alert is-error" role="alert">
              {error}
            </div>
          )}
          {message && (
            <div className="rs-v2-alert is-success rs-ui-admin-flash" role="status">
              <span>✓ {message}</span>
              <button
                type="button"
                aria-label="Dismiss notification"
                onClick={() => setMessage('')}
              >
                ×
              </button>
            </div>
          )}
          {loading && !overview ? (
            <div className="rs-mkt-skeleton" aria-label="Loading admin overview" />
          ) : (
            overview && (
              <>
                <div className="rs-v2-admin-stats">
                  {[
                    ['Listings', overview.stats.listings],
                    ['Available', overview.stats.active],
                    ['Featured', overview.stats.featured],
                    ['Hidden', overview.stats.hidden],
                    ['Reserved', overview.stats.reserved],
                    ['Sold', overview.stats.sold],
                    ['Reservations', overview.stats.reservations],
                    ['Registered users', overview.stats.users],
                  ].map(([title, value]) => (
                    <div className="rs-v2-stat" key={title}>
                      <small>{title}</small>
                      <strong>{value}</strong>
                    </div>
                  ))}
                </div>
                <div className="rs-v2-admin-tabs">
                  <button
                    type="button"
                    className={tab === 'listings' ? 'active' : ''}
                    onClick={() => setTab('listings')}
                  >
                    Listings & moderation
                  </button>
                  <button
                    type="button"
                    className={tab === 'orders' ? 'active' : ''}
                    onClick={() => setTab('orders')}
                  >
                    Reservations
                  </button>
                </div>
                {tab === 'listings' ? (
                  <section className="rs-v2-admin-panel">
                    <div className="rs-v2-admin-tools">
                      <input
                        aria-label="Search listings"
                        placeholder="Search listing or city"
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                      />
                      <select
                        aria-label="Listing status filter"
                        value={stateFilter}
                        onChange={(event) => setStateFilter(event.target.value)}
                      >
                        <option value="all">All listings</option>
                        <option value="featured">Featured</option>
                        <option value="hidden">Hidden</option>
                        <option value="reserved">Reserved</option>
                      </select>
                    </div>
                    <div className="rs-v2-admin-table-wrap">
                      <table className="rs-v2-admin-table">
                        <thead>
                          <tr>
                            <th>Vehicle</th>
                            <th>Price</th>
                            <th>Status</th>
                            <th>Visibility</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {listings.map((car) => (
                            <tr key={car._id}>
                              <td>
                                <div className="rs-v2-table-car">
                                  <img
                                    src={car.image || '/resell-car-placeholder.svg'}
                                    alt=""
                                    loading="lazy"
                                    onError={(event) => {
                                      if (
                                        !event.currentTarget.src.endsWith(
                                          '/resell-car-placeholder.svg',
                                        )
                                      )
                                        event.currentTarget.src = '/resell-car-placeholder.svg';
                                    }}
                                  />
                                  <span>
                                    <strong>{car.model || 'Vehicle'}</strong>
                                    <small>
                                      {prettyName(car.category)} · {car.location || '—'}
                                    </small>
                                    <Link to={`/cars/${encodeURIComponent(car._id)}`}>
                                      View public page ↗
                                    </Link>
                                  </span>
                                </div>
                              </td>
                              <td>{currency(car.price)}</td>
                              <td>{car.sold ? 'Sold' : car.booked ? 'Reserved' : 'Available'}</td>
                              <td>
                                {car.hidden ? 'Hidden' : car.advertise ? 'Featured' : 'Visible'}
                              </td>
                              <td>
                                <div className="rs-v2-table-actions">
                                  <button
                                    className="rs-v2-feature-toggle"
                                    aria-pressed={car.advertise === true}
                                    type="button"
                                    disabled={
                                      !!pending ||
                                      !!car.booked ||
                                      !!car.sold ||
                                      !!car.hidden ||
                                      car.paused ||
                                      ['pending', 'rejected'].includes(car.approvalStatus)
                                    }
                                    onClick={() => askListing(car, 'advertise', !car.advertise)}
                                  >
                                    {car.advertise ? 'Unfeature' : 'Feature'}
                                  </button>
                                  <button
                                    type="button"
                                    className={car.hidden ? 'positive' : 'danger'}
                                    disabled={!!pending}
                                    onClick={() => askListing(car, 'hidden', !car.hidden)}
                                  >
                                    {car.hidden ? 'Restore' : 'Hide'}
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <p className="rs-v2-admin-note">
                      Showing up to {overview.limits.listings} recent listings. Visibility and
                      features update instantly after the server confirms.
                    </p>
                  </section>
                ) : (
                  <section className="rs-v2-admin-panel">
                    <div className="rs-v2-admin-table-wrap">
                      <table className="rs-v2-admin-table">
                        <thead>
                          <tr>
                            <th>Vehicle</th>
                            <th>Buyer</th>
                            <th>Booked</th>
                            <th>Status</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {overview.reservations.map((order) => (
                            <tr key={order._id}>
                              <td>
                                <strong>{order.model || order.carId}</strong>
                                <small>{order.carId}</small>
                              </td>
                              <td>{order.buyeremail || '—'}</td>
                              <td>
                                {order.bookedAt
                                  ? new Date(order.bookedAt).toLocaleDateString('en-GB')
                                  : '—'}
                              </td>
                              <td>{order.status || '—'}</td>
                              <td>
                                <div className="rs-v2-table-actions">
                                  {['booked', 'pending', 'confirmed'].includes(order.status) ? (
                                    <>
                                      <button
                                        type="button"
                                        className="positive"
                                        disabled={!!pending}
                                        onClick={() => askOrder(order, 'complete')}
                                      >
                                        Mark sold
                                      </button>
                                      <button
                                        type="button"
                                        className="danger"
                                        disabled={!!pending}
                                        onClick={() => askOrder(order, 'cancel')}
                                      >
                                        Cancel booking
                                      </button>
                                    </>
                                  ) : (
                                    '—'
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <p className="rs-v2-admin-note">
                      Showing up to {overview.limits.reservations} recent reservations. No payment
                      or refund is performed by these actions.
                    </p>
                  </section>
                )}
              </>
            )
          )}
          <AdminOperationsPanel />
        </>
      )}
      <ConfirmDialog
        open={Boolean(choice)}
        title={choice?.title}
        description={choice?.description}
        subject={choice?.subject}
        confirmLabel={choice?.confirmLabel}
        tone={choice?.tone}
        busy={!!pending}
        error={choice?.error || ''}
        onCancel={() => {
          if (!pending) setChoice(null);
        }}
        onConfirm={confirmAction}
      />
    </main>
  );
}
