-- 043_water_norm_food.sql
-- Норма воды — это ПИТЬЁ, без воды из еды (решение владельца 2026-10-03, v2.49; агент 7). ПРИМЕНИТЬ В SUPABASE SQL EDITOR (одним запуском;
-- повторный запуск безопасен: create or replace).
--
-- Было (033/034): авто-норма = BSA × 1200 мл/м² при росте 100–250 см, иначе вес × 30; без веса — 2000 мл.
-- Стало: человек получает с едой около 20% суточной воды, поэтому норма питья = ВСЯ вода × 0.8:
--   с ростом: round(BSA × 1000 / 10) × 10, где BSA = sqrt(рост × вес / 3600) (Мостеллер); 1000 = ≈1250 мл/м² всей воды × 0.8;
--   без роста: round(вес × 26)  (= вес × 32,5 всей воды × 0.8);
--   без веса: 1800 мл.
-- Примеры: 70 кг / 175 см → 1840; 70 кг без роста → 1820; 55 кг / 185 см → 1680; 60 кг / 160 см → 1630.
-- Зеркало TS: web-*/src/lib/waterGoal.ts (WATER_ML_PER_M2 = 1000, WATER_ML_PER_KG = 26, WATER_DEFAULT_ML = 1800) и water.ts — менять ВМЕСТЕ.
--
-- Что затрагивает: только «выполнена ли вода» (баллы, серии, лидерборд) для метрики воды БЕЗ ручной нормы (goal_value IS NULL). Ручная норма
-- не меняется. Баллы и серии в БД считаются из значений дней по ТЕКУЩЕЙ норме, поэтому у человека с авто-нормой прошлые дни тоже оцениваются
-- по новой, более низкой норме: «выполнено» становится легче (баллы/серии могут вырасти, уменьшиться не должны). Сохранённых итогов
-- миграция не трогает. До применения клиент уже считает по новой формуле — на это время кольца на сайте и баллы в БД могут расходиться;
-- применить миграцию лучше сразу после выкладки v2.49.

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
    return round(sqrt(h * w / 3600) * 1000 / 10) * 10;
  end if;
  return round(w * 26);
end;
$$ language plpgsql stable security definer;

-- Норма метрики с ПУСТЫМ goal_value: для воды — авто-норма (или 1800 без веса), для остальных 0, как раньше (определение 033, меняется только 2000 → 1800).
create or replace function metric_null_goal(m_id uuid, m_user uuid, m_type text, m_name text, m_icon text)
returns numeric as $$
begin
  if m_type <> 'number' or not is_water_like(m_icon, m_name) then return 0; end if;
  -- Только «главная» вода пользователя (первая по position), как findWaterMetric на клиенте.
  if m_id is distinct from (
    select w.id from metrics w
    where w.user_id = m_user and w.active = true and w.type = 'number' and is_water_like(w.icon, w.name)
    order by w.position nulls last, w.id
    limit 1
  ) then
    return 0;
  end if;
  return coalesce(water_auto_norm_ml(m_user), 1800);
end;
$$ language plpgsql stable security definer;

revoke all on function water_auto_norm_ml(uuid) from public, anon, authenticated;
revoke all on function metric_null_goal(uuid, uuid, text, text, text) from public, anon, authenticated;
