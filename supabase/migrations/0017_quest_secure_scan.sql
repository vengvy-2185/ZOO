-- Animal Quest: discoveries can only be recorded by the server, after it has
-- checked the secret token printed in the QR sign beside the enclosure.
-- (Before this, a browser could add any animal to its own session directly.)

drop policy if exists "quest_discoveries_insert" on quest_discoveries;

revoke execute on function public.add_quest_discovery(uuid, uuid, integer) from public, anon, authenticated;
grant execute on function public.add_quest_discovery(uuid, uuid, integer) to service_role;

revoke execute on function public.increment_qr_scan(uuid) from public, anon, authenticated;
grant execute on function public.increment_qr_scan(uuid) to service_role;
