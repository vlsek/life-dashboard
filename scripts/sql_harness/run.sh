#!/bin/bash
# Тестовый стенд для SQL-миграций на РЕАЛЬНОМ PostgreSQL (без Supabase): заглушки ролей/auth/storage + schema.sql + migrations/0NN_*.sql по порядку.
# Использование (нужен root и PostgreSQL 16; в контейнере: apt-get install -y postgresql postgresql-contrib && pg_ctlcluster 16 main start):
#   scripts/sql_harness/run.sh 043                         # чистая БД "pt" со всеми миграциями до 043 включительно
#   scripts/sql_harness/run.sh 044 scenario_044_planned_sets.sql   # то же + прогнать сценарий из этой папки (печатает OK / РАСХОЖДЕНИЕ)
# Единственные ожидаемые ошибки — про storage.foldername (политики хранилища Supabase), к расчётам они не относятся.
# ВАЖНО при чтении вывода: не пропускать кириллицу через `cut`/`head -c` (ломает UTF-8) — писать в файл и читать через python.
set -u
LAST=${1:-999}
SCEN=${2:-}
HERE="$(cd "$(dirname "$0")" && pwd)"
REPO="$(cd "$HERE/../.." && pwd)"
TMP="$(mktemp -d)"; chmod 755 "$TMP"
su postgres -c "psql -q -c 'drop database if exists pt' -c 'create database pt'" >/dev/null 2>&1
su postgres -c "psql -q -d pt" <<'SQL'
do $$ begin
  if not exists (select 1 from pg_roles where rolname='anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname='authenticated') then create role authenticated nologin; end if;
  if not exists (select 1 from pg_roles where rolname='service_role') then create role service_role nologin; end if;
end $$;
create extension if not exists pgcrypto;
create schema if not exists auth;
create table auth.users (id uuid primary key default gen_random_uuid(), email text, raw_user_meta_data jsonb default '{}'::jsonb);
create or replace function auth.uid() returns uuid language sql stable as $f$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $f$;
create or replace function auth.role() returns text language sql stable as $f$ select 'authenticated'::text $f$;
create schema if not exists storage;
create table storage.buckets (id text primary key, name text, public boolean);
create table storage.objects (id uuid default gen_random_uuid(), bucket_id text, name text, owner uuid);
grant usage on schema public, auth to anon, authenticated, service_role;
SQL
apply() { cp "$1" "$TMP/f.sql"; chmod 644 "$TMP/f.sql"; su postgres -c "psql -d pt -v ON_ERROR_STOP=0 -q -f $TMP/f.sql" 2>&1 | grep -i error | head -4 | sed "s|^|  [$(basename "$1")] |"; }
apply "$REPO/schema.sql"
for f in "$REPO"/migrations/0*.sql; do
  n=$(basename "$f" | cut -c1-3)
  [ "$((10#$n))" -gt "$((10#$LAST))" ] && break
  apply "$f"
done
echo "стенд готов: БД pt, миграции до $LAST"
if [ -n "$SCEN" ]; then
  cp "$HERE/$SCEN" "$TMP/s.sql"; chmod 644 "$TMP/s.sql"
  su postgres -c "psql -d pt -q -f $TMP/s.sql" > "$TMP/scenario.out" 2>&1
  python3 - "$TMP/scenario.out" <<'PY'
import sys
t=open(sys.argv[1],encoding='utf-8',errors='replace').read().split('\n')
rows=[l for l in t if '|' in l]
print('сценарий: OK', sum('| OK' in l for l in rows), 'из', len(rows), '| расхождений', sum('РАСХОЖДЕНИЕ' in l for l in rows))
for l in rows:
    if 'РАСХОЖДЕНИЕ' in l: print('  ', l[:160])
for l in t:
    if 'ERROR' in l: print('  ', l[:200])
PY
fi
