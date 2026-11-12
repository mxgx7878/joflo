// Everything the UI needs, shaped exactly like the old demo store and scoped to who is asking:
//   public    → catalogue only (prices hidden when "Show pricing" is off)
//   customer  → + their own orders, quotes and invoices (no supplier / warehouse details)
//   supplier  → + their warehouses, offers, product requests and THEIR share of orders
//                (no customer name, contact, address or retail prices)
//   admin     → everything
import { prisma } from './db';
import { getSettings } from './settings';
import { getLocation } from '../locations';
import { geoOf } from '../usgeo';
import { mapsEnabled } from './maps';

const iso = (d) => (d ? new Date(d).toISOString() : null);

export const userOut = (u) => u && ({
  id: u.id, role: u.role, type: u.type, name: u.name, email: u.email, phone: u.phone, company: u.company, abn: u.abn,
  businessType: u.businessType, status: u.status, isHouse: u.isHouse, createdAt: iso(u.createdAt),
  addresses: (u.addresses || []).map((a) => ({ id: a.id, label: a.label, line1: a.line1, city: a.city, state: a.state, postcode: a.postcode, country: a.country, isDefault: a.isDefault })),
});

const warehouseOut = (w) => ({
  id: w.id, vendorId: w.vendorId, name: w.name, line1: w.line1, city: w.city, state: w.state, postcode: w.postcode,
  suburb: [w.city, w.state].filter(Boolean).join(', '), locationId: w.locationId, lat: w.lat, lng: w.lng, active: w.active,
});

const locOut = (o) => {
  const a = o.address || {};
  const metro = getLocation(o.locationId);
  if (!a.city && !metro) return null;
  const g = geoOf(a);
  return {
    id: o.locationId, city: a.city || metro?.city, state: a.state || metro?.state, lat: o.lat ?? metro?.lat, lng: o.lng ?? metro?.lng,
    zip: g.zip, borough: g.borough, county: g.county,
  };
};

function orderOut(o, { drivers } = {}) {
  const driver = o.driverId && drivers ? drivers.get(o.driverId) : null;
  return {
    id: o.id, userId: o.userId, guest: o.guest, customer: o.customer, address: o.address, location: locOut(o),
    status: o.status, payment: o.payment, paymentMethod: o.paymentMethod, source: o.source, inquiryId: o.inquiryId, notes: o.notes, tracking: o.tracking,
    subtotal: o.subtotal, shipping: o.deliveryFee, deliveryMiles: o.deliveryMiles, discount: o.discount, total: o.total,
    priceConfirmed: o.status !== 'pending' && o.status !== 'cancelled' ? true : o.status === 'cancelled' ? !!o.confirmedAt : false,
    driverId: o.driverId, driver: driver ? { id: driver.id, name: driver.name, phone: driver.phone, vehicle: driver.vehicle, plate: driver.plate } : null,
    timeline: o.timeline, events: o.events, declinedBy: o.declinedBy, createdAt: iso(o.createdAt), confirmedAt: iso(o.confirmedAt),
    invoiceId: o.invoice?.id || null,
    items: o.items.map((i) => ({ id: i.id, productId: i.productId, name: i.name, size: i.size, img: i.img, unit: i.unit, qty: i.qty, price: i.price, vendorId: i.vendorId, warehouseId: i.warehouseId, distanceKm: i.distanceMi })),
    fulfilments: Object.fromEntries(o.fulfilments.map((f) => [f.warehouseId, { status: f.status, tracking: f.tracking, at: iso(f.at), miles: f.miles, fee: f.fee }])),
  };
}

/** Customer view: the order comes from JOLOF TRADING — no supplier, warehouse or routing details. */
function customerOrder(o, opts) {
  const x = orderOut(o, opts);
  // while JOLOF hasn't confirmed, prices shown are the catalogue prices at the time of the request
  return {
    ...x, events: [], declinedBy: [], fulfilments: {},
    driver: x.driver && ['shipped', 'delivered'].includes(x.status) ? { name: x.driver.name, phone: x.driver.phone, vehicle: x.driver.vehicle } : null,
    items: x.items.map(({ vendorId, warehouseId, distanceKm, ...rest }) => rest),
  };
}

/** Supplier view: only their lines, valued at their own supply price, and no customer details. */
function supplierOrder(o, vendorId, costs, myWh) {
  const x = orderOut(o);
  const items = x.items.filter((i) => i.vendorId === vendorId).map((i) => ({ ...i, price: costs.get(`${vendorId}|${i.productId}`) ?? null }));
  if (!items.length) return null;
  const fulfilments = Object.fromEntries(Object.entries(x.fulfilments).filter(([w]) => myWh.has(w)));
  const others = Object.keys(x.fulfilments).length - Object.keys(fulfilments).length + (x.items.some((i) => i.productId && !i.warehouseId) ? 1 : 0);
  return {
    id: x.id, status: x.status, createdAt: x.createdAt, guest: false, customer: null, address: null, location: null, notes: '',
    items, fulfilments, otherParts: Math.max(0, others), tracking: '', timeline: [], events: [], subtotal: 0, shipping: 0, total: 0,
    payment: x.payment, paymentMethod: x.paymentMethod, source: x.source,
  };
}

/** One order as its customer sees it (used for the guest confirmation page). */
export async function orderForCustomer(id) {
  const o = await prisma.order.findUnique({ where: { id }, include: { items: { orderBy: { sort: 'asc' } }, fulfilments: true, invoice: true } });
  return o ? customerOrder(o, {}) : null;
}

function inquiryOut(q, { internal }) {
  return {
    id: q.id, type: q.type, userId: q.userId, name: q.name, company: q.company, email: q.email, phone: q.phone, dept: q.dept, message: q.message,
    items: q.items, trade: q.trade, address: q.address, status: q.status, notes: internal ? q.notes : [], quote: q.quote, orderId: q.orderId, createdAt: iso(q.createdAt),
  };
}

const invoiceOut = (v) => ({ id: v.id, orderId: v.orderId, billTo: v.billTo, shipTo: v.shipTo, lines: v.lines, subtotal: v.subtotal, deliveryFee: v.deliveryFee, discount: v.discount, total: v.total, status: v.status, notes: v.notes, issuedAt: iso(v.issuedAt), dueAt: iso(v.dueAt) });

export async function buildState(user) {
  const role = user?.role || 'public';
  const admin = role === 'admin';
  const vendor = role === 'vendor';
  const settings = await getSettings();

  const [departments, categories, products, commodities, offerRows, levels, activeVendors, activeOffers] = await Promise.all([
    prisma.department.findMany({ orderBy: [{ sort: 'asc' }, { name: 'asc' }] }),
    prisma.category.findMany({ orderBy: [{ sort: 'asc' }, { name: 'asc' }], include: { department: true } }),
    prisma.product.findMany({ orderBy: [{ sort: 'asc' }, { createdAt: 'asc' }], include: { category: { include: { department: true } } } }),
    prisma.commodity.findMany({ orderBy: { sort: 'asc' } }),
    admin || vendor ? prisma.supplierOffer.findMany(admin ? {} : { where: { vendorId: user.id } }) : [],
    prisma.stockLevel.findMany({ include: { warehouse: { select: { vendorId: true, active: true } } } }),
    prisma.user.findMany({ where: { role: 'vendor', status: 'active' }, select: { id: true } }),
    prisma.supplierOffer.findMany({ where: { status: 'active' }, select: { vendorId: true, productId: true } }),
  ]);

  // storefront stock = what approved suppliers hold in active warehouses on active offers
  const live = new Set(activeVendors.map((v) => v.id));
  const offerActive = new Set(activeOffers.map((o) => `${o.vendorId}|${o.productId}`));
  const totals = {};
  levels.forEach((l) => {
    if (!l.warehouse.active || !live.has(l.warehouse.vendorId) || !offerActive.has(`${l.warehouse.vendorId}|${l.productId}`)) return;
    totals[l.productId] = (totals[l.productId] || 0) + l.qty;
  });
  const hidePrices = !admin && !settings.showPricing;

  const productList = products
    .filter((p) => admin || vendor || (p.status === 'active' && p.category.status !== 'hidden' && p.category.department.status !== 'hidden'))
    .map((p) => ({
      id: p.id, sku: p.sku, dept: p.category.department.name, departmentId: p.category.departmentId, cat: p.category.name, categoryId: p.categoryId, brand: p.brand || undefined, name: p.name, size: p.size, pack: p.pack,
      price: hidePrices ? null : p.price, hasPrice: p.price != null, img: p.img, desc: p.desc, tag: p.tag || undefined, real: p.real,
      stock: totals[p.id] || 0, lowStock: p.lowStock, moq: p.moq, status: p.status, featured: p.featured, bestSeller: p.bestSeller,
      newArrival: p.newArrival, recommended: p.recommended, source: p.source, createdAt: iso(p.createdAt),
    }));

  const state = {
    me: userOut(user),
    sessionUserId: user?.id || null,
    settings: admin ? { ...settings, mapsEnabled: mapsEnabled() } : { showPricing: settings.showPricing, delivery: settings.delivery, store: settings.store, invoice: { dueDays: settings.invoice.dueDays, payTo: settings.invoice.payTo, footer: settings.invoice.footer } },
    departments: departments.filter((d) => admin || vendor || d.status !== 'hidden').map((d) => ({ id: d.id, name: d.name, slug: d.slug, kind: d.kind, tagline: d.tagline, description: d.description, image: d.image, status: d.status, sort: d.sort })),
    categories: categories.filter((c) => admin || vendor || c.department.status !== 'hidden')
      .map((c) => ({ id: c.id, dept: c.department.name, departmentId: c.departmentId, name: c.name, status: c.department.status === 'coming_soon' && c.status === 'active' ? 'coming_soon' : c.status })),
    products: productList,
    commodities: commodities.map((c) => ({ ...c })),
    users: user ? [userOut(user)] : [],
    orders: [], inquiries: [], invoices: [], warehouses: [], offers: [], stockLog: [], subscribers: [], drivers: [], productRequests: [],
  };

  const stockByOffer = (o) => Object.fromEntries(levels.filter((l) => l.productId === o.productId && l.warehouse.vendorId === o.vendorId).map((l) => [l.warehouseId, l.qty]));
  const orderInclude = { items: { orderBy: { sort: 'asc' } }, fulfilments: true, invoice: true };

  if (admin) {
    const [users, warehouses, orders, inquiries, invoices, stockLog, subscribers, drivers, requests] = await Promise.all([
      prisma.user.findMany({ include: { addresses: true }, orderBy: { createdAt: 'asc' } }),
      prisma.warehouse.findMany({ orderBy: { createdAt: 'asc' } }),
      prisma.order.findMany({ include: orderInclude, orderBy: { createdAt: 'desc' } }),
      prisma.inquiry.findMany({ orderBy: { createdAt: 'desc' } }),
      prisma.invoice.findMany({ orderBy: { issuedAt: 'desc' } }),
      prisma.stockLog.findMany({ orderBy: { at: 'desc' }, take: 400 }),
      prisma.subscriber.findMany({ orderBy: { at: 'desc' } }),
      prisma.driver.findMany({ orderBy: { createdAt: 'asc' } }),
      prisma.productRequest.findMany({ orderBy: { createdAt: 'desc' }, include: { category: { include: { department: true } }, vendor: { select: { company: true } } } }),
    ]);
    const dmap = new Map(drivers.map((d) => [d.id, d]));
    Object.assign(state, {
      users: users.map(userOut),
      warehouses: warehouses.map(warehouseOut),
      offers: offerRows.map((o) => ({ id: o.id, vendorId: o.vendorId, productId: o.productId, cost: o.cost, status: o.status, updatedAt: iso(o.updatedAt), stock: stockByOffer(o) })),
      orders: orders.map((o) => orderOut(o, { drivers: dmap })),
      inquiries: inquiries.map((q) => inquiryOut(q, { internal: true })),
      invoices: invoices.map(invoiceOut),
      stockLog: stockLog.map((l) => ({ ...l, at: iso(l.at) })),
      subscribers: subscribers.map((s) => ({ email: s.email, at: iso(s.at) })),
      drivers: drivers.map((d) => ({ ...d, createdAt: iso(d.createdAt) })),
      productRequests: requests.map((r) => ({ ...r, dept: r.category.department.name, cat: r.category.name, company: r.vendor.company, category: undefined, vendor: undefined, createdAt: iso(r.createdAt), reviewedAt: iso(r.reviewedAt) })),
    });
  } else if (vendor) {
    const [warehouses, requests] = await Promise.all([
      prisma.warehouse.findMany({ where: { vendorId: user.id }, orderBy: { createdAt: 'asc' } }),
      prisma.productRequest.findMany({ where: { vendorId: user.id }, orderBy: { createdAt: 'desc' }, include: { category: { include: { department: true } } } }),
    ]);
    const myWh = new Set(warehouses.map((w) => w.id));
    const orders = await prisma.order.findMany({ where: { items: { some: { vendorId: user.id } } }, include: orderInclude, orderBy: { createdAt: 'desc' } });
    const costs = new Map(offerRows.map((o) => [`${o.vendorId}|${o.productId}`, o.cost]));
    Object.assign(state, {
      warehouses: warehouses.map(warehouseOut),
      offers: offerRows.map((o) => ({ id: o.id, vendorId: o.vendorId, productId: o.productId, cost: o.cost, status: o.status, updatedAt: iso(o.updatedAt), stock: stockByOffer(o) })),
      orders: orders.map((o) => supplierOrder(o, user.id, costs, myWh)).filter(Boolean),
      productRequests: requests.map((r) => ({ ...r, dept: r.category.department.name, cat: r.category.name, category: undefined, createdAt: iso(r.createdAt), reviewedAt: iso(r.reviewedAt) })),
    });
  } else if (user) {
    const [orders, inquiries, drivers] = await Promise.all([
      prisma.order.findMany({ where: { userId: user.id }, include: orderInclude, orderBy: { createdAt: 'desc' } }),
      prisma.inquiry.findMany({ where: { OR: [{ userId: user.id }, { email: { equals: user.email, mode: 'insensitive' } }] }, orderBy: { createdAt: 'desc' } }),
      prisma.driver.findMany(),
    ]);
    const dmap = new Map(drivers.map((d) => [d.id, d]));
    state.orders = orders.map((o) => customerOrder(o, { drivers: dmap }));
    state.inquiries = inquiries.map((q) => inquiryOut(q, { internal: false }));
    state.invoices = orders.filter((o) => o.invoice && o.invoice.status !== 'void').map((o) => invoiceOut(o.invoice));
  }
  return state;
}
