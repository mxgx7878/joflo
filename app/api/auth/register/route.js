import { route, body, fail, str, EMAIL } from '@/lib/server/http';
import { prisma } from '@/lib/server/db';
import { hashPassword, startSession } from '@/lib/server/auth';
import { buildState } from '@/lib/server/state';
import { resolveAddress } from '@/lib/server/maps';

export const POST = route(async (req) => {
  const d = await body(req);
  const email = str(d.email, 160).toLowerCase();
  const type = ['individual', 'retailer', 'supplier'].includes(d.type) ? d.type : 'individual';
  if (str(d.name).length < 2) fail(400, 'Please enter your name.');
  if (!EMAIL.test(email)) fail(400, 'Enter a valid email address.');
  if (String(d.password || '').length < 6) fail(400, 'Password must be at least 6 characters.');
  if (await prisma.user.findUnique({ where: { email } })) fail(400, 'An account with this email already exists.');
  const supplier = type === 'supplier';
  const addr = d.line1 ? { line1: str(d.line1, 160), city: str(d.city, 80), state: str(d.state, 4).toUpperCase(), postcode: str(d.postcode, 12), country: 'United States' } : null;
  const geo = addr ? await resolveAddress(addr) : null;
  const user = await prisma.user.create({
    data: {
      role: supplier ? 'vendor' : 'customer', type, name: str(d.name, 120), email, passwordHash: await hashPassword(String(d.password)),
      phone: str(d.phone, 40), company: str(d.company, 160), abn: str(d.abn, 40), businessType: str(d.businessType, 80),
      status: type === 'individual' ? 'active' : 'pending',
      ...(addr && !supplier ? { addresses: { create: [{ label: type === 'retailer' ? 'Store' : 'Home', ...addr, isDefault: true, lat: geo?.lat, lng: geo?.lng }] } } : {}),
      ...(addr && supplier ? { warehouses: { create: [{ name: `${str(d.company, 120) || str(d.name, 120)} — ${addr.city}`, ...addr, lat: geo?.lat, lng: geo?.lng, locationId: d.locationId || geo?.locationId || null }] } } : {}),
    },
    include: { addresses: true },
  });
  // a guest who checked out / enquired with this email now sees those in their account
  if (!supplier) {
    await prisma.order.updateMany({ where: { userId: null, guest: true, customer: { path: '$.email', equals: email } }, data: { userId: user.id } });
    await prisma.inquiry.updateMany({ where: { userId: null, email: { equals: email } }, data: { userId: user.id } });
  }
  await startSession(user.id);
  return { user: { id: user.id, role: user.role, status: user.status }, state: await buildState(user) };
});
