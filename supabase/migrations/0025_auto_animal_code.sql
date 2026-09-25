-- Animal codes are made automatically: SPEC-L-NNN
--   SPEC = 4 letters from the species name (last word: "Giant Panda" -> PAND)
--   L    = the category's letter (Mammals A, Birds B, Reptiles C, ... as already used)
--   NNN  = the next number across all animals
-- A code typed in by hand is still kept (imports), but the admin form no longer asks.
create or replace function public.fill_animal_code()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_prefix text;
  v_letter text;
  v_seq int;
begin
  if new.animal_code is not null and btrim(new.animal_code) <> '' then
    new.animal_code := upper(btrim(new.animal_code));
    return new;
  end if;

  select upper(rpad(left(regexp_replace(regexp_replace(btrim(common_name), '^.*\s', ''), '[^A-Za-z]', '', 'g'), 4), 4, 'X'))
    into v_prefix from species where id = new.species_id;

  -- the letter this category already uses; a brand-new category gets the next free letter
  select mode() within group (order by substring(animal_code from '-([A-Z])-'))
    into v_letter from animals where category_id = new.category_id and animal_code ~ '-[A-Z]-';
  if v_letter is null then
    select chr(coalesce(max(ascii(substring(animal_code from '-([A-Z])-'))), ascii('A') - 1) + 1)
      into v_letter from animals where animal_code ~ '-[A-Z]-';
  end if;

  perform pg_advisory_xact_lock(hashtext('animal_code'));
  select coalesce(max(substring(animal_code from '(\d+)$')::int), 0) + 1 into v_seq from animals;

  new.animal_code := coalesce(nullif(v_prefix, 'XXXX'), 'ANIM') || '-' || v_letter || '-' || lpad(v_seq::text, 3, '0');
  return new;
end $$;

drop trigger if exists animals_fill_code on public.animals;
create trigger animals_fill_code before insert on public.animals
  for each row execute function public.fill_animal_code();

-- Preview for the admin form ("will be PAND-A-102"), same rules as the trigger.
create or replace function public.fill_animal_code_preview(p_species uuid, p_category uuid)
returns text language sql stable security definer set search_path = public as $$
  select coalesce(nullif((select upper(rpad(left(regexp_replace(regexp_replace(btrim(common_name), '^.*\s', ''), '[^A-Za-z]', '', 'g'), 4), 4, 'X')) from species where id = p_species), 'XXXX'), 'ANIM')
    || '-' ||
    coalesce(
      (select mode() within group (order by substring(animal_code from '-([A-Z])-')) from animals where category_id = p_category and animal_code ~ '-[A-Z]-'),
      (select chr(coalesce(max(ascii(substring(animal_code from '-([A-Z])-'))), ascii('A') - 1) + 1) from animals where animal_code ~ '-[A-Z]-')
    )
    || '-' ||
    lpad(((select coalesce(max(substring(animal_code from '(\d+)$')::int), 0) from animals) + 1)::text, 3, '0');
$$;
