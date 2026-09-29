-- Shift reminders: every 10 minutes the database calls the site's reminder
-- endpoint with a secret key (made here, kept in the admin-only private_settings).
create extension if not exists pg_cron;
create extension if not exists pg_net;

insert into public.private_settings (key, value)
values ('cron', jsonb_build_object('secret', encode(gen_random_bytes(32), 'hex')))
on conflict (key) do nothing;

select cron.unschedule(jobid) from cron.job where jobname = 'gwz-shift-reminders';
select cron.schedule(
  'gwz-shift-reminders',
  '*/10 * * * *',
  $$
  select net.http_get(
    url := 'https://zoo-seven-rho.vercel.app/api/cron/reminders',
    headers := jsonb_build_object('x-cron-key', (select value->>'secret' from public.private_settings where key = 'cron')),
    timeout_milliseconds := 20000
  );
  $$
);
