// Client price lists loaded into the catalogue:
//   JOLOF FOODS (JOLOF_FOODS.xlsx — DRY, DRINK, FROZEN) → prisma/data/jolof-foods.json · photos public/products/foods/
//   Vaseline (Bajeen Sheabutter price list PDF)         → prisma/data/jolof-vaseline.json · photos public/products/vaseline/
//
// Additive and safe to re-run: products are upserted by id/SKU, nothing else is touched,
// and stock / supplier offers that already exist are kept.
import FOODS from './data/jolof-foods.json';
import VASELINE from './data/jolof-vaseline.json';

export { FOODS, VASELINE };
const LISTS = { foods: FOODS, vaseline: VASELINE };

// Categories the price list needs. Meat & Fish was "coming soon" — it now has products.
const FOOD_CATEGORIES = [
  { id: 'cat-meat', name: 'Meat & Fish', status: 'active' },
  { id: 'cat-frozen', name: 'Frozen Foods', status: 'active' },
];

const toRow = (p, sort) => ({
  sku: p.sku, categoryId: p.categoryId, brand: p.brand, name: p.name, size: p.size, pack: p.pack,
  price: p.price, img: p.img, desc: p.desc, real: true, lowStock: 5, moq: 1, status: 'active', sort,
});

/** Upsert the food categories and every product in the client price lists. Returns counts per list. */
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
  const cats = await prisma.category.findMany({ include: { department: true } });
  const byName = Object.fromEntries(cats.map((c) => [`${c.department.name}|${c.name}`, c.id]));
  const SEED_NAME = {
    'cat-spices': 'Food|Spices & Seasonings', 'cat-millet': 'Food|Millet & Grains', 'cat-tea': 'Food|Tea & Coffee', 'cat-drinks': 'Food|Drinks',
    'cat-pantry': 'Food|Pantry Essentials', 'cat-meat': 'Food|Meat & Fish', 'cat-frozen': 'Food|Frozen Foods', 'cat-skin': 'Cosmetics|Skin Care',
  };
  const catId = (id) => cats.some((c) => c.id === id) ? id : byName[SEED_NAME[id]];

  let sort = ((await prisma.product.aggregate({ _max: { sort: true } }))._max.sort ?? 0) + 1;
  const result = {};
  for (const [list, rows] of Object.entries(LISTS)) {
    let created = 0; let updated = 0;
    for (const p of rows) {
      const categoryId = catId(p.categoryId);
      if (!categoryId) throw new Error(`Category missing for ${p.sku} (${p.categoryId}).`);
      const existing = await prisma.product.findUnique({ where: { sku: p.sku } });
      const { sort: s, ...data } = toRow({ ...p, categoryId }, sort++);
      if (existing) { await prisma.product.update({ where: { id: existing.id }, data }); updated++; }
      else { await prisma.product.create({ data: { id: p.id, ...data, sort: s } }); created++; }
    }
    result[list] = { total: rows.length, created, updated };
  }
  return result;
}
