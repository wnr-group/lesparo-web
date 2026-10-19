-- Explicit table privileges. Newer Supabase projects do not auto-grant public tables to the
-- API roles, so each role's access is declared here. RLS (previous migration) still decides
-- which rows a role can touch; these grants decide which operations are possible at all.

-- Server-side service role: full access (it bypasses RLS by design).
grant usage on schema public to service_role;
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;

-- Public catalogue + content: read-only for visitors.
grant select on public.categories, public.products, public.product_images, public.site_content to anon, authenticated;

-- Staff (authenticated + RLS is_admin/is_staff checks).
grant insert, update, delete on public.categories, public.products, public.product_images, public.site_content to authenticated;
grant select on public.user_roles to authenticated;
grant select, update on public.wholesale_enquiries to authenticated;
grant select on public.enquiry_items, public.enquiry_attachments, public.enquiry_status_history, public.integration_jobs to authenticated;
grant select, insert on public.enquiry_notes to authenticated;

-- Staff may only change workflow fields on enquiries, never buyer-submitted data.
revoke update on public.wholesale_enquiries from authenticated;
grant update (status, assigned_to, quotation_amount, quotation_currency, quotation_valid_until,
  quotation_details, follow_up_at, follow_up_outcome) on public.wholesale_enquiries to authenticated;

grant execute on function public.is_staff(), public.is_admin(), public.category_subtree(uuid) to anon, authenticated;
