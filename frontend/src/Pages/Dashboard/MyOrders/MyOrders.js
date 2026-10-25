import React, { useContext, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../../../Context/AuthProvider/AuthProvider';
import { API, invalidateInventory, currency } from '../../../services/inventory';
import ConfirmDialog from '../../../components/UI/ConfirmDialog';

export default function MyOrders() {
  const { user } = useContext(AuthContext);
  const [items, setItems] = useState([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(''),
    [choice, setChoice] = useState(null),
    [pending, setPending] = useState(false);
  async function load() {
    if (!user?.email) return;
    setError('');
    try {
      const token = await user.getIdToken();
      const r = await fetch(`${API}/myorders/${encodeURIComponent(user.email)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw Error(d.error || 'Cannot load bookings');
      setItems(Array.isArray(d) ? d : []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    let mounted = true;
    if (!user?.email) {
      setLoading(false);
      return undefined;
    }
    const run = async () => {
      try {
        const token = await user.getIdToken();
        const r = await fetch(`${API}/myorders/${encodeURIComponent(user.email)}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const d = await r.json().catch(() => ({}));
        if (!r.ok) throw Error(d.error || 'Cannot load bookings');
        if (mounted) setItems(Array.isArray(d) ? d : []);
      } catch (e) {
        if (mounted) setError(e.message);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    run();
    return () => {
      mounted = false;
    };
  }, [user]);
  async function cancel() {
    if (!choice || pending) return;
    setPending(true);
    setError('');
    try {
      const token = await user.getIdToken();
      const r = await fetch(`${API}/bookings/${encodeURIComponent(choice._id)}/cancel`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw Error(d.error || 'Cancellation failed');
      setItems((old) =>
        old.map((x) => (x._id === choice._id ? { ...x, status: 'cancelled', booked: false } : x)),
      );
      invalidateInventory();
      setChoice(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setPending(false);
    }
  }
  return (
    <main className="rs-shell rs-op-page">
      <div className="rs-op-head">
        <span className="rs-section-kicker">MY RESERVATIONS</span>
        <h1>
          Booking history<span className="rs-title-dot">.</span>
        </h1>
        <p>Track requests, confirm with the seller, or cancel an active reservation.</p>
      </div>
      {error && (
        <p role="alert" className="rs-op-error">
          {error}{' '}
          <button type="button" onClick={load}>
            Retry
          </button>
        </p>
      )}
      {loading ? (
        <div className="rs-mkt-skeleton" />
      ) : items.length === 0 ? (
        <div className="rs-op-empty">
          <h2>No reservations yet</h2>
          <Link to="/cars" className="rs-mkt-book">
            Explore cars →
          </Link>
        </div>
      ) : (
        <div className="rs-op-stack">
          {items.map((order) => (
            <article className="rs-op-order" key={order._id}>
              <img src={order.image || '/resell-car-placeholder.svg'} alt="" loading="lazy" />
              <div>
                <small>{order.location || 'Car reservation'}</small>
                <h2>{order.model || 'Vehicle'}</h2>
                <p>
                  {currency(order.price)} ·{' '}
                  {order.bookedAt ? new Date(order.bookedAt).toLocaleDateString('en-GB') : ''}
                </p>
                <Link to={`/cars/${encodeURIComponent(order.carId)}`}>View listing →</Link>
              </div>
              <div className="rs-op-order-tail">
                <span className="rs-op-status">
                  {order.status === 'booked' ? 'Pending' : order.status || 'Pending'}
                </span>
                {['booked', 'pending', 'confirmed'].includes(order.status) && (
                  <button
                    type="button"
                    className="rs-op-secondary"
                    onClick={() => setChoice(order)}
                  >
                    Cancel reservation
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
      <ConfirmDialog
        open={!!choice}
        title="Cancel this reservation?"
        description="The vehicle will become available to other buyers. This does not process a payment or refund."
        subject={choice?.model}
        tone="danger"
        confirmLabel="Cancel reservation"
        busy={pending}
        onCancel={() => {
          if (!pending) setChoice(null);
        }}
        onConfirm={cancel}
      />
    </main>
  );
}
