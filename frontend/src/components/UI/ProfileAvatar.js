import React, { useEffect, useState } from 'react';

/** Uses the Firebase avatar when present; gracefully falls back to a bundled local illustration. */
export default function ProfileAvatar({ user, size = 'md', className = '' }) {
  const [details, setDetails] = useState({
    photoURL: user?.photoURL || '',
    displayName: user?.displayName || '',
  });
  const [imageFailed, setImageFailed] = useState(false);
  useEffect(() => {
    setDetails({ photoURL: user?.photoURL || '', displayName: user?.displayName || '' });
    setImageFailed(false);
    const handler = (event) => {
      if (event.detail?.uid === user?.uid) {
        setDetails({
          photoURL: event.detail.photoURL || '',
          displayName: event.detail.displayName || '',
        });
        setImageFailed(false);
      }
    };
    window.addEventListener('resell-profile-updated', handler);
    return () => window.removeEventListener('resell-profile-updated', handler);
  }, [user?.uid, user?.photoURL, user?.displayName]);
  const fallback = `${process.env.PUBLIC_URL || ''}/resell-default-avatar.svg`;
  const url = !imageFailed && /^https:\/\//i.test(details.photoURL) ? details.photoURL : fallback;
  return (
    <span className={`rs-ui-avatar rs-ui-avatar-${size} ${className}`}>
      <img
        src={url}
        alt={details.displayName ? `${details.displayName}'s avatar` : 'Account avatar'}
        referrerPolicy="no-referrer"
        onError={() => setImageFailed(true)}
      />
    </span>
  );
}
