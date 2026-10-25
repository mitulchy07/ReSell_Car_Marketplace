import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import BookingButton from '../../components/Marketplace/BookingButton';
import ReportListing from '../../components/Marketplace/ReportListing';
import { currency, loadCar, mileage, prettyName } from '../../services/inventory';

export default function CarDetail() {
  const { id } = useParams();
  const [car, setCar] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [broken, setBroken] = useState(false);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    setBroken(false);
    loadCar(id)
      .then((x) => {
        if (active) setCar(x);
      })
      .catch((e) => {
        if (active) setError(e.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [id]);
  if (loading)
    return (
      <main className="rs-shell rs-mkt-detail-page">
        <div className="rs-mkt-skeleton" />
      </main>
    );
  if (!car)
    return (
      <main className="rs-shell rs-mkt-detail-page rs-mkt-empty">
        <h2>{error || 'Vehicle not found'}</h2>
        <Link className="rs-mkt-book" to="/cars">
          Explore cars
        </Link>
      </main>
    );
  const reserved = car.booked || car.sold;
  const specs = [
    ['Mileage', mileage(car.mileage)],
    ['Transmission', car.transmission],
    ['First registration', car.year],
    ['Fuel', car.fuel],
    [
      'Power',
      car.powerKw
        ? `${car.powerKw} kW (${car.powerHp || Math.round(Number(car.powerKw) * 1.36)} hp)`
        : null,
    ],
    ['Seller type', car.sellerType],
    ['Condition', car.condition],
    ['Location', car.location],
  ].filter((entry) => entry[1] != null && entry[1] !== '');
  return (
    <main className="rs-shell rs-mkt-detail-page">
      <div className="rs-mkt-breadcrumb">
        <Link to="/">Home</Link> / <Link to="/cars">Explore cars</Link> / {car.model}
      </div>
      <div className="rs-mkt-detail-layout">
        <div className="rs-mkt-detail-main">
          <div className="rs-mkt-detail-photo">
            <img
              src={broken || !car.image ? '/resell-car-placeholder.svg' : car.image}
              onError={() => setBroken(true)}
              alt={`${car.model} vehicle`}
              decoding="async"
            />
            {car.advertise && <span>✦ Featured</span>}
          </div>
          <section className="rs-mkt-detail-panel">
            <span className="rs-section-kicker">VEHICLE FACTS</span>
            <h2>Specifications</h2>
            <div className="rs-mkt-detail-spec-grid">
              {specs.map(([name, value]) => (
                <div key={name}>
                  <span>{name}</span>
                  <strong>{value}</strong>
                </div>
              ))}
            </div>
          </section>
          <section className="rs-mkt-detail-panel">
            <span className="rs-section-kicker">ABOUT THE VEHICLE</span>
            <h2>Description</h2>
            <p className="rs-mkt-description">
              {car.description || 'Contact the seller to learn more about this vehicle.'}
            </p>
            {car.demo === true && (
              <p className="rs-mkt-disclosure">
                Illustrative portfolio listing. Vehicle identity, image and specifications are not
                verified; do not treat it as a real sale offer.
              </p>
            )}
            <p className="rs-mkt-disclosure">
              Always confirm ownership, service history, mileage, condition and availability
              directly before making a payment.
            </p>
          </section>
        </div>
        <aside className="rs-mkt-detail-aside">
          <span className="rs-mkt-detail-brand">
            {prettyName(car.category)} · {reserved ? 'Unavailable' : 'Available'}
          </span>
          <h1>{car.model}</h1>
          <div className="rs-mkt-detail-price">{currency(car.price)}</div>
          <p className="rs-mkt-detail-note">
            {car.location || 'Location on request'} · {car.condition || 'Condition not specified'}
          </p>
          <BookingButton car={car} className="rs-v2-detail-booking" />
          <p className="rs-mkt-detail-footnote">Reservation request only — no payment taken.</p>
          {car.email && (
            <a
              className="rs-mkt-detail-contact"
              href={`mailto:${car.email}?subject=${encodeURIComponent('Vehicle inquiry: ' + car.model)}`}
            >
              Contact seller ↗
            </a>
          )}
          <ReportListing carId={car._id} />
          <div className="rs-mkt-detail-mini">
            <strong>Before you reserve</strong>
            <p>
              Review the details, request the service history and arrange an independent inspection
              if possible.
            </p>
          </div>
        </aside>
      </div>
    </main>
  );
}
