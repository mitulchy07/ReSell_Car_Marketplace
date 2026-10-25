import React from 'react';
import { Link } from 'react-router-dom';
import { ARTICLES } from './articles';
import '../../styles/resell-marketplace-final.css';
export default function Blog() {
  return (
    <main className="rs-shell rs-mkt-editorial">
      <div className="rs-mkt-editorial-head">
        <span className="rs-section-kicker">THE RESSELL JOURNAL</span>
        <h1>
          Better decisions, better drives<span className="rs-title-dot">.</span>
        </h1>
        <p>Helpful buying guides, ownership tips and practical advice for the used-car market.</p>
      </div>
      <div className="rs-mkt-blog-grid">
        {ARTICLES.map((a, i) => (
          <Link
            className={`rs-mkt-blog-card ${i === 0 ? 'is-lead' : ''}`}
            key={a.slug}
            to={`/blog/${a.slug}`}
          >
            <div className="rs-mkt-blog-cover">
              <img src={a.image} alt="" loading="lazy" />
              <span>{a.category}</span>
            </div>
            <div className="rs-mkt-blog-content">
              <small>BUYING GUIDE · {a.readTime} MIN READ</small>
              <h2>{a.title}</h2>
              <p>{a.summary}</p>
              <span>Read article ↗</span>
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}
