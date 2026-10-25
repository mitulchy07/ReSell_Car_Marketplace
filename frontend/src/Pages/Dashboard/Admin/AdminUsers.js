import '../../../styles/resell-button-clarity-v4.css';
import React, { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../../../Context/AuthProvider/AuthProvider';
import { API } from '../../../services/inventory';
import '../../../styles/resell-unified-accounts.css';

function AccountDialog({ choice, onCancel, onConfirm, busy, error }) {
  const [typed, setTyped] = useState('');
  const cancelRef = useRef(null);
  useEffect(() => {
    setTyped('');
    if (choice) cancelRef.current?.focus();
  }, [choice]);
  useEffect(() => {
    if (!choice) return undefined;
    const listener = (event) => {
      if (event.key === 'Escape' && !busy) onCancel();
    };
    document.addEventListener('keydown', listener);
    return () => document.removeEventListener('keydown', listener);
  }, [choice, busy, onCancel]);
  if (!choice) return null;
  const isDelete = choice.kind === 'delete';
  const canSubmit =
    !busy &&
    (!isDelete ||
      (choice.account.email && typed.trim().toLowerCase() === choice.account.email.toLowerCase()));
  const wording =
    choice.kind === 'grant'
      ? 'Grant admin access'
      : choice.kind === 'revoke'
        ? 'Remove admin access'
        : choice.kind === 'suspend'
          ? 'Suspend account'
          : choice.kind === 'activate'
            ? 'Reactivate account'
            : 'Delete account permanently';
  return (
    <div
      className="rs-ua-overlay"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !busy) onCancel();
      }}
    >
      <section
        className="rs-ua-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="rs-ua-dialog-title"
        aria-describedby="rs-ua-dialog-description"
      >
        <span className="rs-ua-kicker">ADMIN CONFIRMATION</span>
        <h2 id="rs-ua-dialog-title">{wording}?</h2>
        <p id="rs-ua-dialog-description">
          {isDelete
            ? 'Permanent deletion is available only for accounts without listings, reservations or reports. Accounts with history should be suspended instead.'
            : choice.kind === 'grant'
              ? 'This account will gain access to every administrative action. Only grant access to people you trust.'
              : choice.kind === 'revoke'
                ? 'Admin access will be revoked on the next protected request.'
                : choice.kind === 'suspend'
                  ? 'This user will not be able to use protected marketplace actions.'
                  : 'This user will be able to use marketplace features again.'}
        </p>
        <div className="rs-ua-target">
          <strong>{choice.account.name}</strong>
          <span>{choice.account.email}</span>
        </div>
        {isDelete && (
          <label className="rs-ua-typed">
            Type <strong>{choice.account.email}</strong> to confirm
            <input
              autoComplete="off"
              spellCheck="false"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              aria-label="Confirm account email"
              placeholder="Enter exact email"
            />
          </label>
        )}
        {error && (
          <p role="alert" className="rs-ua-error">
            {error}
          </p>
        )}
        <div className="rs-ua-dialog-buttons">
          <button
            type="button"
            ref={cancelRef}
            className="rs-ua-button secondary"
            disabled={busy}
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            type="button"
            className={`rs-ua-button ${isDelete || choice.kind === 'suspend' ? 'danger' : 'primary'}`}
            disabled={!canSubmit}
            onClick={() => onConfirm(typed)}
          >
            {busy ? 'Working…' : wording}
          </button>
        </div>
      </section>
    </div>
  );
}

export default function AdminUsers({ embedded = false }) {
  const { user } = useContext(AuthContext);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [cursor, setCursor] = useState('');
  const [nextToken, setNextToken] = useState(null);
  const [history, setHistory] = useState([]);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [choice, setChoice] = useState(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState('');
  async function api(path, method = 'GET', body) {
    if (!user) throw Error('Sign in with an admin account.');
    const token = await user.getIdToken();
    const result = await fetch(`${API}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    const data = await result.json().catch(() => ({}));
    if (!result.ok) throw Error(data.error || `Request failed (HTTP ${result.status})`);
    return data;
  }
  useEffect(() => {
    let cancelled = false;
    if (!user) {
      setRows([]);
      setLoading(false);
      return undefined;
    }
    setLoading(true);
    setError('');
    (async () => {
      const params = new URLSearchParams({ limit: '40' });
      if (cursor) params.set('pageToken', cursor);
      const data = await api(`/admin/users/directory?${params}`);
      if (!cancelled) {
        setRows(data.users || []);
        setNextToken(data.nextPageToken || null);
      }
    })()
      .catch((err) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, cursor]);
  const matches = useMemo(
    () =>
      rows.filter((u) => {
        const needle = query.trim().toLowerCase();
        if (needle && !`${u.name} ${u.email} ${u.uid}`.toLowerCase().includes(needle)) return false;
        if (filter === 'admins') return u.isAdmin;
        if (filter === 'suspended') return u.suspended;
        if (filter === 'members') return !u.isAdmin;
        return true;
      }),
    [rows, query, filter],
  );
  function show(kind, account) {
    setChoice({ kind, account });
    setActionError('');
    setNotice('');
  }
  async function apply(typed) {
    if (!choice || busy) return;
    setBusy(true);
    setActionError('');
    const { kind, account } = choice;
    try {
      let update = {};
      if (kind === 'grant' || kind === 'revoke') {
        const r = await api(`/admin/users/${encodeURIComponent(account.uid)}/admin`, 'PATCH', {
          admin: kind === 'grant',
        });
        update = { isAdmin: r.isAdmin };
      } else if (kind === 'suspend' || kind === 'activate') {
        await api(`/admin/users/${encodeURIComponent(account.uid)}`, 'PATCH', {
          suspended: kind === 'suspend',
        });
        update = { suspended: kind === 'suspend' };
      } else if (kind === 'delete') {
        await api(`/admin/users/${encodeURIComponent(account.uid)}`, 'DELETE', {
          confirmEmail: typed,
        });
        setRows((previous) => previous.filter((u) => u.uid !== account.uid));
      }
      if (kind !== 'delete')
        setRows((previous) =>
          previous.map((u) => (u.uid === account.uid ? { ...u, ...update } : u)),
        );
      setChoice(null);
      setNotice(
        `Account updated: ${account.email}. ${kind === 'grant' ? 'New admins may need to sign in again.' : ''}`,
      );
    } catch (err) {
      setActionError(err.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className={`rs-ua-page rs-shell${embedded ? ' rs-ua-embedded' : ''}`}>
      <div className="rs-ua-hero">
        <div>
          <span className="rs-ua-kicker">MARKETPLACE ADMINISTRATION</span>
          <h1>
            User management<span className="rs-title-dot">.</span>
          </h1>
          <p>Browse registered accounts, manage access and protect your marketplace.</p>
        </div>
        {!embedded && (
          <Link className="rs-ua-back" to="/admin">
            ← Admin console
          </Link>
        )}
      </div>
      <div className="rs-ua-info" role="note">
        Admin access is managed by Firebase Admin SDK, not by editable buyer/seller roles. Owner
        admins configured in Vercel are protected. Permanent deletion is blocked when an account has
        marketplace history.
      </div>
      <div className="rs-ua-toolbar">
        <label className="rs-ua-search">
          <span>Search current page</span>
          <input
            type="search"
            placeholder="Name, email or UID"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <label className="rs-ua-filter">
          <span>Account type</span>
          <select value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="all">All accounts</option>
            <option value="members">Members</option>
            <option value="admins">Admins</option>
            <option value="suspended">Suspended</option>
          </select>
        </label>
      </div>
      {notice && (
        <div className="rs-ua-success" role="status">
          {notice}
          <button aria-label="Dismiss" onClick={() => setNotice('')} type="button">
            ×
          </button>
        </div>
      )}
      {error && (
        <div className="rs-ua-error" role="alert">
          {error}
        </div>
      )}
      {loading ? (
        <div className="rs-ua-loading" aria-live="polite">
          Loading accounts…
        </div>
      ) : (
        <div className="rs-ua-table-wrap">
          <table className="rs-ua-table">
            <thead>
              <tr>
                <th>Account</th>
                <th>Registered</th>
                <th>Access</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {matches.map((account) => (
                <tr key={account.uid}>
                  <td data-label="Account">
                    <strong>{account.name}</strong>
                    <small>{account.email || 'No email'}</small>
                    <small className="rs-ua-uid">{account.uid}</small>
                  </td>
                  <td data-label="Registered">
                    {account.createdAt ? new Date(account.createdAt).toLocaleDateString() : '—'}
                  </td>
                  <td data-label="Access">
                    <span className={`rs-ua-tag ${account.isAdmin ? 'admin' : ''}`}>
                      {account.protectedAdmin
                        ? 'Owner admin'
                        : account.isAdmin
                          ? 'Admin'
                          : 'Member'}
                    </span>
                  </td>
                  <td data-label="Status">
                    <span className={`rs-ua-tag ${account.suspended ? 'suspended' : 'active'}`}>
                      {account.suspended ? 'Suspended' : 'Active'}
                    </span>
                  </td>
                  <td data-label="Actions">
                    <div className="rs-ua-actions rs-ui4-actions">
                      {account.uid === user?.uid ? (
                        <span className="rs-ua-muted">Your account</span>
                      ) : account.protectedAdmin ? (
                        <span className="rs-ua-muted">Protected owner</span>
                      ) : (
                        <>
                          {account.isAdmin ? (
                            <button
                              type="button"
                              className="rs-ui4-revoke"
                              onClick={() => show('revoke', account)}
                            >
                              Remove admin
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="rs-ui4-grant"
                              onClick={() => show('grant', account)}
                              disabled={account.suspended}
                            >
                              Make admin
                            </button>
                          )}
                          <button
                            type="button"
                            className={account.suspended ? 'rs-ui4-activate' : 'rs-ui4-suspend'}
                            onClick={() =>
                              show(account.suspended ? 'activate' : 'suspend', account)
                            }
                          >
                            {account.suspended ? 'Reactivate' : 'Suspend'}
                          </button>
                          <button
                            type="button"
                            className="rs-ua-delete rs-ui4-delete"
                            onClick={() => show('delete', account)}
                          >
                            Delete
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {matches.length === 0 && (
            <p className="rs-ua-empty">No accounts match your search or filter on this page.</p>
          )}
        </div>
      )}
      <div className="rs-ua-pagination">
        <button
          type="button"
          disabled={loading || !history.length}
          onClick={() => {
            setCursor(history[history.length - 1]);
            setHistory((h) => h.slice(0, -1));
            setQuery('');
          }}
        >
          ← Previous
        </button>
        <span>
          Page {history.length + 1} · {rows.length} account(s)
        </span>
        <button
          type="button"
          disabled={loading || !nextToken}
          onClick={() => {
            setHistory((h) => [...h, cursor]);
            setCursor(nextToken);
            setQuery('');
          }}
        >
          Next →
        </button>
      </div>
      <p className="rs-ua-footnote">
        Search and filtering apply to the current page. Use Next/Previous to browse more registered
        Firebase accounts.
      </p>
      <AccountDialog
        choice={choice}
        busy={busy}
        error={actionError}
        onCancel={() => {
          if (!busy) setChoice(null);
        }}
        onConfirm={apply}
      />
    </section>
  );
}
