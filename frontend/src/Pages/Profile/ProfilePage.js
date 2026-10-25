import React, { useContext, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { updateProfile } from 'firebase/auth';
import { AuthContext } from '../../Context/AuthProvider/AuthProvider';
import ProfileAvatar from '../../components/UI/ProfileAvatar';

function friendlyDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? '—'
    : date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}
export default function ProfilePage() {
  const { user } = useContext(AuthContext);
  const [name, setName] = useState(user?.displayName || '');
  const [photo, setPhoto] = useState(user?.photoURL || '');
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [localProfile, setLocalProfile] = useState(null);
  useEffect(() => {
    setName(user?.displayName || '');
    setPhoto(user?.photoURL || '');
    setLocalProfile(null);
  }, [user?.uid, user?.displayName, user?.photoURL]);
  if (!user)
    return (
      <main className="rs-shell rs-profile-page">
        <p>Please log in to access your profile.</p>
        <Link to="/login">Log in</Link>
      </main>
    );
  const profileUser = localProfile ? { ...user, ...localProfile } : user;
  async function handleSave(event) {
    event.preventDefault();
    setError('');
    setSaved(false);
    const displayName = name.trim();
    const photoURL = photo.trim();
    if (displayName.length < 2 || displayName.length > 60) {
      setError('Please enter a name between 2 and 60 characters.');
      return;
    }
    if (photoURL && (!/^https:\/\//i.test(photoURL) || photoURL.length > 1000)) {
      setError('Avatar URL must be an HTTPS image link (up to 1,000 characters).');
      return;
    }
    setBusy(true);
    try {
      await updateProfile(user, { displayName, photoURL: photoURL || null });
      setLocalProfile({ displayName, photoURL });
      window.dispatchEvent(
        new CustomEvent('resell-profile-updated', {
          detail: { uid: user.uid, displayName, photoURL },
        }),
      );
      setSaved(true);
    } catch (err) {
      setError(err.message || 'Could not save your profile.');
    } finally {
      setBusy(false);
    }
  }
  const loginMethods = [
    ...new Set(
      (user.providerData || [])
        .map((item) =>
          item.providerId === 'google.com'
            ? 'Google'
            : item.providerId === 'password'
              ? 'Email & password'
              : item.providerId,
        )
        .filter(Boolean),
    ),
  ];
  return (
    <main className="rs-shell rs-profile-page">
      <div className="rs-profile-breadcrumb">
        <Link to="/">Home</Link> <span>›</span> <span>My profile</span>
      </div>
      <div className="rs-profile-intro">
        <span className="rs-section-kicker">YOUR ACCOUNT</span>
        <h1>
          My profile<span className="rs-title-dot">.</span>
        </h1>
        <p>Keep your account details up to date for a smoother marketplace experience.</p>
      </div>
      <div className="rs-profile-layout">
        <aside className="rs-profile-identity">
          <div className="rs-profile-banner">
            <span className="rs-profile-banner-lines" />
          </div>
          <ProfileAvatar user={profileUser} size="xl" />
          <h2>{localProfile?.displayName || user.displayName || 'ReSell member'}</h2>
          <p>{user.email || 'No email on file'}</p>
          <span className="rs-profile-status">
            ● {user.emailVerified ? 'Verified email' : 'Email not verified'}
          </span>
          <div className="rs-profile-divider" />
          <div className="rs-profile-quick">
            <span>Member since</span>
            <strong>{friendlyDate(user.metadata?.creationTime)}</strong>
          </div>
          <div className="rs-profile-quick">
            <span>Last sign in</span>
            <strong>{friendlyDate(user.metadata?.lastSignInTime)}</strong>
          </div>
          <div className="rs-profile-quick">
            <span>Sign-in method</span>
            <strong>{loginMethods.join(', ') || 'Firebase'}</strong>
          </div>
          <Link
            className="rs-profile-dash-link"
            to={`/dashboard/${encodeURIComponent(user.email || '')}`}
          >
            Go to dashboard <span>↗</span>
          </Link>
        </aside>
        <section className="rs-profile-edit">
          <div className="rs-profile-edit-heading">
            <span className="rs-section-kicker">PERSONAL DETAILS</span>
            <h2>Edit profile</h2>
            <p>Your changes are saved to Firebase Authentication.</p>
          </div>
          <form onSubmit={handleSave} className="rs-profile-form">
            <label htmlFor="rs-profile-name">Full name</label>
            <input
              id="rs-profile-name"
              autoComplete="name"
              maxLength={60}
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setSaved(false);
              }}
              placeholder="Your name"
              required
            />
            <label htmlFor="rs-profile-email">Email address</label>
            <input id="rs-profile-email" type="email" value={user.email || ''} readOnly />
            <small className="rs-profile-help">Email changes are not supported here.</small>
            <label htmlFor="rs-profile-photo">
              Profile photo URL <span>(optional)</span>
            </label>
            <input
              id="rs-profile-photo"
              type="url"
              value={photo}
              onChange={(e) => {
                setPhoto(e.target.value);
                setSaved(false);
              }}
              placeholder="https://example.com/your-photo.jpg"
            />
            <p className="rs-profile-help">
              Leave this empty for the default avatar. Photo uploads are not needed.
            </p>
            {error && (
              <div className="rs-profile-flash rs-profile-flash-error" role="alert">
                {error}
              </div>
            )}
            {saved && (
              <div className="rs-profile-flash rs-profile-flash-good" role="status">
                ✓ Your profile has been updated.
              </div>
            )}
            <button className="rs-profile-save" type="submit" disabled={busy}>
              {busy ? 'Saving changes…' : 'Save changes'} <span>→</span>
            </button>
          </form>
          <div className="rs-profile-security">
            <span aria-hidden="true">◇</span>
            <div>
              <strong>Your account stays protected</strong>
              <p>
                Profile changes require your signed-in Firebase session. Your marketplace admin
                permissions are managed separately on the server.
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
