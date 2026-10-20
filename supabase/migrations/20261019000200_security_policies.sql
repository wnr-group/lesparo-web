-- Row Level Security and storage policies.
-- Principle: public reads only published catalogue + site content. Everything about
-- enquiries is staff-only; public submissions go through server code (service role).

alter table public.user_roles enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.product_images enable row level security;
alter table public.site_content enable row level security;
alter table public.wholesale_enquiries enable row level security;
alter table public.enquiry_items enable row level security;
alter table public.enquiry_attachments enable row level security;
alter table public.enquiry_notes enable row level security;
alter table public.enquiry_status_history enable row level security;
alter table public.integration_jobs enable row level security;
alter table public.rate_limits enable row level security;

-- user_roles: a signed-in user may see their own roles. No write policies:
-- roles are granted with the service role only.
create policy "own roles readable" on public.user_roles
  for select to authenticated using (user_id = auth.uid());

-- categories
create policy "published categories are public" on public.categories
  for select to anon, authenticated using (is_published or public.is_staff());
create policy "admins manage categories" on public.categories
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- products
create policy "published products are public" on public.products
  for select to anon, authenticated
  using ((is_published and archived_at is null) or public.is_staff());
create policy "admins manage products" on public.products
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- product images follow their product's visibility
create policy "images of visible products are public" on public.product_images
  for select to anon, authenticated
  using (
    public.is_staff() or exists (
      select 1 from public.products p
      where p.id = product_id and p.is_published and p.archived_at is null
    )
  );
create policy "admins manage product images" on public.product_images
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- site content
create policy "site content is public" on public.site_content
  for select to anon, authenticated using (true);
create policy "admins manage site content" on public.site_content
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- enquiries: staff only. No anon policies at all.
create policy "staff read enquiries" on public.wholesale_enquiries
  for select to authenticated using (public.is_staff());
create policy "staff update enquiries" on public.wholesale_enquiries
  for update to authenticated using (public.is_staff()) with check (public.is_staff());

create policy "staff read enquiry items" on public.enquiry_items
  for select to authenticated using (public.is_staff());

create policy "staff read enquiry attachments" on public.enquiry_attachments
  for select to authenticated using (public.is_staff());

create policy "staff read notes" on public.enquiry_notes
  for select to authenticated using (public.is_staff());
create policy "staff add own notes" on public.enquiry_notes
  for insert to authenticated with check (public.is_staff() and author_id = auth.uid());

create policy "staff read status history" on public.enquiry_status_history
  for select to authenticated using (public.is_staff());

create policy "staff read integration jobs" on public.integration_jobs
  for select to authenticated using (public.is_staff());

-- rate_limits: no policies (service role only).

-- Column-level hardening: anon never needs these tables at all.
revoke all on public.wholesale_enquiries, public.enquiry_items, public.enquiry_attachments,
  public.enquiry_notes, public.enquiry_status_history, public.integration_jobs, public.rate_limits,
  public.user_roles
  from anon;

-- ---------------------------------------------------------------------------
-- Storage
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('product-media', 'product-media', true, 10485760, array['image/jpeg', 'image/png', 'image/webp', 'image/avif']),
  ('enquiry-attachments', 'enquiry-attachments', false, 10485760,
    array['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])
on conflict (id) do nothing;

-- product-media: public bucket (served via public URL); only admins may write.
create policy "admins upload product media" on storage.objects
  for insert to authenticated with check (bucket_id = 'product-media' and public.is_admin());
create policy "admins update product media" on storage.objects
  for update to authenticated using (bucket_id = 'product-media' and public.is_admin());
create policy "admins delete product media" on storage.objects
  for delete to authenticated using (bucket_id = 'product-media' and public.is_admin());

-- enquiry-attachments: private. Uploads happen server-side with the service role.
-- Staff can read (used to create short-lived signed URLs). No public access.
create policy "staff read enquiry attachments" on storage.objects
  for select to authenticated using (bucket_id = 'enquiry-attachments' and public.is_staff());
