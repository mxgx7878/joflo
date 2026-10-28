// Order routing — which warehouse ships which line.
//
// Rule 1  JOLOF first: any line JOLOF's own warehouses can fill goes to JOLOF, regardless of distance
//         (the JOLOF warehouse nearest the customer that can fill it; one JOLOF warehouse for all of
//         those lines when possible).
// Rule 2  Everything else goes to the nearest approved supplier warehouse that holds enough stock
//         (one warehouse for all remaining lines when possible, otherwise line by line).
// Rule 3  Lines nobody can fill stay unassigned → admin assigns them by hand.
// Lines without a catalogue product (commodity quotes) ship from JOLOF's nearest warehouse.
import { milesTo } from './maps';
import { getSettings } from './settings';

/** Pure planner. avail(warehouseId, productId) → units; miles[warehouseId] → road miles. */
export function planLines({ lines, warehouses, avail, miles, exclude = [], houseMaxMiles = 0 }) {
  const far = (w) => (miles[w.id] == null ? Number.MAX_SAFE_INTEGER : miles[w.id]);
  const ws = warehouses.filter((w) => !exclude.includes(w.vendorId)).sort((a, b) => far(a) - far(b));
  // houseMaxMiles > 0 limits "JOLOF first" to JOLOF warehouses within that distance (0 = anywhere)
  const house = ws.filter((w) => w.isHouse && (!houseMaxMiles || far(w) <= houseMaxMiles));
  const others = ws.filter((w) => !w.isHouse);
  const out = lines.map(() => null);
  const pick = (w) => ({ vendorId: w.vendorId, warehouseId: w.id, distanceMi: miles[w.id] ?? null, isHouse: !!w.isHouse });
  const can = (w, i) => avail(w.id, lines[i].productId) >= lines[i].qty;

  const assign = (pool, idxs) => {
    if (!idxs.length) return;
    const whole = pool.find((w) => idxs.every((i) => can(w, i)));
    if (whole) { idxs.forEach((i) => { out[i] = pick(whole); }); return; }
    idxs.forEach((i) => { const w = pool.find((x) => can(x, i)); if (w) out[i] = pick(w); });
  };

  const stockIdx = lines.map((l, i) => (l.productId ? i : -1)).filter((i) => i >= 0);
  assign(house, stockIdx.filter((i) => house.some((w) => can(w, i))));
  assign(others, stockIdx.filter((i) => !out[i]));
  const anyHouse = ws.find((w) => w.isHouse);
  lines.forEach((l, i) => { if (!l.productId && anyHouse) out[i] = pick(anyHouse); });
  return out;
}

/**
 * Load the live supply network for some products (inside a transaction when given one).
 * Only active warehouses of approved suppliers, and only active offers, count.
 */
export async function loadNetwork(db, productIds) {
  const warehouses = await db.warehouse.findMany({
    where: { active: true, vendor: { role: 'vendor', status: 'active' } },
    select: { id: true, vendorId: true, name: true, lat: true, lng: true, locationId: true, vendor: { select: { isHouse: true, company: true } } },
  });
  const ids = [...new Set(productIds.filter(Boolean))];
  const [offers, levels] = ids.length
    ? await Promise.all([
      db.supplierOffer.findMany({ where: { productId: { in: ids }, status: 'active' }, select: { vendorId: true, productId: true, cost: true } }),
      db.stockLevel.findMany({ where: { productId: { in: ids }, warehouseId: { in: warehouses.map((w) => w.id) } }, select: { warehouseId: true, productId: true, qty: true } }),
    ])
    : [[], []];
  const offerOk = new Set(offers.map((o) => `${o.vendorId}|${o.productId}`));
  const cost = new Map(offers.map((o) => [`${o.vendorId}|${o.productId}`, o.cost]));
  const whById = new Map(warehouses.map((w) => [w.id, { ...w, isHouse: w.vendor.isHouse }]));
  const qty = new Map();
  levels.forEach((l) => {
    const w = whById.get(l.warehouseId);
    if (w && offerOk.has(`${w.vendorId}|${l.productId}`)) qty.set(`${l.warehouseId}|${l.productId}`, l.qty);
  });
  return {
    warehouses: [...whById.values()],
    avail: (warehouseId, productId) => qty.get(`${warehouseId}|${productId}`) || 0,
    costOf: (vendorId, productId) => cost.get(`${vendorId}|${productId}`) ?? null,
  };
}

/** Plan an order end to end: network → road miles → assignment. */
export async function routeOrder(db, { lines, dest, exclude = [] }) {
  const net = await loadNetwork(db, lines.map((l) => l.productId));
  // only measure warehouses that could matter (JOLOF ones + any holding these products)
  const relevant = net.warehouses.filter((w) => w.isHouse || lines.some((l) => l.productId && net.avail(w.id, l.productId) > 0));
  const miles = dest ? await milesTo(dest, relevant.filter((w) => w.lat != null).map((w) => ({ id: w.id, lat: w.lat, lng: w.lng }))) : {};
  const settings = await getSettings();
  const plan = planLines({ lines, warehouses: relevant, avail: net.avail, miles, exclude, houseMaxMiles: Number(settings.routing?.jolofFirstMaxMiles) || 0 });
  return { plan, miles, net };
}
