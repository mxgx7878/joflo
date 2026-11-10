// Moves the imported skin-care products (ids skn-…) that aren't skin care into the right category.
//
//   npx tsx prisma/move-skincare-categories.js          → shows what would move (nothing written)
//   npx tsx prisma/move-skincare-categories.js --apply  → moves them
//
// Edit RULES below to change where things go. Departments are matched by name (case-insensitive);
// a category that doesn't exist yet in that department is created (status active).
// Only products whose id starts with "skn-" are touched, and only if they are still in Skin Care,
// so products you already moved by hand in the admin panel are left alone.
import { PrismaClient } from '@prisma/client';

try { process.loadEnvFile?.('.env'); } catch { /* use shell env */ }
const APPLY = process.argv.includes('--apply');

// first matching rule wins — `match` is tested against the product name
const RULES = [
  { match: /bitters|detox/i,                                   department: 'Health & Nutrition',     category: 'Herbal Bitters' },
  { match: /tooth\s*paste/i,                                   department: 'Health & Nutrition',     category: 'Oral Care' },
  { match: /hair|batana|relaxer|d[ée]fris|sulphur/i,           department: 'Cosmetics & Fragrances', category: 'Hair Care' },
  { match: /deod[eo]?rant/i,                                   department: 'Cosmetics & Fragrances', category: 'Deodorants' },
];

const prisma = new PrismaClient();
(async () => {
  const skin = await prisma.category.findMany({ where: { name: { equals: 'Skin Care', mode: 'insensitive' } } });
  const products = await prisma.product.findMany({ where: { id: { startsWith: 'skn-' }, categoryId: { in: skin.map((c) => c.id) } }, orderBy: { sku: 'asc' } });
  const depts = await prisma.department.findMany({ include: { categories: true } });

  const plan = [];
  for (const p of products) {
    const rule = RULES.find((r) => r.match.test(p.name));
    if (rule) plan.push({ p, rule });
  }
  if (!plan.length) { console.log('Nothing to move.'); return; }

  const catIds = {};
  for (const rule of new Set(plan.map((x) => x.rule))) {
    const dept = depts.find((d) => d.name.toLowerCase() === rule.department.toLowerCase());
    if (!dept) throw new Error(`No department "${rule.department}". Departments: ${depts.map((d) => `"${d.name}"`).join(', ')} — fix RULES.`);
    const cat = dept.categories.find((c) => c.name.toLowerCase() === rule.category.toLowerCase());
    catIds[`${rule.department}|${rule.category}`] = cat?.id
      || (APPLY ? (await prisma.category.create({ data: { departmentId: dept.id, name: rule.category, status: 'active', sort: await prisma.category.count() } })).id : null);
    if (!cat) console.log(`${APPLY ? 'Created' : 'Will create'} category ${dept.name} › ${rule.category}`);
  }

  console.table(plan.map(({ p, rule }) => ({ sku: p.sku, name: p.name.slice(0, 50), to: `${rule.department} › ${rule.category}` })));
  if (!APPLY) { console.log(`\n${plan.length} products would move. Run again with --apply to move them.`); return; }
  for (const { p, rule } of plan) await prisma.product.update({ where: { id: p.id }, data: { categoryId: catIds[`${rule.department}|${rule.category}`] } });
  console.log(`\nMoved ${plan.length} products.`);
})().catch((e) => { console.error(`✗ ${e.message}`); process.exitCode = 1; }).finally(() => prisma.$disconnect());