-- Invite links also pay when a friend simply joins: a new account created
-- after opening someone's link earns the sharer points straight away. The
-- friend's credit row is created without a booking and gets its booking
-- (and the bigger "friend bought tickets" points) later, if they pay.
alter table public.referral_credits alter column booking_id drop not null;

alter table public.point_ledger drop constraint if exists point_ledger_reason_check;
alter table public.point_ledger add constraint point_ledger_reason_check
  check (reason in ('purchase', 'referral', 'referral_join', 'welcome', 'milestone', 'redeem', 'admin', 'checkout'));
