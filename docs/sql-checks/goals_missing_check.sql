-- Проверка BACKLOG 58.8 (ТОЛЬКО ЧТЕНИЕ, ничего не меняет): «пропали все цели у пользователя Ирина».
-- КАК: в первой строке замените ПОЧТА_ИЛИ_ЧАСТЬ_ИМЕНИ на почту (или её часть / часть имени в профиле, например ирин) и запустите файл целиком
-- в Supabase SQL Editor. Вернётся по строке на каждый подходящий аккаунт. Пришлите результат в чат (почты можно закрасить) — разберём по таблице ниже.
with q as (select lower('ПОЧТА_ИЛИ_ЧАСТЬ_ИМЕНИ') as s)
select u.id as user_id,
       u.email,
       u.created_at as registered,
       u.last_sign_in_at,
       p.display_name,
       p.onboarded,
       (select count(*) from goals g where g.user_id = u.id) as goals_total,
       (select count(*) from goals g where g.user_id = u.id and not coalesce(g.done, false)) as goals_active,
       (select count(*) from goals g where g.user_id = u.id and coalesce(g.done, false)) as goals_done,
       (select min(g.created_at) from goals g where g.user_id = u.id) as first_goal_created,
       (select max(g.created_at) from goals g where g.user_id = u.id) as last_goal_created,
       (select count(*) from goal_invites i where i.recipient_id = u.id and i.status = 'pending') as invites_pending,
       (select count(*) from goal_invites i where i.recipient_id = u.id and i.status = 'accepted') as invites_accepted,
       (select count(*) from goal_invites i where i.recipient_id = u.id and i.status = 'accepted' and i.kind = 'goal' and i.goal_id is null) as accepted_but_goal_gone
  from auth.users u
  left join profiles p on p.user_id = u.id, q
 where lower(coalesce(u.email, '')) like '%' || q.s || '%'
    or lower(coalesce(p.display_name, '')) like '%' || q.s || '%'
 order by u.created_at;

-- КАК ЧИТАТЬ (по строке аккаунта, которым она пользуется):
--  • goals_total > 0 → данные ЦЕЛЫ. Причина на стороне клиента: старая страница в кэше (нужно обновить / открыть заново, версия видна в «Аккаунте»),
--    либо она вошла в ДРУГОЙ аккаунт — сравните строки: если у двух аккаунтов с похожим именем цели лежат только у одного, она входит не в тот.
--    Если goals_active = 0, а goals_done > 0 — все цели просто отмечены выполненными: на странице они в свёрнутом блоке «Выполненные».
--  • goals_total = 0, аккаунт зарегистрирован недавно (registered позже, чем она начала вести цели) → аккаунт пересоздан (например, удалён в админке
--    и зарегистрирован заново): цели удаляются каскадом вместе с аккаунтом и не восстанавливаются.
--  • goals_total = 0, аккаунт старый, accepted_but_goal_gone > 0 → цели были (по приглашениям), но кто-то удалил строки целей; удаление в приложении —
--    только по одной цели с подтверждением, массового удаления в коде нет.
--  • invites_pending > 0 → у неё есть неотвеченные приглашения: именно при них раньше (до v4.55) прятался весь список целей. Если страница показывает
--    приглашения и НЕ показывает цели — у неё версия до 4.55 (кэш).
