// Delivery locations used to route orders to the nearest supplier warehouse.
// Coordinates are city centres — good enough for "which warehouse is closest".

export const LOCATIONS = [
  { id: 'melbourne', city: 'Melbourne', state: 'VIC', lat: -37.8136, lng: 144.9631 },
  { id: 'geelong', city: 'Geelong', state: 'VIC', lat: -38.1499, lng: 144.3617 },
  { id: 'ballarat', city: 'Ballarat', state: 'VIC', lat: -37.5622, lng: 143.8503 },
  { id: 'bendigo', city: 'Bendigo', state: 'VIC', lat: -36.757, lng: 144.2794 },
  { id: 'sydney', city: 'Sydney', state: 'NSW', lat: -33.8688, lng: 151.2093 },
  { id: 'newcastle', city: 'Newcastle', state: 'NSW', lat: -32.9283, lng: 151.7817 },
  { id: 'wollongong', city: 'Wollongong', state: 'NSW', lat: -34.4278, lng: 150.8931 },
  { id: 'canberra', city: 'Canberra', state: 'ACT', lat: -35.2809, lng: 149.13 },
  { id: 'brisbane', city: 'Brisbane', state: 'QLD', lat: -27.4698, lng: 153.0251 },
  { id: 'gold-coast', city: 'Gold Coast', state: 'QLD', lat: -28.0167, lng: 153.4 },
  { id: 'sunshine-coast', city: 'Sunshine Coast', state: 'QLD', lat: -26.65, lng: 153.0667 },
  { id: 'toowoomba', city: 'Toowoomba', state: 'QLD', lat: -27.5598, lng: 151.9507 },
  { id: 'townsville', city: 'Townsville', state: 'QLD', lat: -19.259, lng: 146.8169 },
  { id: 'cairns', city: 'Cairns', state: 'QLD', lat: -16.9186, lng: 145.7781 },
  { id: 'adelaide', city: 'Adelaide', state: 'SA', lat: -34.9285, lng: 138.6007 },
  { id: 'perth', city: 'Perth', state: 'WA', lat: -31.9505, lng: 115.8605 },
  { id: 'hobart', city: 'Hobart', state: 'TAS', lat: -42.8821, lng: 147.3272 },
  { id: 'launceston', city: 'Launceston', state: 'TAS', lat: -41.4332, lng: 147.1441 },
  { id: 'darwin', city: 'Darwin', state: 'NT', lat: -12.4634, lng: 130.8456 },
];

export const STATES = ['VIC', 'NSW', 'ACT', 'QLD', 'SA', 'WA', 'TAS', 'NT'];
const CAPITAL = { VIC: 'melbourne', NSW: 'sydney', ACT: 'canberra', QLD: 'brisbane', SA: 'adelaide', WA: 'perth', TAS: 'hobart', NT: 'darwin' };

const byId = Object.fromEntries(LOCATIONS.map((l) => [l.id, l]));
export const getLocation = (id) => byId[id] || null;
export const locationLabel = (loc) => (loc ? `${loc.city} ${loc.state}` : '—');

/** Resolve a postal address to a routing location: exact city match, else the state's capital. */
export function locationFromAddress(a) {
  if (!a) return null;
  const city = String(a.city || '').trim().toLowerCase();
  const hit = LOCATIONS.find((l) => l.city.toLowerCase() === city);
  if (hit) return hit;
  const st = String(a.state || '').trim().toUpperCase();
  return byId[CAPITAL[st]] || null;
}

/** Straight-line distance in km (haversine). */
export function distanceKm(a, b) {
  if (!a || !b) return null;
  const R = 6371;
  const toR = (d) => (d * Math.PI) / 180;
  const dLat = toR(b.lat - a.lat);
  const dLng = toR(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toR(a.lat)) * Math.cos(toR(b.lat)) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(h)));
}

export const fmtKm = (km) => (km === null || km === undefined ? '' : km < 5 ? 'local' : `${km.toLocaleString()} km`);
export const kmAway = (km) => (km === null || km === undefined ? '' : km < 5 ? 'same city' : `${km.toLocaleString()} km away`);
