import React from 'react';
import '../../styles/resell-vehicle-specs.css';

const readableMileage = (value) => {
  const n = Number(value);
  return Number.isFinite(n) && value !== '' && value !== null && value !== undefined
    ? `${new Intl.NumberFormat('en-GB').format(n)} km`
    : null;
};

export default function ResellVehicleSpecs({ car = {} }) {
  const power =
    Number.isFinite(Number(car.powerKw)) && car.powerKw !== undefined && car.powerKw !== ''
      ? `${car.powerKw} kW${car.powerHp !== undefined && car.powerHp !== '' ? ` (${car.powerHp} hp)` : ''}`
      : car.powerHp
        ? `${car.powerHp} hp`
        : null;
  const entries = [
    ['Mileage', readableMileage(car.mileage)],
    ['Transmission', car.transmission],
    ['Registration', car.year || car.firstRegistration],
    ['Fuel', car.fuel],
    ['Power', power],
    ['Seller', car.sellerType],
  ].filter(([, value]) => value !== null && value !== undefined && String(value).trim());
  if (!entries.length) return null;
  return (
    <div className="rs-vehicle-specs" aria-label="Vehicle specifications">
      {entries.map(([label, value]) => (
        <div className="rs-vehicle-spec" key={label}>
          <span className="rs-vehicle-spec-label">{label}</span>
          <strong className="rs-vehicle-spec-value">{value}</strong>
        </div>
      ))}
    </div>
  );
}
