-- Meal API için gerekli Postgres yardımcıları
-- Supabase SQL Editor'de bir kez çalıştırın (tablolar güncellendikten sonra).

create extension if not exists pg_trgm;

-- foods üzerinde (food_name, unit_type) unique — upsert race için
do $$
begin
  if not exists (
    select 1 from pg_indexes
    where schemaname = 'badoo' and indexname = 'foods_food_name_unit_type_uidx'
  ) then
    create unique index foods_food_name_unit_type_uidx
      on badoo.foods (food_name, unit_type);
  end if;
end $$;

-- Fuzzy match RPC (PostgREST: schema badoo exposed olmalı)
create or replace function badoo.match_food(search_name text, search_unit text)
returns table (
  id uuid,
  food_name text,
  calories integer,
  protein integer,
  carbohydrates integer,
  fats integer,
  reference_amount numeric,
  sim real
)
language sql
stable
security definer
set search_path = badoo, public
as $$
  select
    f.id,
    f.food_name,
    f.calories,
    f.protein,
    f.carbohydrates,
    f.fats,
    coalesce(f.reference_amount, case when f.unit_type = 'gram' then 100 else 1 end)::numeric as reference_amount,
    similarity(f.food_name, search_name)::real as sim
  from badoo.foods f
  where f.unit_type = search_unit
    and f.food_name % search_name
  order by sim desc
  limit 1;
$$;

grant execute on function badoo.match_food(text, text) to service_role;
grant execute on function badoo.match_food(text, text) to authenticated;
grant execute on function badoo.match_food(text, text) to anon;

-- meals.total_* güncelleyen tipik trigger (yoksa ekle)
create or replace function badoo.refresh_meal_totals()
returns trigger
language plpgsql
security definer
set search_path = badoo, public
as $$
declare
  target_meal_id uuid;
begin
  target_meal_id := coalesce(new.meal_id, old.meal_id);
  if target_meal_id is null then
    return coalesce(new, old);
  end if;

  update badoo.meals m
  set
    total_calories = coalesce((
      select sum(fl.calories) from badoo.food_logs fl
      where fl.meal_id = target_meal_id and fl.deleted_at is null
    ), 0),
    total_protein = coalesce((
      select sum(fl.protein) from badoo.food_logs fl
      where fl.meal_id = target_meal_id and fl.deleted_at is null
    ), 0),
    total_carbohydrates = coalesce((
      select sum(fl.carbohydrates) from badoo.food_logs fl
      where fl.meal_id = target_meal_id and fl.deleted_at is null
    ), 0),
    total_fats = coalesce((
      select sum(fl.fats) from badoo.food_logs fl
      where fl.meal_id = target_meal_id and fl.deleted_at is null
    ), 0),
    updated_at = now()
  where m.id = target_meal_id;

  return coalesce(new, old);
end;
$$;

drop trigger if exists food_logs_refresh_meal_totals on badoo.food_logs;
create trigger food_logs_refresh_meal_totals
after insert or update or delete on badoo.food_logs
for each row execute function badoo.refresh_meal_totals();
