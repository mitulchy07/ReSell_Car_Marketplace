import React, { useContext, useState } from 'react';
import { AuthContext } from '../../Context/AuthProvider/AuthProvider';
import { API } from '../../services/inventory';
export default function ReportListing({ carId }) {
  const { user } = useContext(AuthContext),
    [open, setOpen] = useState(false),
    [reason, setReason] = useState(''),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(''),
    [error, setError] = useState('');
  async function submit(e) {
    e.preventDefault();
    if (!user) return;
    setBusy(true);
    setError('');
    try {
      const token = await user.getIdToken();
      const r = await fetch(`${API}/reports/${encodeURIComponent(carId)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ reason }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw Error(d.error || `HTTP ${r.status}`);
      setOpen(false);
      setMessage('Thank you. An administrator will review your report.');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="rs-op-report">
      <button
        type="button"
        className="rs-op-report-link"
        onClick={() => {
          setOpen(!open);
          setError('');
        }}
      >
        Report incorrect or suspicious listing
      </button>
      {message && (
        <p role="status" className="rs-booking-success">
          {message}
        </p>
      )}
      {open && (
        <form onSubmit={submit} className="rs-op-report-form">
          <label htmlFor="rs-report-reason">Why should this listing be reviewed?</label>
          <textarea
            id="rs-report-reason"
            required
            minLength={10}
            maxLength={400}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Describe the problem with this listing"
          />
          {!user && <p>Sign in to submit a report.</p>}
          {error && (
            <p role="alert" className="rs-op-error">
              {error}
            </p>
          )}
          <div className="rs-op-quicknav">
            <button
              className="rs-op-primary"
              type="submit"
              disabled={!user || busy || reason.trim().length < 10}
            >
              {busy ? 'Submitting…' : 'Send report'}
            </button>
            <button className="rs-op-secondary" type="button" onClick={() => setOpen(false)}>
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
