-- 124_shop_repeatable.sql
-- BACKLOG 78.9 «Повторяемая награда» (кофе раз в неделю). repeatable — вещь можно покупать снова: она остаётся в магазине, а каждая покупка
-- записывается отдельной строкой-копией (redeemed = true, repeat_of = id вещи) — «потрачено» и защита от перерасхода (057) работают как раньше.
-- Права и RLS не меняются. Без миграции переключатель «Можно снова» в форме не показывается. ПРИМЕНИТЬ В SUPABASE SQL EDITOR (повторный запуск безопасен).
alter table shop_items add column if not exists repeatable boolean not null default false;
alter table shop_items add column if not exists repeat_of uuid references shop_items(id) on delete set null;
create index if not exists shop_items_repeat_of_idx on shop_items(repeat_of) where repeat_of is not null;
