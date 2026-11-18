-- Inventory: per-size stock for products, with an append-only movement log.
ALTER TABLE "products" ADD COLUMN "track_inventory" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "products" ADD COLUMN "low_stock_threshold" INTEGER NOT NULL DEFAULT 5;

CREATE TABLE "product_stock" (
    "id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "size" TEXT NOT NULL DEFAULT '',
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "product_stock_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "product_stock_quantity_nonneg" CHECK ("quantity" >= 0)
);

CREATE TABLE "stock_movements" (
    "id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "size" TEXT NOT NULL DEFAULT '',
    "delta" INTEGER NOT NULL,
    "quantity_after" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "note" TEXT,
    "actor" TEXT,
    "order_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "stock_movements_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "product_stock_product_id_size_key" ON "product_stock"("product_id", "size");
CREATE INDEX "stock_movements_product_id_created_at_idx" ON "stock_movements"("product_id", "created_at");

ALTER TABLE "product_stock" ADD CONSTRAINT "product_stock_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Row level security: the Supabase Data API roles get nothing on the new tables. The app reaches them only through the server (Prisma).
ALTER TABLE "product_stock" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "stock_movements" ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  r text;
  t text;
BEGIN
  FOREACH r IN ARRAY ARRAY['anon', 'authenticated'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = r) THEN
      FOREACH t IN ARRAY ARRAY['product_stock', 'stock_movements'] LOOP
        EXECUTE format('REVOKE ALL ON public.%I FROM %I', t, r);
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'deny_all_' || r, t);
        EXECUTE format('CREATE POLICY %I ON public.%I AS RESTRICTIVE FOR ALL TO %I USING (false) WITH CHECK (false)', 'deny_all_' || r, t, r);
      END LOOP;
    END IF;
  END LOOP;
END $$;
