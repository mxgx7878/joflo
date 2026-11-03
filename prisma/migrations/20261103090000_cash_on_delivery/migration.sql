-- Cash on delivery is now the only payment method.
ALTER TABLE "Order" ALTER COLUMN "paymentMethod" SET DEFAULT 'cod';

-- Existing orders were "invoice / bank transfer" placeholders — move them to cash on delivery.
UPDATE "Order" SET "paymentMethod" = 'cod' WHERE "paymentMethod" = 'invoice';

-- Invoice payment instructions → cash on delivery (open invoices, and the saved setting if any).
UPDATE "Invoice" SET "notes" = 'Cash on delivery — please have the full amount ready in cash for our driver when your order arrives.', "dueAt" = NULL
  WHERE "status" = 'unpaid';
UPDATE "Setting" SET "value" = jsonb_set("value"::jsonb, '{payTo}', to_jsonb('Cash on delivery — please have the full amount ready in cash for our driver when your order arrives.'::text))
  WHERE "key" = 'invoice';
