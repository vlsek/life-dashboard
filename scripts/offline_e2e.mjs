// Сквозной тест офлайна в настоящем Chromium (BACKLOG 66.7): «выключили сеть → отметили метрику → включили → запись дошла на сервер (мок)».
// Установка (один раз, вне репозитория):  mkdir /tmp/e2e && cd /tmp/e2e && npm init -y && npm i puppeteer-core
// Запуск:  node scripts/offline_e2e.mjs   (из папки, где стоит puppeteer-core, например:  NODE_PATH=/tmp/e2e/node_modules node ...;
//          Chromium берётся из PW_CHROME или /opt/pw-browsers/chromium-*/chrome-linux/chrome). Сервер сайта поднимается сам на :8099.
// Мок Supabase ЗАПОМИНАЕТ записи (daily_values) — по нему и проверяем, что отправка дошла. Код возврата 1, если сценарий не прошёл.
import { createRequire } from 'node:module'
import { spawn } from 'node:child_process'
import { existsSync, readdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
const require = createRequire(process.env.NODE_PATH ? path.join(process.env.NODE_PATH, 'x.js') : import.meta.url)
const puppeteer = require('puppeteer-core')
const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const chromeDir = existsSync('/opt/pw-browsers') ? readdirSync('/opt/pw-browsers').find((d) => /^chromium-\d+$/.test(d)) : null
const exe = process.env.PW_CHROME || (chromeDir && `/opt/pw-browsers/${chromeDir}/chrome-linux/chrome`)
if (!exe) { console.error('Нет Chromium: задайте PW_CHROME'); process.exit(2) }

const srv = spawn('python3', ['-m', 'http.server', '8099'], { cwd: ROOT, stdio: 'ignore' })
await new Promise((r) => setTimeout(r, 800))
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url')
const now = Math.floor(Date.now() / 1000), uid = '11111111-1111-1111-1111-111111111111'
const jwt = `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ sub: uid, role: 'authenticated', aud: 'authenticated', exp: now + 36000 })}.sig`
const session = { access_token: jwt, refresh_token: 'r', expires_in: 36000, expires_at: now + 36000, token_type: 'bearer', user: { id: uid, aud: 'authenticated', role: 'authenticated', email: 't@e.com', app_metadata: {}, user_metadata: {} } }
const metric = { id: 'aaaaaaaa-0000-0000-0000-000000000001', user_id: uid, name: 'Зарядка', icon: null, type: 'boolean', unit: null, goal_value: null, goal_direction: null, schedule: null, category_id: null, position: 1, active: true, created_at: '2026-01-01T00:00:00Z' }

// Вода и тренировки (66.7, остаток после 66.5а/в): метрика воды, одно упражнение и сегодняшняя запись с одним подходом
const waterMetric = { id: 'aaaaaaaa-0000-0000-0000-0000000000w1', user_id: uid, name: 'Вода', icon: 'svg:droplet', type: 'number', unit: 'мл', goal_value: 2000, goal_direction: null, schedule: null, category_id: null, position: 1, active: true }
const todayIso = (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` })()
const exercise = { id: 'eeeeeeee-0000-0000-0000-000000000001', user_id: uid, name: 'Отжимания', category: null, unit: null, tracks_weight: false, value_label: 'Повторы', created_at: '2026-10-01T00:00:00Z' }
const server = { down: false, dailyValues: [], waterLog: [], entries: [{ id: 'ffffffff-0000-0000-0000-000000000001', user_id: uid, exercise_id: exercise.id, date: todayIso, sets: [{ reps: 10 }], notes: null }], entryPatches: 0, writes: 0 }
const eqParams = (u) => [...new URL(u).searchParams.entries()].filter(([, v]) => v.startsWith('eq.')).map(([k, v]) => [k, v.slice(3)])
const matches = (row, u) => eqParams(u).every(([k, v]) => !(k in row) || String(row[k]) === v)
const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*', 'access-control-expose-headers': '*' }
let failed = 0
const check = (ok, msg) => { console.log((ok ? 'ok   ' : 'FAIL ') + msg); if (!ok) failed++ }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
async function until(fn, ms = 8000) { const t = Date.now(); while (Date.now() - t < ms) { if (await fn()) return true; await sleep(150) } return false }

const br = await puppeteer.launch({ executablePath: exe, args: ['--no-sandbox'], headless: 'new' })
try {
  const p = await br.newPage()
  await p.setViewport({ width: 390, height: 844 })
  await p.evaluateOnNewDocument((s) => { localStorage.setItem('sb-haxmgtflegsfpxieaydv-auth-token', JSON.stringify(s)); localStorage.setItem('lang', 'ru') }, session)
  await p.setRequestInterception(true)
  p.on('request', (r) => {
    const u = r.url()
    if (!u.includes('.supabase.co')) return r.continue()
    if (server.down) return r.abort('internetdisconnected')
    if (r.method() === 'OPTIONS') return r.respond({ status: 204, headers: cors })
    const single = (r.headers()['accept'] || '').includes('vnd.pgrst.object')
    const prof = { user_id: uid, onboarded: true, display_name: 'Тест' }
    let body = single ? '{}' : '[]'
    if (u.includes('/rest/v1/profiles')) body = JSON.stringify(single ? prof : [prof])
    else if (u.includes('/rest/v1/metrics') && r.method() === 'GET') body = JSON.stringify([metric, waterMetric])
    else if (u.includes('/rest/v1/water_log')) {
      if (r.method() === 'POST') {
        const row = JSON.parse(r.postData() || '{}')
        if (server.waterLog.some((x) => x.id === row.id)) return r.respond({ status: 409, contentType: 'application/json', headers: cors, body: JSON.stringify({ code: '23505', message: 'duplicate key' }) })
        server.waterLog.push(row)
        return r.respond({ status: 201, headers: cors, body: '' })
      }
      if (r.method() === 'GET') body = JSON.stringify(server.waterLog.filter((x) => matches(x, u)))
    } else if (u.includes('/rest/v1/workout_exercises') && r.method() === 'GET') body = JSON.stringify([exercise])
    else if (u.includes('/rest/v1/workout_entries')) {
      if (r.method() === 'PATCH') {
        const id = (eqParams(u).find(([k]) => k === 'id') || [])[1]
        const patch = JSON.parse(r.postData() || '{}')
        const i = server.entries.findIndex((x) => x.id === id)
        if (i >= 0) server.entries[i] = { ...server.entries[i], ...patch }
        server.entryPatches++
        return r.respond({ status: 204, headers: cors, body: '' })
      }
      if (r.method() === 'GET') body = JSON.stringify(server.entries)
    }
    else if (u.includes('/rest/v1/daily_values')) {
      if (r.method() === 'POST') {
        server.writes++
        const rows = [].concat(JSON.parse(r.postData() || '[]'))
        for (const row of rows) {
          const i = server.dailyValues.findIndex((x) => x.date === row.date && x.metric_id === row.metric_id)
          if (i >= 0) server.dailyValues[i] = { ...server.dailyValues[i], ...row }
          else server.dailyValues.push(row)
        }
        return r.respond({ status: 201, headers: cors, body: '' })
      }
      if (r.method() === 'GET') body = JSON.stringify(server.dailyValues.filter((x) => matches(x, u)))
    }
    return r.respond({ status: 200, contentType: 'application/json', headers: cors, body })
  })
  // клик «изнутри» страницы: не зависит от геометрии (значок воды в шапке на узком экране может быть без своего места)
  const jsClick = (selector) => p.evaluate((q) => { const el = document.querySelector(q); if (!el) return false; el.click(); return true }, selector)
  const outboxCount = () => p.evaluate(() => new Promise((res) => {
    const rq = indexedDB.open('ld-outbox')
    rq.onerror = () => res(-1)
    rq.onupgradeneeded = () => res(0)
    rq.onsuccess = () => {
      const db = rq.result
      if (!db.objectStoreNames.contains('ops')) return res(0)
      const c = db.transaction('ops').objectStore('ops').count()
      c.onsuccess = () => res(c.result)
      c.onerror = () => res(-1)
    }
  }))

  await p.goto('http://localhost:8099/dashboard/', { waitUntil: 'networkidle2' })
  const sel = 'input[type=checkbox]'
  check(await until(() => p.$(sel).then(Boolean)), 'метрика «Зарядка» нарисована (галочка есть)')
  check((await p.evaluate(() => document.body.innerText)).includes('Зарядка'), 'название метрики на странице')

  // 1. Онлайн: отметка уходит на сервер сразу, очередь пуста
  await p.click(sel)
  check(await until(() => server.dailyValues.length === 1), 'онлайн: отметка дошла на сервер')
  check((await outboxCount()) === 0, 'онлайн: очередь пуста')

  // 2. Сеть пропала: снимаем отметку — запись уходит в очередь, на сервер не идёт
  server.down = true
  const writesBefore = server.writes
  await p.click(sel)
  check(await until(async () => (await outboxCount()) === 1), 'офлайн: запись легла в очередь (1)')
  check(server.writes === writesBefore, 'офлайн: на сервер ничего не ушло')
  check(await until(() => p.$('[data-test=offline-badge]').then(Boolean), 4000), 'офлайн: плашка в шапке показана')

  // 3. Сеть вернулась: очередь уходит сама
  server.down = false
  await p.evaluate(() => window.dispatchEvent(new Event('online')))
  check(await until(async () => (await outboxCount()) === 0), 'онлайн снова: очередь опустела')
  check(server.writes > writesBefore, 'онлайн снова: запись дошла на сервер')
  check(server.dailyValues.length === 1 && server.dailyValues[0].value === false, 'на сервере одна строка с последним значением (без дублей)')

  // 3б. Вода без сети (66.5а): стакан онлайн → стакан офлайн (в очереди сумма дня + строка журнала) → сеть вернулась → всё на сервере, без дублей
  check(await jsClick('[data-test=water-badge]'), 'вода: нажали значок воды')
  check(await until(() => p.$('[data-test=water-modal]').then(Boolean)), 'вода: окно воды открылось из шапки')
  check(await jsClick('[data-test=add-200]'), 'вода: нажали +200 мл (онлайн)')
  check(await until(() => server.waterLog.length === 1 && server.dailyValues.some((x) => x.metric_id === waterMetric.id && x.value === 200)), 'вода онлайн: 200 мл дошли на сервер (сумма дня + журнал)')
  check(await until(async () => (await outboxCount()) === 0), 'вода онлайн: очередь пуста')
  server.down = true
  // как «режим в самолёте»: запросы падают (server.down), и браузер сообщает navigator.onLine = false (puppeteer с перехватом запросов этого не делает сам)
  await p.evaluate(() => { window.__olDesc = Object.getOwnPropertyDescriptor(Navigator.prototype, 'onLine'); Object.defineProperty(Navigator.prototype, 'onLine', { get: () => false, configurable: true }); window.dispatchEvent(new Event('offline')) })
  check(await jsClick('[data-test=add-200]'), 'вода: нажали +200 мл (без сети)')
  check(await until(async () => (await outboxCount()) === 2), 'вода офлайн: в очереди сумма дня и строка журнала (2)')
  check(server.waterLog.length === 1, 'вода офлайн: на сервер ничего не ушло')
  check(!(await p.$('[data-test=water-save-error]')), 'вода офлайн: ошибки в окне нет (запись принята локально)')
  server.down = false
  await p.evaluate(() => { Object.defineProperty(Navigator.prototype, 'onLine', window.__olDesc); window.dispatchEvent(new Event('online')) })
  check(await until(async () => (await outboxCount()) === 0), 'вода: сеть вернулась — очередь опустела')
  check(server.waterLog.length === 2 && new Set(server.waterLog.map((x) => x.id)).size === 2, 'вода: на сервере ровно две строки журнала с разными id (без дублей)')
  check(server.dailyValues.filter((x) => x.metric_id === waterMetric.id).length === 1 && server.dailyValues.find((x) => x.metric_id === waterMetric.id).value === 400, 'вода: сумма дня на сервере 400, одна строка')
  await p.evaluate(() => document.querySelector('[data-test=water-modal]')?.click())

  // 3в. Тренировки без сети (66.5в): «+ подход» к сегодняшней записи → в очередь → сеть вернулась → подход на сервере один раз
  await p.goto('http://localhost:8099/workouts/', { waitUntil: 'networkidle2' })
  check(await until(async () => (await p.evaluate(() => document.body.innerText)).includes('Отжимания'), 10000), 'тренировки: упражнение «Отжимания» нарисовано')
  const quick = '[data-testid=quick-add-set]'
  check(await until(() => p.$(quick).then(Boolean), 8000), 'тренировки: у сегодняшней записи есть «+ подход»')
  server.down = true
  check(await jsClick(quick), 'тренировки: нажали «+ подход» (без сети)')
  check(await until(async () => (await outboxCount()) === 1), 'тренировки офлайн: правка записи легла в очередь (1)')
  check(server.entries[0].sets.length === 1 && server.entryPatches === 0, 'тренировки офлайн: на сервер ничего не ушло')
  check(await until(async () => (await p.$$('[data-testid=entry-set-row]')).length === 2, 4000), 'тренировки офлайн: новый подход сразу виден в списке (2 строки)')
  server.down = false
  await p.evaluate(() => window.dispatchEvent(new Event('online')))
  check(await until(async () => (await outboxCount()) === 0), 'тренировки: сеть вернулась — очередь опустела')
  check(server.entryPatches === 1 && server.entries[0].sets.length === 2, 'тренировки: на сервере у записи два подхода, правка пришла один раз')
  await p.goto('http://localhost:8099/dashboard/', { waitUntil: 'networkidle2' })

  // 4. Перезагрузка без сети: страница открывается из кэша, данные читаются из офлайн-кэша
  server.down = true
  await p.reload({ waitUntil: 'domcontentloaded' })
  check(await until(async () => (await p.evaluate(() => document.body.innerText)).includes('Зарядка'), 10000), 'офлайн-перезагрузка: метрика видна из кэша чтения')

  // 5. Холодный старт без сайта: сервер статики выключен, сеть до Supabase тоже — страница поднимается из service worker'а
  await p.evaluate(() => navigator.serviceWorker.ready)
  await until(() => p.evaluate(async () => (await caches.keys()).some((k) => k === 'ld-pilots' || k.startsWith('ld-shell'))), 15000)
  await sleep(1500) // докачка предкэша пилотов
  srv.kill()
  await sleep(500)
  await p.reload({ waitUntil: 'domcontentloaded' })
  check(await until(async () => (await p.evaluate(() => document.body.innerText)).includes('Зарядка'), 10000), 'холодный старт без сайта и без сети: страница и данные из кэшей')
} catch (e) {
  console.log('FAIL исключение: ' + (e && e.stack || e)); failed++
} finally {
  await br.close(); srv.kill()
}
console.log(failed ? `Провалено: ${failed}` : 'Все проверки пройдены')
process.exit(failed ? 1 : 0)
