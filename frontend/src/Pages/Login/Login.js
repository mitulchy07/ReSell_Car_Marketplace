import React, { useContext, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { AuthContext } from '../../Context/AuthProvider/AuthProvider';

const Login = () => {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm();
  const { user, login, handleGoogleSignIn, loading } = useContext(AuthContext);
  const [error, setError] = useState('');
  const location = useLocation();
  const navigate = useNavigate();
  const from = location.state?.from?.pathname || '/';

  // Also handles return from Google Sign-In; Firebase auth state is the source of truth.
  useEffect(() => {
    if (user?.uid) navigate(from, { replace: true });
  }, [user, from, navigate]);

  const handleLogin = async (data) => {
    setError('');
    try {
      await login(data.email, data.password);
      toast.success('Welcome back!');
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message || 'Login failed. Please try again.');
    }
  };

  return (
    <main className="rs-auth-page">
      <div className="rs-shell rs-auth-layout">
        <section className="rs-auth-card" aria-labelledby="rs-login-title">
          <Link to="/" className="rs-auth-back">
            ← Back to home
          </Link>
          <span className="rs-section-kicker">WELCOME BACK</span>
          <h1 id="rs-login-title">
            Good to see you<span className="rs-title-dot">.</span>
          </h1>
          <p className="rs-auth-subtitle">Sign in to continue exploring your next drive.</p>
          <form onSubmit={handleSubmit(handleLogin)} className="rs-form rs-auth-form">
            <label htmlFor="rs-login-email">Email address</label>
            <input
              id="rs-login-email"
              className="rs-input"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              {...register('email', { required: 'Email is required' })}
            />
            {errors.email && (
              <span className="rs-input-error" role="alert">
                {errors.email.message}
              </span>
            )}
            <label htmlFor="rs-login-password">Password</label>
            <input
              id="rs-login-password"
              className="rs-input"
              type="password"
              autoComplete="current-password"
              placeholder="Your password"
              {...register('password', { required: 'Password is required' })}
            />
            {errors.password && (
              <span className="rs-input-error" role="alert">
                {errors.password.message}
              </span>
            )}
            {error && (
              <div className="rs-error-banner" role="alert">
                {error}
              </div>
            )}
            <button
              className="rs-btn rs-btn-primary rs-form-submit"
              disabled={loading || isSubmitting}
              type="submit"
            >
              {isSubmitting ? 'Signing in…' : 'Log in'} <span aria-hidden="true">→</span>
            </button>
          </form>
          <div className="rs-auth-separator">
            <span>or continue with</span>
          </div>
          <button className="rs-btn rs-btn-google" type="button" onClick={handleGoogleSignIn}>
            <svg viewBox="0 0 20 20" width="21" height="21" aria-hidden="true">
              <path
                fill="#4285F4"
                d="M19.6 10.2c0-.66-.06-1.31-.17-1.94H10v3.7h5.42a4.64 4.64 0 0 1-2.02 3.04v2.52h3.26c1.91-1.77 2.94-4.38 2.94-7.32Z"
              />
              <path
                fill="#34A853"
                d="M10 20c2.7 0 4.97-.9 6.63-2.47l-3.26-2.52a6.04 6.04 0 0 1-8.95-3.17H1.1v2.59A10 10 0 0 0 10 20Z"
              />
              <path
                fill="#FBBC05"
                d="M4.42 11.84a6 6 0 0 1 0-3.68V5.57H1.1a10 10 0 0 0 0 8.86l3.32-2.59Z"
              />
              <path
                fill="#EA4335"
                d="M10 3.96c1.48 0 2.8.51 3.84 1.52L16.72 2.6A9.61 9.61 0 0 0 10 0a10 10 0 0 0-8.9 5.57l3.32 2.59A6.03 6.03 0 0 1 10 3.96Z"
              />
            </svg>
            Sign in with Google
          </button>
          <p className="rs-auth-bottom">
            New around here? <Link to="/register">Create an account</Link>
          </p>
        </section>
        <aside className="rs-auth-aside" aria-label="Marketplace illustration">
          <span className="rs-eyebrow">
            <span className="rs-eyebrow-light" /> MADE FOR THE ROAD
          </span>
          <div className="rs-auth-aside-content">
            <h2>
              More journeys.
              <br />
              <em>More possibilities.</em>
            </h2>
            <p>Your marketplace, redesigned for a smoother ride.</p>
          </div>
          <img src={`${process.env.PUBLIC_URL || ''}/resell-hero-car.svg`} alt="" />
        </aside>
      </div>
    </main>
  );
};

export default Login;
