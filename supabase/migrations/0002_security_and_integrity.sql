-- 0002: turn on Row Level Security and add integrity constraints.
-- Safe to run more than once. Run it in the Supabase SQL Editor.
--
-- RLS: with RLS enabled and NO policies, the public anon key (visible in the
-- browser) can read/write nothing. The app's server code uses the service-role
-- key, which bypasses RLS, so the app keeps working unchanged.

alter table creators            enable row level security;
alter table source_posts        enable row level security;
alter table content_patterns    enable row level security;
alter table post_patterns       enable row level security;
alter table voice_profiles      enable row level security;
alter table voice_examples      enable row level security;
alter table content_research    enable row level security;
alter table drafts              enable row level security;
alter table published_posts     enable row level security;
alter table post_performance    enable row level security;
alter table pattern_performance enable row level security;

-- One published record per draft. First remove accidental duplicates, keeping
-- the one that already has performance data (else the earliest).
delete from published_posts p
using (
  select id,
         row_number() over (
           partition by draft_id
           order by (exists (select 1 from post_performance pp where pp.published_post_id = published_posts.id)) desc,
                    created_at asc
         ) as rn
  from published_posts
  where draft_id is not null
) ranked
where p.id = ranked.id and ranked.rn > 1;

create unique index if not exists published_posts_draft_unique
  on published_posts (draft_id) where draft_id is not null;

-- One pattern_performance row per (pattern, topic, audience). Remove older duplicates first.
delete from pattern_performance a
using (
  select id,
         row_number() over (
           partition by pattern_id, coalesce(topic, ''), coalesce(audience, '')
           order by calculated_at desc, id
         ) as rn
  from pattern_performance
) ranked
where a.id = ranked.id and ranked.rn > 1;

create unique index if not exists pattern_performance_unique
  on pattern_performance (pattern_id, coalesce(topic, ''), coalesce(audience, ''));
