import React from 'react';
import { Link } from 'react-router-dom';

const Footer = () => (
  <footer className="rs-footer">
    <div className="rs-shell">
      <div className="rs-footer-top">
        <div className="rs-footer-about">
          <Link to="/" className="rs-footer-brand" aria-label="ReSell Market home">
            resell<span>.</span>
          </Link>
          <p>Find your next drive with a cleaner, simpler way to explore used cars.</p>
        </div>
        <nav aria-label="Footer navigation" className="rs-footer-links">
          <Link to="/">Home</Link>
          <Link to="/#brands">Browse cars</Link>
          <Link to="/blog">Blog</Link>
          <Link to="/faq">FAQ</Link>
        </nav>
      </div>
      <div className="rs-footer-bottom">
        <span>© {new Date().getFullYear()} ReSell Market. All rights reserved.</span>
        <span>Designed for the road ahead.</span>
      </div>
    </div>
  </footer>
);

export default Footer;
