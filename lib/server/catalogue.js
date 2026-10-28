// Master products, categories, commodities, warehouses, supplier offers, stock and product requests.
import { prisma } from './db';
import { fail, round2, str, int } from './http';
import { resolveAddress } from './maps';

const num = (v) => (v === '' || v === null || v === undefined || Number.isNaN(Number(v)) ? null : round2(Math.max(0, Number(v))));

async function categoryFor({ categoryId, dept, cat }) {
  if (categoryId) {
    const c = await prisma.category.findUnique({ where: { id: categoryId } });
    if (c) return c;
  }
  const c = await prisma.category.findFirst({ where: { dept: dept || 'Food', name: cat || '' } });
  if (!c) fail(400, 'Choose a valid category.');
  return c;
}

async function nextSku(dept) {
  const prefix = `JLF-${String(dept || 'GEN').slice(0, 3).toUpperCase()}-`;
  const last = await prisma.product.findMany({ where: { sku: { startsWith: prefix } }, select: { sku: true } });
  const n = last.reduce((m, p) => Math.max(m, parseInt(p.sku.slice(prefix.length), 10) || 0), 0) + 1;
  return `${prefix}${String(n).padStart(3, '0')}`;
}

/* ---------------- master products (admin) ---------------- */

export async function saveProduct(input, actor) {
  const c = await categoryFor(input);
  const data = {
    categoryId: c.id, name: str(input.name, 200), size: str(input.size, 80) || null, pack: str(input.pack, 80) || null,
    price: input.price === null || input.price === '' || input.price === undefined ? null : num(input.price),
    img: str(input.img, 600) || null, desc: str(input.desc, 2000), tag: str(input.tag, 20) || null,
    lowStock: int(input.lowStock), moq: int(input.moq, 1), status: input.status === 'hidden' ? 'hidden' : 'active',
    featured: !!input.featured, bestSeller: !!input.bestSeller, newArrival: !!input.newArrival, recommended: !!input.recommended,
  };
  if (!data.name) fail(400, 'Product name is required.');
  if (input.id) {
    const p = await prisma.product.findUnique({ where: { id: input.id } });
    if (!p) fail(404, 'Product not found.');
    await prisma.product.update({ where: { id: p.id }, data });
    return p.id;
  }
  const p = await prisma.product.create({ data: { ...data, sku: str(input.sku, 40) || (await nextSku(c.dept)) } });
  // optional opening stock → JOLOF's main warehouse
  const opening = int(input.stock);
  if (opening > 0) {
    const house = await prisma.user.findFirst({ where: { isHouse: true }, include: { warehouses: { orderBy: { createdAt: 'asc' }, take: 1 } } });
    const wh = house?.warehouses[0];
    if (wh) {
      await prisma.supplierOffer.upsert({ where: { vendorId_productId: { vendorId: house.id, productId: p.id } }, create: { vendorId: house.id, productId: p.id }, update: {} });
      await prisma.stockLevel.create({ data: { warehouseId: wh.id, productId: p.id, qty: opening } });
      await prisma.stockLog.create({ data: { productId: p.id, warehouseId: wh.id, vendorId: house.id, change: opening, reason: 'Opening stock', by: actor } });
    }
  }
  return p.id;
}

export async function deleteProduct(id) {
  const used = await prisma.orderItem.count({ where: { productId: id } });
  if (used) {
    // keep order history intact — hide instead of deleting
    await prisma.product.update({ where: { id }, data: { status: 'hidden' } });
    return { hidden: true };
  }
  await prisma.product.delete({ where: { id } });
  return { hidden: false };
}

/* ---------------- categories & commodities ---------------- */

export async function saveCategory(input) {
  const data = { dept: str(input.dept, 30) || 'Food', name: str(input.name, 80), status: ['active', 'coming_soon', 'hidden'].includes(input.status) ? input.status : 'active' };
  if (!data.name) fail(400, 'Category name is required.');
  const clash = await prisma.category.findFirst({ where: { dept: data.dept, name: { equals: data.name, mode: 'insensitive' }, NOT: input.id ? { id: input.id } : undefined } });
  if (clash) fail(400, 'That category already exists in this department.');
  if (input.id) return (await prisma.category.update({ where: { id: input.id }, data })).id;
  const sort = await prisma.category.count();
  return (await prisma.category.create({ data: { ...data, sort } })).id;
}

export async function deleteCategory(id) {
  const n = await prisma.product.count({ where: { categoryId: id } });
  if (n) fail(400, `Move or delete its ${n} product(s) first.`);
  await prisma.productRequest.deleteMany({ where: { categoryId: id, status: { not: 'pending' } } });
  await prisma.category.delete({ where: { id } });
}

export async function saveCommodity(input) {
  const data = {
    name: str(input.name, 120), line: str(input.line, 300), img: str(input.img, 600), alt: str(input.alt, 200), group: str(input.group, 80) || 'Grains & Cereals',
    origin: str(input.origin, 80), unit: str(input.unit, 10) || 'MT', minQty: int(input.minQty, 1), indicative: num(input.indicative), status: input.status === 'hidden' ? 'hidden' : 'active',
  };
  if (!data.name) fail(400, 'Name is required.');
  if (input.id) return (await prisma.commodity.update({ where: { id: input.id }, data })).id;
  return (await prisma.commodity.create({ data: { ...data, sort: await prisma.commodity.count() } })).id;
}

/* ---------------- warehouses ---------------- */

export async function saveWarehouse(input, user) {
  const vendorId = user.role === 'admin' ? input.vendorId || user.id : user.id;
  if (input.id) {
    const w = await prisma.warehouse.findUnique({ where: { id: input.id } });
    if (!w || (user.role !== 'admin' && w.vendorId !== user.id)) fail(404, 'Warehouse not found.');
    const patch = {};
    ['name', 'line1', 'city', 'state', 'postcode'].forEach((k) => { if (input[k] !== undefined) patch[k] = str(input[k], 160); });
    if (input.active !== undefined) patch.active = !!input.active;
    const moved = ['line1', 'city', 'state', 'postcode'].some((k) => patch[k] !== undefined && patch[k] !== w[k]);
    if (moved) Object.assign(patch, await geo({ ...w, ...patch }, input.locationId));
    await prisma.warehouse.update({ where: { id: w.id }, data: patch });
    return w.id;
  }
  const data = { vendorId, name: str(input.name, 160), line1: str(input.line1, 160), city: str(input.city, 80), state: str(input.state, 4).toUpperCase(), postcode: str(input.postcode, 12), active: input.active !== false };
  if (!data.name) fail(400, 'Warehouse name is required.');
  if (!data.city || !data.state) fail(400, 'City and state are required so orders can be routed.');
  Object.assign(data, await geo(data, input.locationId));
  return (await prisma.warehouse.create({ data })).id;
}

async function geo(a, locationId) {
  const r = await resolveAddress(a);
  return r ? { lat: r.lat, lng: r.lng, locationId: locationId || r.locationId } : { locationId: locationId || null };
}

/* ---------------- supplier offers & stock ---------------- */

/** Supplier lists a master product (or updates it): supply price, status and stock per warehouse. */
export async function saveOffer({ productId, cost, stock, status }, user, actor, vendorIdForAdmin) {
  const vendorId = user.role === 'admin' ? vendorIdForAdmin || user.id : user.id;
  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) fail(404, 'Product not found.');
  const myWh = await prisma.warehouse.findMany({ where: { vendorId }, select: { id: true } });
  const allowed = new Set(myWh.map((w) => w.id));
  await prisma.$transaction(async (tx) => {
    const old = await tx.supplierOffer.findUnique({ where: { vendorId_productId: { vendorId, productId } } });
    await tx.supplierOffer.upsert({
      where: { vendorId_productId: { vendorId, productId } },
      create: { vendorId, productId, cost: num(cost), status: status === 'paused' ? 'paused' : 'active' },
      update: { ...(cost !== undefined ? { cost: num(cost) } : {}), ...(status ? { status: status === 'paused' ? 'paused' : 'active' } : {}) },
    });
    for (const [warehouseId, raw] of Object.entries(stock || {})) {
      if (!allowed.has(warehouseId) || raw === '' || raw === null || raw === undefined) continue;
      const qty = int(raw);
      const cur = await tx.stockLevel.findUnique({ where: { warehouseId_productId: { warehouseId, productId } } });
      const diff = qty - (cur?.qty || 0);
      if (!diff) continue;
      await tx.stockLevel.upsert({ where: { warehouseId_productId: { warehouseId, productId } }, create: { warehouseId, productId, qty }, update: { qty } });
      await tx.stockLog.create({ data: { productId, warehouseId, vendorId, change: diff, reason: old ? 'Stock updated by supplier' : 'Listed by supplier', by: actor } });
    }
  });
}

export async function removeOffer(offerId, user) {
  const o = await prisma.supplierOffer.findUnique({ where: { id: offerId } });
  if (!o || (user.role !== 'admin' && o.vendorId !== user.id)) fail(404, 'Listing not found.');
  const wh = await prisma.warehouse.findMany({ where: { vendorId: o.vendorId }, select: { id: true } });
  await prisma.$transaction([
    prisma.stockLevel.deleteMany({ where: { productId: o.productId, warehouseId: { in: wh.map((w) => w.id) } } }),
    prisma.supplierOffer.delete({ where: { id: offerId } }),
  ]);
}

/** +/- stock in one warehouse (admin inventory, supplier quick edit). */
export async function adjustStock({ productId, warehouseId, change, reason }, user, actor) {
  const wh = await prisma.warehouse.findUnique({ where: { id: warehouseId } });
  if (!wh || (user.role !== 'admin' && wh.vendorId !== user.id)) fail(404, 'Warehouse not found.');
  const delta = parseInt(change, 10) || 0;
  if (!delta) return;
  await prisma.$transaction(async (tx) => {
    await tx.supplierOffer.upsert({ where: { vendorId_productId: { vendorId: wh.vendorId, productId } }, create: { vendorId: wh.vendorId, productId }, update: {} });
    const cur = await tx.stockLevel.findUnique({ where: { warehouseId_productId: { warehouseId, productId } } });
    const qty = Math.max(0, (cur?.qty || 0) + delta);
    await tx.stockLevel.upsert({ where: { warehouseId_productId: { warehouseId, productId } }, create: { warehouseId, productId, qty }, update: { qty } });
    await tx.stockLog.create({ data: { productId, warehouseId, vendorId: wh.vendorId, change: qty - (cur?.qty || 0), reason: str(reason, 200) || 'Manual adjustment', by: actor } });
  });
}

/* ---------------- product requests (supplier → admin approval → master product) ---------------- */

export async function createProductRequest(input, user) {
  const c = await categoryFor(input);
  const data = {
    vendorId: user.id, categoryId: c.id, name: str(input.name, 200), size: str(input.size, 80) || null, pack: str(input.pack, 80) || null,
    desc: str(input.desc, 2000), img: str(input.img, 600) || null, suggestedPrice: num(input.suggestedPrice), cost: num(input.cost),
    stock: Object.fromEntries(Object.entries(input.stock || {}).map(([k, v]) => [k, int(v)]).filter(([, v]) => v > 0)),
  };
  if (!data.name) fail(400, 'Product name is required.');
  const dupe = await prisma.product.findFirst({ where: { name: { equals: data.name, mode: 'insensitive' }, size: data.size } });
  if (dupe) fail(400, `“${dupe.name}” is already in the catalogue — add it from the catalogue instead.`);
  return (await prisma.productRequest.create({ data })).id;
}

/** Admin approves: master product is created (admin can edit fields/price first) and the supplier's offer + stock are loaded. */
export async function approveProductRequest(id, overrides, actor) {
  const r = await prisma.productRequest.findUnique({ where: { id } });
  if (!r || r.status !== 'pending') fail(404, 'Request not found or already reviewed.');
  const input = {
    categoryId: overrides.categoryId || r.categoryId, name: overrides.name ?? r.name, size: overrides.size ?? r.size, pack: overrides.pack ?? r.pack,
    desc: overrides.desc ?? r.desc, img: overrides.img ?? r.img, price: overrides.price !== undefined ? overrides.price : r.suggestedPrice,
    status: 'active', newArrival: true, lowStock: 10, moq: 1,
  };
  const productId = await saveProduct(input, actor);
  await prisma.product.update({ where: { id: productId }, data: { source: 'supplier_request' } });
  const supplier = await prisma.user.findUnique({ where: { id: r.vendorId } });
  await saveOffer({ productId, cost: r.cost, stock: r.stock, status: 'active' }, supplier, supplier.company || supplier.name);
  await prisma.productRequest.update({ where: { id }, data: { status: 'approved', productId, adminNote: str(overrides.note, 500), reviewedAt: new Date() } });
  return productId;
}

export async function rejectProductRequest(id, note) {
  const r = await prisma.productRequest.findUnique({ where: { id } });
  if (!r || r.status !== 'pending') fail(404, 'Request not found or already reviewed.');
  await prisma.productRequest.update({ where: { id }, data: { status: 'rejected', adminNote: str(note, 500), reviewedAt: new Date() } });
}
