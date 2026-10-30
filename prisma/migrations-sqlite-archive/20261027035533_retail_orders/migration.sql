-- CreateTable
CREATE TABLE "retail_orders" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "order_number" TEXT NOT NULL,
    "idempotency_key" TEXT NOT NULL,
    "customer_name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "address_line" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "postcode" TEXT NOT NULL,
    "notes" TEXT,
    "payment_method" TEXT NOT NULL DEFAULT 'cod',
    "payment_status" TEXT NOT NULL DEFAULT 'pending',
    "status" TEXT NOT NULL DEFAULT 'new',
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "subtotal" REAL NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "retail_order_items" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "order_id" TEXT NOT NULL,
    "product_id" TEXT,
    "product_name" TEXT NOT NULL,
    "size" TEXT,
    "quantity" INTEGER NOT NULL,
    "unit_price" REAL NOT NULL,
    CONSTRAINT "retail_order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "retail_orders" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "retail_order_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "retail_orders_order_number_key" ON "retail_orders"("order_number");

-- CreateIndex
CREATE UNIQUE INDEX "retail_orders_idempotency_key_key" ON "retail_orders"("idempotency_key");

-- CreateIndex
CREATE INDEX "retail_orders_status_created_at_idx" ON "retail_orders"("status", "created_at");

-- CreateIndex
CREATE INDEX "retail_order_items_order_id_idx" ON "retail_order_items"("order_id");
