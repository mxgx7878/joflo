import { route, body, fail, str } from '@/lib/server/http';
import { prisma } from '@/lib/server/db';
import { requireUser } from '@/lib/server/auth';
import { resolveAddress } from '@/lib/server/maps';
import { withState } from '@/lib/server/respond';

/** Create or update an address (send id to update). */
export const POST = route(async (req) => {
  const u = await requireUser();
  const a = await body(req);
  const data = {};
  ['label', 'line1', 'city', 'postcode', 'country'].forEach((k) => { if (a[k] !== undefined) data[k] = str(a[k], 160); });
  if (a.state !== undefined) data.state = str(a.state, 4).toUpperCase();
  let id = a.id;
  if (id) {
    const cur = u.addresses.find((x) => x.id === id);
    if (!cur) fail(404, 'Address not found.');
    if (['line1', 'city', 'state', 'postcode'].some((k) => data[k] !== undefined && data[k] !== cur[k])) {
      const g = await resolveAddress({ ...cur, ...data });
      Object.assign(data, { lat: g?.lat ?? null, lng: g?.lng ?? null });
    }
    await prisma.address.update({ where: { id }, data });
  } else {
    if (!data.line1 || !data.city || !data.state || !data.postcode) fail(400, 'Street, city, state and ZIP are required.');
    const g = await resolveAddress(data);
    id = (await prisma.address.create({ data: { ...data, userId: u.id, lat: g?.lat, lng: g?.lng } })).id;
  }
  if (a.isDefault || !u.addresses.length) {
    await prisma.address.updateMany({ where: { userId: u.id }, data: { isDefault: false } });
    await prisma.address.update({ where: { id }, data: { isDefault: true } });
  }
  return withState({ id });
});

export const DELETE = route(async (req) => {
  const u = await requireUser();
  const id = new URL(req.url).searchParams.get('id');
  const cur = u.addresses.find((x) => x.id === id);
  if (!cur) fail(404, 'Address not found.');
  await prisma.address.delete({ where: { id } });
  if (cur.isDefault) {
    const next = await prisma.address.findFirst({ where: { userId: u.id } });
    if (next) await prisma.address.update({ where: { id: next.id }, data: { isDefault: true } });
  }
  return withState();
});
