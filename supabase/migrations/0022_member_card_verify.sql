-- The QR on each printed ID card holds a secret token. Scanning it opens a
-- public check page that shows the real card from our records, so fakes are
-- easy to spot. Making a replacement card gives it a new token, so the lost
-- card stops being valid.
alter table public.member_cards add column if not exists verify_token text unique default encode(gen_random_bytes(12), 'hex');
update public.member_cards set verify_token = encode(gen_random_bytes(12), 'hex') where verify_token is null;
alter table public.member_cards alter column verify_token set not null;

-- 'ready' = card exists (with its QR) but has not been printed yet.
alter table public.member_cards drop constraint if exists member_cards_status_check;
alter table public.member_cards add constraint member_cards_status_check check (status in ('ready', 'printed', 'collected'));
alter table public.member_cards alter column status set default 'ready';
