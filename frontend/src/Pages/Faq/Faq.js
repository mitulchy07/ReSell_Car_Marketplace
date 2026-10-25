import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import '../../styles/resell-marketplace-final.css';
const faqs = [
  [
    'Booking',
    'How do I reserve a car?',
    'Open a listing, choose “Book this car”, sign in if requested and confirm the reservation. A reservation is not a payment or purchase.',
  ],
  [
    'Booking',
    'Does reserving a car mean I have bought it?',
    'No. It is a request to hold the listing. Contact the seller to discuss inspection, payment, paperwork and handover.',
  ],
  [
    'Booking',
    'Can I cancel a reservation?',
    'If you need to cancel, contact the seller directly. This demo marketplace does not currently provide automated cancellation or refunds.',
  ],
  [
    'Buying',
    'Can I inspect the car first?',
    'Contact the seller to arrange an inspection and test drive. We recommend independent vehicle checks before paying.',
  ],
  [
    'Buying',
    'Are listings or sellers verified?',
    'Not all listings or sellers are independently verified. Confirm identity, ownership, mileage, specifications and vehicle condition yourself.',
  ],
  [
    'Buying',
    'What documents should I check?',
    'Ask for vehicle registration, inspection records where applicable, invoices and service history. Requirements vary by country.',
  ],
  [
    'Selling',
    'How do I create a listing?',
    'Sign in and open “Sell a car” from your account. Add photos, vehicle information, a description and a contact method.',
  ],
  [
    'Selling',
    'Can I feature my listing?',
    'Eligible seller listings can be marked as advertised from My Listings. Featured listings are prioritised in the browse view.',
  ],
  [
    'Account',
    'Do I need an account to browse?',
    'No. All cars, vehicle details and buying guides are public. Signing in is required to make a reservation.',
  ],
  [
    'Account',
    'How do I contact a seller?',
    'Use contact information shown on the vehicle detail page when the seller provides it.',
  ],
];
export default function Faq() {
  const [topic, setTopic] = useState('All questions'),
    [open, setOpen] = useState(0);
  const tabs = ['All questions', 'Booking', 'Buying', 'Selling', 'Account'];
  const filtered = faqs
    .map((x, i) => ({ ...{ section: x[0], q: x[1], a: x[2] }, id: i }))
    .filter((x) => topic === 'All questions' || x.section === topic);
  return (
    <main className="rs-shell rs-mkt-editorial">
      <div className="rs-mkt-editorial-head">
        <span className="rs-section-kicker">HELP CENTER</span>
        <h1>
          Questions? We have answers<span className="rs-title-dot">.</span>
        </h1>
        <p>Everything you need to know about browsing, reserving and listing cars on ReSell.</p>
      </div>
      <div className="rs-mkt-faq-layout">
        <aside>
          <h3>Topics</h3>
          <div className="rs-mkt-faq-tabs">
            {tabs.map((x) => (
              <button
                className={topic === x ? 'is-active' : ''}
                key={x}
                onClick={() => {
                  setTopic(x);
                  setOpen(-1);
                }}
              >
                {x}
                <span>↗</span>
              </button>
            ))}
          </div>
          <div className="rs-mkt-faq-help">
            <h3>Ready to find a car?</h3>
            <p>
              Browse all available vehicles and open any listing for specifications and booking.
            </p>
            <Link to="/cars">Explore cars →</Link>
          </div>
        </aside>
        <div className="rs-mkt-faq-questions">
          {filtered.map(({ q, a, section, id }) => (
            <div key={id} className={`rs-mkt-faq-item ${open === id ? 'is-open' : ''}`}>
              <button aria-expanded={open === id} onClick={() => setOpen(open === id ? -1 : id)}>
                <span>
                  <small>{section}</small>
                  <strong>{q}</strong>
                </span>
                <em>{open === id ? '−' : '+'}</em>
              </button>
              {open === id && <p>{a}</p>}
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
