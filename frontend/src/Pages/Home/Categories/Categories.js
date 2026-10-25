import React, { useEffect, useState } from 'react';
import CategoryCard from './CategoryCard';
import { loadCategories } from '../../../services/inventory';

export default function Categories() {
  const [state, setState] = useState({ brands: [], loading: true, error: '' });
  useEffect(() => {
    let active = true;
    loadCategories()
      .then((brands) => {
        if (active) setState({ brands, loading: false, error: '' });
      })
      .catch((e) => {
        if (active) setState({ brands: [], loading: false, error: e.message });
      });
    return () => {
      active = false;
    };
  }, []);
  return (
    <section
      id="brands"
      className="rs-section rs-categories-section"
      aria-labelledby="rs-brands-title"
    >
      <div className="rs-section-heading">
        <div>
          <span className="rs-section-kicker">EXPLORE BY BRAND</span>
          <h2 id="rs-brands-title">
            Find your kind of car<span className="rs-title-dot">.</span>
          </h2>
          <p>Browse a brand you like, then compare every available vehicle.</p>
        </div>
        <span className="rs-section-count">{state.brands.length} brands</span>
      </div>
      {state.loading ? (
        <div className="rs-loading-grid" aria-label="Loading brands">
          {[0, 1, 2].map((x) => (
            <div className="rs-skeleton-card" key={x} />
          ))}
        </div>
      ) : state.error ? (
        <div role="alert" className="rs-empty-state">
          <h3>Brands aren't available.</h3>
          <p>{state.error}</p>
        </div>
      ) : state.brands.length ? (
        <div className="rs-category-grid">
          {state.brands.map((brand, i) => (
            <CategoryCard key={brand._id || i} category={brand} />
          ))}
        </div>
      ) : (
        <div className="rs-empty-state">No brands available.</div>
      )}
    </section>
  );
}
