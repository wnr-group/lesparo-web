-- Supabase admin authentication.
--
-- 1. staff_users becomes the admin profile table: auth_user_id links a row to its Supabase Auth user (auth.users.id).
--    Passwords now live in Supabase, so the old bcrypt column is optional (kept until every admin has signed in
--    through Supabase, then dropped in a later migration).
-- 2. Row Level Security on every table. The app reads and writes the database only through Prisma (the owner role,
--    which bypasses RLS), so NO policy is granted to anon or authenticated: the Supabase Data API (PostgREST) and
--    anyone holding the public publishable key can read or write nothing here. Staff password hashes, orders, payments
--    and enquiries were reachable through that API before this migration unless RLS had been switched on by hand.
-- Add every new table to the RLS list below (tests/unit/admin-auth-core.test.ts fails if one is missing).

-- AlterTable
ALTER TABLE "staff_users" ADD COLUMN "auth_user_id" UUID;
ALTER TABLE "staff_users" ALTER COLUMN "password_hash" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "staff_users_auth_user_id_key" ON "staff_users"("auth_user_id");

-- Row Level Security: enabled on every application table. With no permissive policy, RLS denies all access to any role
-- that does not bypass it.
ALTER TABLE "staff_users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "categories" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "products" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "product_images" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "site_content" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "wholesale_enquiries" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "enquiry_items" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "enquiry_attachments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "enquiry_notes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "enquiry_status_history" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "integration_jobs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "rate_limits" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "counters" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "retail_orders" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "retail_order_items" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "payments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "payment_events" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "order_audits" ENABLE ROW LEVEL SECURITY;

-- Supabase roles used by the Data API. Skipped on a plain Postgres (local test databases) where they do not exist.
DO $$
DECLARE
  r text;
  t text;
BEGIN
  FOREACH r IN ARRAY ARRAY['anon', 'authenticated'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = r) THEN
      -- Belt and braces: no table or sequence privileges at all, now or for tables created later by this role.
      EXECUTE format('REVOKE ALL ON ALL TABLES IN SCHEMA public FROM %I', r);
      EXECUTE format('REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM %I', r);
      EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM %I', r);
      EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM %I', r);
      -- An explicit deny, so the intent is visible in the policy list and survives an accidental GRANT later.
      FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations' LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'deny_all_' || r, t);
        EXECUTE format('CREATE POLICY %I ON public.%I AS RESTRICTIVE FOR ALL TO %I USING (false) WITH CHECK (false)', 'deny_all_' || r, t, r);
      END LOOP;
    END IF;
  END LOOP;
END $$;
