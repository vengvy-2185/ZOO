-- Live video and the souvenir shop were taken out of the website again.
drop function if exists public.live_like(uuid, text);
drop function if exists public.live_bump(uuid, integer, integer);
drop function if exists public.shop_finish_sale(uuid, text, text);
drop table if exists public.live_likes;
drop table if exists public.live_comments;
drop table if exists public.live_streams;
drop table if exists public.shop_sale_items;
drop table if exists public.shop_sales;
drop table if exists public.shop_products;
delete from public.private_settings where key = 'shop_payment';
-- nobody keeps the old "shop" / "media" permissions
update public.staff_positions set permissions = array_remove(array_remove(permissions, 'shop'), 'media') where permissions && array['shop', 'media'];
