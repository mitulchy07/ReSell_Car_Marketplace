/* Fast public inventory: one Firestore-backed request, with cache + legacy fallback. */
export const API = (
  process.env.REACT_APP_API_URL || 'https://resell-firestore-preview.vercel.app'
).replace(/\/$/, '');
let snapshot = null;
let cacheUntil = 0;
let pending = null;
let categoryCache = null;
let categoryPending = null;
const TTL = 60_000;
export function invalidateInventory() {
  snapshot = null;
  cacheUntil = 0;
  pending = null;
}
async function getJson(path, timeout = 10000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(API + path, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) throw new Error(`${path}: HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}
export async function loadCategories() {
  if (categoryCache) return categoryCache;
  if (categoryPending) return categoryPending;
  categoryPending = getJson('/categories').then((items) => {
    if (!Array.isArray(items)) throw new Error('Unexpected brands response');
    categoryCache = items;
    return items;
  });
  try {
    return await categoryPending;
  } finally {
    categoryPending = null;
  }
}
export async function loadInventory() {
  if (snapshot && Date.now() < cacheUntil) return snapshot;
  if (pending) return pending;
  pending = (async () => {
    // Use the new single-request endpoint. Deploy the backend patch first for best speed.
    const [listingResult, categoryResult] = await Promise.allSettled([
      getJson('/listings'),
      loadCategories(),
    ]);
    let categories =
      categoryResult.status === 'fulfilled' && Array.isArray(categoryResult.value)
        ? categoryResult.value
        : [];
    let cars =
      listingResult.status === 'fulfilled' && Array.isArray(listingResult.value)
        ? listingResult.value
        : null;
    if (!cars) {
      // Old backend compatibility, NOT the normal fast path.
      if (!categories.length)
        throw new Error('The marketplace is temporarily unavailable. Please try again.');
      const names = [
        ...new Set(
          categories
            .map((c) => String(c.name || c.category || c._id || '').toLowerCase())
            .filter(Boolean),
        ),
      ];
      const batches = await Promise.allSettled(
        names.map((name) => getJson('/category/' + encodeURIComponent(name))),
      );
      const index = new Map();
      batches.forEach((b) => {
        if (b.status === 'fulfilled' && Array.isArray(b.value))
          b.value.forEach((car) => {
            if (car && car._id && car.hidden !== true) index.set(String(car._id), car);
          });
      });
      cars = [...index.values()];
      if (!batches.some((b) => b.status === 'fulfilled'))
        throw new Error('The marketplace is temporarily unavailable. Please try again.');
    }
    if (!categories.length) {
      categories = [...new Set(cars.map((c) => c.category).filter(Boolean))].map((name) => ({
        _id: name,
        name,
      }));
    }
    cars = cars.filter((c) => c && c._id && c.hidden !== true);
    cars.sort(
      (a, b) =>
        Number(b.advertise === true) - Number(a.advertise === true) ||
        String(b.postedAt || b.postdate || '').localeCompare(
          String(a.postedAt || a.postdate || ''),
        ),
    );
    snapshot = { cars, categories };
    cacheUntil = Date.now() + TTL;
    return snapshot;
  })();
  try {
    return await pending;
  } finally {
    pending = null;
  }
}
export async function loadCar(id) {
  if (snapshot) {
    const result = snapshot.cars.find((c) => String(c._id) === String(id));
    if (result) return result;
  }
  try {
    return await getJson('/listings/' + encodeURIComponent(id));
  } catch (e) {
    // Backward compatible with the old backend until the new endpoint is deployed.
    if (/HTTP 404/.test(e.message))
      return (await loadInventory()).cars.find((c) => String(c._id) === String(id)) || null;
    throw e;
  }
}
export const prettyName = (text) => String(text || '').replace(/\b\w/g, (c) => c.toUpperCase());
export const mileage = (value) =>
  value === '' || value == null || !Number.isFinite(Number(value))
    ? 'Ask seller'
    : `${new Intl.NumberFormat('en-GB').format(Number(value))} km`;
export const currency = (value) => {
  if (value === '' || value == null) return 'Price on request';
  const amount = Number(String(value).replace(/[,\s]/g, ''));
  if (!Number.isFinite(amount) || amount < 0) return 'Price on request';
  const currencyCode = process.env.REACT_APP_LISTING_CURRENCY || 'EUR';
  try {
    return new Intl.NumberFormat(currencyCode === 'EUR' ? 'fr-FR' : 'en-US', {
      style: 'currency',
      currency: currencyCode,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch (_) {
    return String(value);
  }
};
