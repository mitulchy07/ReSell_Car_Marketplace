import React, { useContext, useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../../../Context/AuthProvider/AuthProvider';
import { API, currency, invalidateInventory, mileage } from '../../../services/inventory';
import ConfirmDialog from '../../../components/UI/ConfirmDialog';

const editable = [
  'model',
  'price',
  'location',
  'description',
  'image',
  'mileage',
  'transmission',
  'year',
  'fuel',
  'condition',
  'phone',
];
export default function MyItems() {
  const { user } = useContext(AuthContext);
  const [cars, setCars] = useState([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(''),
    [saving, setSaving] = useState(false),
    [edit, setEdit] = useState(null),
    [choice, setChoice] = useState(null);
  const request = useCallback(
    async (path, method = 'GET', body) => {
      const token = await user.getIdToken();
      const res = await fetch(`${API}${path}`, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          ...(body ? { 'Content-Type': 'application/json' } : {}),
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw Error(data.error || `Request failed (${res.status})`);
      return data;
    },
    [user],
  );
  const refresh = useCallback(async () => {
    if (!user?.email) return;
    setError('');
    try {
      const data = await request(`/myitems/${encodeURIComponent(user.email)}`);
      setCars(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [user, request]);
  useEffect(() => {
    if (user?.email) refresh();
    else setLoading(false);
  }, [user, refresh]);
  async function save(e) {
    e.preventDefault();
    if (!edit || saving) return;
    setSaving(true);
    setError('');
    try {
      const original = cars.find((x) => x._id === edit._id);
      if (!original) throw Error('Listing no longer exists');
      const changes = {};
      for (const key of editable) {
        if (String(edit[key] ?? '') !== String(original[key] ?? '')) {
          changes[key] = ['price', 'mileage'].includes(key) ? Number(edit[key]) : edit[key];
        }
      }
      if (!Object.keys(changes).length) {
        setEdit(null);
        return;
      }
      const result = await request(`/myitems/${encodeURIComponent(edit._id)}`, 'PATCH', changes);
      setCars((old) => old.map((x) => (x._id === edit._id ? { ...x, ...result.updates } : x)));
      invalidateInventory();
      setEdit(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }
  async function applyAction() {
    if (!choice || saving) return;
    setSaving(true);
    setError('');
    try {
      if (choice.kind === 'delete') {
        await request(`/myitems/${encodeURIComponent(choice.car._id)}`, 'DELETE');
        setCars((old) => old.filter((x) => x._id !== choice.car._id));
      } else {
        await request(`/myitems/${encodeURIComponent(choice.car._id)}/availability`, 'PATCH', {
          paused: choice.kind === 'pause',
        });
        setCars((old) =>
          old.map((x) =>
            x._id === choice.car._id ? { ...x, paused: choice.kind === 'pause' } : x,
          ),
        );
      }
      invalidateInventory();
      setChoice(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }
  return (
    <main className="rs-shell rs-op-page">
      <div className="rs-op-head">
        <span className="rs-section-kicker">SELLER WORKSPACE</span>
        <h1>
          My garage<span className="rs-title-dot">.</span>
        </h1>
        <p>Edit your cars, manage visibility and respond to buyer requests.</p>
        <div className="rs-op-quicknav">
          <Link className="rs-op-primary" to="/additem">
            + Add a car
          </Link>
          <Link className="rs-op-secondary" to="/seller/orders">
            Manage reservations →
          </Link>
        </div>
      </div>
      {error && (
        <p role="alert" className="rs-op-error">
          {error}{' '}
          <button type="button" onClick={refresh}>
            Retry
          </button>
        </p>
      )}
      {loading ? (
        <div className="rs-mkt-skeleton" />
      ) : cars.length === 0 ? (
        <div className="rs-op-empty">
          <h2>Your garage is empty</h2>
          <Link to="/additem" className="rs-op-primary">
            Create first listing
          </Link>
        </div>
      ) : (
        <div className="rs-op-stack">
          {cars.map((car) => (
            <article className="rs-op-order" key={car._id}>
              <img src={car.image || '/resell-car-placeholder.svg'} alt="" loading="lazy" />
              <div>
                <small>
                  {car.location} · {mileage(car.mileage)}
                </small>
                <h2>{car.model}</h2>
                <p>
                  {currency(car.price)} ·{' '}
                  {car.sold
                    ? 'Sold'
                    : car.booked
                      ? 'Reserved'
                      : car.paused
                        ? 'Paused'
                        : car.hidden
                          ? 'Hidden'
                          : car.approvalStatus === 'pending'
                            ? 'Pending approval'
                            : car.approvalStatus === 'rejected'
                              ? 'Changes required'
                              : 'Published'}
                </p>
                {car.rejectionReason && (
                  <p className="rs-op-error">Review note: {car.rejectionReason}</p>
                )}
              </div>
              <div className="rs-op-order-tail">
                <button
                  className="rs-op-primary rs-op-edit-button"
                  type="button"
                  disabled={car.booked || car.sold}
                  onClick={() => setEdit({ ...car })}
                >
                  Edit listing
                </button>
                <button
                  type="button"
                  className="rs-op-secondary"
                  disabled={car.sold || car.booked}
                  onClick={() => setChoice({ kind: car.paused ? 'resume' : 'pause', car })}
                >
                  {car.paused ? 'Resume' : 'Pause'}
                </button>
                <button
                  type="button"
                  className="rs-op-danger"
                  disabled={car.booked || car.sold}
                  onClick={() => setChoice({ kind: 'delete', car })}
                >
                  Delete
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
      {edit && (
        <div
          className="rs-op-overlay"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !saving) setEdit(null);
          }}
        >
          <section
            className="rs-op-editor"
            role="dialog"
            aria-modal="true"
            aria-label="Edit vehicle"
          >
            <h2>Edit {edit.model}</h2>
            <p>Updating a published vehicle sends it for admin review again.</p>
            <form onSubmit={save} className="rs-op-edit-grid">
              {editable.map((field) => (
                <label key={field}>
                  <span>{field.charAt(0).toUpperCase() + field.slice(1)}</span>
                  {field === 'description' ? (
                    <textarea
                      value={edit[field] || ''}
                      onChange={(e) => setEdit({ ...edit, [field]: e.target.value })}
                      minLength={20}
                      required
                    />
                  ) : field === 'condition' || field === 'transmission' || field === 'fuel' ? (
                    <select
                      value={edit[field] || ''}
                      onChange={(e) => setEdit({ ...edit, [field]: e.target.value })}
                    >
                      {(field === 'condition'
                        ? ['Excellent', 'Good', 'Fair']
                        : field === 'transmission'
                          ? ['Manual', 'Automatic']
                          : ['Petrol', 'Diesel', 'Hybrid', 'Electric', 'Plug-in Hybrid']
                      ).map((v) => (
                        <option key={v} value={v}>
                          {v}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      value={edit[field] ?? ''}
                      required
                      type={['price', 'mileage'].includes(field) ? 'number' : 'text'}
                      min={['price', 'mileage'].includes(field) ? '0' : undefined}
                      onChange={(e) => setEdit({ ...edit, [field]: e.target.value })}
                    />
                  )}
                </label>
              ))}
              <div className="rs-op-editor-buttons">
                <button
                  type="button"
                  className="rs-op-secondary"
                  disabled={saving}
                  onClick={() => setEdit(null)}
                >
                  Cancel
                </button>
                <button type="submit" className="rs-op-primary" disabled={saving}>
                  {saving ? 'Saving…' : 'Save changes'}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
      <ConfirmDialog
        open={!!choice}
        title={
          choice?.kind === 'delete'
            ? 'Delete listing?'
            : choice?.kind === 'pause'
              ? 'Pause listing?'
              : 'Resume listing?'
        }
        description={
          choice?.kind === 'delete'
            ? 'This permanently deletes your vehicle listing. Reservations must be resolved first.'
            : 'Visibility changes immediately after confirmation.'
        }
        subject={choice?.car?.model}
        confirmLabel="Confirm"
        tone={choice?.kind === 'delete' ? 'danger' : 'normal'}
        busy={saving}
        onCancel={() => {
          if (!saving) setChoice(null);
        }}
        onConfirm={applyAction}
      />
    </main>
  );
}
