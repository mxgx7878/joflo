// Delivery locations used to route orders to the nearest supplier warehouse (United States).
// Coordinates are city centres — good enough for "which warehouse is closest".
// Data keys `suburb` / `postcode` on addresses are kept for compatibility; the UI labels them City / ZIP code.

export const REGIONS = ['Northeast', 'Southeast', 'Midwest', 'South Central', 'Mountain', 'West Coast'];

export const LOCATIONS = [
  { id: 'new-york', city: 'New York', state: 'NY', region: 'Northeast', lat: 40.7128, lng: -74.006 },
  { id: 'newark', city: 'Newark', state: 'NJ', region: 'Northeast', lat: 40.7357, lng: -74.1724 },
  { id: 'philadelphia', city: 'Philadelphia', state: 'PA', region: 'Northeast', lat: 39.9526, lng: -75.1652 },
  { id: 'boston', city: 'Boston', state: 'MA', region: 'Northeast', lat: 42.3601, lng: -71.0589 },
  { id: 'baltimore', city: 'Baltimore', state: 'MD', region: 'Northeast', lat: 39.2904, lng: -76.6122 },
  { id: 'washington', city: 'Washington', state: 'DC', region: 'Northeast', lat: 38.9072, lng: -77.0369 },
  { id: 'atlanta', city: 'Atlanta', state: 'GA', region: 'Southeast', lat: 33.749, lng: -84.388 },
  { id: 'charlotte', city: 'Charlotte', state: 'NC', region: 'Southeast', lat: 35.2271, lng: -80.8431 },
  { id: 'nashville', city: 'Nashville', state: 'TN', region: 'Southeast', lat: 36.1627, lng: -86.7816 },
  { id: 'miami', city: 'Miami', state: 'FL', region: 'Southeast', lat: 25.7617, lng: -80.1918 },
  { id: 'orlando', city: 'Orlando', state: 'FL', region: 'Southeast', lat: 28.5383, lng: -81.3792 },
  { id: 'tampa', city: 'Tampa', state: 'FL', region: 'Southeast', lat: 27.9506, lng: -82.4572 },
  { id: 'chicago', city: 'Chicago', state: 'IL', region: 'Midwest', lat: 41.8781, lng: -87.6298 },
  { id: 'detroit', city: 'Detroit', state: 'MI', region: 'Midwest', lat: 42.3314, lng: -83.0458 },
  { id: 'columbus', city: 'Columbus', state: 'OH', region: 'Midwest', lat: 39.9612, lng: -82.9988 },
  { id: 'minneapolis', city: 'Minneapolis', state: 'MN', region: 'Midwest', lat: 44.9778, lng: -93.265 },
  { id: 'st-louis', city: 'St. Louis', state: 'MO', region: 'Midwest', lat: 38.627, lng: -90.1994 },
  { id: 'houston', city: 'Houston', state: 'TX', region: 'South Central', lat: 29.7604, lng: -95.3698 },
  { id: 'dallas', city: 'Dallas', state: 'TX', region: 'South Central', lat: 32.7767, lng: -96.797 },
  { id: 'austin', city: 'Austin', state: 'TX', region: 'South Central', lat: 30.2672, lng: -97.7431 },
  { id: 'san-antonio', city: 'San Antonio', state: 'TX', region: 'South Central', lat: 29.4241, lng: -98.4936 },
  { id: 'new-orleans', city: 'New Orleans', state: 'LA', region: 'South Central', lat: 29.9511, lng: -90.0715 },
  { id: 'denver', city: 'Denver', state: 'CO', region: 'Mountain', lat: 39.7392, lng: -104.9903 },
  { id: 'phoenix', city: 'Phoenix', state: 'AZ', region: 'Mountain', lat: 33.4484, lng: -112.074 },
  { id: 'las-vegas', city: 'Las Vegas', state: 'NV', region: 'Mountain', lat: 36.1699, lng: -115.1398 },
  { id: 'salt-lake-city', city: 'Salt Lake City', state: 'UT', region: 'Mountain', lat: 40.7608, lng: -111.891 },
  { id: 'los-angeles', city: 'Los Angeles', state: 'CA', region: 'West Coast', lat: 34.0522, lng: -118.2437 },
  { id: 'san-diego', city: 'San Diego', state: 'CA', region: 'West Coast', lat: 32.7157, lng: -117.1611 },
  { id: 'san-francisco', city: 'San Francisco', state: 'CA', region: 'West Coast', lat: 37.7749, lng: -122.4194 },
  { id: 'sacramento', city: 'Sacramento', state: 'CA', region: 'West Coast', lat: 38.5816, lng: -121.4944 },
  { id: 'portland', city: 'Portland', state: 'OR', region: 'West Coast', lat: 45.5152, lng: -122.6784 },
  { id: 'seattle', city: 'Seattle', state: 'WA', region: 'West Coast', lat: 47.6062, lng: -122.3321 },
];

/** All 50 states + DC, for address forms. */
export const STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'DC', 'FL', 'GA', 'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD', 'MA', 'MI', 'MN', 'MS', 'MO',
  'MT', 'NE', 'NV', 'NH', 'NJ', 'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC', 'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY',
];

// Addresses in a state without a listed city route from its nearest hub
const STATE_HUB = {
  AL: 'atlanta', AK: 'seattle', AZ: 'phoenix', AR: 'dallas', CA: 'los-angeles', CO: 'denver', CT: 'new-york', DE: 'philadelphia', DC: 'washington',
  FL: 'miami', GA: 'atlanta', HI: 'los-angeles', ID: 'salt-lake-city', IL: 'chicago', IN: 'chicago', IA: 'minneapolis', KS: 'st-louis', KY: 'nashville',
  LA: 'new-orleans', ME: 'boston', MD: 'baltimore', MA: 'boston', MI: 'detroit', MN: 'minneapolis', MS: 'new-orleans', MO: 'st-louis', MT: 'denver',
  NE: 'st-louis', NV: 'las-vegas', NH: 'boston', NJ: 'newark', NM: 'phoenix', NY: 'new-york', NC: 'charlotte', ND: 'minneapolis', OH: 'columbus',
  OK: 'dallas', OR: 'portland', PA: 'philadelphia', RI: 'boston', SC: 'charlotte', SD: 'minneapolis', TN: 'nashville', TX: 'houston', UT: 'salt-lake-city',
  VT: 'boston', VA: 'washington', WA: 'seattle', WV: 'columbus', WI: 'chicago', WY: 'denver',
};

const byId = Object.fromEntries(LOCATIONS.map((l) => [l.id, l]));
export const getLocation = (id) => byId[id] || null;
export const locationLabel = (loc) => (loc ? `${loc.city}, ${loc.state}` : '—');

/** Resolve a postal address to a routing location: exact city match, else the state's hub city. */
export function locationFromAddress(a) {
  if (!a) return null;
  const city = String(a.city || '').trim().toLowerCase();
  const st = String(a.state || '').trim().toUpperCase();
  const hit = LOCATIONS.find((l) => l.city.toLowerCase() === city && (!st || l.state === st));
  if (hit) return hit;
  return byId[STATE_HUB[st]] || null;
}

/** Straight-line distance in miles (haversine). */
export function distanceKm(a, b) {
  if (!a || !b) return null;
  const R = 3958.8; // earth radius in miles — the app is US-based, so distances are shown in miles
  const toR = (d) => (d * Math.PI) / 180;
  const dLat = toR(b.lat - a.lat);
  const dLng = toR(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toR(a.lat)) * Math.cos(toR(b.lat)) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(h)));
}

export const fmtKm = (mi) => (mi === null || mi === undefined ? '' : mi < 5 ? 'local' : `${mi.toLocaleString()} mi`);
export const kmAway = (mi) => (mi === null || mi === undefined ? '' : mi < 5 ? 'same city' : `${mi.toLocaleString()} mi away`);
