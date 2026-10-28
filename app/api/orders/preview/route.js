import { route, body, str } from '@/lib/server/http';
import { prisma } from '@/lib/server/db';
import { getUser } from '@/lib/server/auth';
import { previewDelivery } from '@/lib/server/orders';

/** Delivery estimate for the cart (customer never sees which supplier/warehouse). */
export const POST = route(async (req) => {
  const d = await body(req);
  const user = await getUser();
  const address = d.addressId && user ? user.addresses.find((a) => a.id === d.addressId) : d.address;
  if (!address?.city && !address?.postcode) return { estimate: null };
  const cart = (Array.isArray(d.items) ? d.items : []).map((i) => ({ productId: str(i.productId, 40), qty: parseInt(i.qty, 10) || 0 })).filter((i) => i.productId && i.qty > 0);
  const products = await prisma.product.findMany({ where: { id: { in: cart.map((c) => c.productId) } }, select: { id: true, price: true } });
  const price = Object.fromEntries(products.map((p) => [p.id, p.price]));
  const estimate = await previewDelivery({ lines: cart.map((c) => ({ ...c, price: price[c.productId] ?? 0 })), address });
  return { estimate };
});
