// Demo / starter data for JOLOF TRADING.
// Loads the current storefront catalogue (lib/catalogue.js) into the database, plus demo
// customers, suppliers with US warehouses and stock, drivers, orders, inquiries and settings.
// Used by `npm run db:seed` and Admin → Settings → Reset demo data.
import bcrypt from 'bcryptjs';
import { SEED_PRODUCTS, SEED_COMMODITIES, BASE_CATEGORIES } from '../lib/catalogue.js';
import { getLocation, locationFromAddress } from '../lib/locations.js';
import { planLines } from '../lib/server/routing.js';
import { haversineMiles, ROAD_FACTOR } from '../lib/server/maps.js';
import { deliveryFee, orderDeliveryFee, DEFAULT_DELIVERY } from '../lib/delivery.js';

const HOUSE = 'v-jolof';
const hash = (s) => { let h = 0; for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h; };
const r2 = (n) => Math.round(n * 100) / 100;
const jitter = (id, k) => ((hash(id + k) % 1000) / 1000 - 0.5) * 0.08; // keep warehouses off the exact city centre

/* ---------------- people ---------------- */

const USERS = [
  { id: 'u-admin', role: 'admin', type: 'staff', name: 'Moussa Diallo', email: 'admin@jolof.demo', password: 'admin123', phone: '+1 (973) 555-1100', company: 'JOLOF TRADING', createdAt: '2026-01-04T09:00:00Z' },
  {
    id: 'u-1001', role: 'customer', type: 'retailer', name: 'Aminata Sow', email: 'retailer@jolof.demo', password: 'demo123', phone: '+1 (212) 555-0182', company: 'Teranga African Grocery', abn: '13-4827531', businessType: 'Grocery store', createdAt: '2026-03-12T10:20:00Z',
    addresses: [
      { id: 'a-1001-1', label: 'Store', line1: '2154 Adam Clayton Powell Jr Blvd', city: 'New York', state: 'NY', postcode: '10027', isDefault: true },
      { id: 'a-1001-2', label: 'Warehouse', line1: 'Unit 6, 40 Avenue P', city: 'Newark', state: 'NJ', postcode: '07105' },
    ],
  },
  { id: 'u-1002', role: 'customer', type: 'individual', name: 'Fatou Ndiaye', email: 'customer@jolof.demo', password: 'demo123', phone: '+1 (713) 555-0774', createdAt: '2026-06-02T14:05:00Z', addresses: [{ id: 'a-1002-1', label: 'Home', line1: '8 Willow Bend Dr', city: 'Houston', state: 'TX', postcode: '77035', isDefault: true }] },
  { id: 'u-1003', role: 'customer', type: 'retailer', name: 'Kwame Mensah', email: 'kwame@accrabeauty.demo', password: 'demo123', phone: '+1 (404) 555-0902', company: 'Accra Beauty Supply', abn: '58-3619004', businessType: 'Beauty salon & retail', status: 'pending', createdAt: '2026-10-25T08:40:00Z', addresses: [{ id: 'a-1003-1', label: 'Shop', line1: '201 Peachtree St NE', city: 'Atlanta', state: 'GA', postcode: '30303', isDefault: true }] },
  { id: 'u-1004', role: 'customer', type: 'retailer', name: 'Ibrahim Keita', email: 'ibrahim@sahelmart.demo', password: 'demo123', phone: '+1 (612) 555-0615', company: 'Sahel Mart', abn: '41-1024453', businessType: 'Grocery store', createdAt: '2026-05-18T11:00:00Z', addresses: [{ id: 'a-1004-1', label: 'Store', line1: '2401 Cedar Ave S', city: 'Minneapolis', state: 'MN', postcode: '55404', isDefault: true }] },
  { id: 'u-1005', role: 'customer', type: 'retailer', name: 'Nana Asante', email: 'nana@goldcoastmarket.demo', password: 'demo123', phone: '+1 (323) 555-0447', company: 'Gold Coast Market', abn: '62-7781902', businessType: 'Grocery & cosmetics', createdAt: '2026-07-09T16:30:00Z', addresses: [{ id: 'a-1005-1', label: 'Store', line1: '4330 Crenshaw Blvd', city: 'Los Angeles', state: 'CA', postcode: '90008', isDefault: true }] },

  /* suppliers (role vendor) — JOLOF's own stock is the house supplier */
  { id: HOUSE, role: 'vendor', type: 'house', isHouse: true, name: 'JOLOF Warehouse Team', email: 'warehouse@jolof.demo', password: 'demo123', phone: '+1 (973) 555-1100', company: 'JOLOF TRADING (own stock)', abn: '—', businessType: 'In-house warehouse', createdAt: '2026-01-04T09:00:00Z' },
  { id: 'v-2001', role: 'vendor', type: 'supplier', name: 'Ousmane Ba', email: 'vendor@jolof.demo', password: 'demo123', phone: '+1 (713) 555-4410', company: 'Sahel Wholesale Foods', abn: '76-5091187', businessType: 'Food wholesaler', createdAt: '2026-02-20T09:00:00Z' },
  { id: 'v-2002', role: 'vendor', type: 'supplier', name: 'Adwoa Mensah', email: 'westcoast@beauty.demo', password: 'demo123', phone: '+1 (323) 555-2030', company: 'West Coast Beauty Wholesale', abn: '95-3307721', businessType: 'Cosmetics distributor', createdAt: '2026-04-02T09:00:00Z' },
  { id: 'v-2003', role: 'vendor', type: 'supplier', name: 'Cheikh Fall', email: 'cheikh@baobab.demo', password: 'demo123', phone: '+1 (773) 555-8812', company: 'Baobab Trade Supplies', abn: '36-7123340', businessType: 'Food wholesaler', status: 'pending', createdAt: '2026-10-26T03:00:00Z' },
  { id: 'v-2004', role: 'vendor', type: 'supplier', name: 'Grace Adeyemi', email: 'midwest@foods.demo', password: 'demo123', phone: '+1 (312) 555-7720', company: 'Midwest African Foods', abn: '27-4410983', businessType: 'Food wholesaler', createdAt: '2026-03-15T09:00:00Z' },
  { id: 'v-2005', role: 'vendor', type: 'supplier', name: 'Samuel Owusu', email: 'lonestar@cosmetics.demo', password: 'demo123', phone: '+1 (214) 555-3381', company: 'Lone Star Cosmetics Supply', abn: '81-2290447', businessType: 'Cosmetics distributor', createdAt: '2026-05-01T09:00:00Z' },
  { id: 'v-2006', role: 'vendor', type: 'supplier', name: 'Mamadou Sy', email: 'sunshine@wholesale.demo', password: 'demo123', phone: '+1 (305) 555-6610', company: 'Sunshine Wholesale Group', abn: '59-7741036', businessType: 'Food & cosmetics wholesaler', createdAt: '2026-06-10T09:00:00Z' },
  { id: 'v-2007', role: 'vendor', type: 'supplier', name: 'Aisha Bello', email: 'rocky@distribution.demo', password: 'demo123', phone: '+1 (303) 555-9014', company: 'Rocky Mountain Distribution', abn: '44-1187620', businessType: 'General wholesaler', createdAt: '2026-08-21T09:00:00Z' },
];

const WAREHOUSES = [
  { id: 'wh-jolof-nj', vendorId: HOUSE, name: 'JOLOF Port Newark DC', line1: '40 Doremus Ave', city: 'Newark', state: 'NJ', postcode: '07105', loc: 'newark' },
  { id: 'wh-jolof-atl', vendorId: HOUSE, name: 'JOLOF Atlanta Cross-dock', line1: '3500 Fulton Industrial Blvd SW', city: 'Atlanta', state: 'GA', postcode: '30336', loc: 'atlanta' },
  { id: 'wh-sahel-hou', vendorId: 'v-2001', name: 'Sahel — Houston', line1: '8600 Wallisville Rd', city: 'Houston', state: 'TX', postcode: '77029', loc: 'houston' },
  { id: 'wh-sahel-atl', vendorId: 'v-2001', name: 'Sahel — Atlanta', line1: '1350 Fulton Industrial Blvd NW', city: 'Atlanta', state: 'GA', postcode: '30336', loc: 'atlanta' },
  { id: 'wh-wcb-la', vendorId: 'v-2002', name: 'West Coast — Los Angeles', line1: '2100 E 49th St', city: 'Vernon', state: 'CA', postcode: '90058', loc: 'los-angeles' },
  { id: 'wh-wcb-sea', vendorId: 'v-2002', name: 'West Coast — Seattle', line1: '19800 84th Ave S', city: 'Kent', state: 'WA', postcode: '98032', loc: 'seattle' },
  { id: 'wh-bao-chi', vendorId: 'v-2003', name: 'Baobab — Chicago', line1: '4300 W 47th St', city: 'Chicago', state: 'IL', postcode: '60632', loc: 'chicago' },
  { id: 'wh-maf-chi', vendorId: 'v-2004', name: 'Midwest African — Chicago', line1: '2525 S Kedzie Ave', city: 'Chicago', state: 'IL', postcode: '60623', loc: 'chicago' },
  { id: 'wh-maf-msp', vendorId: 'v-2004', name: 'Midwest African — Minneapolis', line1: '1600 Broadway St NE', city: 'Minneapolis', state: 'MN', postcode: '55413', loc: 'minneapolis' },
  { id: 'wh-lsc-dal', vendorId: 'v-2005', name: 'Lone Star — Dallas', line1: '9400 Ambassador Row', city: 'Dallas', state: 'TX', postcode: '75247', loc: 'dallas' },
  { id: 'wh-sun-mia', vendorId: 'v-2006', name: 'Sunshine — Miami', line1: '7500 NW 25th St', city: 'Miami', state: 'FL', postcode: '33122', loc: 'miami' },
  { id: 'wh-sun-orl', vendorId: 'v-2006', name: 'Sunshine — Orlando', line1: '2300 Principal Row', city: 'Orlando', state: 'FL', postcode: '32837', loc: 'orlando' },
  { id: 'wh-rmd-den', vendorId: 'v-2007', name: 'Rocky Mountain — Denver', line1: '5050 Osage St', city: 'Denver', state: 'CO', postcode: '80221', loc: 'denver' },
  { id: 'wh-rmd-phx', vendorId: 'v-2007', name: 'Rocky Mountain — Phoenix', line1: '4202 W Van Buren St', city: 'Phoenix', state: 'AZ', postcode: '85009', loc: 'phoenix' },
].map((w) => { const l = getLocation(w.loc); return { ...w, lat: r2((l.lat + jitter(w.id, 'a')) * 1e4) / 1e4, lng: r2((l.lng + jitter(w.id, 'b')) * 1e4) / 1e4 }; });

const DRIVERS = [
  { id: 'drv-1', name: 'Marcus Johnson', phone: '+1 (973) 555-0141', email: 'marcus.j@jolof.demo', vehicle: 'Ford Transit 350 (box)', plate: 'NJ X41-KRT', homeBase: 'newark' },
  { id: 'drv-2', name: 'Abdoulaye Cisse', phone: '+1 (212) 555-0178', email: 'abdoulaye.c@jolof.demo', vehicle: 'Isuzu NPR 16ft', plate: 'NY KTD-4471', homeBase: 'new-york' },
  { id: 'drv-3', name: 'Tanya Brooks', phone: '+1 (404) 555-0193', email: 'tanya.b@jolof.demo', vehicle: 'Mercedes Sprinter', plate: 'GA CQR-2280', homeBase: 'atlanta' },
  { id: 'drv-4', name: 'Kofi Boateng', phone: '+1 (713) 555-0126', email: 'kofi.b@jolof.demo', vehicle: 'Ram ProMaster 2500', plate: 'TX MLV-9034', homeBase: 'houston' },
  { id: 'drv-5', name: 'Luis Hernandez', phone: '+1 (323) 555-0168', email: 'luis.h@jolof.demo', vehicle: 'Isuzu NPR 16ft', plate: 'CA 8XYZ219', homeBase: 'los-angeles' },
  { id: 'drv-6', name: 'Dawit Bekele', phone: '+1 (612) 555-0112', email: 'dawit.b@jolof.demo', vehicle: 'Ford Transit 250', plate: 'MN GHT-551', homeBase: 'minneapolis', status: 'off_duty' },
];

/* ---------------- stock: who carries what ----------------
   JOLOF's own warehouses hold a core range (the priced Carotone / Bio Claire wholesale lines it imports,
   plus about half of the food range). Suppliers carry the rest, so orders show both routes. */
function buildOffers() {
  const offers = []; // { vendorId, productId, cost, status }
  const stock = []; // { warehouseId, productId, qty }
  const add = (vendorId, p, whQty, factor) => {
    offers.push({ vendorId, productId: p.id, cost: typeof p.price === 'number' ? r2(p.price * factor) : null, status: 'active' });
    Object.entries(whQty).forEach(([warehouseId, qty]) => stock.push({ warehouseId, productId: p.id, qty }));
  };
  SEED_PRODUCTS.forEach((p) => {
    const h = hash(p.id);
    const food = p.dept === 'Food';
    const jolofCore = p.real || (food && h % 2 === 0) || ['jc6', 'jc7', 'jc11', 'jc12', 'k1', 'k2'].includes(p.id);
    if (jolofCore) {
      const scarce = ['p3', 'jc9', 'd3', 'jc16'].includes(p.id);
      add(HOUSE, p, { 'wh-jolof-nj': scarce ? 0 : 30 + (h % 260), 'wh-jolof-atl': scarce || h % 3 === 0 ? 0 : 12 + (h % 80) }, 0.7);
    }
    if (food && h % 5 !== 0) add('v-2001', p, { 'wh-sahel-hou': 20 + (h % 160), 'wh-sahel-atl': h % 3 === 0 ? 0 : 12 + (h % 90) }, 0.74);
    if (food && h % 3 === 1) add('v-2003', p, { 'wh-bao-chi': 10 + (h % 50) }, 0.72);
    if (food && h % 4 !== 2) add('v-2004', p, { 'wh-maf-chi': 15 + (h % 120), 'wh-maf-msp': h % 2 ? 8 + (h % 60) : 0 }, 0.75);
    if (!food && h % 5 !== 1) add('v-2002', p, { 'wh-wcb-la': 8 + (h % 70), 'wh-wcb-sea': h % 4 === 0 ? 0 : 6 + (h % 40) }, 0.76);
    if (!food && h % 3 !== 0) add('v-2005', p, { 'wh-lsc-dal': 10 + (h % 90) }, 0.77);
    if (h % 3 === 2) add('v-2006', p, { 'wh-sun-mia': 10 + (h % 70), 'wh-sun-orl': h % 2 ? 0 : 6 + (h % 50) }, 0.75);
    if (h % 4 === 1) add('v-2007', p, { 'wh-rmd-den': 12 + (h % 80), 'wh-rmd-phx': 8 + (h % 40) }, 0.76);
  });
  return { offers, stock };
}

/* ---------------- orders (routed with the live rule) ---------------- */
const byId = Object.fromEntries(SEED_PRODUCTS.map((p) => [p.id, p]));
const line = (id, qty) => { const p = byId[id]; return { productId: id, name: p.name, size: [p.size, p.pack].filter(Boolean).join(' · '), img: p.img, qty, price: p.price }; };
const ORDERS = [
  ['JT-10241', 'u-1001', [line('s1', 12), line('s2', 6), line('g4', 24), line('p2', 12)], 'pending', '2026-10-27T05:12:00Z'],
  ['JT-10240', 'u-1004', [line('d1', 10), line('d4', 6), line('c5', 12)], 'confirmed', '2026-10-26T09:30:00Z', { driverId: 'drv-6' }],
  ['JT-10239', null, [line('s1', 6), line('g1', 12), line('c1', 10)], 'pending', '2026-10-26T01:20:00Z', {
    guest: true, customer: { name: 'Mariam Touré', email: 'mariam.toure@demo.com', phone: '+1 (470) 555-0302', company: '' },
    address: { label: 'Delivery', line1: '455 Glen Iris Dr NE', city: 'Atlanta', state: 'GA', postcode: '30308', country: 'United States' },
  }],
  ['JT-10238', 'u-1002', [line('c1', 3), line('p1', 6), line('p5', 1)], 'packed', '2026-10-25T03:45:00Z', { driverId: 'drv-4' }],
  ['JT-10237', 'u-1005', [line('jc29', 3), line('jc38', 2), line('k1', 2)], 'confirmed', '2026-10-24T18:10:00Z', { driverId: 'drv-5' }],
  ['JT-10235', 'u-1001', [line('jc29', 2), line('jc38', 2), line('k1', 1)], 'shipped', '2026-10-22T07:10:00Z', { driverId: 'drv-2' }],
  ['JT-10229', 'u-1004', [line('g1', 24), line('g2', 24), line('s6', 12)], 'delivered', '2026-10-15T02:00:00Z', { source: 'quote', inquiryId: 'INQ-2049', price: { g1: 2.95, g2: 2.95 }, driverId: 'drv-6' }],
  ['JT-10224', 'u-1001', [line('d3', 4), line('c6', 12)], 'delivered', '2026-10-08T06:25:00Z', { driverId: 'drv-1' }],
  ['JT-10219', 'u-1002', [line('k2', 2), line('p4', 2)], 'cancelled', '2026-10-03T10:00:00Z'],
  ['JT-10212', 'u-1001', [line('s3', 10), line('p3', 8), line('c3', 6)], 'delivered', '2026-09-24T04:00:00Z', { driverId: 'drv-1' }],
];

const INQUIRIES = [
  {
    id: 'INQ-2058', type: 'product', userId: null, name: 'Grace Okafor', company: 'Lagos Kitchen Store', email: 'grace@lagoskitchen.demo', phone: '+1 (301) 555-0901',
    dept: 'Cosmetics', message: 'Hi, please send wholesale pricing for Chebe Hair Oil and Chebe Hair Mask. We would take 4 cases of each to start.',
    items: [{ productId: 'jc6', name: 'Chebe Hair Oil', qty: 4, unit: 'cases' }, { productId: 'jc7', name: 'Chebe Hair Mask', qty: 4, unit: 'cases' }],
    address: { label: 'Store', line1: '8020 Georgia Ave', city: 'Silver Spring', state: 'MD', postcode: '20910', country: 'United States' },
    status: 'new', createdAt: '2026-10-27T04:02:00Z',
  },
  {
    id: 'INQ-2057', type: 'commodity', userId: 'u-1004', name: 'Ibrahim Keita', company: 'Sahel Mart', email: 'ibrahim@sahelmart.demo', phone: '+1 (612) 555-0615',
    dept: 'Trading', message: 'Looking for a monthly supply of sesame seeds, hulled, for our packing line. CIF Port of New York/New Jersey.',
    items: [{ commodityId: 'cm6', name: 'Sesame Seeds', qty: 20, unit: 'MT' }], trade: { incoterm: 'CIF', port: 'Port of New York/New Jersey', frequency: 'Monthly', targetPrice: 1400 },
    status: 'new', createdAt: '2026-10-26T22:15:00Z',
  },
  {
    id: 'INQ-2055', type: 'product', userId: 'u-1001', name: 'Aminata Sow', company: 'Teranga African Grocery', email: 'retailer@jolof.demo', phone: '+1 (212) 555-0182',
    dept: 'Cosmetics', message: 'Can you quote Dudu Osun and African Black Soap by the carton? Also interested in Vaseline Cocoa Glow.',
    items: [{ productId: 'jc12', name: 'Dudu Osun Black Soap Classic/Fragrance', qty: 3, unit: 'cases' }, { productId: 'jc11', name: 'African Black Soap', qty: 2, unit: 'cases' }, { productId: 'jc3', name: 'Vaseline Cocoa Glow Lotion', qty: 2, unit: 'cases' }],
    status: 'quoted', createdAt: '2026-10-24T03:30:00Z',
    notes: [{ by: 'Moussa Diallo', text: 'Regular customer — applied 5% loyalty discount.', at: '2026-10-24T08:00:00Z' }],
    quote: {
      lines: [
        { productId: 'jc12', name: 'Dudu Osun Black Soap Classic/Fragrance', size: '150g · 48 pcs', unit: 'cases', qty: 3, unitPrice: 62.4 },
        { productId: 'jc11', name: 'African Black Soap', size: '250g · 72 pcs', unit: 'cases', qty: 2, unitPrice: 79.2 },
        { productId: 'jc3', name: 'Vaseline Cocoa Glow Lotion', size: '260 gr · 36 Units', unit: 'cases', qty: 2, unitPrice: 118.8 },
      ],
      shipping: 4.5, deliveryMiles: 18, discount: 0, validUntil: '2026-11-07', note: 'Prices per case. Stock reserved for 10 days.', sentAt: '2026-10-24T08:05:00Z', sentBy: 'Moussa Diallo',
    },
  },
  {
    id: 'INQ-2052', type: 'bulk', userId: null, name: 'Daniel Mekonnen', company: 'Habesha Market', email: 'daniel@habesha.demo', phone: '+1 (202) 555-0120',
    dept: 'Food', message: 'We run two stores in Washington DC. Interested in Jumbo cubes, Maggi and Saafia range at volume — pallet pricing please.',
    items: [], status: 'in_review', createdAt: '2026-10-23T01:10:00Z',
    address: { label: 'Store', line1: '1200 U St NW', city: 'Washington', state: 'DC', postcode: '20009', country: 'United States' },
    notes: [{ by: 'Moussa Diallo', text: 'Called Daniel — wants 1 pallet mixed. Preparing quote.', at: '2026-10-23T05:00:00Z' }],
  },
  {
    id: 'INQ-2049', type: 'cart', userId: 'u-1004', name: 'Ibrahim Keita', company: 'Sahel Mart', email: 'ibrahim@sahelmart.demo', phone: '+1 (612) 555-0615',
    dept: 'Food', message: 'Bulk quote for my cart please.',
    items: [{ productId: 'g1', name: 'Saafia Arraw', qty: 48, unit: 'units' }, { productId: 'g2', name: 'Saafia Thiacry', qty: 48, unit: 'units' }],
    status: 'accepted', createdAt: '2026-10-12T02:00:00Z', orderId: 'JT-10229',
    quote: { lines: [{ productId: 'g1', name: 'Saafia Arraw', size: '500 g', qty: 48, unitPrice: 2.95 }, { productId: 'g2', name: 'Saafia Thiacry', size: '500 g', qty: 48, unitPrice: 2.95 }], shipping: 0, discount: 0, validUntil: '2026-10-26', note: 'Volume price.', sentAt: '2026-10-12T06:00:00Z', sentBy: 'Moussa Diallo' },
  },
  {
    id: 'INQ-2046', type: 'contact', userId: null, name: 'Sarah Bennett', company: '', email: 'sarah.b@demo.com', phone: '',
    dept: 'Food', message: 'Do you deliver to Anchorage, Alaska? And is there a minimum order for individuals?',
    items: [], status: 'closed', createdAt: '2026-10-09T09:00:00Z',
    notes: [{ by: 'Moussa Diallo', text: 'Replied by email — yes via courier, no minimum.', at: '2026-10-09T11:00:00Z' }],
  },
];

const FLOW = ['pending', 'confirmed', 'packed', 'shipped', 'delivered'];
const TO_FUL = { pending: 'assigned', confirmed: 'accepted', packed: 'packed', shipped: 'shipped', delivered: 'delivered', cancelled: 'accepted' };

/** Wipe and load everything. */
export async function seedDatabase(prisma) {
  // order matters for FKs
  await prisma.$transaction([
    prisma.invoice.deleteMany(), prisma.fulfilment.deleteMany(), prisma.orderItem.deleteMany(), prisma.order.deleteMany(),
    prisma.inquiry.deleteMany(), prisma.stockLog.deleteMany(), prisma.stockLevel.deleteMany(), prisma.supplierOffer.deleteMany(),
    prisma.productRequest.deleteMany(), prisma.product.deleteMany(), prisma.category.deleteMany(), prisma.warehouse.deleteMany(),
    prisma.address.deleteMany(), prisma.driver.deleteMany(), prisma.user.deleteMany(), prisma.commodity.deleteMany(),
    prisma.setting.deleteMany(), prisma.subscriber.deleteMany(), prisma.counter.deleteMany(),
  ]);

  /* catalogue */
  await prisma.category.createMany({ data: BASE_CATEGORIES.map((c, i) => ({ id: c.id, dept: c.dept, name: c.name, status: c.status, sort: i })) });
  const catId = Object.fromEntries(BASE_CATEGORIES.map((c) => [`${c.dept}|${c.name}`, c.id]));
  await prisma.product.createMany({
    data: SEED_PRODUCTS.map((p, i) => ({
      id: p.id, sku: p.sku, categoryId: catId[`${p.dept}|${p.cat}`], name: p.name, size: p.size || null, pack: p.pack || null, price: typeof p.price === 'number' ? p.price : null,
      img: p.img || null, desc: p.desc || '', tag: p.tag || null, real: !!p.real, lowStock: p.lowStock, moq: p.moq, status: p.status, featured: !!p.featured,
      bestSeller: !!p.bestSeller, newArrival: !!p.newArrival, recommended: !!p.recommended, sort: i,
    })),
  });
  await prisma.commodity.createMany({ data: SEED_COMMODITIES.map((c, i) => ({ id: c.id, name: c.name, line: c.line, img: c.img, alt: c.alt, group: c.group, origin: c.origin, unit: c.unit, minQty: c.minQty, indicative: c.indicative, status: c.status, sort: i })) });

  /* people */
  const pw = {};
  for (const u of USERS) pw[u.password] = pw[u.password] || (await bcrypt.hash(u.password, 10));
  for (const u of USERS) {
    await prisma.user.create({
      data: {
        id: u.id, role: u.role, type: u.type, name: u.name, email: u.email, passwordHash: pw[u.password], phone: u.phone || '', company: u.company || '', abn: u.abn || '',
        businessType: u.businessType || '', status: u.status || 'active', isHouse: !!u.isHouse, createdAt: new Date(u.createdAt),
        addresses: u.addresses ? { create: u.addresses.map((a) => { const l = locationFromAddress(a); return { ...a, country: 'United States', isDefault: !!a.isDefault, lat: l?.lat, lng: l?.lng }; }) } : undefined,
      },
    });
  }
  await prisma.warehouse.createMany({ data: WAREHOUSES.map(({ loc, ...w }) => ({ ...w, locationId: loc, active: true, createdAt: new Date('2026-02-01T00:00:00Z') })) });
  await prisma.driver.createMany({ data: DRIVERS.map((d) => ({ status: 'active', ...d })) });

  const { offers, stock } = buildOffers();
  await prisma.supplierOffer.createMany({ data: offers.map((o) => ({ ...o, id: `of-${o.vendorId}-${o.productId}` })) });

  /* route the demo orders with the live rule, reserving stock in memory */
  const qty = new Map(stock.map((s) => [`${s.warehouseId}|${s.productId}`, s.qty]));
  const activeVendor = new Set(USERS.filter((u) => u.role === 'vendor' && (u.status || 'active') === 'active').map((u) => u.id));
  const network = WAREHOUSES.filter((w) => activeVendor.has(w.vendorId)).map((w) => ({ ...w, isHouse: w.vendorId === HOUSE }));
  const cost = new Map(offers.map((o) => [`${o.vendorId}|${o.productId}`, o.cost]));
  const usersById = Object.fromEntries(USERS.map((u) => [u.id, u]));
  const settingsDelivery = DEFAULT_DELIVERY;
  const logs = [];

  for (const [id, userId, rawLines, status, createdAt, extra = {}] of ORDERS) {
    const u = userId ? usersById[userId] : null;
    const address = extra.address || { ...(u.addresses.find((a) => a.isDefault) || u.addresses[0]), country: 'United States' };
    delete address.id; delete address.isDefault;
    const dest = locationFromAddress(address);
    const miles = Object.fromEntries(network.map((w) => [w.id, Math.round(haversineMiles(w, dest) * ROAD_FACTOR * 10) / 10]));
    const lines = rawLines.map((l) => ({ ...l, price: extra.price?.[l.productId] ?? l.price }));
    const plan = planLines({ lines, warehouses: network, avail: (w, p) => qty.get(`${w}|${p}`) || 0, miles });
    const items = lines.map((l, k) => ({ ...l, vendorId: plan[k]?.vendorId || null, warehouseId: plan[k]?.warehouseId || null, distanceMi: plan[k]?.distanceMi ?? null }));
    if (status !== 'cancelled') items.forEach((i) => { if (i.warehouseId) { const k = `${i.warehouseId}|${i.productId}`; qty.set(k, qty.get(k) - i.qty); logs.push({ productId: i.productId, warehouseId: i.warehouseId, vendorId: i.vendorId, change: -i.qty, reason: `Order ${id}`, by: 'System', at: new Date(createdAt) }); } });
    const ships = [...new Map(items.filter((i) => i.warehouseId).map((i) => [i.warehouseId, i.distanceMi])).entries()];
    const subtotal = r2(items.reduce((s, i) => s + i.price * i.qty, 0));
    const fee = extra.source === 'quote' ? 0 : orderDeliveryFee(ships.map(([, m]) => m), subtotal, settingsDelivery);
    const steps = status === 'cancelled' ? ['pending', 'cancelled'] : FLOW.slice(0, FLOW.indexOf(status) + 1);
    const t0 = new Date(createdAt).getTime();
    const customer = extra.customer || { name: u.name, email: u.email, phone: u.phone, company: u.company || '' };
    const total = r2(subtotal + fee);
    const names = Object.fromEntries(WAREHOUSES.map((w) => [w.id, w.name]));
    await prisma.order.create({
      data: {
        id, userId, guest: !!extra.guest, customer, address, lat: dest.lat, lng: dest.lng, locationId: dest.id, status,
        payment: ['delivered', 'shipped'].includes(status) ? 'paid' : 'unpaid', paymentMethod: 'invoice', source: extra.source || 'checkout', inquiryId: extra.inquiryId || null,
        tracking: ['shipped', 'delivered'].includes(status) ? `JLF-${id.replace(/\D/g, '')}-D` : '', subtotal, deliveryFee: fee, deliveryMiles: ships.length ? Math.max(...ships.map(([, m]) => m || 0)) : null,
        total, driverId: status === 'pending' || status === 'cancelled' ? null : extra.driverId || null, createdAt: new Date(createdAt), confirmedAt: status === 'pending' ? null : new Date(t0 + 26 * 3600e3),
        timeline: steps.map((s, i) => ({ status: s, at: new Date(t0 + i * 26 * 3600e3).toISOString(), note: s === 'pending' ? 'Order request placed online' : s === 'confirmed' ? 'Confirmed by JOLOF TRADING — invoice issued' : '' })),
        events: [{ at: createdAt, by: 'System', text: `Routed for ${address.city}, ${address.state}: ${ships.map(([w, m]) => `${names[w]}${w.startsWith('wh-jolof') ? ' (JOLOF stock)' : ''} · ${m} mi`).join('; ') || 'no warehouse had stock'}.` }],
        items: { create: items.map((i, k) => ({ sort: k, productId: i.productId, name: i.name, size: i.size, img: i.img, qty: i.qty, price: i.price, vendorId: i.vendorId, warehouseId: i.warehouseId, distanceMi: i.distanceMi })) },
        fulfilments: { create: ships.map(([w, m]) => ({ warehouseId: w, status: TO_FUL[status], miles: m, fee: fee ? deliveryFee(m, settingsDelivery) : 0, tracking: ['shipped', 'delivered'].includes(status) ? `JLF-${id.replace(/\D/g, '')}-D` : '' })) },
      },
    });
    if (status !== 'pending') {
      await prisma.invoice.create({
        data: {
          id: id.replace('JT-', 'INV-'), orderId: id, billTo: customer, shipTo: address, subtotal, deliveryFee: fee, discount: 0, total,
          lines: items.map((i) => ({ name: i.name, size: i.size, unit: null, qty: i.qty, price: i.price, amount: r2(i.price * i.qty) })),
          status: status === 'cancelled' ? 'void' : ['delivered', 'shipped'].includes(status) ? 'paid' : 'unpaid',
          issuedAt: new Date(t0 + 26 * 3600e3), dueAt: new Date(t0 + 8 * 864e5), notes: 'Bank transfer (ACH / wire).',
        },
      });
    }
  }
  void cost;

  await prisma.stockLevel.createMany({ data: [...qty.entries()].map(([k, n]) => { const [warehouseId, productId] = k.split('|'); return { warehouseId, productId, qty: Math.max(0, n) }; }) });
  await prisma.stockLog.createMany({
    data: [
      ...logs,
      { productId: 's1', warehouseId: 'wh-jolof-nj', vendorId: HOUSE, change: 240, reason: 'Container JT-C14 received', by: 'Moussa Diallo', at: new Date('2026-10-01T03:00:00Z') },
    ],
  });

  for (const q of INQUIRIES) {
    await prisma.inquiry.create({ data: { company: '', phone: '', notes: [], ...q, createdAt: new Date(q.createdAt) } });
  }

  /* a supplier product request waiting for approval */
  await prisma.productRequest.create({
    data: {
      vendorId: 'v-2004', categoryId: 'cat-spices', name: 'Lamb Seasoning Mix (Dibi Spice)', size: '250 g jar', pack: '24 units', cost: 3.1, suggestedPrice: 4.99,
      desc: 'Senegalese dibi-style spice blend for grilled lamb. We import this monthly from Dakar.', img: 'adja', stock: { 'wh-maf-chi': 120, 'wh-maf-msp': 48 },
      createdAt: new Date('2026-10-27T13:00:00Z'),
    },
  });

  await prisma.setting.createMany({
    data: [
      { key: 'showPricing', value: true },
      { key: 'delivery', value: DEFAULT_DELIVERY },
    ],
  });
  await prisma.counter.createMany({ data: [{ key: 'order', value: 10241 }, { key: 'inquiry', value: 2058 }] });
  await prisma.subscriber.createMany({ data: [{ email: 'kofi@demo.com', at: new Date('2026-10-20T10:00:00Z') }, { email: 'mariam.t@demo.com', at: new Date('2026-10-18T10:00:00Z') }, { email: 'olu@demo.com', at: new Date('2026-10-11T10:00:00Z') }] });

  return { products: SEED_PRODUCTS.length, suppliers: USERS.filter((u) => u.role === 'vendor').length, warehouses: WAREHOUSES.length, offers: offers.length, orders: ORDERS.length };
}

export const DEMO_LOGINS = USERS.map((u) => ({ email: u.email, password: u.password, role: u.role, status: u.status || 'active' }));
