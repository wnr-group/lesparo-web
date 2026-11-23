-- The verified business accounts feature was reverted; its tables are no longer used.
-- DropTable
DROP TABLE IF EXISTS "business_discounts";
DROP TABLE IF EXISTS "business_history";
DROP TABLE IF EXISTS "business_profiles";

-- AlterTable
ALTER TABLE "products" DROP COLUMN IF EXISTS "wholesale_min_qty",
DROP COLUMN IF EXISTS "wholesale_price";
