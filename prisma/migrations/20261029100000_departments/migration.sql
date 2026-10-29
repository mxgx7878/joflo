-- Departments become their own table; categories point at a department instead of holding its name.

CREATE TABLE "Department" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'products',
    "tagline" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL DEFAULT '',
    "image" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'active',
    "sort" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Department_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Department_name_key" ON "Department"("name");
CREATE UNIQUE INDEX "Department_slug_key" ON "Department"("slug");

-- one department per department name already used by categories
INSERT INTO "Department" ("id", "name", "slug", "kind", "sort")
SELECT 'dep-' || lower(regexp_replace(d."dept", '[^a-zA-Z0-9]+', '-', 'g')),
       d."dept",
       lower(regexp_replace(d."dept", '[^a-zA-Z0-9]+', '-', 'g')),
       CASE WHEN d."dept" = 'Trading' THEN 'trading' ELSE 'products' END,
       CASE d."dept" WHEN 'Trading' THEN 0 WHEN 'Food' THEN 1 WHEN 'Cosmetics' THEN 2 ELSE 9 END
FROM (SELECT DISTINCT "dept" FROM "Category") d;

UPDATE "Department" SET "tagline" = 'Maize, millet, rice, groundnuts, sesame, shea and more — quoted on request.',
  "description" = 'Global commodity trading from Africa to the world.',
  "image" = 'https://images.unsplash.com/photo-1651667343153-6dc318e27e41?auto=format&fit=crop&w=900&q=80' WHERE "name" = 'Trading';
UPDATE "Department" SET "tagline" = 'Seasonings, millet & grains, tea & coffee, drinks and pantry staples.',
  "image" = 'https://images.unsplash.com/photo-1736182146384-72e77abe44ec?auto=format&fit=crop&w=900&q=80' WHERE "name" = 'Food';
UPDATE "Department" SET "tagline" = 'Skin care, hair care, soaps and fragrance from the JOLOF Cosmetics catalogue.',
  "image" = 'https://images.unsplash.com/photo-1612817288484-6f916006741a?auto=format&fit=crop&w=900&q=80' WHERE "name" = 'Cosmetics';

ALTER TABLE "Category" ADD COLUMN "departmentId" TEXT;
UPDATE "Category" c SET "departmentId" = d."id" FROM "Department" d WHERE d."name" = c."dept";
ALTER TABLE "Category" ALTER COLUMN "departmentId" SET NOT NULL;

DROP INDEX "Category_dept_name_key";
ALTER TABLE "Category" DROP COLUMN "dept";
CREATE UNIQUE INDEX "Category_departmentId_name_key" ON "Category"("departmentId", "name");
ALTER TABLE "Category" ADD CONSTRAINT "Category_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
