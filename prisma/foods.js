// JOLOF FOODS price list (client sheet JOLOF_FOODS.xlsx — DRY, DRINK and FROZEN tabs).
// Data: prisma/data/jolof-foods.json · photos: public/products/foods/ (plus existing client photos).
//
// Additive and safe to re-run: products are upserted by id/SKU, nothing else is touched,
// and stock / supplier offers that already exist are kept.
import FOODS from './data/jolof-foods.json';

export { FOODS };

// Categories the price list needs. Meat & Fish was "coming soon" — it now has products.
const FOOD_CATEGORIES = [
  { id: 'cat-meat', name: 'Meat & Fish', status: 'active' },
  { id: 'cat-frozen', name: 'Frozen Foods', status: 'active' },
];

const toRow = (p, sort) => ({
  sku: p.sku, categoryId: p.categoryId, brand: p.brand, name: p.name, size: p.size, pack: p.pack,
  price: p.price, img: p.img, desc: p.desc, real: true, lowStock: 5, moq: 1, status: 'active', sort,
});

/** Upsert the food categories and all JOLOF FOODS products. Returns counts. */
export async function importFoods(prisma) {
  const food = await prisma.department.findFirst({ where: { name: 'Food' } });
  if (!food) throw new Error('No "Food" department — run the main seed first (npm run db:seed).');

  for (const c of FOOD_CATEGORIES) {
    const existing = await prisma.category.findFirst({ where: { OR: [{ id: c.id }, { departmentId: food.id, name: c.name }] } });
    if (existing) {
      if (existing.status !== c.status) await prisma.category.update({ where: { id: existing.id }, data: { status: c.status } });
      c.dbId = existing.id;
    } else {
      const sort = await prisma.category.count();
      c.dbId = (await prisma.category.create({ data: { id: c.id, departmentId: food.id, name: c.name, status: c.status, sort } })).id;
    }
  }
  // category ids in the data are the seed ids — map them to whatever this database uses
  const cats = await prisma.category.findMany({ where: { departmentId: food.id } });
  const byName = Object.fromEntries(cats.map((c) => [c.name, c.id]));
  const SEED_NAME = { 'cat-spices': 'Spices & Seasonings', 'cat-millet': 'Millet & Grains', 'cat-tea': 'Tea & Coffee', 'cat-drinks': 'Drinks', 'cat-pantry': 'Pantry Essentials', 'cat-meat': 'Meat & Fish', 'cat-frozen': 'Frozen Foods' };
  const catId = (id) => cats.some((c) => c.id === id) ? id : byName[SEED_NAME[id]];

  const base = ((await prisma.product.aggregate({ _max: { sort: true } }))._max.sort ?? 0) + 1;
  let created = 0; let updated = 0;
  for (const [i, p] of FOODS.entries()) {
    const categoryId = catId(p.categoryId);
    if (!categoryId) throw new Error(`Category missing for ${p.sku} (${p.categoryId}).`);
    const existing = await prisma.product.findUnique({ where: { sku: p.sku } });
    const { sort, ...data } = toRow({ ...p, categoryId }, base + i);
    if (existing) { await prisma.product.update({ where: { id: existing.id }, data }); updated++; }
    else { await prisma.product.create({ data: { id: p.id, ...data, sort } }); created++; }
  }
  return { foods: FOODS.length, created, updated };
}
