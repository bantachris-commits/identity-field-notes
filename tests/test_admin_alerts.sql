-- Run in Supabase SQL Editor as postgres. All fixture comments/alerts roll back.
begin;
do $$
declare admin_id uuid; v_parent_id uuid := gen_random_uuid(); reply_id uuid := gen_random_uuid(); hidden_id uuid; claimed jsonb; item jsonb; other_item jsonb;
begin
  if has_schema_privilege('anon','ifn_private','USAGE') or has_schema_privilege('authenticated','ifn_private','USAGE') then
    raise exception 'Client access to private schema';
  end if;
  if has_function_privilege('anon','public.ifn_alert_claim()','EXECUTE')
    or has_function_privilege('authenticated','public.ifn_alert_auth(text)','EXECUTE') then
    raise exception 'Client access to alert RPCs';
  end if;
  select admin_user_id into admin_id from ifn_private.alert_config;
  perform set_config('request.jwt.claim.sub',admin_id::text,true);
  perform set_config('request.jwt.claims',jsonb_build_object('sub',admin_id,'role','authenticated')::text,true);
  execute 'set local role authenticated';
  insert into public.comments(id,article_id,user_id,body,kind,status)
    values(v_parent_id,'community-general',admin_id,'Transactional alert trigger test','comment','published');
  insert into public.comments(id,article_id,parent_id,user_id,body,kind,status)
    values(reply_id,'community-general',v_parent_id,admin_id,'Transactional reply test','reply','published');
  execute 'reset role';
  insert into public.comments(article_id,user_id,body,kind,status)
    values('community-general',admin_id,'Transactional hidden test','comment','hidden') returning id into hidden_id;
  update public.comments set body='Edited transactional test' where id=v_parent_id;
  if (select count(*) from ifn_private.comment_alerts where comment_id in (v_parent_id,reply_id,hidden_id)) <> 2 then
    raise exception 'Trigger did not enqueue exactly comment/reply once';
  end if;
  -- Isolate fixtures from any real queued comments in this rollback-only transaction.
  update ifn_private.comment_alerts set next_attempt_at=now()+interval '1 day'
    where comment_id is distinct from v_parent_id and comment_id is distinct from reply_id;
  execute 'set local role service_role';
  if public.ifn_alert_auth(repeat('0',64)) then raise exception 'Invalid token accepted'; end if;
  claimed := public.ifn_alert_claim();
  if jsonb_array_length(claimed)<>2 then raise exception 'Service worker cannot claim both comments'; end if;
  if jsonb_array_length(public.ifn_alert_claim())<>0 then raise exception 'Active lease claimed twice'; end if;
  item := claimed->0; other_item := claimed->1;
  if public.ifn_alert_finish((item->>'id')::uuid,gen_random_uuid(),'accepted','test-provider',null) then
    raise exception 'Wrong lease accepted';
  end if;
  if not public.ifn_alert_finish((item->>'id')::uuid,(item->>'lease_id')::uuid,'accepted','test-provider',null) then
    raise exception 'Valid completion rejected';
  end if;
  update ifn_private.comment_alerts set lease_until=now()-interval '1 minute',first_attempt_at=now()-interval '24 hours'
    where id=(other_item->>'id')::uuid;
  if jsonb_array_length(public.ifn_alert_claim())<>0 then raise exception 'Expired idempotency window retried'; end if;
  if (select state from ifn_private.comment_alerts where id=(other_item->>'id')::uuid)<>'needs_review' then
    raise exception 'Expired attempt not held for review';
  end if;
  execute 'reset role';
end $$;
rollback;
select 'PASS: authenticated inserts, comment/reply queue, hidden exclusion, edit deduplication, RPC grants, leases, completion, retry deadline; fixtures rolled back' as result;
