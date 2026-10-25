import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import BookingButton from './BookingButton';
import { currency, mileage, prettyName } from '../../services/inventory';

export default function MarketplaceCard({ car, priority = false }) {
  const [broken, setBroken] = useState(false);
  const link = `/cars/${encodeURIComponent(String(car._id))}`;
  return (
    <article className="rs-mkt-card rs-mkt-card-v2">
      <Link className="rs-mkt-card-photo" to={link} aria-label={`View ${car.model} details`}>
        <img
          src={broken || !car.image ? '/resell-car-placeholder.svg' : car.image}
          alt={`${prettyName(car.category)} ${car.model || 'used car'}`}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          onError={() => setBroken(true)}
        />
        <span className="rs-mkt-photo-tag">
          {car.booked || car.sold ? 'Reserved' : 'Available'}
        </span>
        {car.advertise === true && <span className="rs-mkt-featured-tag">✦ Featured</span>}
      </Link>
      <div className="rs-mkt-card-body">
        <div className="rs-mkt-card-brand">
          {prettyName(car.category)} · {car.location || 'Location on request'}
        </div>
        <div className="rs-mkt-card-heading">
          <Link to={link}>
            <h3>{car.model || 'Vehicle listing'}</h3>
          </Link>
          <strong>{currency(car.price)}</strong>
        </div>
        <div className="rs-mkt-quick-specs">
          <span>◷ {mileage(car.mileage)}</span>
          <span>⚙ {car.transmission || 'Transmission unknown'}</span>
          <span>◈ {car.fuel || 'Fuel unknown'}</span>
          <span>▣ {car.year || 'Year unknown'}</span>
        </div>
        <div className="rs-mkt-card-footer rs-mkt-actions-v2">
          <Link className="rs-mkt-more" to={link}>
            View details ↗
          </Link>
          <BookingButton car={car} />
        </div>
      </div>
    </article>
  );
}
