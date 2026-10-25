import React, { useContext, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../Context/AuthProvider/AuthProvider';
import { API, invalidateInventory } from '../../services/inventory';
import ConfirmDialog from '../UI/ConfirmDialog';

export default function BookingButton({ car, className = '', onBooked }) {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [choice, setChoice] = useState(false);
  const [busy, setBusy] = useState(false);
  const [reserved, setReserved] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const unavailable =
    !car || car.booked === true || car.sold === true || car.paused === true || reserved;
  function requestBooking() {
    if (!car?._id || busy || unavailable) return;
    if (!user) {
      navigate('/login', { state: { from: { pathname: `/cars/${encodeURIComponent(car._id)}` } } });
      return;
    }
    setError('');
    setChoice(true);
  }
  async function book() {
    if (busy || unavailable || !choice) return;
    setBusy(true);
    setError('');
    try {
      const token = await user.getIdToken();
      const response = await fetch(`${API}/bookings/${encodeURIComponent(car._id)}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: '{}',
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || `Booking failed (HTTP ${response.status})`);
      invalidateInventory();
      setReserved(true);
      setSuccess(true);
      setChoice(false);
      if (onBooked) onBooked(data);
    } catch (e) {
      setError(e.message || 'Could not reserve this vehicle');
      setChoice(false);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className={`rs-booking-control rs-op-booking ${className}`}>
      <button
        type="button"
        className="rs-mkt-book rs-mkt-book-action"
        onClick={requestBooking}
        disabled={busy || unavailable}
      >
        {busy ? 'Booking…' : unavailable ? 'Reserved / unavailable' : 'Book this car'}{' '}
        <span aria-hidden="true">→</span>
      </button>
      {error && (
        <p className="rs-booking-error" role="alert">
          {error}
        </p>
      )}
      {success && (
        <p role="status" className="rs-booking-success">
          Reservation requested.{' '}
          <button type="button" onClick={() => navigate('/myorders')}>
            View status →
          </button>
        </p>
      )}
      <ConfirmDialog
        open={choice}
        title="Request a reservation?"
        description="Your reservation request will be sent to the seller. No payment is taken. A vehicle can have only one active reservation."
        subject={car?.model}
        confirmLabel="Request reservation"
        busy={busy}
        error=""
        onCancel={() => {
          if (!busy) setChoice(false);
        }}
        onConfirm={book}
      />
    </div>
  );
}
