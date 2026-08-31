-- SEO/marketing infrastructure: tracking + verification fields on the
-- settings singleton, per-page metadata overrides, URL redirects, a blog
-- system, and our own first-party funnel-analytics event log (real data we
-- can query ourselves, rather than depending on a third-party API this app
-- has no credentials for).

-- ---------------------------------------------------------------------------
-- SETTINGS: tracking ids, search-console verification, local-SEO geo/GBP
-- ---------------------------------------------------------------------------
-- Every field defaults to null/empty — nothing loads or renders until an
-- admin actually configures it (same "off until configured" philosophy as
-- RESEND_API_KEY/PAYFAST_* elsewhere in this app).

alter table settings
  add column ga4_measurement_id text,
  add column gtm_container_id text,
  add column clarity_project_id text,
  add column fb_pixel_id text,
  add column gsc_verification_code text,
  add column google_business_profile_url text,
  add column google_place_id text,
  add column latitude numeric(9, 6),
  add column longitude numeric(9, 6),
  add column service_area text,
  add column default_og_image_url text;

comment on column settings.ga4_measurement_id is 'Google Analytics 4 Measurement ID (G-XXXXXXX) — loads gtag.js on public pages when set.';
comment on column settings.gtm_container_id is 'Google Tag Manager container ID (GTM-XXXXXXX) — loads GTM on public pages when set. Prefer GA4 direct OR GTM, not both, to avoid double-counting.';
comment on column settings.clarity_project_id is 'Microsoft Clarity project ID — loads the Clarity script on public pages when set.';
comment on column settings.fb_pixel_id is 'Meta/Facebook Pixel ID — loads the Pixel base code on public pages when set.';
comment on column settings.gsc_verification_code is 'Google Search Console HTML-tag verification content value (not the whole <meta> tag) — rendered as <meta name="google-site-verification">.';
comment on column settings.google_business_profile_url is 'Public Google Business Profile / Maps listing URL, linked from the contact page and used as sameAs in structured data.';
comment on column settings.google_place_id is 'Google Place ID — used for Maps embeds and (optionally) a real-time reviews widget in future.';
comment on column settings.latitude is 'Property latitude — powers LodgingBusiness geo schema and map embeds. Null until the owner confirms the exact address.';
comment on column settings.longitude is 'Property longitude — see latitude.';
comment on column settings.service_area is 'Free-text description of the local area served, e.g. "Hermanus and the surrounding Overberg region" — used in local-SEO copy and schema areaServed.';
comment on column settings.default_og_image_url is 'Override for the generated default OG/social-share image (src/app/opengraph-image.tsx) once real photography is available.';

-- ---------------------------------------------------------------------------
-- PAGE SEO OVERRIDES — admin-editable title/description/canonical/OG/noindex
-- per path, layered over the coded defaults in each page's generateMetadata.
-- ---------------------------------------------------------------------------

create table page_seo_overrides (
  path text primary key,
  title text,
  description text,
  canonical_path text,
  og_image_url text,
  noindex boolean not null default false,
  updated_at timestamptz not null default now(),
  updated_by uuid references profiles (id)
);

alter table page_seo_overrides enable row level security;

create policy "Admins can read page SEO overrides"
  on page_seo_overrides for select
  using (exists (select 1 from profiles p where p.id = auth.uid()));

-- ---------------------------------------------------------------------------
-- REDIRECTS — checked by middleware.ts before falling through to routing.
-- ---------------------------------------------------------------------------

create table redirects (
  id uuid primary key default gen_random_uuid(),
  from_path text not null unique,
  to_path text not null,
  status_code int not null default 308 check (status_code in (301, 302, 307, 308)),
  created_at timestamptz not null default now(),
  created_by uuid references profiles (id)
);

alter table redirects enable row level security;

create policy "Admins can read redirects"
  on redirects for select
  using (exists (select 1 from profiles p where p.id = auth.uid()));

-- ---------------------------------------------------------------------------
-- BLOG POSTS
-- ---------------------------------------------------------------------------
-- `status` drives visibility: 'published' is always visible; 'scheduled' is
-- visible once `published_at` has passed (checked at query time — see
-- src/lib/blog/store.ts — no cron needed to "flip" the status). Content is
-- stored as plain text with a small dependency-free markdown-ish subset
-- (## / ### headings, blank-line paragraphs) rendered by
-- src/lib/blog/render.ts, matching this app's existing preference for no
-- heavy WYSIWYG/markdown dependency.

create table blog_posts (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  excerpt text,
  content text not null default '',
  featured_image_url text,
  featured_image_alt text,
  category text,
  tags text[] not null default '{}',
  status text not null default 'draft' check (status in ('draft', 'scheduled', 'published')),
  published_at timestamptz,
  author_id uuid references profiles (id),
  author_name text,
  meta_title text,
  meta_description text,
  focus_keyword text,
  canonical_url text,
  social_image_url text,
  schema_type text not null default 'BlogPosting' check (schema_type in ('BlogPosting', 'Article', 'NewsArticle')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index blog_posts_status_published_idx on blog_posts (status, published_at desc);
create index blog_posts_category_idx on blog_posts (category);
create index blog_posts_tags_idx on blog_posts using gin (tags);

alter table blog_posts enable row level security;

create policy "Admins can read all blog posts"
  on blog_posts for select
  using (exists (select 1 from profiles p where p.id = auth.uid()));

-- ---------------------------------------------------------------------------
-- ANALYTICS EVENTS — our own first-party funnel log, real and queryable
-- without any third-party API credentials. Not a replacement for GA4/
-- Clarity (those are opt-in, owner-configured, see settings above) — this
-- is what powers /admin/analytics's funnel numbers regardless of whether
-- the owner has set up a third-party account yet.
-- ---------------------------------------------------------------------------

create table analytics_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  booking_id uuid references bookings (id) on delete set null,
  session_id text,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index analytics_events_type_created_idx on analytics_events (event_type, created_at desc);
create index analytics_events_booking_idx on analytics_events (booking_id);

alter table analytics_events enable row level security;

comment on table analytics_events is 'First-party funnel events (enquiry_submitted, booking_requested, deposit_paid, booking_confirmed, ...) written by /api/analytics/event — service-role only, no public read policy.';
