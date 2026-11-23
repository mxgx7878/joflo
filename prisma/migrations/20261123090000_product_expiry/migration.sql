-- Products can carry an optional expiry date, shown on the storefront when set. Nullable — existing products are unchanged.
-- (Check on delivery needs no schema change: Order.paymentMethod is a string and now also accepts 'check'.)
ALTER TABLE "Product" ADD COLUMN "expiryDate" DATE;
