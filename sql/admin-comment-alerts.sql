-- Apply once using Supabase migrations. No historical comments are backfilled.
create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron with schema pg_catalog;
-- Keep net and ifn_private outside the Data API's exposed schemas.
create schema if not exists ifn_private;
revoke all on schema ifn_private from public, anon, authenticated;
grant usage on schema ifn_private to service_role;

create table ifn_private.alert_config (
  singleton boolean primary key default true check (singleton),
  admin_user_id uuid not null references auth.users(id),
  recipient text not null,
  sender text not null default 'Identity Field Notes <alerts@identityfieldnotes.com>',
  token_hash text not null,
  health text not null default 'not_checked',
  checked_at timestamptz
);
create table ifn_private.comment_alerts (
  id uuid primary key default gen_random_uuid(),
  comment_id uuid unique references public.comments(id) on delete cascade,
  snapshot jsonb not null,
  constraint comment_alerts_source_check check (comment_id is not null or snapshot->>'kind' = 'setup_test'),
  state text not null default 'pending' check (state in ('pending','processing','accepted','failed','needs_review','cancelled')),
  attempts integer not null default 0,
  created_at timestamptz not null default now(),
  first_attempt_at timestamptz,
  next_attempt_at timestamptz not null default now(),
  lease_until timestamptz,
  lease_id uuid,
  provider_id text,
  last_error text,
  accepted_at timestamptz
);
create index comment_alerts_pending_idx on ifn_private.comment_alerts(next_attempt_at)
where state in ('pending','processing');
alter table ifn_private.alert_config enable row level security;
alter table ifn_private.comment_alerts enable row level security;
revoke all on all tables in schema ifn_private from public, anon, authenticated;
grant select, update on ifn_private.alert_config to service_role;
grant select, update on ifn_private.comment_alerts to service_role;

-- Resolve the sole confirmed project admin; never accept recipients from a caller.
do $$
declare token text := encode(extensions.gen_random_bytes(32),'hex'); admin_record record;
begin
  if (select count(*) from public.community_roles r join auth.users u on u.id=r.user_id
      where r.role='admin' and u.email_confirmed_at is not null) <> 1 then
    raise exception 'Expected exactly one confirmed admin; configure the recipient explicitly';
  end if;
  select u.id,u.email into strict admin_record from public.community_roles r
    join auth.users u on u.id=r.user_id where r.role='admin' and u.email_confirmed_at is not null;
  perform vault.create_secret(token,'ifn_comment_alert_worker','Private IFN comment alert worker authentication');
  insert into ifn_private.alert_config(singleton,admin_user_id,recipient,token_hash)
    values(true,admin_record.id,admin_record.email,encode(extensions.digest(token,'sha256'),'hex'));
end $$;

create function ifn_private.enqueue_comment_alert() returns trigger
language plpgsql security definer set search_path = '' as $$
declare cfg ifn_private.alert_config; author_name text;
begin
  if new.status not in ('published','pending') then return new; end if;
  select * into strict cfg from ifn_private.alert_config where singleton;
  select p.display_name into author_name from public.profiles p where p.id=new.user_id;
  insert into ifn_private.comment_alerts(comment_id,snapshot) values(new.id,jsonb_build_object(
    'recipient',cfg.recipient,'sender',cfg.sender,'author',coalesce(nullif(author_name,''),'Identity practitioner'),
    'article_id',new.article_id,'body',new.body,'title',new.title,'kind',new.kind,
    'is_reply',new.parent_id is not null,'status',new.status,'created_at',new.created_at));
  return new;
end $$;
revoke all on function ifn_private.enqueue_comment_alert() from public,anon,authenticated;
create trigger comments_enqueue_admin_alert after insert on public.comments
for each row execute function ifn_private.enqueue_comment_alert();

-- These RPCs use service_role privileges, not SECURITY DEFINER. Client roles cannot invoke them.
create function ifn_private.alert_recipient_valid() returns boolean
language sql security definer set search_path = '' as $$
  select exists(select 1 from ifn_private.alert_config cfg join public.community_roles r on r.user_id=cfg.admin_user_id
    join auth.users u on u.id=r.user_id where r.role='admin' and u.email_confirmed_at is not null and u.email=cfg.recipient);
$$;
revoke all on function ifn_private.alert_recipient_valid() from public,anon,authenticated;
grant execute on function ifn_private.alert_recipient_valid() to service_role;

create function public.ifn_alert_auth(p_token text) returns boolean
language sql security invoker set search_path = '' as $$
  select exists(select 1 from ifn_private.alert_config
    where singleton and length(p_token)=64 and token_hash=encode(extensions.digest(p_token,'sha256'),'hex'));
$$;
create function public.ifn_alert_health(p_health text) returns void
language sql security invoker set search_path = '' as $$
  update ifn_private.alert_config set health=left(p_health,100),checked_at=now() where singleton;
$$;
create function public.ifn_alert_claim() returns jsonb
language plpgsql security invoker set search_path = '' as $$
declare result jsonb;
begin
  update ifn_private.comment_alerts a set state='cancelled',last_error='Comment no longer visible or admin recipient changed'
    where a.state in ('pending','processing') and (a.lease_until is null or a.lease_until < now())
    and ((a.comment_id is not null and not exists(select 1 from public.comments c where c.id=a.comment_id and c.status in ('published','pending')))
      or not ifn_private.alert_recipient_valid()
      or not exists(select 1 from ifn_private.alert_config cfg where cfg.recipient=a.snapshot->>'recipient'));
  -- Resend retains idempotency keys for 24h. Never retry uncertain sends beyond that window.
  update ifn_private.comment_alerts set state='needs_review',last_error='Automatic retry window exhausted; inspect provider before any resend'
    where state in ('pending','processing') and (lease_until is null or lease_until < now())
    and (first_attempt_at < now()-interval '23 hours' or attempts >= 8);
  with candidates as (
    select id from ifn_private.comment_alerts where state in ('pending','processing')
      and next_attempt_at<=now() and (lease_until is null or lease_until<now())
    order by created_at for update skip locked limit 10
  ), claimed as (
    update ifn_private.comment_alerts a set state='processing',attempts=attempts+1,
      first_attempt_at=coalesce(first_attempt_at,now()),lease_until=now()+interval '5 minutes',lease_id=gen_random_uuid()
    from candidates c where a.id=c.id returning a.id,a.lease_id,a.snapshot
  ) select coalesce(jsonb_agg(to_jsonb(claimed)),'[]'::jsonb) into result from claimed;
  return result;
end $$;
create function public.ifn_alert_finish(p_id uuid,p_lease uuid,p_state text,p_provider_id text default null,p_error text default null) returns boolean
language plpgsql security invoker set search_path = '' as $$
declare changed integer;
begin
  if p_state not in ('accepted','pending','failed') then raise exception 'Invalid completion state'; end if;
  update ifn_private.comment_alerts set state=p_state,provider_id=p_provider_id,last_error=left(p_error,200),
    accepted_at=case when p_state='accepted' then now() else null end,
    next_attempt_at=now()+make_interval(secs=>least(3600,60*power(2,attempts)::integer)),lease_until=null,lease_id=null
    where id=p_id and lease_id=p_lease and state='processing';
  get diagnostics changed=row_count;
  return changed=1;
end $$;
revoke all on function public.ifn_alert_auth(text),public.ifn_alert_health(text),public.ifn_alert_claim(),public.ifn_alert_finish(uuid,uuid,text,text,text) from public,anon,authenticated;
grant execute on function public.ifn_alert_auth(text),public.ifn_alert_health(text),public.ifn_alert_claim(),public.ifn_alert_finish(uuid,uuid,text,text,text) to service_role;

create function ifn_private.wake_comment_alert_worker() returns bigint
language sql security invoker set search_path = '' as $$
  select net.http_post(
    url:='https://fbiwpyeodonkkllfzwbs.supabase.co/functions/v1/comment-admin-alerts',
    headers:=jsonb_build_object('Content-Type','application/json','x-ifn-alert-key',
      (select decrypted_secret from vault.decrypted_secrets where name='ifn_comment_alert_worker')),
    body:='{}'::jsonb,timeout_milliseconds:=120000);
$$;
revoke all on function ifn_private.wake_comment_alert_worker() from public,anon,authenticated,service_role;
select cron.schedule('ifn-comment-admin-alerts','*/5 * * * *','select ifn_private.wake_comment_alert_worker();');
