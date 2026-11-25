-- Card processing fee (Square 2.6% + $0.15) passed on to customers who pay by card.
-- Stored separately so invoices and emails can show it as its own line; included in "total".
-- Existing orders / invoices get 0 — nothing changes for them.
ALTER TABLE "Order" ADD COLUMN "cardFee" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "Invoice" ADD COLUMN "cardFee" DOUBLE PRECISION NOT NULL DEFAULT 0;
