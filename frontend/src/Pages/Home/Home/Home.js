import React from 'react';
import Banner from '../Banner/Banner';
import Categories from '../Categories/Categories';
import FeaturedCars from '../FeaturedCars/FeaturedCars';
import { Contact } from '../Contact/Contact';

export default function Home() {
  return (
    <main className="rs-home">
      <div className="rs-shell rs-hero-wrapper">
        <Banner />
      </div>
      <div className="rs-shell">
        <Categories />
        <FeaturedCars />
        <Contact />
      </div>
    </main>
  );
}
