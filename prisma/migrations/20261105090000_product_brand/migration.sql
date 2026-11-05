-- Products can carry a brand (JOLOF FOODS price list). Nullable — existing products are unchanged.
ALTER TABLE "Product" ADD COLUMN "brand" TEXT;
