# «Тренировки» v2 — контракт данных (BACKLOG 69.1)

Миграция: `migrations/113_workout_sessions.sql` (аддитивная, повтор безопасен). Проверка: `scripts/sql_harness/run.sh 113 scenario_113_workout_sessions.sql` — 28 из 28 на PostgreSQL 16.
Чистые типы и правила чтения: `web-workouts/src/lib/sessionContract.ts` (+ тест). В UI пока не подключено — это основа для 69.2+.

## Принципы
- **Ничего не ломаем.** Старые таблицы, строки, политики не меняются. Старые записи `workout_entries` без `session_id` остаются валидными и показываются как «неявная тренировка» за день (группировка по `date`), данные не переносятся.
- **Клиент работает до применения миграции.** Проба наличия таблицы `workout_sessions` (как у 054); нет таблицы — раздел остаётся на записях «упражнение × день».
- **Идентификаторы создаёт клиент (uuid)** — офлайн-очередь (раздел 66) повторяет запись без дублей (upsert по `id`).

## Таблицы
| Таблица | Назначение | Главное |
|---|---|---|
| `workout_sessions` | одна тренировка | `date` (локальная дата начала, считает клиент), `started_at`, `finished_at` (NULL = идёт сейчас), `routine_id`, `source` (`live` / `manual`), `name`, `notes` |
| `workout_routines` | рутина (шаблон) | `name`, `folder`, `notes`, `position`, `archived` |
| `workout_routine_items` | упражнение в рутине | `exercise_id`, `position`, `target_sets`, `reps_min/max`, `rest_seconds`, `superset_group`, `note` |

Колонки: `workout_entries.session_id` (удаление сессии → NULL, записи не пропадают), `position` (порядок в сессии), `superset_group` (одинаковый номер = один суперсет); `profiles.workout_settings jsonb`.

## Правила, которые держит база
- Не больше **одной идущей** сессии на пользователя (частичный уникальный индекс). Второе устройство, получив `23505` при старте, берёт уже идущую.
- `finished_at >= started_at`; `source = 'manual'` (запись задним числом) всегда с концом.
- Длины и диапазоны (название ≤ 80, `target_sets` 1–20, `reps_max ≥ reps_min`, `superset_group` 1–20, отдых 0–3600 с).
- RLS «только свои»; пункт рутины и сессия дополнительно проверяют, что ссылаются на СВОИ рутину/упражнение.

## Подход (`workout_entries.sets`, jsonb) — необязательные поля
База формат не проверяет, как и раньше. Читать только через `sessionContract.ts`:
- `type`: `normal | warmup | drop | failure`; нет поля или неизвестное значение = `normal`.
- `rpe`: 5…10 с шагом 0.5 (`normalizeRpe`).
- `done`: `false` — «ещё не сделан» (в активной тренировке); нет поля = выполнен.
- `rest`: секунды отдыха после подхода.
- **Рабочий подход** = выполнен и не разминка: только такие идут в объём, рекорды и «прошлый раз».

## Настройки `profiles.workout_settings`
`units` (`kg`|`lb`, по умолчанию kg), `rest_default` (90 с), `auto_rest`, `rpe`, `prev_source` (`last`|`best`), `keep_awake`, `smart_superset`. Читать через `readSettings` — битые ключи заменяются значениями по умолчанию.

## Для следующих срезов
- 69.2 (активная тренировка): старт = insert в `workout_sessions` с клиентским uuid; запись упражнений — upsert в `workout_entries` с `session_id/position`; конец = `finished_at`.
- Лента (69.3): `groupSessions(entries, sessions)`; длительность — `sessionMinutes`.
- Соцзадел (`friend_summary`, 056) не затронут.
