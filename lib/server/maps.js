// Google Maps Platform helpers (server-side only).
//   • Geocoding API  → address → lat/lng
//   • Routes API     → road distance (computeRouteMatrix) from warehouses to the customer
// Without GOOGLE_MAPS_API_KEY everything still works: addresses resolve to their city / state hub
// and distances are straight-line miles × ROAD_FACTOR, flagged as approximate.
import { locationFromAddress, LOCATIONS } from '../locations';

const KEY = () => process.env.GOOGLE_MAPS_API_KEY || '';
export const mapsEnabled = () => !!KEY();
export const ROAD_FACTOR = 1.2;
const METERS_PER_MILE = 1609.344;

const geoCache = new Map();
const distCache = new Map();

/** Straight-line miles between two { lat, lng }. */
export function haversineMiles(a, b) {
  if (!a || !b || a.lat == null || b.lat == null) return null;
  const R = 3958.8;
  const toR = (d) => (d * Math.PI) / 180;
  const dLat = toR(b.lat - a.lat);
  const dLng = toR(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toR(a.lat)) * Math.cos(toR(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Nearest delivery metro to a point (for grouping / labels). */
export function nearestLocationId(pt) {
  if (!pt) return null;
  let best = null;
  LOCATIONS.forEach((l) => { const d = haversineMiles(pt, l); if (!best || d < best.d) best = { id: l.id, d }; });
  return best?.id || null;
}

const addrString = (a) => [a.line1, a.city, [a.state, a.postcode].filter(Boolean).join(' '), a.country || 'United States'].filter(Boolean).join(', ');

/**
 * Resolve a postal address to coordinates.
 * → { lat, lng, locationId, precise: boolean }  (precise = geocoded by Google)
 */
export async function resolveAddress(a) {
  if (!a) return null;
  if (typeof a.lat === 'number' && typeof a.lng === 'number') return { lat: a.lat, lng: a.lng, locationId: nearestLocationId(a), precise: true };
  const q = addrString(a);
  if (KEY() && (a.line1 || a.postcode)) {
    if (geoCache.has(q)) return geoCache.get(q);
    try {
      const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(q)}&components=country:US&key=${KEY()}`;
      const r = await fetch(url, { cache: 'no-store' });
      const j = await r.json();
      const loc = j.results?.[0]?.geometry?.location;
      if (loc) {
        const out = { lat: loc.lat, lng: loc.lng, locationId: nearestLocationId({ lat: loc.lat, lng: loc.lng }), precise: true };
        geoCache.set(q, out);
        return out;
      }
      if (j.status && j.status !== 'ZERO_RESULTS') console.warn('[maps] geocode', j.status, j.error_message || '');
    } catch (e) { console.warn('[maps] geocode failed', e.message); }
  }
  const hub = locationFromAddress(a);
  return hub ? { lat: hub.lat, lng: hub.lng, locationId: hub.id, precise: false } : null;
}

/**
 * Road miles from each origin to one destination.
 * origins: [{ id, lat, lng }] → { [id]: miles } (rounded to 0.1)
 */
export async function milesTo(dest, origins) {
  const out = {};
  if (!dest || !origins.length) return out;
  const todo = [];
  origins.forEach((o) => {
    const k = `${o.lat},${o.lng}>${dest.lat},${dest.lng}`;
    if (distCache.has(k)) out[o.id] = distCache.get(k);
    else todo.push({ ...o, k });
  });
  if (todo.length && KEY()) {
    try {
      for (let i = 0; i < todo.length; i += 50) {
        const chunk = todo.slice(i, i + 50);
        const r = await fetch('https://routes.googleapis.com/distanceMatrix/v2:computeRouteMatrix', {
          method: 'POST',
          cache: 'no-store',
          headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': KEY(), 'X-Goog-FieldMask': 'originIndex,destinationIndex,distanceMeters,condition' },
          body: JSON.stringify({
            origins: chunk.map((o) => ({ waypoint: { location: { latLng: { latitude: o.lat, longitude: o.lng } } } })),
            destinations: [{ waypoint: { location: { latLng: { latitude: dest.lat, longitude: dest.lng } } } }],
            travelMode: 'DRIVE',
          }),
        });
        const rows = await r.json();
        if (!Array.isArray(rows)) { console.warn('[maps] route matrix', rows?.error?.message || rows); break; }
        rows.forEach((el) => {
          const o = chunk[el.originIndex ?? 0];
          if (o && el.condition === 'ROUTE_EXISTS' && el.distanceMeters != null) {
            const mi = Math.round((el.distanceMeters / METERS_PER_MILE) * 10) / 10;
            out[o.id] = mi;
            distCache.set(o.k, mi);
          }
        });
      }
    } catch (e) { console.warn('[maps] route matrix failed', e.message); }
  }
  // anything Google could not price → straight line × road factor
  todo.forEach((o) => {
    if (out[o.id] == null) {
      const h = haversineMiles(o, dest);
      out[o.id] = h == null ? null : Math.round(h * ROAD_FACTOR * 10) / 10;
    }
  });
  return out;
}
