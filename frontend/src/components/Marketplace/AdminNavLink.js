import React, { useContext, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../../Context/AuthProvider/AuthProvider';
import { API } from '../../services/inventory';
/** Merely a navigation hint; the backend enforces permissions independently. */
export default function AdminNavLink({ onClick }) {
  const { user } = useContext(AuthContext);
  const [admin, setAdmin] = useState(false);
  useEffect(() => {
    let active = true;
    setAdmin(false);
    if (!user)
      return () => {
        active = false;
      };
    user
      .getIdToken()
      .then((token) => fetch(`${API}/admin/me`, { headers: { Authorization: `Bearer ${token}` } }))
      .then((response) => {
        if (active && response.ok) setAdmin(true);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [user]);
  if (!admin) return null;
  return (
    <Link className="rs-v2-admin-nav" to="/admin" onClick={onClick}>
      Admin console
    </Link>
  );
}
