-- Row level security: the Supabase Data API roles get nothing on the new tables. The app reaches them only through the server (Prisma).
ALTER TABLE "customers" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "customer_addresses" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "customer_tokens" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "email_logs" ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  r text;
  t text;
BEGIN
  FOREACH r IN ARRAY ARRAY['anon', 'authenticated'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = r) THEN
      FOREACH t IN ARRAY ARRAY['customers', 'customer_addresses', 'customer_tokens', 'email_logs'] LOOP
        EXECUTE format('REVOKE ALL ON public.%I FROM %I', t, r);
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'deny_all_' || r, t);
        EXECUTE format('CREATE POLICY %I ON public.%I AS RESTRICTIVE FOR ALL TO %I USING (false) WITH CHECK (false)', 'deny_all_' || r, t, r);
      END LOOP;
    END IF;
  END LOOP;
END $$;
