import '../../styles/resell-unified-accounts.css';
import React, { useContext, useState } from 'react';
import { useForm } from 'react-hook-form';
import { updateProfile } from 'firebase/auth';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { AuthContext } from '../../Context/AuthProvider/AuthProvider';

const API_URL = (
  process.env.REACT_APP_API_URL || 'https://resell-firestore-preview.vercel.app'
).replace(/\/$/, '');

function registrationMessage(error) {
  switch (error?.code) {
    case 'auth/email-already-in-use':
      return 'This email already has an account. Please sign in.';
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/weak-password':
      return 'Please choose a stronger password.';
    case 'auth/network-request-failed':
      return 'Network error. Check your connection and try again.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Please try again later.';
    default:
      return 'We could not create your account. Please try again.';
  }
}

const Register = () => {
  const { createUser } = useContext(AuthContext);
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({ mode: 'onTouched' });

  const password = watch('password') || '';
  const busy = isSubmitting || isSaving;

  async function onSubmit(values) {
    setError('');
    setIsSaving(true);
    let created = false;
    try {
      // Create the Firebase Auth identity first.
      const credential = await createUser(values.email.trim(), values.password);
      created = true;
      const firebaseUser = credential.user;
      const displayName = values.name.trim();

      // Profile display name is best-effort and independent from creating the account.
      try {
        await updateProfile(firebaseUser, { displayName });
      } catch (profileError) {
        console.warn(
          'Firebase profile name could not be updated:',
          profileError?.code || 'unknown',
        );
      }

      // IMPORTANT: Backend must implement POST /users with Firebase ID token verification.
      // The current booking-stage Backend may not have this route yet.
      let profileSaved = false;
      try {
        const token = await firebaseUser.getIdToken();
        const response = await fetch(`${API_URL}/users`, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ name: displayName }),
        });
        profileSaved = response.ok;
      } catch (_error) {
        // Firebase account still exists even when the optional profile API is unavailable.
      }

      if (profileSaved) {
        toast.success('Your account is ready. Welcome to ReSell!');
      } else {
        toast.warning(
          'Account created. Profile sync is temporarily unavailable; sign in and try again.',
          {
            autoClose: 9000,
          },
        );
      }
      navigate('/', { replace: true });
    } catch (authError) {
      setError(
        created
          ? 'Account created, but part of setup failed. Please sign in instead of registering again.'
          : registrationMessage(authError),
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <main className="rs-auth-page rs-signup-page">
      <div className="rs-shell rs-auth-layout rs-signup-layout">
        <section className="rs-auth-card rs-signup-card" aria-labelledby="rs-signup-title">
          <Link to="/" className="rs-auth-back">
            ← Back to home
          </Link>
          <span className="rs-section-kicker">START YOUR JOURNEY</span>
          <h1 id="rs-signup-title">
            Join the drive<span className="rs-title-dot">.</span>
          </h1>
          <p className="rs-auth-subtitle">
            Create your free account to discover great cars or list your own.
          </p>

          <form
            className="rs-form rs-auth-form rs-signup-form"
            onSubmit={handleSubmit(onSubmit)}
            noValidate
          >
            <div className="rs-signup-field">
              <label htmlFor="rs-signup-name">Full name</label>
              <input
                id="rs-signup-name"
                className="rs-input"
                placeholder="Your full name"
                autoComplete="name"
                aria-invalid={!!errors.name}
                {...register('name', {
                  required: 'Your name is required',
                  minLength: { value: 2, message: 'Enter at least 2 characters' },
                  maxLength: { value: 80, message: 'Name is too long' },
                })}
              />
              {errors.name && (
                <span className="rs-input-error" role="alert">
                  {errors.name.message}
                </span>
              )}
            </div>

            <div className="rs-signup-field">
              <label htmlFor="rs-signup-email">Email address</label>
              <input
                id="rs-signup-email"
                className="rs-input"
                type="email"
                placeholder="you@example.com"
                autoComplete="email"
                aria-invalid={!!errors.email}
                {...register('email', {
                  required: 'Email is required',
                  pattern: {
                    value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                    message: 'Enter a valid email address',
                  },
                })}
              />
              {errors.email && (
                <span className="rs-input-error" role="alert">
                  {errors.email.message}
                </span>
              )}
            </div>

            <div className="rs-unified-member-note" role="note">
              <strong>One account. Every opportunity.</strong>
              <span>
                Browse, reserve and list vehicles with the same account. No buyer/seller roles to
                choose.
              </span>
            </div>

            <div className="rs-signup-field">
              <label htmlFor="rs-signup-password">Password</label>
              <div className="rs-signup-password-wrap">
                <input
                  id="rs-signup-password"
                  className="rs-input"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  placeholder="At least 8 characters"
                  aria-invalid={!!errors.password}
                  {...register('password', {
                    required: 'Password is required',
                    minLength: { value: 8, message: 'Use at least 8 characters' },
                  })}
                />
                <button
                  type="button"
                  className="rs-signup-reveal"
                  onClick={() => setShowPassword((s) => !s)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
              <div className="rs-signup-password-hint" aria-live="polite">
                <span className={password.length >= 8 ? 'is-valid' : ''}>✓ 8+ characters</span>
                <span
                  className={/[A-Za-z]/.test(password) && /\d/.test(password) ? 'is-valid' : ''}
                >
                  ✓ Letters &amp; numbers recommended
                </span>
              </div>
              {errors.password && (
                <span className="rs-input-error" role="alert">
                  {errors.password.message}
                </span>
              )}
            </div>

            <div className="rs-signup-field">
              <label htmlFor="rs-signup-confirm">Confirm password</label>
              <div className="rs-signup-password-wrap">
                <input
                  id="rs-signup-confirm"
                  className="rs-input"
                  type={showConfirm ? 'text' : 'password'}
                  autoComplete="new-password"
                  placeholder="Re-enter your password"
                  aria-invalid={!!errors.confirmPassword}
                  {...register('confirmPassword', {
                    required: 'Please confirm your password',
                    validate: (value) => value === password || 'Passwords do not match',
                  })}
                />
                <button
                  type="button"
                  className="rs-signup-reveal"
                  onClick={() => setShowConfirm((s) => !s)}
                  aria-label={
                    showConfirm ? 'Hide confirmation password' : 'Show confirmation password'
                  }
                >
                  {showConfirm ? 'Hide' : 'Show'}
                </button>
              </div>
              {errors.confirmPassword && (
                <span className="rs-input-error" role="alert">
                  {errors.confirmPassword.message}
                </span>
              )}
            </div>

            {error && (
              <div className="rs-error-banner" role="alert">
                {error}
              </div>
            )}
            <button
              className="rs-btn rs-btn-primary rs-form-submit rs-signup-submit"
              disabled={busy}
              type="submit"
            >
              {busy ? 'Creating your account…' : 'Create free account'}{' '}
              <span aria-hidden="true">→</span>
            </button>
            <p className="rs-signup-security-note">
              Your account is securely managed with Firebase Authentication.
            </p>
          </form>
          <p className="rs-auth-bottom">
            Already have an account? <Link to="/login">Sign in</Link>
          </p>
        </section>

        <aside className="rs-auth-aside rs-signup-aside" aria-label="Marketplace illustration">
          <span className="rs-eyebrow">
            <span className="rs-eyebrow-light" /> BUILT FOR THE JOURNEY
          </span>
          <div className="rs-auth-aside-content">
            <div className="rs-signup-pill">
              <span /> YOUR NEXT DRIVE STARTS HERE
            </div>
            <h2>
              Find your car.
              <br />
              <em>Make it yours.</em>
            </h2>
            <p>Browse, discover and connect — a fresh experience for every road ahead.</p>
            <div className="rs-signup-benefits">
              <div>
                <span>01</span> Explore curated listings
              </div>
              <div>
                <span>02</span> Reserve a car you love
              </div>
              <div>
                <span>03</span> List your own vehicle
              </div>
            </div>
          </div>
          <img
            src={`${process.env.PUBLIC_URL || ''}/resell-hero-car.svg`}
            alt="Modern car illustration"
          />
        </aside>
      </div>
    </main>
  );
};

export default Register;
