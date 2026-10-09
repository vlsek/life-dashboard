-- Сценарий для run.sh 063: цели и задачи друзьям (миграция 063). Печатает OK / РАСХОЖДЕНИЕ. Только тестовая БД стенда.
\set ON_ERROR_STOP 1
\pset format unaligned
\pset tuples_only on
create temp table res(n serial, name text, expected text, got text);
grant all on all tables in schema public to authenticated; -- как в Supabase по умолчанию; RLS проверяем ролью authenticated (суперпользователь RLS обходит)
grant all on pg_temp.res to public;
create or replace function pg_temp.as_client(u uuid) returns void as $$ begin perform set_config('request.jwt.claim.sub', u::text, false); end $$ language plpgsql;
create or replace function pg_temp.as_admin() returns void as $$ begin perform set_config('request.jwt.claim.sub', '', false); end $$ language plpgsql;
create or replace function pg_temp.check_(p_name text, p_expected text, p_got text) returns void as $$
begin insert into res(name, expected, got) values (p_name, p_expected, p_got); end $$ language plpgsql;

do $$
declare a uuid := gen_random_uuid(); b uuid := gen_random_uuid(); c uuid := gen_random_uuid();
        i1 uuid; i2 uuid; i3 uuid; i4 uuid; gid uuid; e text; r goal_invites; k int;
begin
  insert into auth.users(id) values (a), (b), (c);
  insert into profiles(user_id, display_name) values (a, 'A'), (b, 'B'), (c, 'C');
  insert into friendships(requester_id, addressee_id, status) values (a, b, 'accepted');

  -- не друг
  perform pg_temp.as_client(a); e := '';
  begin perform send_goal_invite(c, 'goal', 'x'); exception when others then e := sqlstate; end;
  perform pg_temp.check_('01 не друг -> 42501', '42501', e);

  -- цель другу; баллы не от отправителя
  select id into i1 from send_goal_invite(b, 'goal', 'Бегать', 3, 'hard', current_date + 30);
  perform pg_temp.as_client(b);
  perform pg_temp.check_('03 получатель видит входящее', '1', (select count(*)::text from get_goal_invites() where direction = 'incoming' and unread));
  perform pg_temp.as_client(c);
  set local role authenticated;
  k := (select count(*) from goal_invites);
  reset role;
  perform pg_temp.check_('04 посторонний не видит (RLS)', '0', k::text);
  perform pg_temp.as_client(a); e := '';
  begin perform respond_goal_invite(i1, true); exception when others then e := sqlstate; end;
  perform pg_temp.check_('05 отправитель не может принять -> P0002', 'P0002', e);
  e := '';
  set local role authenticated;
  begin insert into goal_invites(sender_id, recipient_id, kind, name) values (a, b, 'goal', 'прямая вставка'); exception when others then e := sqlstate; end;
  reset role;
  perform pg_temp.check_('06 прямая вставка запрещена -> 42501', '42501', e);

  perform pg_temp.as_client(b);
  select goal_id into gid from respond_goal_invite(i1, true);
  perform pg_temp.check_('07 принята: цель создана у получателя, баллы по сложности (hard=15)', '15|3|Бегать',
    (select points || '|' || stages || '|' || name from goals where id = gid and user_id = b));
  e := ''; begin perform respond_goal_invite(i1, true); exception when others then e := sqlstate; end;
  perform pg_temp.check_('08 повторный ответ -> P0002', 'P0002', e);

  -- выполнение -> отправитель видит
  update goals set done = true, done_date = current_date where id = gid;
  perform pg_temp.as_client(a);
  perform pg_temp.check_('09 отправитель видит completed + непрочитано', 'true|true',
    (select (completed_at is not null) || '|' || unread from get_goal_invites() where id = i1));
  perform mark_goal_invite_seen(i1);
  perform pg_temp.check_('10 после mark_seen непрочитанного нет', 'false', (select unread::text from get_goal_invites() where id = i1));

  -- задача на день
  select id into i2 from send_goal_invite(b, 'task', 'Позвонить маме', 5, 'hard', current_date, current_date + 1);
  perform pg_temp.as_client(b);
  perform respond_goal_invite(i2, true);
  perform pg_temp.check_('11 задача попала в план на дату', '1',
    (select jsonb_array_length(planned_goals)::text from daily_notes where user_id = b and date = current_date + 1));
  update daily_notes set planned_goals = (select jsonb_agg(jsonb_set(x, '{done}', 'true')) from jsonb_array_elements(planned_goals) x) where user_id = b and date = current_date + 1;
  perform pg_temp.check_('12 задача отмечена -> completed_at', 'true', (select (completed_at is not null)::text from goal_invites where id = i2));

  -- отклонение
  perform pg_temp.as_client(a);
  select id into i3 from send_goal_invite(b, 'goal', 'Отклонить');
  perform pg_temp.as_client(b);
  select status into e from respond_goal_invite(i3, false);
  perform pg_temp.check_('13 отклонение', 'declined', e);
  perform pg_temp.check_('14 после отклонения цели нет', '0', (select count(*)::text from goals where user_id = b and name = 'Отклонить'));

  -- лимит получателя
  update profiles set goal_invites_per_day = 0 where user_id = b;
  perform pg_temp.as_client(a); e := '';
  begin perform send_goal_invite(b, 'goal', 'лимит'); exception when others then e := sqlstate; end;
  perform pg_temp.check_('15 лимит получателя 0 -> 53400', '53400', e);
  perform pg_temp.as_admin();
  update profiles set goal_invites_per_day = null where user_id = b;
  delete from goal_invites where recipient_id = b;
  perform pg_temp.as_client(a);
  for k in 1..5 loop perform send_goal_invite(b, 'goal', 'спам ' || k); end loop;
  e := '';
  begin perform send_goal_invite(b, 'goal', 'спам 6'); exception when others then e := sqlstate; end;
  perform pg_temp.check_('16 шестое ожидающее -> 53400', '53400', e);

  -- отзыв и удаление из друзей
  select id into i4 from goal_invites where sender_id = a and name = 'спам 1';
  perform cancel_goal_invite(i4);
  perform pg_temp.check_('17 отзыв', 'cancelled', (select status from goal_invites where id = i4));
  perform pg_temp.as_admin();
  delete from friendships where requester_id = a and addressee_id = b;
  perform pg_temp.check_('18 удаление из друзей отменяет ожидающие', '0', (select count(*)::text from goal_invites where status = 'pending'));
  perform pg_temp.as_client(a); e := '';
  begin perform send_goal_invite(b, 'goal', 'после'); exception when others then e := sqlstate; end;
  perform pg_temp.check_('19 после удаления из друзей -> 42501', '42501', e);
  -- задача без даты
  perform pg_temp.as_admin();
  insert into friendships(requester_id, addressee_id, status) values (b, a, 'accepted');
  perform pg_temp.as_client(a); e := '';
  begin perform send_goal_invite(b, 'task', 'без даты'); exception when others then e := sqlstate; end;
  perform pg_temp.check_('20 задача без даты -> 22023', '22023', e);
end $$;

select case when expected = got then 'OK' else 'РАСХОЖДЕНИЕ' end || ' ' || name || case when expected = got then '' else ' | ожидалось: ' || expected || ' | получено: ' || coalesce(got, 'NULL') end from res order by n;
