# Life Dashboard

Личный трекер целей, метрик и привычек.
Бэкенд — Supabase (Postgres + Auth + Row Level Security), фронтенд — чистые HTML/CSS/JS без сборки.

Публичная визитка вынесена в отдельный репозиторий (`portfolio`) и отдельный деплой на Cloudflare.

## Разделы

| Файл | Что это |
|---|---|
| `legacy/login.html` | Вход / регистрация (классика; основная версия — `/login/`, в корне заглушка `login.html`) |
| `legacy/onboarding.html` | Первичная настройка после регистрации (классика; основная версия — `/onboarding/`) |
| `legacy/dashboard.html` | Главный трекер: метрики дня, графики, план на сегодня, стрики |
| `legacy/goals.html` | Долгосрочные цели |
| `legacy/skills.html` | Навыки (классика; основная версия — `/skills/`) |
| `legacy/workouts.html` | Тренировки: шаблоны программ, подходы, вес |
| `legacy/challenges.html` | Челленджи: дневные цели, привычки, накопительные счётчики |
| `legacy/english.html` | Изучение языков (классика; основная версия — `/languages/`) |
| `calendar.html` | Календарь |
| `legacy/shop.html` | Магазин за баллы (классика; основная версия — `/shop/`) |
| `legacy/community.html` | Общий лидерборд и лента активности |
| `legacy/account.html` | Настройки аккаунта |
| `admin.html` | Админка |

Общая логика (клиент Supabase, авторизация, модалки, навигация) — в `config.js`.
Переводы (RU/EN) — в `i18n.js`. Тема оформления — в `theme.js`.

## Разворачивание

### 1. Supabase-проект
[supabase.com](https://supabase.com) → New project.

### 2. Схема БД
SQL Editor → вставить содержимое `schema.sql` → Run.
Затем по порядку прогнать все файлы из `migrations/` (001 → 019).

### 3. Настройки авторизации
Authentication → Providers → Email должен быть включён (по умолчанию так и есть).
Confirm email можно отключить в Authentication → Settings, если не нужна почтовая верификация при регистрации.

### 4. Ключи
Project Settings → API:
- **Project URL** → `SUPABASE_URL` в `config.js`
- **Publishable key** (anon/public) → `SUPABASE_ANON_KEY` в `config.js`

Secret key использовать не нужно — весь доступ идёт через RLS-политики на уровне базы.

### 5. Хостинг
Cloudflare Workers (статика из корня репозитория, деплой через `wrangler deploy`, без `wrangler.toml` — конфигурация по умолчанию). Автодеплой на пуш в `main`.
Корень сайта (`/`) — `index.html`-заглушка с мгновенным редиректом на `/login/` (нужна, чтобы wrangler вообще нашёл статику для деплоя — без index.html в корне сборка падает с ошибкой "Could not detect a directory containing static files").

### 6. PWA
`manifest.json` + иконки в `icons/` — сайт можно установить на Android/desktop Chrome как приложение ("Установить" / "На главный экран"). Иконки сгенерированы из `favicon.svg`; при смене иконки перегенерировать `icons/icon-192.png`, `icons/icon-512.png`, `icons/icon-512-maskable.png`, `icons/apple-touch-icon.png`.

## Известные ограничения

- Регистрация открыта всем, у кого есть ссылка (обычная email+пароль модель). Закрыть — можно отключить публичный signUp и заводить пользователей вручную через Supabase Dashboard.
- Баллы за день считаются по текущему набору метрик — удаление/добавление метрики не пересчитывает задним числом баллы за прошлые дни.
