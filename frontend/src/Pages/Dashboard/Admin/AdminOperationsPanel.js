import React, { useContext, useCallback, useEffect, useState } from 'react';
import { AuthContext } from '../../../Context/AuthProvider/AuthProvider';
import { API, invalidateInventory } from '../../../services/inventory';
import ConfirmDialog from '../../../components/UI/ConfirmDialog';
import { Link } from 'react-router-dom';
import { loadInventory } from '../../../services/inventory';

export default function AdminOperationsPanel() {
  const { user } = useContext(AuthContext),
    [tab, setTab] = useState('review'),
    [rows, setRows] = useState([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [choice, setChoice] = useState(null);
  const [listingNames, setListingNames] = useState({});
  const call = useCallback(
    async (path, method = 'GET', body) => {
      const token = await user.getIdToken();
      const r = await fetch(`${API}${path}`, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          ...(body ? { 'Content-Type': 'application/json' } : {}),
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw Error(data.error || `HTTP ${r.status}`);
      return data;
    },
    [user],
  );
  const load = useCallback(
    async (key) => {
      if (!user) return;
      setLoading(true);
      setError('');
      try {
        const result = await call(
          key === 'review'
            ? '/admin/overview'
            : key === 'users'
              ? '/admin/users'
              : key === 'reports'
                ? '/admin/reports'
                : '/admin/audit',
        );
        setRows(
          key === 'review'
            ? result.listings.filter(
                (c) => c.approvalStatus === 'pending' || c.approvalStatus === 'rejected',
              )
            : key === 'users'
              ? result.users
              : key === 'reports'
                ? result.reports
                : result.events,
        );
      } catch (e) {
        setError(e.message);
        setRows([]);
      } finally {
        setLoading(false);
      }
    },
    [user, call],
  );
  useEffect(() => {
    if (user) load(tab);
    else setLoading(false);
  }, [tab, user, load]);
  useEffect(() => {
    if (tab !== 'reports' || !rows.length) return undefined;
    let active = true;
    loadInventory()
      .then(({ cars }) => {
        if (active) {
          setListingNames(Object.fromEntries(cars.map((car) => [String(car._id), car])));
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [tab, rows]);
  async function confirm() {
    if (!choice || busy) return;
    setBusy(true);
    setError('');
    try {
      if (choice.type === 'review')
        await call(`/admin/listings/${encodeURIComponent(choice.id)}/review`, 'PATCH', {
          status: choice.action,
          ...(choice.action === 'rejected'
            ? { reason: choice.reason || 'Listing requires additional verification' }
            : {}),
        });
      else if (choice.type === 'user')
        await call(`/admin/users/${encodeURIComponent(choice.id)}`, 'PATCH', {
          [choice.field]: choice.value,
        });
      else if (choice.type === 'report')
        await call(`/admin/reports/${encodeURIComponent(choice.id)}`, 'PATCH', {
          status: choice.action,
        });
      invalidateInventory();
      setChoice(null);
      setRows((old) =>
        old
          .filter((row) => !(choice.type === 'review' && row._id === choice.id))
          .map((row) => {
            if (choice.type === 'user' && row.uid === choice.id)
              return { ...row, [choice.field]: choice.value };
            if (choice.type === 'report' && row._id === choice.id)
              return { ...row, status: choice.action };
            return row;
          }),
      );
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="rs-op-admin-extra">
      <div className="rs-op-head">
        <span className="rs-section-kicker">ADMIN OPERATIONS</span>
        <h2>Reviews, users & activity</h2>
        <p>Moderation and user changes are authenticated and recorded in the audit log.</p>
      </div>
      <div className="rs-op-tabs" role="tablist" aria-label="Admin operations">
        {[
          ['review', 'Approval queue'],
          ['reports', 'Reports'],
          ['audit', 'Audit trail'],
        ].map(([id, label]) => (
          <button
            role="tab"
            aria-selected={tab === id}
            key={id}
            type="button"
            className={tab === id ? 'active' : ''}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </div>
      {error && (
        <p className="rs-op-error" role="alert">
          {error}
        </p>
      )}
      {loading ? (
        <div className="rs-mkt-skeleton" />
      ) : rows.length === 0 ? (
        <div className="rs-op-empty">No items in this section.</div>
      ) : (
        <div className="rs-op-admin-table-wrap">
          <table className="rs-op-admin-table">
            <thead>
              <tr>
                {(tab === 'review'
                  ? ['Vehicle', 'Approval', 'Actions']
                  : tab === 'users'
                    ? ['Account', 'Role', 'Status', 'Actions']
                    : tab === 'reports'
                      ? ['Listing', 'Reason', 'Status', 'Actions']
                      : ['Time', 'Action', 'Actor']
                ).map((col) => (
                  <th key={col}>{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((x) => (
                <tr key={x._id || x.uid}>
                  {tab === 'review' ? (
                    <>
                      <td>{x.model || x._id}</td>
                      <td>{x.approvalStatus}</td>
                      <td>
                        <button
                          onClick={() =>
                            setChoice({
                              type: 'review',
                              id: x._id,
                              action: 'approved',
                              name: x.model,
                            })
                          }
                        >
                          Approve
                        </button>{' '}
                        <button
                          onClick={() =>
                            setChoice({
                              type: 'review',
                              id: x._id,
                              action: 'rejected',
                              name: x.model,
                              reason: 'Listing information or photos require review',
                            })
                          }
                        >
                          Reject
                        </button>
                      </td>
                    </>
                  ) : tab === 'users' ? (
                    <>
                      <td>
                        <strong>{x.name || 'User'}</strong>
                        <small>{x.email}</small>
                      </td>
                      <td>{x.role}</td>
                      <td>{x.suspended ? 'Suspended' : 'Active'}</td>
                      <td>
                        <button
                          onClick={() =>
                            setChoice({
                              type: 'user',
                              id: x.uid,
                              field: 'role',
                              value: x.role === 'seller' ? 'buyer' : 'seller',
                              name: x.email,
                            })
                          }
                        >
                          {x.role === 'seller' ? 'Set buyer' : 'Set seller'}
                        </button>{' '}
                        <button
                          onClick={() =>
                            setChoice({
                              type: 'user',
                              id: x.uid,
                              field: 'suspended',
                              value: !x.suspended,
                              name: x.email,
                            })
                          }
                        >
                          {x.suspended ? 'Reactivate' : 'Suspend'}
                        </button>
                      </td>
                    </>
                  ) : tab === 'reports' ? (
                    <>
                      <td>
                        {listingNames[x.carId] ? (
                          <>
                            <Link to={`/cars/${encodeURIComponent(x.carId)}`}>
                              {listingNames[x.carId].model}
                            </Link>
                            <small>
                              {listingNames[x.carId].location} · {x.carId}
                            </small>
                          </>
                        ) : (
                          <>
                            <Link to={`/cars/${encodeURIComponent(x.carId)}`}>{x.carId}</Link>
                            <small>Vehicle details</small>
                          </>
                        )}
                      </td>
                      <td>{x.reason}</td>
                      <td>{x.status}</td>
                      <td>
                        {x.status === 'open' ? (
                          <>
                            <button
                              onClick={() =>
                                setChoice({
                                  type: 'report',
                                  id: x._id,
                                  action: 'resolved',
                                  name: x.carId,
                                })
                              }
                            >
                              Resolve
                            </button>{' '}
                            <button
                              onClick={() =>
                                setChoice({
                                  type: 'report',
                                  id: x._id,
                                  action: 'dismissed',
                                  name: x.carId,
                                })
                              }
                            >
                              Dismiss
                            </button>
                          </>
                        ) : (
                          'Reviewed'
                        )}
                      </td>
                    </>
                  ) : (
                    <>
                      <td>{x.occurredAt ? new Date(x.occurredAt).toLocaleString('en-GB') : '—'}</td>
                      <td>{x.kind || x.type || x.action || 'Update'}</td>
                      <td>{x.actorUid || 'System'}</td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <ConfirmDialog
        open={!!choice}
        title="Confirm admin action?"
        description="This action will be checked by the server and added to the audit trail."
        subject={choice?.name}
        confirmLabel="Confirm action"
        tone={choice?.action === 'rejected' || choice?.value === true ? 'danger' : 'normal'}
        busy={busy}
        error={error}
        onCancel={() => {
          if (!busy) setChoice(null);
        }}
        onConfirm={confirm}
      />
    </section>
  );
}
