import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { ARTICLES } from './articles';
import '../../styles/resell-marketplace-final.css';
export default function Article() {
  const { slug } = useParams(),
    a = ARTICLES.find((x) => x.slug === slug);
  if (!a)
    return (
      <main className="rs-shell rs-mkt-article">
        <h1>Article not found</h1>
        <Link to="/blog">← All articles</Link>
      </main>
    );
  return (
    <main className="rs-shell rs-mkt-article">
      <Link className="rs-mkt-back" to="/blog">
        ← Back to the journal
      </Link>
      <div className="rs-mkt-article-head">
        <span className="rs-section-kicker">
          {a.category.toUpperCase()} · {a.readTime} MIN READ
        </span>
        <h1>{a.title}</h1>
        <p>{a.summary}</p>
      </div>
      <img className="rs-mkt-article-hero" src={a.image} alt="Car editorial" />
      <article>
        {a.sections.map(([h, t]) => (
          <section key={h}>
            <h2>{h}</h2>
            <p>{t}</p>
          </section>
        ))}
        <p className="rs-mkt-editorial-disclosure">
          General educational information, not a substitute for an independent vehicle inspection or
          professional advice.
        </p>
      </article>
      <div className="rs-mkt-article-end">
        <strong>Find a car that fits.</strong>
        <Link to="/cars">Explore available cars →</Link>
      </div>
    </main>
  );
}
