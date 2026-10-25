import '../../styles/resell-button-clarity-v4.css';
import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { loadInventory, prettyName } from '../../services/inventory';
import MarketplaceCard from '../../components/Marketplace/MarketplaceCard';

export default function BrowseCars() {
  const [params, setParams] = useSearchParams();
  const brand = params.get('brand') || '';
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('featured');
  const [fuel, setFuel] = useState('');
  const [gearbox, setGearbox] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [inventory, setInventory] = useState({ cars: [], categories: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retryKey, setRetryKey] = useState(0);
  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError('');
    loadInventory()
      .then((data) => {
        if (alive) setInventory(data);
      })
      .catch((e) => {
        if (alive) setError(e.message);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [retryKey]);
  const fuels = useMemo(
    () => [...new Set(inventory.cars.map((c) => c.fuel).filter(Boolean))].sort(),
    [inventory.cars],
  );
  const transmissions = useMemo(
    () => [...new Set(inventory.cars.map((c) => c.transmission).filter(Boolean))].sort(),
    [inventory.cars],
  );
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let items = inventory.cars.filter((car) => {
      if (brand && String(car.category || '').toLowerCase() !== brand.toLowerCase()) return false;
      if (
        q &&
        !`${car.model || ''} ${car.category || ''} ${car.location || ''}`.toLowerCase().includes(q)
      )
        return false;
      if (fuel && car.fuel !== fuel) return false;
      if (gearbox && car.transmission !== gearbox) return false;
      if (maxPrice && Number(car.price) > Number(maxPrice)) return false;
      return true;
    });
    items = [...items];
    if (sort === 'priceAsc') items.sort((a, b) => Number(a.price) - Number(b.price));
    else if (sort === 'priceDesc') items.sort((a, b) => Number(b.price) - Number(a.price));
    else if (sort === 'mileage')
      items.sort((a, b) => (Number(a.mileage) || Infinity) - (Number(b.mileage) || Infinity));
    else if (sort === 'newest')
      items.sort((a, b) =>
        String(b.postedAt || b.postdate || '').localeCompare(
          String(a.postedAt || a.postdate || ''),
        ),
      );
    else
      items.sort(
        (a, b) =>
          Number(b.advertise === true) - Number(a.advertise === true) ||
          String(b.postedAt || b.postdate || '').localeCompare(
            String(a.postedAt || a.postdate || ''),
          ),
      );
    return items;
  }, [inventory.cars, brand, search, fuel, gearbox, maxPrice, sort]);
  function reset() {
    setParams({});
    setSearch('');
    setFuel('');
    setGearbox('');
    setMaxPrice('');
    setSort('featured');
  }
  return (
    <main className="rs-shell rs-mkt-page rs-v2-browse">
      <div className="rs-mkt-heading">
        <div>
          <span className="rs-section-kicker">EXPLORE THE MARKETPLACE</span>
          <h1>
            Find the right car<span className="rs-title-dot">.</span>
          </h1>
          <p>
            Browse real listing fields, compare key specifications and open a dedicated detail page
            for more information.
          </p>
        </div>
        <span className="rs-mkt-results-pill">{filtered.length} vehicles</span>
      </div>
      <div className="rs-mkt-filters rs-v2-filters">
        <label className="rs-mkt-search">
          <span aria-hidden="true">⌕</span>
          <input
            aria-label="Search by brand, model or city"
            placeholder="Brand, model or city"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        <label>
          <span className="rs-mkt-label">Brand</span>
          <select
            value={brand}
            onChange={(e) => setParams(e.target.value ? { brand: e.target.value } : {})}
          >
            <option value="">All brands</option>
            {inventory.categories.map((c) => {
              const value = String(c.name || c.category || c._id || '').toLowerCase();
              return (
                <option key={value} value={value}>
                  {prettyName(value)}
                </option>
              );
            })}
          </select>
        </label>
        <label>
          <span className="rs-mkt-label">Fuel</span>
          <select value={fuel} onChange={(e) => setFuel(e.target.value)}>
            <option value="">All fuels</option>
            {fuels.map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
        </label>
        <label>
          <span className="rs-mkt-label">Transmission</span>
          <select value={gearbox} onChange={(e) => setGearbox(e.target.value)}>
            <option value="">Any gearbox</option>
            {transmissions.map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
        </label>
        <label>
          <span className="rs-mkt-label">Maximum price</span>
          <input
            inputMode="numeric"
            type="number"
            min="0"
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
            placeholder="No limit"
            aria-label="Maximum price"
          />
        </label>
        <label>
          <span className="rs-mkt-label">Sort</span>
          <select value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="featured">Featured first</option>
            <option value="newest">Newest</option>
            <option value="priceAsc">Lowest price</option>
            <option value="priceDesc">Highest price</option>
            <option value="mileage">Lowest mileage</option>
          </select>
        </label>
        <button
          className="rs-v2-reset rs-ui4-clear"
          aria-label="Clear all car filters"
          type="button"
          onClick={reset}
        >
          <span>Clear filters</span>
        </button>
      </div>
      <div className="rs-mkt-count-row">
        <span>{filtered.length} matching vehicles</span>
        <span className="rs-mkt-featured-note">✦ Advertised listings appear first by default</span>
      </div>
      {loading ? (
        <div className="rs-mkt-grid">
          {[1, 2, 3].map((x) => (
            <div className="rs-mkt-skeleton" key={x} />
          ))}
        </div>
      ) : error ? (
        <div role="alert" className="rs-mkt-empty">
          <h2>Could not load cars</h2>
          <p>{error}</p>
          <button
            type="button"
            className="rs-mkt-book rs-ui4-empty-action"
            onClick={() => {
              setError('');
              setLoading(true);
              setRetryKey((n) => n + 1);
            }}
          >
            Retry
          </button>
        </div>
      ) : filtered.length ? (
        <div className="rs-mkt-grid">
          {filtered.map((car, i) => (
            <MarketplaceCard car={car} key={car._id} priority={i < 3} />
          ))}
        </div>
      ) : (
        <div className="rs-mkt-empty">
          <h2>No matching vehicles</h2>
          <p>Try removing a filter or browsing all cars.</p>
          <button type="button" className="rs-mkt-book rs-ui4-empty-action" onClick={reset}>
            <span>Show all cars</span>
          </button>
        </div>
      )}
      <p className="rs-v2-inventory-note">
        Specifications and availability are supplied by listing owners; independently verify the
        vehicle before buying.
      </p>
    </main>
  );
}
