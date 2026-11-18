-- Online-payment orders that are never paid are cancelled after a deadline so the stock they hold goes back on sale.
ALTER TABLE "retail_orders" ADD COLUMN "payment_due_at" TIMESTAMP(3);
CREATE INDEX "retail_orders_payment_due_at_idx" ON "retail_orders"("payment_due_at");
-- Existing unpaid online orders get a fresh window instead of being cancelled the moment this runs.
UPDATE "retail_orders" SET "payment_due_at" = NOW() + INTERVAL '30 minutes' WHERE "payment_method" = 'razorpay' AND "payment_status" IN ('pending', 'failed') AND "status" <> 'cancelled';
