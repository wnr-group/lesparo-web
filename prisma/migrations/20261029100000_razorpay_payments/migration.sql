-- AlterTable
ALTER TABLE "retail_orders" ADD COLUMN "access_token" TEXT;
ALTER TABLE "retail_orders" ADD COLUMN "razorpay_order_id" TEXT;
ALTER TABLE "retail_orders" ADD COLUMN "razorpay_amount" INTEGER;
ALTER TABLE "retail_orders" ADD COLUMN "razorpay_payment_id" TEXT;
ALTER TABLE "retail_orders" ADD COLUMN "payment_verified" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "retail_orders" ADD COLUMN "paid_at" DATETIME;

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "order_id" TEXT NOT NULL,
    "razorpay_order_id" TEXT NOT NULL,
    "razorpay_payment_id" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "method" TEXT,
    "error_code" TEXT,
    "error_description" TEXT,
    "duplicate" BOOLEAN NOT NULL DEFAULT false,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "payments_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "retail_orders" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "payment_events" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "event_id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "razorpay_order_id" TEXT,
    "razorpay_payment_id" TEXT,
    "received_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed_at" DATETIME,
    "outcome" TEXT
);

-- CreateTable
CREATE TABLE "order_audits" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "order_id" TEXT NOT NULL,
    "actor" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "from_value" TEXT,
    "to_value" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "order_audits_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "retail_orders" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "retail_orders_access_token_key" ON "retail_orders"("access_token");
CREATE UNIQUE INDEX "retail_orders_razorpay_order_id_key" ON "retail_orders"("razorpay_order_id");
CREATE UNIQUE INDEX "payments_razorpay_payment_id_key" ON "payments"("razorpay_payment_id");
CREATE INDEX "payments_order_id_idx" ON "payments"("order_id");
CREATE UNIQUE INDEX "payment_events_event_id_key" ON "payment_events"("event_id");
CREATE INDEX "order_audits_order_id_created_at_idx" ON "order_audits"("order_id", "created_at");
