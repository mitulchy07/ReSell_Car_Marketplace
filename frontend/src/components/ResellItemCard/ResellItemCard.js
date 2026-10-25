import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import '../../styles/resell-item-cards.css';
import ResellVehicleSpecs from '../ResellVehicleSpecs/ResellVehicleSpecs';

const FAVORITES_KEY = 'resell-market-saved-cars-v1';

const Icons = {
  pin: (
    <>
      <path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" />
      <circle cx="12" cy="10" r="2.7" />
    </>
  ),
  heart: (
    <path d="M20.8 4.6a5.4 5.4 0 0 0-7.7 0L12 5.7l-1.1-1.1a5.4 5.4 0 0 0-7.7 7.7L12 21l8.8-8.7a5.4 5.4 0 0 0 0-7.7Z" />
  ),
  arrow: (
    <>
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </>
  ),
  calendar: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M16 3v4M8 3v4M3 10h18" />
    </>
  ),
  check: <path d="m5 12 4 4L19 6" />,
  phone: (
    <path d="M21 16.4v3a2 2 0 0 1-3.2 3A19 19 0 0 1 1.6 6.2 2 2 0 0 1 3.5 3h3A2 2 0 0 1 8.5 4.7l.5 3a2 2 0 0 1-.6 1.8L7.3 10.6a16 16 0 0 0 6.1 6.1l1.1-1.1a2 2 0 0 1 1.8-.6l3 .5a2 2 0 0 1 1.7 1.9Z" />
  ),
  mail: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3 7 9 6 9-6" />
    </>
  ),
  shield: (
    <>
      <path d="m12 2 8 4v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6l8-4Z" />
      <path d="m9 12 2 2 4-4" />
    </>
  ),
  chevron: <path d="m6 9 6 6 6-6" />,
  trash: (
    <>
      <path d="M3 6h18M8 6V4h8v2M6 6l1 15h10l1-15" />
      <path d="M10 10v7M14 10v7" />
    </>
  ),
  sparkle: (
    <>
      <path d="m12 3 1.8 6.2L20 11l-6.2 1.8L12 19l-1.8-6.2L4 11l6.2-1.8L12 3Z" />
    </>
  ),
};

function Icon({ name, size = 18, filled = false }) {
  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      focusable="false"
    >
      {Icons[name]}
    </svg>
  );
}

function titleCase(s) {
  const text = String(s || '').trim();
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : '';
}

function displayPrice(value) {
  if (value === undefined || value === null || value === '') return 'Price on request';
  const raw = String(value).replace(/\s/g, '');
  const amount = Number(raw.replace(/,/g, ''));
  const currency = process.env.REACT_APP_LISTING_CURRENCY || 'USD';
  if (!Number.isFinite(amount) || amount < 0) return String(value);
  try {
    return new Intl.NumberFormat(currency === 'EUR' ? 'fr-FR' : 'en-US', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch (_) {
    return String(value);
  }
}

function displayDate(date) {
  if (!date) return '';
  const parsed = new Date(`${String(date).slice(0, 10)}T12:00:00`);
  return Number.isNaN(parsed.getTime())
    ? String(date)
    : parsed.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function getSaved() {
  try {
    const items = JSON.parse(window.localStorage.getItem(FAVORITES_KEY) || '[]');
    return Array.isArray(items) ? items : [];
  } catch (_) {
    return [];
  }
}

const PLACEHOLDER = '/resell-car-placeholder.svg';

export default function ResellItemCard({
  car = {},
  mode = 'browse',
  booked: bookedOverride,
  pending = false,
  signedIn = false,
  onBook,
  onDelete,
  onAdvertise,
}) {
  const [expanded, setExpanded] = useState(false);
  const [photoError, setPhotoError] = useState(false);
  const [favorites, setFavorites] = useState(getSaved);
  const isOwner = mode === 'owner';
  const booked = bookedOverride === undefined ? car.booked === true : Boolean(bookedOverride);
  const advertised = car.advertise === true;
  const identity = String(car._id || `${car.category || ''}-${car.model || ''}`);
  const saved = favorites.includes(identity);
  const model = car.model || 'Vehicle listing';
  const make = titleCase(car.category) || 'Car';
  const email =
    typeof car.email === 'string' && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(car.email)
      ? car.email.trim()
      : '';
  const phone = String(car.phone || '').trim();
  const callable = phone.replace(/[^+\d]/g, '').length >= 7 && !/[a-z]/i.test(phone);
  const demoLogo =
    typeof car.image === 'string' && /(?:^|\/)(?:logo192|logo512)\.png(?:\?|$)/i.test(car.image);
  const photo =
    !photoError && !demoLogo && typeof car.image === 'string' && car.image.trim()
      ? car.image
      : PLACEHOLDER;

  const toggleFavorite = () => {
    const latest = getSaved();
    const next = latest.includes(identity)
      ? latest.filter((v) => v !== identity)
      : [...latest, identity];
    setFavorites(next);
    try {
      window.localStorage.setItem(FAVORITES_KEY, JSON.stringify(next));
    } catch (_) {
      /* private browsing can block storage */
    }
  };

  return (
    <article className={`rs-listing-card ${isOwner ? 'rs-listing-owner' : ''}`}>
      <div className="rs-listing-photo">
        <img
          src={photo}
          alt={`${make} ${model}`}
          loading="lazy"
          onError={() => setPhotoError(true)}
        />
        <div className="rs-listing-photo-top">
          <span className={`rs-status-pill ${booked ? 'is-booked' : 'is-available'}`}>
            <span className="rs-status-dot" />
            {booked ? 'Reserved' : 'Available'}
          </span>
          {!isOwner && (
            <button
              type="button"
              className={`rs-favorite ${saved ? 'is-saved' : ''}`}
              aria-label={
                saved ? `Remove ${model} from saved cars` : `Save ${model} to this browser`
              }
              aria-pressed={saved}
              title="Saved on this device only"
              onClick={toggleFavorite}
            >
              <Icon name="heart" size={19} filled={saved} />
            </button>
          )}
          {isOwner && advertised && (
            <span className="rs-owner-featured">
              <Icon name="sparkle" size={14} /> Featured
            </span>
          )}
        </div>
        <span className="rs-image-credit">{make}</span>
      </div>

      <div className="rs-listing-content">
        <div className="rs-listing-kicker">
          <span>{make} collection</span>
          <span className="rs-listing-kicker-line" />
        </div>
        <div className="rs-listing-title-row">
          <div className="rs-listing-title-block">
            <h3 title={model}>{model}</h3>
            {car.verified === true && (
              <span className="rs-verified">
                <Icon name="shield" size={14} /> Verified seller
              </span>
            )}
          </div>
          <p className="rs-listing-price">{displayPrice(car.price)}</p>
        </div>

        <div className="rs-listing-metadata">
          <span>
            <Icon name="pin" size={16} />
            {car.location || 'Location not provided'}
          </span>
          <span>
            <Icon name="check" size={16} />
            {car.condition || 'Condition unspecified'}
          </span>
          {car.postdate && (
            <span>
              <Icon name="calendar" size={16} />
              {displayDate(car.postdate)}
            </span>
          )}
        </div>

        <ResellVehicleSpecs car={car} />
        <p className="rs-listing-description">
          {car.description || 'Contact the seller for more information about this vehicle.'}
        </p>

        <button
          type="button"
          className="rs-details-toggle"
          onClick={() => setExpanded((e) => !e)}
          aria-expanded={expanded}
        >
          {expanded ? 'Hide details' : 'Vehicle & seller details'}{' '}
          <span className={expanded ? 'is-open' : ''}>
            <Icon name="chevron" size={16} />
          </span>
        </button>
        {expanded && (
          <div className="rs-extra-details">
            {car.boughtdate && (
              <div>
                <span>First purchased</span>
                <strong>{displayDate(car.boughtdate)}</strong>
              </div>
            )}
            <div>
              <span>Seller</span>
              <strong>{car.sellername || 'Not specified'}</strong>
            </div>
            {email && (
              <div>
                <span>Email</span>
                <a href={`mailto:${email}`} title={`Email ${car.sellername || 'seller'}`}>
                  {email}
                </a>
              </div>
            )}
            {phone && (
              <div>
                <span>Phone</span>
                {callable ? (
                  <a href={`tel:${phone.replace(/[^+\d]/g, '')}`}>{phone}</a>
                ) : (
                  <strong>{phone}</strong>
                )}
              </div>
            )}
          </div>
        )}

        <div className="rs-listing-actions">
          {isOwner ? (
            <>
              <button
                type="button"
                className="rs-listing-primary"
                onClick={onAdvertise}
                disabled={booked || advertised || typeof onAdvertise !== 'function'}
              >
                <Icon name="sparkle" size={17} />
                {advertised ? 'Already featured' : booked ? 'Reserved' : 'Advertise car'}
              </button>
              <button
                type="button"
                className="rs-listing-secondary rs-listing-delete"
                onClick={onDelete}
                disabled={typeof onDelete !== 'function'}
              >
                <Icon name="trash" size={16} /> Delete
              </button>
            </>
          ) : (
            <>
              {booked ? (
                <button type="button" className="rs-listing-primary is-disabled" disabled>
                  Already reserved
                </button>
              ) : signedIn ? (
                <button
                  type="button"
                  className="rs-listing-primary"
                  onClick={onBook}
                  disabled={pending || typeof onBook !== 'function'}
                >
                  {pending ? 'Booking…' : 'Book this car'}{' '}
                  {!pending && <Icon name="arrow" size={17} />}
                </button>
              ) : (
                <Link className="rs-listing-primary" to="/login">
                  Sign in to book <Icon name="arrow" size={17} />
                </Link>
              )}
              {email ? (
                <a
                  className="rs-listing-secondary"
                  href={`mailto:${email}?subject=${encodeURIComponent(`Inquiry about ${model}`)}`}
                >
                  <Icon name="mail" size={17} /> Contact
                </a>
              ) : (
                <button
                  className="rs-listing-secondary"
                  type="button"
                  onClick={() => setExpanded(true)}
                >
                  <Icon name="phone" size={16} /> Details
                </button>
              )}
            </>
          )}
        </div>
        {!isOwner && (
          <p className="rs-listing-disclaimer">
            Demo listing · Booking is a reservation request, not a payment.
          </p>
        )}
      </div>
    </article>
  );
}
