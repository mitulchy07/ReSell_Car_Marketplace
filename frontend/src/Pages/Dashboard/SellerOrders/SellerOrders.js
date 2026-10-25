import React, { useContext, useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../../../Context/AuthProvider/AuthProvider';
import { API, invalidateInventory, currency } from '../../../services/inventory';
import ConfirmDialog from '../../../components/UI/ConfirmDialog';

export default function SellerOrders() {
  const { user } = useContext(AuthContext);
  const [rows, setRows] = useState([]),
    [busy, setBusy] = useState(false),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(''),
    [choice, setChoice] = useState(null);
  const fetchRows = useCallback(async () => {
    if (!user) return;
    setError('');
    try {
      const token = await user.getIdToken();
      const r = await fetch(`${API}/seller/orders`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw Error(d.error || `HTTP ${r.status}`);
      setRows(Array.isArray(d) ? d : []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [user]);
  useEffect(() => {
    if (user) fetchRows();
    else setLoading(false);
  }, [user, fetchRows]);
  async function action() {
    if (!choice || busy) return;
    setBusy(true);
    setError('');
    try {
      const token = await user.getIdToken();
      const r = await fetch(`${API}/seller/orders/${encodeURIComponent(choice.row._id)}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: choice.action }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw Error(d.error || `HTTP ${r.status}`);
      setRows((old) =>
        old.map((row) => (row._id === choice.row._id ? { ...row, status: d.status } : row)),
      );
      invalidateInventory();
      setChoice(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="rs-shell rs-op-page">
      <div className="rs-op-head">
        <span className="rs-section-kicker">SELLER WORKSPACE</span>
        <h1>
          Reservations<span className="rs-title-dot">.</span>
        </h1>
        <p>Respond to buyers and manage the reservation lifecycle.</p>
        <Link to={user?.email ? `/myitems/${encodeURIComponent(user.email)}` : '/dashboard'}>
          ← My garage
        </Link>
      </div>
      {error && (
        <p role="alert" className="rs-op-error">
          {error}
        </p>
      )}
      {loading ? (
        <div className="rs-mkt-skeleton" />
      ) : rows.length === 0 ? (
        <div className="rs-op-empty">No incoming reservations yet.</div>
      ) : (
        <div className="rs-op-stack">
          {rows.map((row) => (
            <article className="rs-op-order" key={row._id}>
              <img src={row.image || '/resell-car-placeholder.svg'} loading="lazy" alt="" />
              <div>
                <h2>{row.model}</h2>
                <p>
                  {currency(row.price)} · {row.buyeremail || 'Buyer'} ·{' '}
                  {row.bookedAt ? new Date(row.bookedAt).toLocaleDateString('en-GB') : ''}
                </p>
                <span className="rs-op-status">
                  {row.status === 'booked' ? 'pending' : row.status}
                </span>
              </div>
              <div className="rs-op-order-tail">
                {['booked', 'pending'].includes(row.status) && (
                  <button
                    className="rs-op-primary"
                    type="button"
                    onClick={() => setChoice({ row, action: 'confirm' })}
                  >
                    Confirm
                  </button>
                )}
                {['booked', 'pending', 'confirmed'].includes(row.status) && (
                  <button
                    type="button"
                    className="rs-op-secondary"
                    onClick={() => setChoice({ row, action: 'decline' })}
                  >
                    Decline
                  </button>
                )}
                {['booked', 'confirmed'].includes(row.status) && (
                  <button
                    type="button"
                    className="rs-op-primary"
                    onClick={() => setChoice({ row, action: 'complete' })}
                  >
                    Mark sold
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
      <ConfirmDialog
        open={!!choice}
        title={`${choice?.action === 'complete' ? 'Mark sold' : choice?.action === 'decline' ? 'Decline reservation' : 'Confirm reservation'}?`}
        description="This will update the reservation and vehicle availability for the buyer. No payment is processed."
        subject={choice?.row?.model}
        confirmLabel="Confirm action"
        tone={choice?.action === 'decline' ? 'danger' : 'normal'}
        busy={busy}
        onCancel={() => {
          if (!busy) setChoice(null);
        }}
        onConfirm={action}
      />
    </main>
  );
}
