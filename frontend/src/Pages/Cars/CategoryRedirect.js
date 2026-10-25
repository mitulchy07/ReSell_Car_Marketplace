import React from 'react';
import { Navigate, useParams } from 'react-router-dom';

// Keeps older /category/:category bookmarks functional without loading the old card design.
export default function CategoryRedirect() {
  const { category } = useParams();
  if (!category) return <Navigate to="/cars" replace />;
  return <Navigate to={`/cars?brand=${encodeURIComponent(category.toLowerCase())}`} replace />;
}
