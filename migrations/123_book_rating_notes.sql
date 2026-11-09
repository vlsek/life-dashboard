-- 123_book_rating_notes.sql
-- BACKLOG 77.8 «Книги: оценка и заметки». rating — 1..5 (null — без оценки), notes — свободный текст (клиент ограничивает 1000 символов).
-- Права и RLS не меняются. Без миграции поля «Оценка» и «Заметка» в форме книги не показываются. ПРИМЕНИТЬ В SUPABASE SQL EDITOR (повторный запуск безопасен).
alter table books add column if not exists rating smallint;
alter table books add column if not exists notes text;
do $$ begin
  alter table books add constraint books_rating_check check (rating is null or (rating between 1 and 5));
exception when duplicate_object then null; end $$;
