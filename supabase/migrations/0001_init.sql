-- =============================================================================
-- LinkedIn Content Intelligence Agent - initial schema
--
-- Layers this schema supports (see docs/architecture.md):
--   research -> normalization -> pattern extraction -> pattern library
--   -> voice model -> topic research -> retrieval -> draft generation
--   -> critique -> human review -> publish record -> performance
--   -> pattern analysis -> feedback loop
-- =============================================================================

create extension if not exists "uuid-ossp";
create extension if not exists vector;

-- -----------------------------------------------------------------------------
-- creators: public LinkedIn (or other public-platform) authors we research.
-- Only public profile metadata is stored here - never credentials, never
-- private/authenticated content.
-- -----------------------------------------------------------------------------
create table if not exists creators (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  profile_url text,
  niche text,
  description text,
  created_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- source_posts: normalized public posts collected via the research pipeline.
-- raw_data preserves the untouched provider response for auditability;
-- content is the normalized, deduplicated text used everywhere else.
-- -----------------------------------------------------------------------------
create table if not exists source_posts (
  id uuid primary key default uuid_generate_v4(),
  creator_id uuid references creators(id) on delete set null,
  source_url text not null,
  canonical_url text not null,
  content_hash text not null,
  source_platform text not null default 'linkedin',
  author text,
  content text not null,
  published_at timestamptz,
  engagement_data jsonb not null default '{}'::jsonb,
  raw_data jsonb not null default '{}'::jsonb,
  embedding vector(1536),
  created_at timestamptz not null default now(),
  unique (canonical_url, content_hash)
);

create index if not exists source_posts_creator_idx on source_posts(creator_id);
create index if not exists source_posts_canonical_url_idx on source_posts(canonical_url);

-- -----------------------------------------------------------------------------
-- content_patterns: the reusable pattern library, populated by pattern
-- extraction and curated by hand.
-- -----------------------------------------------------------------------------
create table if not exists content_patterns (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  category text not null check (category in ('hook', 'structure', 'storytelling', 'evidence', 'cta', 'formatting')),
  description text not null,
  structure jsonb not null default '[]'::jsonb,
  example text,
  strengths jsonb not null default '[]'::jsonb,
  weaknesses jsonb not null default '[]'::jsonb,
  embedding vector(1536),
  created_at timestamptz not null default now()
);

create index if not exists content_patterns_category_idx on content_patterns(category);

-- -----------------------------------------------------------------------------
-- post_patterns: evidence-based many-to-many link between a source post and
-- the pattern(s) it demonstrates, with a confidence score and the extracted
-- evidence supporting the classification.
-- -----------------------------------------------------------------------------
create table if not exists post_patterns (
  post_id uuid not null references source_posts(id) on delete cascade,
  pattern_id uuid not null references content_patterns(id) on delete cascade,
  confidence numeric(4,3) not null check (confidence >= 0 and confidence <= 1),
  evidence jsonb not null default '[]'::jsonb,
  extraction jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  primary key (post_id, pattern_id)
);

create index if not exists post_patterns_pattern_idx on post_patterns(pattern_id);

-- -----------------------------------------------------------------------------
-- voice_profiles: a structured description of a user's own writing voice,
-- derived only from writing samples they provide (never imitates a public
-- figure).
-- -----------------------------------------------------------------------------
create table if not exists voice_profiles (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  tone jsonb not null default '[]'::jsonb,
  sentence_length jsonb not null default '{}'::jsonb,
  paragraph_length jsonb not null default '{}'::jsonb,
  vocabulary jsonb not null default '{}'::jsonb,
  formality text,
  humor_level text,
  storytelling_level text,
  formatting_style jsonb not null default '{}'::jsonb,
  things_to_avoid jsonb not null default '[]'::jsonb,
  sample_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- voice_examples: representative writing samples backing a voice profile.
-- -----------------------------------------------------------------------------
create table if not exists voice_examples (
  id uuid primary key default uuid_generate_v4(),
  voice_profile_id uuid not null references voice_profiles(id) on delete cascade,
  content text not null,
  source text,
  embedding vector(1536),
  created_at timestamptz not null default now()
);

create index if not exists voice_examples_profile_idx on voice_examples(voice_profile_id);

-- -----------------------------------------------------------------------------
-- content_research: normalized research documents gathered for a specific
-- topic/audience request. Every row must carry a real source_url.
-- -----------------------------------------------------------------------------
create table if not exists content_research (
  id uuid primary key default uuid_generate_v4(),
  query text not null,
  source_url text not null,
  canonical_url text not null,
  content_hash text not null,
  source_type text not null default 'article',
  title text,
  content text not null,
  extracted_facts jsonb not null default '[]'::jsonb,
  embedding vector(1536),
  created_at timestamptz not null default now(),
  unique (canonical_url, content_hash)
);

create index if not exists content_research_query_idx on content_research(query);

-- -----------------------------------------------------------------------------
-- drafts: generated posts moving through the human review lifecycle.
-- status: draft -> critiqued -> approved | rejected -> (edited copies stay
-- as new draft rows so history is preserved).
-- -----------------------------------------------------------------------------
create table if not exists drafts (
  id uuid primary key default uuid_generate_v4(),
  topic text not null,
  audience text not null,
  objective text not null,
  voice_profile_id uuid references voice_profiles(id) on delete set null,
  selected_pattern_id uuid references content_patterns(id) on delete set null,
  content text not null,
  status text not null default 'draft' check (status in ('draft', 'critiqued', 'approved', 'rejected')),
  critique jsonb not null default '{}'::jsonb,
  generation_metadata jsonb not null default '{}'::jsonb,
  research_ids uuid[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists drafts_status_idx on drafts(status);

-- -----------------------------------------------------------------------------
-- published_posts: the human-approved, manually-published record. Publishing
-- is never automatic - this table is only ever written after a human clicks
-- "approve" on a draft.
-- -----------------------------------------------------------------------------
create table if not exists published_posts (
  id uuid primary key default uuid_generate_v4(),
  draft_id uuid references drafts(id) on delete set null,
  content text not null,
  published_at timestamptz not null default now(),
  source_url text,
  created_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- post_performance: manually-entered performance snapshots. Multiple
-- snapshots per post are expected (performance is measured over time).
-- -----------------------------------------------------------------------------
create table if not exists post_performance (
  id uuid primary key default uuid_generate_v4(),
  published_post_id uuid not null references published_posts(id) on delete cascade,
  captured_at timestamptz not null default now(),
  impressions integer,
  likes integer,
  comments integer,
  reposts integer,
  profile_views integer,
  clicks integer,
  engagement_rate numeric(6,4),
  created_at timestamptz not null default now()
);

create index if not exists post_performance_post_idx on post_performance(published_post_id);

-- -----------------------------------------------------------------------------
-- pattern_performance: pre-aggregated, recomputable feedback-loop output.
-- Always carries posts_analyzed (sample size) and confidence so the UI can
-- never present a correlation without disclosing how much data backs it.
-- -----------------------------------------------------------------------------
create table if not exists pattern_performance (
  id uuid primary key default uuid_generate_v4(),
  pattern_id uuid not null references content_patterns(id) on delete cascade,
  topic text,
  audience text,
  posts_analyzed integer not null default 0,
  impressions_median numeric,
  engagement_rate_median numeric,
  comments_median numeric,
  confidence text not null default 'low' check (confidence in ('low', 'medium', 'high')),
  calculated_at timestamptz not null default now()
);

create index if not exists pattern_performance_pattern_idx on pattern_performance(pattern_id);

-- =============================================================================
-- Semantic search functions (pgvector). Each mirrors a specific retrieval
-- need from the generation pipeline; plain SQL filters are used everywhere
-- else (see docs/research-system.md - "Do not use vector search when a
-- normal SQL filter is sufficient").
-- =============================================================================

create or replace function match_voice_examples(
  query_embedding vector(1536),
  match_voice_profile_id uuid,
  match_count int default 5
)
returns table (id uuid, content text, source text, similarity float)
language sql stable
as $$
  select
    voice_examples.id,
    voice_examples.content,
    voice_examples.source,
    1 - (voice_examples.embedding <=> query_embedding) as similarity
  from voice_examples
  where voice_examples.voice_profile_id = match_voice_profile_id
    and voice_examples.embedding is not null
  order by voice_examples.embedding <=> query_embedding
  limit match_count;
$$;

create or replace function match_content_patterns(
  query_embedding vector(1536),
  match_category text default null,
  match_count int default 5
)
returns table (id uuid, name text, category text, description text, similarity float)
language sql stable
as $$
  select
    content_patterns.id,
    content_patterns.name,
    content_patterns.category,
    content_patterns.description,
    1 - (content_patterns.embedding <=> query_embedding) as similarity
  from content_patterns
  where content_patterns.embedding is not null
    and (match_category is null or content_patterns.category = match_category)
  order by content_patterns.embedding <=> query_embedding
  limit match_count;
$$;

create or replace function match_content_research(
  query_embedding vector(1536),
  match_query text default null,
  match_count int default 8
)
returns table (id uuid, title text, source_url text, content text, similarity float)
language sql stable
as $$
  select
    content_research.id,
    content_research.title,
    content_research.source_url,
    content_research.content,
    1 - (content_research.embedding <=> query_embedding) as similarity
  from content_research
  where content_research.embedding is not null
    and (match_query is null or content_research.query = match_query)
  order by content_research.embedding <=> query_embedding
  limit match_count;
$$;

create or replace function match_source_posts(
  query_embedding vector(1536),
  match_count int default 8
)
returns table (id uuid, content text, source_url text, similarity float)
language sql stable
as $$
  select
    source_posts.id,
    source_posts.content,
    source_posts.source_url,
    1 - (source_posts.embedding <=> query_embedding) as similarity
  from source_posts
  where source_posts.embedding is not null
  order by source_posts.embedding <=> query_embedding
  limit match_count;
$$;
