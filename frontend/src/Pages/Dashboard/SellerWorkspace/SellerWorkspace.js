import React, { useContext } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AuthContext } from '../../../Context/AuthProvider/AuthProvider';
import '../../../styles/resell-sell-car.css';

const API = (
  process.env.REACT_APP_API_URL || 'https://resell-firestore-preview.vercel.app'
).replace(/\/$/, '');
export default function SellerWorkspace() {
  const { user } = useContext(AuthContext);
  const listings = useQuery({
    queryKey: ['seller-listings', user?.uid],
    enabled: Boolean(user?.uid && user?.email),
    retry: false,
    queryFn: async () => {
      const token = await user.getIdToken();
      const res = await fetch(`${API}/myitems/${encodeURIComponent(user.email)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok)
        throw new Error('Seller API is not ready. Deploy the backend update to use listings.');
      const value = await res.json();
      if (!Array.isArray(value)) throw new Error('Unexpected seller API result.');
      return value;
    },
  });
  const cars = listings.data || [];
  const featured = cars.filter((c) => c.advertise).length;
  const reserved = cars.filter((c) => c.booked).length;
  const accountPath = `/myitems/${encodeURIComponent(user?.email || '')}`;
  return (
    <div className="rs-sell-page rs-seller-overview">
      <div className="rs-sell-head">
        <div>
          <span className="rs-sell-eyebrow">YOUR GARAGE</span>
          <h1>
            Ready to <em>sell?</em>
          </h1>
          <p>Publish cars, showcase your favourites and manage what buyers see.</p>
        </div>
        <Link to="/additem" className="rs-sell-button rs-sell-primary">
          + Create listing
        </Link>
      </div>
      <div className="rs-seller-hero">
        <div>
          <span>SELL WITH CONFIDENCE</span>
          <h2>Your next buyer starts with a great listing.</h2>
          <p>Share the vehicle story, set your price and keep your garage organised.</p>
          <Link to="/additem">Post a car now →</Link>
        </div>
        <img src="/resell-dashboard-car.svg" alt="" />
      </div>
      {listings.isError && (
        <div className="rs-sell-alert" role="alert">
          {listings.error.message}{' '}
          <button type="button" onClick={() => listings.refetch()}>
            Retry
          </button>
        </div>
      )}
      <div className="rs-sell-stats">
        <div>
          <span>Total listings</span>
          <strong>{listings.isLoading ? '—' : listings.isError ? '!' : cars.length}</strong>
        </div>
        <div>
          <span>Featured</span>
          <strong>{listings.isLoading ? '—' : listings.isError ? '!' : featured}</strong>
        </div>
        <div>
          <span>Reserved</span>
          <strong>{listings.isLoading ? '—' : listings.isError ? '!' : reserved}</strong>
        </div>
      </div>
      <div className="rs-seller-shortcuts">
        <Link to="/additem">
          <strong>＋</strong>
          <span>
            <b>Create new listing</b>
            <small>Publish a vehicle with photos and details.</small>
          </span>
          →
        </Link>
        <Link to={accountPath}>
          <strong>▤</strong>
          <span>
            <b>Manage your listings</b>
            <small>Feature, review or remove available cars.</small>
          </span>
          →
        </Link>
      </div>
      <p className="rs-sell-bottom-note">
        Buyer and seller profiles share Firebase login in this demo. The backend verifies account
        ownership before listing changes.
      </p>
    </div>
  );
}
