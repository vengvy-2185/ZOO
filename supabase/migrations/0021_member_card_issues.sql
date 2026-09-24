-- Every time a printed ID card is handed to its owner (the first card, and
-- any replacement for a lost one). The count shows how many were given out.
create table if not exists public.member_card_issues (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  card_type text not null,
  issued_by uuid references auth.users(id) on delete set null,
  issued_at timestamptz not null default now()
);
create index if not exists member_card_issues_user on public.member_card_issues (user_id, issued_at desc);
alter table public.member_card_issues enable row level security;
drop policy if exists member_card_issues_read on public.member_card_issues;
create policy member_card_issues_read on public.member_card_issues for select using (user_id = auth.uid() or auth_role() = 'admin');

-- Cards already marked as handed over count as one hand-over.
insert into public.member_card_issues (user_id, card_type, issued_at)
select c.user_id, c.card_type, c.updated_at from public.member_cards c
where c.status = 'collected' and not exists (select 1 from public.member_card_issues i where i.user_id = c.user_id);
