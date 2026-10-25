import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import MarketplaceCard from '../../../components/Marketplace/MarketplaceCard';
import { loadInventory } from '../../../services/inventory';

export default function FeaturedCars() {
  const [state, setState] = useState({ cars: [], loading: true });
  useEffect(() => {
    let alive = true;
    loadInventory()
      .then(({ cars }) => {
        if (alive)
          setState({
            loading: false,
            cars: cars.filter((c) => c.advertise === true && !c.booked && !c.sold).slice(0, 3),
          });
      })
      .catch(() => {
        if (alive) setState({ loading: false, cars: [] });
      });
    return () => {
      alive = false;
    };
  }, []);
  if (!state.loading && !state.cars.length) return null;
  return (
    <section className="rs-mkt-home-featured" aria-labelledby="featured-heading">
      <div className="rs-section-heading">
        <div>
          <span className="rs-section-kicker">FEATURED VEHICLES</span>
          <h2 id="featured-heading">
            Featured picks<span className="rs-title-dot">.</span>
          </h2>
          <p>Explore selected listings, compare the essentials and reserve directly.</p>
        </div>
        <Link className="rs-mkt-all-link" to="/cars">
          Explore all cars →
        </Link>
      </div>
      {state.loading ? (
        <div className="rs-mkt-grid">
          {[1, 2, 3].map((n) => (
            <div className="rs-mkt-skeleton" key={n} />
          ))}
        </div>
      ) : (
        <div className="rs-mkt-grid">
          {state.cars.map((car, i) => (
            <MarketplaceCard key={car._id} car={car} priority={i === 0} />
          ))}
        </div>
      )}
    </section>
  );
}
