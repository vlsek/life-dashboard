# Life Dashboard для Android (Capacitor)

Приложение = тот же сайт внутри Android-оболочки (Capacitor). Офлайн-запись, плашка очереди, кэш чтения и вход без сети уже в сайте
(см. `docs/ANDROID_APP_PLAN.md`), поэтому в приложение попадает ровно то, что собрано в корневых папках репозитория.

## Один раз: включить сборку на GitHub
Файл сборки лежит в `android-app/workflow/android.yml`. Токен агентов не имеет права создавать workflow, поэтому владельцу нужно один раз скопировать его в `.github/workflows/android.yml`: GitHub → репозиторий → **Add file → Create new file** → имя `.github/workflows/android.yml` → вставить содержимое → Commit. (Или выдать токену агентов право `workflow` — тогда перенесёт агент.)

## Получить APK (без Android Studio)
1. GitHub → вкладка **Actions** → **Android APK** → **Run workflow** (ветка `main`).
2. Через ~5–10 минут внизу страницы запуска, в **Artifacts**, появится `life-dashboard-debug-apk` — внутри `app-debug.apk`.
3. Скачайте на телефон, откройте файл (Android спросит разрешение «Установка из неизвестных источников» — разрешите для браузера/файлового менеджера).
   Подпись отладочная: подойдёт для своего телефона; для Play Store нужна релизная (пункт 66.10).

## ОБЯЗАТЕЛЬНО один раз в Supabase (иначе вход через Google не вернёт в приложение)
Supabase → Authentication → URL Configuration → **Redirect URLs**: добавить `https://localhost` и `https://localhost/**`
(приложение открывает сайт по адресу `https://localhost` — это `androidScheme: https` в `capacitor.config.json`).
Вход по почте и паролю работает и без этого.

## Как устроено
- `capacitor.config.json` — имя, `appId` (`com.vlsek.lifedashboard`), схема `https`.
- `scripts/build-www.mjs` — копирует собранный сайт из корня в `www/` (без исходников `web-*`, документов, миграций) и подключает `native-shell.js`.
- `native-shell.js` — кнопка «назад» (на Дашборде/входе закрывает приложение, иначе назад по истории), цвет строки состояния по теме, заставка.
- Папка `android/` и `www/` создаются при сборке и в git не хранятся. Иконка — из `resources/` (адаптивная: передний план + фон `#121212`).

## Локально (если есть Android Studio / JDK 21 + Android SDK)
```
cd android-app && npm install && node scripts/build-www.mjs
npx cap add android && npx capacitor-assets generate --android --iconBackgroundColor '#121212' --iconBackgroundColorDark '#121212'
npx cap sync android && cd android && ./gradlew assembleDebug
```
APK: `android/app/build/outputs/apk/debug/app-debug.apk`.

## Обновление
Сайт внутри приложения — копия на момент сборки. Новая версия сайта = новая сборка APK (плашка «доступна новая версия» — пункт 66.11).

## Вибро и напоминания (BACKLOG 66.9, срез 1)

Слой `native-shell.js` даёт странице `__ldNative.haptic(kind)` (`light` / `medium` / `success` / `warning`) и `__ldNative.applyReminders(settings)`. В браузере обе функции ничего не делают.
`settings = { water: { enabled, fromHour, toHour, everyHours }, workout: { enabled, time: 'HH:MM', weekdays: [1..7] } }`, дни ISO (1 = понедельник). План напоминаний считает чистая `reminderPlan` (покрыта `npm test`); id уведомлений стабильны (вода 1000–1023, тренировка 2001–2007), перед постановкой старые отменяются.
Плагины `@capacitor/haptics` и `@capacitor/local-notifications` — в `package.json`; после `npm run sync` попадают в проект Android.
**Не проверено на телефоне** (нет Android SDK): запрос разрешения на уведомления (Android 13+), срабатывание в нужное время, поведение после перезагрузки телефона. Если в сгенерированном `AndroidManifest.xml` не окажется `POST_NOTIFICATIONS`, добавить его в шаге сборки. Экран настроек напоминаний («Аккаунт») — следующий срез.

