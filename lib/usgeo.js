// US address helpers for location search/filters: state names, NYC borough and county.
// Borough/county come from the order's stored address (filled by Google geocoding when the
// Maps key is set). When they are missing, NYC addresses are worked out from the ZIP code,
// so the five boroughs always filter correctly — even for orders placed before this existed.

export const STATE_NAMES = {
  AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California', CO: 'Colorado', CT: 'Connecticut', DE: 'Delaware',
  DC: 'District of Columbia', FL: 'Florida', GA: 'Georgia', HI: 'Hawaii', ID: 'Idaho', IL: 'Illinois', IN: 'Indiana', IA: 'Iowa',
  KS: 'Kansas', KY: 'Kentucky', LA: 'Louisiana', ME: 'Maine', MD: 'Maryland', MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota',
  MS: 'Mississippi', MO: 'Missouri', MT: 'Montana', NE: 'Nebraska', NV: 'Nevada', NH: 'New Hampshire', NJ: 'New Jersey', NM: 'New Mexico',
  NY: 'New York', NC: 'North Carolina', ND: 'North Dakota', OH: 'Ohio', OK: 'Oklahoma', OR: 'Oregon', PA: 'Pennsylvania', RI: 'Rhode Island',
  SC: 'South Carolina', SD: 'South Dakota', TN: 'Tennessee', TX: 'Texas', UT: 'Utah', VT: 'Vermont', VA: 'Virginia', WA: 'Washington',
  WV: 'West Virginia', WI: 'Wisconsin', WY: 'Wyoming',
};

export const BOROUGHS = ['Manhattan', 'Brooklyn', 'Queens', 'The Bronx', 'Staten Island'];

const BOROUGH_COUNTY = {
  Manhattan: 'New York County', Brooklyn: 'Kings County', Queens: 'Queens County', 'The Bronx': 'Bronx County', 'Staten Island': 'Richmond County',
};

const zip5 = (z) => String(z || '').trim().slice(0, 5);

/** NYC borough for a ZIP code, or null if the ZIP is outside New York City. */
export function boroughFromZip(zip) {
  const z = zip5(zip);
  if (!/^\d{5}$/.test(z)) return null;
  const p = z.slice(0, 3);
  if (p === '100' || p === '101' || p === '102') return 'Manhattan';
  if (p === '103') return 'Staten Island';
  if (p === '104') return 'The Bronx';
  if (p === '112') return 'Brooklyn';
  if (p === '111' || p === '113' || p === '114' || p === '116' || z === '11004' || z === '11005') return 'Queens';
  return null;
}

/** Normalise borough names coming from Google ("Bronx", "Kings County", …). */
export function normBorough(b) {
  const s = String(b || '').trim().toLowerCase().replace(/ county$/, '');
  if (!s) return null;
  if (s === 'bronx' || s === 'the bronx') return 'The Bronx';
  if (s === 'manhattan' || s === 'new york') return 'Manhattan';
  if (s === 'brooklyn' || s === 'kings') return 'Brooklyn';
  if (s === 'queens') return 'Queens';
  if (s === 'staten island' || s === 'richmond') return 'Staten Island';
  return null;
}

/** "Bronx County" style county name; null when unknown. */
export function normCounty(c) {
  const s = String(c || '').trim();
  if (!s) return null;
  return /county|parish|borough|municipality|census area|city$/i.test(s) ? s : `${s} County`;
}

/** Everything the location filters need for one address. */
export function geoOf(a) {
  if (!a) return { state: '', zip: '', city: '', borough: null, county: null };
  const state = String(a.state || '').trim().toUpperCase();
  const zip = zip5(a.postcode || a.zip);
  const borough = normBorough(a.borough) || (state === 'NY' || !state ? boroughFromZip(zip) : null);
  const county = normCounty(a.county) || (borough ? BOROUGH_COUNTY[borough] : null);
  return { state, zip, city: String(a.city || '').trim(), borough, county };
}
