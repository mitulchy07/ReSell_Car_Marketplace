import React, { useState } from 'react';
import { Link } from 'react-router-dom';

const BRAND_LOGOS = {
  bmw: 'https://cdn.simpleicons.org/bmw',
  audi: 'https://cdn.simpleicons.org/audi',
  hyundai: 'https://cdn.simpleicons.org/hyundai',
  mercedes: 'https://cdn.simpleicons.org/mercedes',
  opel: 'https://cdn.simpleicons.org/opel',
  peugeot: 'https://cdn.simpleicons.org/peugeot',
  renault: 'https://cdn.simpleicons.org/renault',
  skoda: 'https://cdn.simpleicons.org/skoda',
  toyota: 'https://cdn.simpleicons.org/toyota',
};

export default function CategoryCard({ category }) {
  const label = String(category?.name || category?.category || category?._id || 'Cars').trim();
  const slug = label.toLowerCase();
  const [imageFailed, setImageFailed] = useState(false);
  const imageSource = BRAND_LOGOS[slug] || category?.img;

  return (
    <Link
      to={`/cars?brand=${encodeURIComponent(slug)}`}
      className="rs-mkt-brand-card"
      aria-label={`Browse ${label} cars`}
    >
      <span className="rs-mkt-brand-mark">
        {imageSource && !imageFailed ? (
          <img
            src={imageSource}
            alt={`${label} logo`}
            onError={() => setImageFailed(true)}
            loading="lazy"
          />
        ) : (
          <strong style={{ fontSize: 40, color: '#8293a5' }}>
            {label[0]?.toUpperCase() || 'C'}
          </strong>
        )}
      </span>
      <span className="rs-mkt-brand-card-footer">
        <strong>{label.charAt(0).toUpperCase() + label.slice(1)}</strong>
        <span aria-hidden="true">↗</span>
      </span>
    </Link>
  );
}
