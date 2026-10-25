import React from 'react';
import { Link } from 'react-router-dom';

const Banner = () => (
  <section className="rs-hero" aria-labelledby="rs-hero-heading">
    <div className="rs-hero-glow" aria-hidden="true" />
    <div className="rs-hero-copy">
      <span className="rs-eyebrow">
        <span className="rs-eyebrow-light" /> RESELL MARKETPLACE
      </span>
      <h1 id="rs-hero-heading">
        A better way
        <br />
        to find <em>your ride.</em>
      </h1>
      <p>
        Explore used cars by brand, compare listings and discover the one that feels right for you.
      </p>
      <div className="rs-hero-actions">
        <Link className="rs-btn rs-btn-lime" to="/cars">
          Explore cars <span aria-hidden="true">↗</span>
        </Link>
        <Link className="rs-btn rs-btn-ghost-light" to="/register">
          Join the marketplace <span aria-hidden="true">→</span>
        </Link>
      </div>
      <div className="rs-hero-proof">
        <span className="rs-hero-proof-icon" aria-hidden="true">
          ✦
        </span>
        <span>Discover. Connect. Drive.</span>
      </div>
    </div>
    <div className="rs-hero-art">
      <div className="rs-hero-car-circle" aria-hidden="true" />
      <img
        src={`${process.env.PUBLIC_URL || ''}/resell-hero-car.svg`}
        alt="Illustration of a modern performance coupe"
      />
      <div className="rs-hero-float rs-hero-float-top">
        <span aria-hidden="true">◉</span>
        <span>
          Find a car
          <br />
          <strong>that fits you.</strong>
        </span>
      </div>
      <div className="rs-hero-float rs-hero-float-bottom">
        <span className="rs-float-label">YOUR NEXT CHAPTER</span>
        <strong>
          Starts here <span aria-hidden="true">↗</span>
        </strong>
      </div>
    </div>
  </section>
);

export default Banner;
