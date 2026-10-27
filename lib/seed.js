// Demo seed data — users, orders, inquiries. Fixed dates so every fresh load looks the same.
import { SEED_PRODUCTS } from './catalogue';
import { locationFromAddress, getLocation, distanceKm } from './locations';
import { planFulfilment, recalcProductStock, ORDER_TO_FUL, HOUSE_VENDOR } from './fulfilment';

const byId = Object.fromEntries(SEED_PRODUCTS.map((p) => [p.id, p]));
const line = (id, qty) => {
  const p = byId[id];
  return { productId: id, name: p.name, size: [p.size, p.pack].filter(Boolean).join(' · '), img: p.img, qty, price: p.price };
};
const sum = (items) => Math.round(items.reduce((s, i) => s + (i.price || 0) * i.qty, 0) * 100) / 100;

export const DEMO_ACCOUNTS = [
  { role: 'admin', email: 'admin@jolof.demo', password: 'admin123', label: 'Admin' },
  { role: 'customer', email: 'retailer@jolof.demo', password: 'demo123', label: 'Retailer' },
  { role: 'customer', email: 'customer@jolof.demo', password: 'demo123', label: 'Individual' },
  { role: 'vendor', email: 'vendor@jolof.demo', password: 'demo123', label: 'Supplier' },
];

export const SEED_USERS = [
  {
    id: 'u-admin', role: 'admin', type: 'staff', name: 'Moussa Diallo', email: 'admin@jolof.demo', password: 'admin123',
    phone: '+221 77 000 1100', company: 'JOLOF TRADING', status: 'active', createdAt: '2026-01-04T09:00:00Z', addresses: [],
  },
  {
    id: 'u-1001', role: 'customer', type: 'retailer', name: 'Aminata Sow', email: 'retailer@jolof.demo', password: 'demo123',
    phone: '+61 412 555 018', company: 'Teranga African Grocery', abn: '51 824 753 556', businessType: 'Grocery store',
    status: 'active', createdAt: '2026-03-12T10:20:00Z',
    addresses: [
      { id: 'a1', label: 'Store', line1: '14 Footscray Market Lane', city: 'Footscray', state: 'VIC', postcode: '3011', country: 'Australia', isDefault: true },
      { id: 'a2', label: 'Warehouse', line1: 'Unit 6, 22 Industrial Dr', city: 'Braybrook', state: 'VIC', postcode: '3019', country: 'Australia' },
    ],
  },
  {
    id: 'u-1002', role: 'customer', type: 'individual', name: 'Fatou Ndiaye', email: 'customer@jolof.demo', password: 'demo123',
    phone: '+61 433 210 774', company: '', status: 'active', createdAt: '2026-06-02T14:05:00Z',
    addresses: [{ id: 'a1', label: 'Home', line1: '8 Wattle St', city: 'Blacktown', state: 'NSW', postcode: '2148', country: 'Australia', isDefault: true }],
  },
  {
    id: 'u-1003', role: 'customer', type: 'retailer', name: 'Kwame Mensah', email: 'kwame@accrabeauty.demo', password: 'demo123',
    phone: '+61 400 778 902', company: 'Accra Beauty Supply', abn: '33 619 004 812', businessType: 'Beauty salon & retail',
    status: 'pending', createdAt: '2026-10-25T08:40:00Z',
    addresses: [{ id: 'a1', label: 'Shop', line1: '201 Sydney Rd', city: 'Brunswick', state: 'VIC', postcode: '3056', country: 'Australia', isDefault: true }],
  },
  {
    id: 'u-1004', role: 'customer', type: 'retailer', name: 'Ibrahim Keita', email: 'ibrahim@sahelmart.demo', password: 'demo123',
    phone: '+61 421 330 615', company: 'Sahel Mart', abn: '78 102 445 390', businessType: 'Grocery store',
    status: 'active', createdAt: '2026-05-18T11:00:00Z',
    addresses: [{ id: 'a1', label: 'Store', line1: '3/45 Beaufort St', city: 'Mount Lawley', state: 'WA', postcode: '6050', country: 'Australia', isDefault: true }],
  },

  /* ---- Suppliers / wholesalers (role: vendor) ---- */
  {
    id: HOUSE_VENDOR, role: 'vendor', type: 'house', name: 'JOLOF Warehouse Team', email: 'warehouse@jolof.demo', password: 'demo123',
    phone: '+61 3 9000 1100', company: 'JOLOF TRADING (own stock)', abn: '—', businessType: 'In-house warehouse',
    status: 'active', createdAt: '2026-01-04T09:00:00Z', addresses: [],
  },
  {
    id: 'v-2001', role: 'vendor', type: 'supplier', name: 'Ousmane Ba', email: 'vendor@jolof.demo', password: 'demo123',
    phone: '+61 2 9600 4410', company: 'Sahel Wholesale Foods', abn: '62 509 118 774', businessType: 'Food wholesaler',
    status: 'active', createdAt: '2026-02-20T09:00:00Z', addresses: [],
  },
  {
    id: 'v-2002', role: 'vendor', type: 'supplier', name: 'Adwoa Mensah', email: 'westcoast@beauty.demo', password: 'demo123',
    phone: '+61 8 9455 2030', company: 'West Coast Beauty Wholesale', abn: '19 330 772 105', businessType: 'Cosmetics distributor',
    status: 'active', createdAt: '2026-04-02T09:00:00Z', addresses: [],
  },
  {
    id: 'v-2003', role: 'vendor', type: 'supplier', name: 'Cheikh Fall', email: 'cheikh@baobab.demo', password: 'demo123',
    phone: '+61 3 6200 8812', company: 'Baobab Trade Supplies', abn: '40 712 334 096', businessType: 'Food wholesaler',
    status: 'pending', createdAt: '2026-10-26T03:00:00Z', addresses: [],
  },
];

/* ---- Supplier warehouses ---- */
export const SEED_WAREHOUSES = [
  { id: 'wh-jolof-mel', vendorId: HOUSE_VENDOR, name: 'JOLOF Footscray DC', line1: '40 Whitehall St', suburb: 'Footscray', postcode: '3011', locationId: 'melbourne', active: true },
  { id: 'wh-sahel-syd', vendorId: 'v-2001', name: 'Sahel — Sydney West', line1: '12 Victoria St', suburb: 'Wetherill Park', postcode: '2164', locationId: 'sydney', active: true },
  { id: 'wh-sahel-bne', vendorId: 'v-2001', name: 'Sahel — Brisbane South', line1: '5 Ashover Rd', suburb: 'Rocklea', postcode: '4106', locationId: 'brisbane', active: true },
  { id: 'wh-wcb-per', vendorId: 'v-2002', name: 'West Coast — Canning Vale', line1: '18 Bannister Rd', suburb: 'Canning Vale', postcode: '6155', locationId: 'perth', active: true },
  { id: 'wh-wcb-adl', vendorId: 'v-2002', name: 'West Coast — Adelaide', line1: '7 Kings Rd', suburb: 'Wingfield', postcode: '5013', locationId: 'adelaide', active: true },
  { id: 'wh-bao-hob', vendorId: 'v-2003', name: 'Baobab — Hobart', line1: '22 Lampton Ave', suburb: 'Derwent Park', postcode: '7009', locationId: 'hobart', active: true },
];

/* ---- What each supplier carries (one offer per supplier + product, stock per warehouse) ---- */
const hash = (str) => { let h = 0; for (const c of str) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h; };
const SCARCE = ['p3', 'jc9', 'd3', 'jc16']; // only JOLOF holds these, so stock alerts still show
export const SEED_OFFERS = (() => {
  const out = [];
  const offer = (vendorId, p, stock, costFactor) => out.push({
    id: `of-${vendorId}-${p.id}`, vendorId, productId: p.id, status: 'active', stock,
    cost: typeof p.price === 'number' ? Math.round(p.price * costFactor * 100) / 100 : null, updatedAt: '2026-10-01T03:00:00Z',
  });
  SEED_PRODUCTS.forEach((p) => {
    const h = hash(p.id);
    if (SCARCE.includes(p.id)) { offer(HOUSE_VENDOR, p, { 'wh-jolof-mel': p.stock }, 0.7); return; }
    offer(HOUSE_VENDOR, p, { 'wh-jolof-mel': Math.round(p.stock * 0.45) }, 0.7);
    if (p.dept === 'Food' && h % 5 !== 0) offer('v-2001', p, { 'wh-sahel-syd': 20 + (h % 160), 'wh-sahel-bne': h % 3 === 0 ? 0 : 12 + (h % 90) }, 0.74);
    if (p.dept === 'Cosmetics' && h % 5 !== 1) offer('v-2002', p, { 'wh-wcb-per': 8 + (h % 70), 'wh-wcb-adl': h % 4 === 0 ? 0 : 6 + (h % 40) }, 0.76);
    if (p.dept === 'Food' && h % 3 === 1) offer('v-2003', p, { 'wh-bao-hob': 10 + (h % 50) }, 0.72);
  });
  return out;
})();

/** Catalogue with stock totals derived from supplier offers */
export const SEED_PRODUCTS_STOCKED = recalcProductStock(SEED_PRODUCTS, SEED_OFFERS, SEED_USERS);

const addr = (u) => SEED_USERS.find((x) => x.id === u).addresses[0];
const cust = (u) => { const x = SEED_USERS.find((y) => y.id === u); return { name: x.name, email: x.email, phone: x.phone, company: x.company }; };

// Seed orders are routed with the same rule as live checkouts
// historical orders that no one could fill today were shipped by JOLOF's own warehouse
const route = (items, location) => {
  const plan = planFulfilment({ lines: items, location, warehouses: SEED_WAREHOUSES, offers: SEED_OFFERS, users: SEED_USERS });
  const house = { vendorId: HOUSE_VENDOR, warehouseId: 'wh-jolof-mel', distanceKm: distanceKm(location, getLocation('melbourne')) };
  return items.map((it, i) => ({ ...it, ...(plan[i] || house) }));
};
const fulFor = (items, status) => Object.fromEntries([...new Set(items.map((i) => i.warehouseId).filter(Boolean))].map((w) => [w, { status: ORDER_TO_FUL[status] === 'cancelled' ? 'assigned' : ORDER_TO_FUL[status], tracking: '', at: null }]));

const mkOrder = (id, userId, rawItems, status, createdAt, extra = {}) => {
  const address = extra.address || addr(userId);
  const location = locationFromAddress(address);
  const items = route(rawItems, location);
  const subtotal = sum(items);
  const shipping = subtotal >= 250 ? 0 : 18;
  const flow = ['pending', 'confirmed', 'packed', 'shipped', 'delivered'];
  const steps = status === 'cancelled' ? ['pending', 'cancelled'] : flow.slice(0, flow.indexOf(status) + 1);
  const t0 = new Date(createdAt).getTime();
  return {
    id, userId, customer: userId ? cust(userId) : null, items, subtotal, shipping, total: Math.round((subtotal + shipping) * 100) / 100,
    status, payment: ['delivered', 'shipped', 'packed'].includes(status) ? 'paid' : 'unpaid',
    paymentMethod: 'bank_transfer', address, location, fulfilments: fulFor(items, status), source: 'checkout', notes: '', guest: false,
    tracking: ['shipped', 'delivered'].includes(status) ? `AUP${id.replace(/\D/g, '')}771` : '',
    timeline: steps.map((s, i) => ({ status: s, at: new Date(t0 + i * 26 * 3600e3).toISOString(), note: '' })),
    createdAt, ...extra,
  };
};

export const SEED_ORDERS = [
  mkOrder('JT-10241', 'u-1001', [line('s1', 12), line('s2', 6), line('g4', 24), line('p2', 12)], 'pending', '2026-10-27T05:12:00Z'),
  mkOrder('JT-10240', 'u-1004', [line('d1', 10), line('d4', 6), line('c5', 12)], 'confirmed', '2026-10-26T09:30:00Z'),
  mkOrder('JT-10239', null, [line('s1', 6), line('g1', 12), line('c1', 10)], 'pending', '2026-10-26T01:20:00Z', {
    guest: true, customer: { name: 'Mariam Touré', email: 'mariam.toure@demo.com', phone: '+61 450 118 302', company: '' },
    address: { label: 'Delivery', line1: '9 Logan Rd', city: 'Woolloongabba', state: 'QLD', postcode: '4102', country: 'Australia' },
  }),
  mkOrder('JT-10238', 'u-1002', [line('c1', 3), line('p1', 6), line('p5', 1)], 'packed', '2026-10-25T03:45:00Z'),
  mkOrder('JT-10235', 'u-1001', [line('jc29', 2), line('jc38', 2), line('k1', 1)], 'shipped', '2026-10-22T07:10:00Z'),
  mkOrder('JT-10229', 'u-1004', [line('g1', 24), line('g2', 24), line('s6', 12)], 'delivered', '2026-10-15T02:00:00Z'),
  mkOrder('JT-10224', 'u-1001', [line('d3', 4), line('c6', 12)], 'delivered', '2026-10-08T06:25:00Z'),
  mkOrder('JT-10219', 'u-1002', [line('k2', 2), line('p4', 2)], 'cancelled', '2026-10-03T10:00:00Z'),
  mkOrder('JT-10212', 'u-1001', [line('s3', 10), line('p3', 8), line('c3', 6)], 'delivered', '2026-09-24T04:00:00Z'),
];

export const SEED_INQUIRIES = [
  {
    id: 'INQ-2058', type: 'product', userId: null, name: 'Grace Okafor', company: 'Lagos Kitchen Store', email: 'grace@lagoskitchen.demo', phone: '+61 410 223 901',
    dept: 'Cosmetics', message: 'Hi, please send wholesale pricing for Chebe Hair Oil and Chebe Hair Mask. We would take 4 cases of each to start.',
    items: [{ productId: 'jc6', name: 'Chebe Hair Oil', qty: 4, unit: 'cases' }, { productId: 'jc7', name: 'Chebe Hair Mask', qty: 4, unit: 'cases' }],
    status: 'new', createdAt: '2026-10-27T04:02:00Z', notes: [], quote: null, orderId: null,
  },
  {
    id: 'INQ-2057', type: 'commodity', userId: 'u-1004', name: 'Ibrahim Keita', company: 'Sahel Mart', email: 'ibrahim@sahelmart.demo', phone: '+61 421 330 615',
    dept: 'Trading', message: 'Looking for a monthly supply of sesame seeds, hulled, for our packing line. CIF Fremantle.',
    items: [{ commodityId: 'cm6', name: 'Sesame Seeds', qty: 20, unit: 'MT' }],
    trade: { incoterm: 'CIF', port: 'Fremantle, WA', frequency: 'Monthly', targetPrice: 1400 },
    status: 'new', createdAt: '2026-10-26T22:15:00Z', notes: [], quote: null, orderId: null,
  },
  {
    id: 'INQ-2055', type: 'product', userId: 'u-1001', name: 'Aminata Sow', company: 'Teranga African Grocery', email: 'retailer@jolof.demo', phone: '+61 412 555 018',
    dept: 'Cosmetics', message: 'Can you quote Dudu Osun and African Black Soap by the carton? Also interested in Vaseline Cocoa Glow.',
    items: [{ productId: 'jc12', name: 'Dudu Osun Black Soap Classic/Fragrance', qty: 3, unit: 'cases' }, { productId: 'jc11', name: 'African Black Soap', qty: 2, unit: 'cases' }, { productId: 'jc3', name: 'Vaseline Cocoa Glow Lotion', qty: 2, unit: 'cases' }],
    status: 'quoted', createdAt: '2026-10-24T03:30:00Z',
    notes: [{ by: 'Moussa Diallo', text: 'Regular customer — applied 5% loyalty discount.', at: '2026-10-24T08:00:00Z' }],
    quote: {
      lines: [
        { productId: 'jc12', name: 'Dudu Osun Black Soap Classic/Fragrance', size: '150g · 48 pcs', qty: 3, unitPrice: 62.4 },
        { productId: 'jc11', name: 'African Black Soap', size: '250g · 72 pcs', qty: 2, unitPrice: 79.2 },
        { productId: 'jc3', name: 'Vaseline Cocoa Glow Lotion', size: '260 gr · 36 Units', qty: 2, unitPrice: 118.8 },
      ],
      shipping: 0, validUntil: '2026-11-07', note: 'Prices per case. Free delivery to Footscray. Stock reserved for 10 days.', sentAt: '2026-10-24T08:05:00Z',
    },
    orderId: null,
  },
  {
    id: 'INQ-2052', type: 'bulk', userId: null, name: 'Daniel Mekonnen', company: 'Habesha Market', email: 'daniel@habesha.demo', phone: '+61 433 900 120',
    dept: 'Food', message: 'We run two stores in Melbourne. Interested in Jumbo cubes, Maggi and Saafia range at volume — pallet pricing please.',
    items: [], status: 'in_review', createdAt: '2026-10-23T01:10:00Z',
    notes: [{ by: 'Moussa Diallo', text: 'Called Daniel — wants 1 pallet mixed. Preparing quote.', at: '2026-10-23T05:00:00Z' }], quote: null, orderId: null,
  },
  {
    id: 'INQ-2049', type: 'cart', userId: 'u-1004', name: 'Ibrahim Keita', company: 'Sahel Mart', email: 'ibrahim@sahelmart.demo', phone: '+61 421 330 615',
    dept: 'Food', message: 'Bulk quote for my cart please.',
    items: [{ productId: 'g1', name: 'Saafia Arraw', qty: 48, unit: 'units' }, { productId: 'g2', name: 'Saafia Thiacry', qty: 48, unit: 'units' }],
    status: 'accepted', createdAt: '2026-10-12T02:00:00Z', notes: [],
    quote: { lines: [{ productId: 'g1', name: 'Saafia Arraw', size: '500 g', qty: 48, unitPrice: 2.95 }, { productId: 'g2', name: 'Saafia Thiacry', size: '500 g', qty: 48, unitPrice: 2.95 }], shipping: 0, validUntil: '2026-10-26', note: 'Volume price.', sentAt: '2026-10-12T06:00:00Z' },
    orderId: 'JT-10229',
  },
  {
    id: 'INQ-2046', type: 'contact', userId: null, name: 'Sarah Bennett', company: '', email: 'sarah.b@demo.com', phone: '',
    dept: 'Food', message: 'Do you deliver to Hobart? And is there a minimum order for individuals?',
    items: [], status: 'closed', createdAt: '2026-10-09T09:00:00Z',
    notes: [{ by: 'Moussa Diallo', text: 'Replied by email — yes via courier, no minimum.', at: '2026-10-09T11:00:00Z' }], quote: null, orderId: null,
  },
];

export const SEED_STOCK_LOG = [
  { id: 'sl3', productId: 'p3', change: -8, reason: 'Order JT-10212', at: '2026-09-24T04:00:00Z', by: 'System' },
  { id: 'sl2', productId: 'd3', change: -4, reason: 'Order JT-10224', at: '2026-10-08T06:25:00Z', by: 'System' },
  { id: 'sl1', productId: 's1', change: 240, reason: 'Container JT-C14 received', at: '2026-10-01T03:00:00Z', by: 'Moussa Diallo' },
];

export const SEED_SUBSCRIBERS = [
  { email: 'kofi@demo.com', at: '2026-10-20T10:00:00Z' },
  { email: 'mariam.t@demo.com', at: '2026-10-18T10:00:00Z' },
  { email: 'olu@demo.com', at: '2026-10-11T10:00:00Z' },
];
