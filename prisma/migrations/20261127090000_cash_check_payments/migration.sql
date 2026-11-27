-- Cash / check payments recorded by hand on "cash / check on delivery" orders
-- (paid in full, deposit + balance later, "bill to bill"). Order.payment is now worked out from these rows.
CREATE TABLE "CashPayment" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "method" TEXT NOT NULL DEFAULT 'cash',
    "amount" DOUBLE PRECISION NOT NULL,
    "checkNumber" TEXT NOT NULL DEFAULT '',
    "receivedAt" TIMESTAMP(3),
    "note" TEXT NOT NULL DEFAULT '',
    "createdBy" TEXT NOT NULL DEFAULT 'System',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "voidedAt" TIMESTAMP(3),
    "voidedBy" TEXT NOT NULL DEFAULT '',
    "voidReason" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "CashPayment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CashPayment_orderId_idx" ON "CashPayment"("orderId");

ALTER TABLE "CashPayment" ADD CONSTRAINT "CashPayment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Existing cash / check orders already marked "paid" (collected) keep that status:
-- each gets one payment row for its full total. The method wasn't recorded before, so it is "unknown"
-- (older "check on delivery" orders are known to be checks).
INSERT INTO "CashPayment" ("id", "orderId", "method", "amount", "note", "createdBy")
SELECT 'cp_' || "id", "id", CASE WHEN "paymentMethod" = 'check' THEN 'check' ELSE 'unknown' END, "total",
       'Marked as collected before payment tracking was added', 'System'
FROM "Order"
WHERE "paymentMethod" IN ('cod', 'check') AND "payment" = 'paid';
