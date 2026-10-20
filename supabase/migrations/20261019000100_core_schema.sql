-- LESPARO core schema: catalogue, staff roles, wholesale enquiries, site content,
-- integration outbox. Quote-first: no orders/payments until retail checkout is confirmed.

create extension if not exists pg_trgm with schema extensions;

-- ---------------------------------------------------------------------------
-- Shared helpers
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Staff roles
-- ---------------------------------------------------------------------------

create type public.staff_role as enum ('admin', 'sales');

create table public.user_roles (
  user_id uuid not null references auth.users (id) on delete cascade,
  role public.staff_role not null,
  created_at timestamptz not null default now(),
  primary key (user_id, role)
);

comment on table public.user_roles is
  'Staff permissions. Granted only via service role (scripts/grant-staff-role.ts); no client write policies exist.';

-- security definer so policies can call it without granting select on user_roles.
create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.user_roles where user_id = auth.uid());
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.user_roles where user_id = auth.uid() and role = 'admin');
$$;

-- ---------------------------------------------------------------------------
-- Catalogue
-- ---------------------------------------------------------------------------

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid references public.categories (id) on delete restrict,
  name text not null check (length(trim(name)) > 0),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  description text,
  cover_image_path text,
  display_order integer not null default 0,
  is_published boolean not null default false,
  is_featured boolean not null default false,
  legacy_id integer unique,
  legacy_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (parent_id is distinct from id)
);

create index categories_parent_idx on public.categories (parent_id, display_order);

create trigger categories_updated_at before update on public.categories
  for each row execute function public.set_updated_at();

create table public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) > 0),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  sku text unique,
  category_id uuid references public.categories (id) on delete restrict,
  description text,
  -- Ordered label/value pairs, e.g. [{"label":"Fit type","value":"Regular"}].
  specs jsonb not null default '[]'::jsonb check (jsonb_typeof(specs) = 'array'),
  fabric text,
  sizes text[] not null default '{}',
  packing text,
  quote_enabled boolean not null default true,
  retail_enabled boolean not null default false,
  price numeric(12, 2) check (price is null or price >= 0),
  currency char(3) not null default 'INR',
  is_published boolean not null default false,
  is_featured boolean not null default false,
  archived_at timestamptz,
  seo_title text,
  seo_description text,
  legacy_id integer unique,
  legacy_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  search tsvector generated always as (
    setweight(to_tsvector('simple', coalesce(name, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(fabric, '') || ' ' || coalesce(sku, '')), 'B') ||
    setweight(to_tsvector('simple', coalesce(description, '')), 'C')
  ) stored,
  -- A retail product must have a price; retail checkout is not live yet.
  check (not retail_enabled or price is not null)
);

create index products_category_idx on public.products (category_id) where archived_at is null;
create index products_published_idx on public.products (is_published, created_at desc) where archived_at is null;
create index products_search_idx on public.products using gin (search);
create index products_name_trgm_idx on public.products using gin (name extensions.gin_trgm_ops);

create trigger products_updated_at before update on public.products
  for each row execute function public.set_updated_at();

create table public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  storage_path text not null,
  alt_text text not null default '',
  width integer,
  height integer,
  display_order integer not null default 0,
  is_primary boolean not null default false,
  created_at timestamptz not null default now()
);

create index product_images_product_idx on public.product_images (product_id, display_order);
create unique index product_images_one_primary on public.product_images (product_id) where is_primary;

-- Category subtree (self + descendants), used for category listing pages.
create or replace function public.category_subtree(root uuid)
returns setof uuid
language sql
stable
set search_path = ''
as $$
  with recursive tree as (
    select id from public.categories where id = root
    union all
    select c.id from public.categories c join tree t on c.parent_id = t.id
  )
  select id from tree;
$$;

-- ---------------------------------------------------------------------------
-- Site content (homepage etc.). Shape is validated by lib/validation/content.ts.
-- ---------------------------------------------------------------------------

create table public.site_content (
  key text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null
);

create trigger site_content_updated_at before update on public.site_content
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Wholesale enquiries
-- ---------------------------------------------------------------------------

create type public.enquiry_status as enum (
  'new',
  'under_review',
  'info_required',
  'quotation_prepared',
  'quotation_sent',
  'accepted',
  'rejected',
  'closed'
);

create type public.sync_status as enum ('not_configured', 'pending', 'synced', 'failed');

create sequence public.enquiry_number_seq;

create table public.wholesale_enquiries (
  id uuid primary key default gen_random_uuid(),
  enquiry_number text not null unique,
  idempotency_key uuid not null unique,
  customer_name text not null,
  company_name text,
  email text not null,
  phone text not null,
  country text,
  message text not null,
  target_budget text,
  status public.enquiry_status not null default 'new',
  assigned_to uuid references auth.users (id) on delete set null,
  quotation_amount numeric(14, 2) check (quotation_amount is null or quotation_amount >= 0),
  quotation_currency char(3),
  quotation_valid_until date,
  quotation_details text,
  follow_up_at timestamptz,
  follow_up_outcome text,
  crm_record_id text,
  crm_sync_status public.sync_status not null default 'not_configured',
  consent_at timestamptz not null,
  source text not null default 'website',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index wholesale_enquiries_status_idx on public.wholesale_enquiries (status, created_at desc);
create index wholesale_enquiries_created_idx on public.wholesale_enquiries (created_at desc);
create index wholesale_enquiries_email_idx on public.wholesale_enquiries (lower(email));

create trigger wholesale_enquiries_updated_at before update on public.wholesale_enquiries
  for each row execute function public.set_updated_at();

create table public.enquiry_items (
  id uuid primary key default gen_random_uuid(),
  enquiry_id uuid not null references public.wholesale_enquiries (id) on delete cascade,
  product_id uuid references public.products (id) on delete set null,
  product_name_snapshot text not null,
  quantity integer check (quantity is null or quantity > 0),
  specifications text,
  display_order integer not null default 0
);

create index enquiry_items_enquiry_idx on public.enquiry_items (enquiry_id, display_order);

create table public.enquiry_attachments (
  id uuid primary key default gen_random_uuid(),
  enquiry_id uuid not null references public.wholesale_enquiries (id) on delete cascade,
  storage_path text not null unique,
  original_filename text not null,
  content_type text not null,
  file_size integer not null check (file_size > 0),
  created_at timestamptz not null default now()
);

create index enquiry_attachments_enquiry_idx on public.enquiry_attachments (enquiry_id);

create table public.enquiry_notes (
  id uuid primary key default gen_random_uuid(),
  enquiry_id uuid not null references public.wholesale_enquiries (id) on delete cascade,
  author_id uuid references auth.users (id) on delete set null,
  note text not null check (length(trim(note)) > 0),
  created_at timestamptz not null default now()
);

create index enquiry_notes_enquiry_idx on public.enquiry_notes (enquiry_id, created_at);

create table public.enquiry_status_history (
  id bigint generated always as identity primary key,
  enquiry_id uuid not null references public.wholesale_enquiries (id) on delete cascade,
  from_status public.enquiry_status,
  to_status public.enquiry_status not null,
  changed_by uuid references auth.users (id) on delete set null,
  changed_at timestamptz not null default now()
);

create index enquiry_status_history_enquiry_idx on public.enquiry_status_history (enquiry_id, changed_at);

create or replace function public.record_enquiry_status()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' or new.status is distinct from old.status then
    insert into public.enquiry_status_history (enquiry_id, from_status, to_status, changed_by)
    values (new.id, case when tg_op = 'UPDATE' then old.status end, new.status, auth.uid());
  end if;
  return new;
end;
$$;

create trigger wholesale_enquiries_status_history
  after insert or update of status on public.wholesale_enquiries
  for each row execute function public.record_enquiry_status();

-- ---------------------------------------------------------------------------
-- Integration outbox (CRM, email, ...). Rows are written by server code only.
-- ---------------------------------------------------------------------------

create type public.job_status as enum ('pending', 'running', 'succeeded', 'failed', 'blocked');

create table public.integration_jobs (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  operation text not null,
  entity_type text not null,
  entity_id uuid not null,
  idempotency_key text not null unique,
  status public.job_status not null default 'pending',
  attempts integer not null default 0,
  max_attempts integer not null default 5,
  next_attempt_at timestamptz not null default now(),
  last_error text,
  external_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index integration_jobs_due_idx on public.integration_jobs (next_attempt_at) where status in ('pending', 'failed');
create index integration_jobs_entity_idx on public.integration_jobs (entity_type, entity_id);

create trigger integration_jobs_updated_at before update on public.integration_jobs
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Rate limiting for public endpoints (fixed window, keyed by hashed client id).
-- ---------------------------------------------------------------------------

create table public.rate_limits (
  key text not null,
  window_start timestamptz not null,
  hits integer not null default 0,
  primary key (key, window_start)
);

create or replace function public.hit_rate_limit(p_key text, p_max integer, p_window_seconds integer)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_window timestamptz := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);
  v_hits integer;
begin
  insert into public.rate_limits as r (key, window_start, hits)
  values (p_key, v_window, 1)
  on conflict (key, window_start) do update set hits = r.hits + 1
  returning hits into v_hits;

  delete from public.rate_limits where window_start < now() - interval '1 day';
  return v_hits <= p_max;
end;
$$;

-- ---------------------------------------------------------------------------
-- Enquiry creation: one transaction for enquiry + items + outbox jobs.
-- Called by the server with the service role only.
-- ---------------------------------------------------------------------------

create or replace function public.create_wholesale_enquiry(p jsonb, p_jobs jsonb default '[]'::jsonb)
returns table (id uuid, enquiry_number text, created boolean)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
  v_number text;
  v_item jsonb;
  v_job jsonb;
  v_order integer := 0;
begin
  select e.id, e.enquiry_number into v_id, v_number
  from public.wholesale_enquiries e
  where e.idempotency_key = (p ->> 'idempotency_key')::uuid;

  if v_id is not null then
    return query select v_id, v_number, false;
    return;
  end if;

  v_number := 'LSP-' || to_char(now() at time zone 'Asia/Kolkata', 'YYYY') || '-'
    || lpad(nextval('public.enquiry_number_seq')::text, 5, '0');

  insert into public.wholesale_enquiries (
    enquiry_number, idempotency_key, customer_name, company_name, email, phone, country,
    message, target_budget, consent_at, crm_sync_status
  ) values (
    v_number,
    (p ->> 'idempotency_key')::uuid,
    p ->> 'customer_name',
    nullif(p ->> 'company_name', ''),
    p ->> 'email',
    p ->> 'phone',
    nullif(p ->> 'country', ''),
    p ->> 'message',
    nullif(p ->> 'target_budget', ''),
    now(),
    coalesce((p ->> 'crm_sync_status')::public.sync_status, 'not_configured')
  )
  returning wholesale_enquiries.id into v_id;

  for v_item in select * from jsonb_array_elements(coalesce(p -> 'items', '[]'::jsonb)) loop
    insert into public.enquiry_items (enquiry_id, product_id, product_name_snapshot, quantity, specifications, display_order)
    values (
      v_id,
      nullif(v_item ->> 'product_id', '')::uuid,
      coalesce(
        (select pr.name from public.products pr where pr.id = nullif(v_item ->> 'product_id', '')::uuid),
        v_item ->> 'product_name'
      ),
      nullif(v_item ->> 'quantity', '')::integer,
      nullif(v_item ->> 'specifications', ''),
      v_order
    );
    v_order := v_order + 1;
  end loop;

  for v_job in select * from jsonb_array_elements(p_jobs) loop
    insert into public.integration_jobs (provider, operation, entity_type, entity_id, idempotency_key, status, last_error)
    values (
      v_job ->> 'provider',
      v_job ->> 'operation',
      'wholesale_enquiry',
      v_id,
      (v_job ->> 'operation') || ':' || v_id::text,
      coalesce((v_job ->> 'status')::public.job_status, 'pending'),
      v_job ->> 'last_error'
    );
  end loop;

  return query select v_id, v_number, true;
end;
$$;

revoke execute on function public.create_wholesale_enquiry(jsonb, jsonb) from public, anon, authenticated;
revoke execute on function public.hit_rate_limit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.create_wholesale_enquiry(jsonb, jsonb) to service_role;
grant execute on function public.hit_rate_limit(text, integer, integer) to service_role;
