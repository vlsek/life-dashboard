-- 034_water_norm_height.sql
-- Рост в формуле авто-нормы воды (BACKLOG 17, просьба владельца 2026-10-01). ПРИМЕНИТЬ В SUPABASE SQL EDITOR (владелец).
--
-- Было (033): авто-норма = round(вес × 30). Стало: если в profiles.height (см) есть правдоподобный рост (100–250) —
-- норма = round(BSA × 1200 / 10) × 10, где BSA = sqrt(рост × вес / 3600) (Мостеллер), 1200 = 1500 мл/м²·сут общей жидкости × 0.8
-- (около 20% воды приходит с едой). Нет роста — прежняя формула вес × 30. Зеркало TS: autoNormFromBody() в waterGoal.ts
-- (web-dashboard, web-header, web-history, web-shop) — менять ВМЕСТЕ.
--
-- Что затрагивает: только water_auto_norm_ml(uuid), которой пользуется metric_null_goal() — то есть «выполнена ли вода» в очках,
-- сериях и лидерборде для метрики воды БЕЗ ручной нормы (goal_value IS NULL). Ручная норма не меняется. create or replace
-- сохраняет права (revoke из 033 остаётся); если вдруг сбросятся — повторить revoke ниже.

create or replace function water_auto_norm_ml(target_user uuid)
returns numeric as $$
declare
  param_id uuid;
  w numeric;
  h numeric;
begin
  select bp.id into param_id
  from body_parameters bp
  where bp.user_id = target_user and is_weight_like(bp.icon, bp.name)
  order by bp.position nulls last, bp.id
  limit 1;
  if param_id is null then return null; end if;

  select v.value into w
  from body_parameter_values v
  where v.user_id = target_user and v.parameter_id = param_id
  order by v.date desc
  limit 1;
  if coalesce(w, 0) = 0 then return null; end if;

  select p.height into h from profiles p where p.user_id = target_user;
  if h is not null and h >= 100 and h <= 250 then
    return round(sqrt(h * w / 3600) * 1200 / 10) * 10;
  end if;
  return round(w * 30);
end;
$$ language plpgsql stable security definer;

revoke all on function water_auto_norm_ml(uuid) from public, anon, authenticated;
