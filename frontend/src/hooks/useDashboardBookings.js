import { useQuery } from '@tanstack/react-query';

export const DASHBOARD_API = (
  process.env.REACT_APP_API_URL || 'https://resell-firestore-preview.vercel.app'
).replace(/\/$/, '');

/** Only orders belonging to the signed-in Firebase user are requested.
 * The backend MUST verify the ID token; this UI never implements authorization.
 */
export default function useDashboardBookings(user) {
  return useQuery({
    queryKey: ['dashboard-bookings', user?.uid],
    enabled: Boolean(user?.uid && user?.email),
    staleTime: 30 * 1000,
    retry: false,
    queryFn: async ({ signal }) => {
      const token = await user.getIdToken();
      const response = await fetch(`${DASHBOARD_API}/myorders/${encodeURIComponent(user.email)}`, {
        headers: { Authorization: `Bearer ${token}` },
        signal,
      });
      if (!response.ok) {
        if (response.status === 404)
          throw new Error('Booking history is not connected to this deployment yet.');
        if (response.status === 401 || response.status === 403)
          throw new Error('Your session could not be verified. Please sign in again.');
        throw new Error('Reservations could not be loaded. Please try again.');
      }
      const data = await response.json();
      if (!Array.isArray(data))
        throw new Error('The booking service returned an unexpected response.');
      return data;
    },
  });
}
