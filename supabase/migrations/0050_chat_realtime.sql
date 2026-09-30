-- Team chat without waiting: new messages, reactions and "seen" reach every
-- open chat at once (Supabase Realtime), instead of the page reloading.
-- Only staff and admins can read them (same rule as the messages themselves).

drop policy if exists staff_message_reactions_team on public.staff_message_reactions;
create policy staff_message_reactions_team on public.staff_message_reactions for select using (auth_role() in ('admin', 'staff'));
drop policy if exists staff_chat_reads_team on public.staff_chat_reads;
create policy staff_chat_reads_team on public.staff_chat_reads for select using (auth_role() in ('admin', 'staff'));

do $$
declare t text;
begin
  foreach t in array array['staff_messages', 'staff_message_reactions', 'staff_chat_reads'] loop
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = t) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;
