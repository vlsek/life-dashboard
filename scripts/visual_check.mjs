// Визуальная проверка страниц в НАСТОЯЩЕМ браузере (headless Chromium) с подставной сессией Supabase — без реального входа и сети.
// Написано агентом 4 (2026-10-06), когда по коду нельзя было понять, что владелец видит на экране («пустой круг» вместо сердечка).
//
// Установка (один раз, вне репозитория):  mkdir /tmp/shot && cd /tmp/shot && npm init -y && npm i puppeteer-core @sparticuz/chromium
//   (Chromium приходит внутри npm-пакета, скачивать с чужих серверов не нужно; в контейнере агента реестр npm доступен.)
// Запуск (из каталога с node_modules, статический сервер из корня репозитория на :8099):
//   (cd <repo> && python3 -m http.server 8099 &)   затем   node visual_check.mjs /dashboard/ 390 844 out.png
//   (сервер надо запускать В ТОЙ ЖЕ команде, что и скрипт: после её завершения фоновый процесс убивается)
// Печатает: итоговый URL (если ушло на /onboarding/ или /login/ — подставной профиль не подошёл), размеры значка сердечка кнопки «Избранное»,
// есть ли сердечко «в избранное» (`[data-test=favorite-heart]`) и число значков шапки; сохраняет скриншот (deviceScaleFactor 2) — открыть через view.
// Все запросы к *.supabase.co перехватываются: профиль `onboarded: true`, остальные таблицы пустые (`[]`). Данных в страницах НЕТ — это проверка
// оформления и вёрстки, не логики. Чужие домены блокируются.
import chromium from '@sparticuz/chromium'
import puppeteer from 'puppeteer-core'
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url')
const now = Math.floor(Date.now() / 1000)
const uid = '11111111-1111-1111-1111-111111111111'
const jwt = `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ sub: uid, role: 'authenticated', aud: 'authenticated', exp: now + 36000, email: 'test@example.com' })}.sig`
const session = { access_token: jwt, refresh_token: 'r', expires_in: 36000, expires_at: now + 36000, token_type: 'bearer', user: { id: uid, aud: 'authenticated', role: 'authenticated', email: 'test@example.com', app_metadata: {}, user_metadata: {} } }
const target = process.argv[2] || '/dashboard/'
const w = +process.argv[3] || 390
const h = +process.argv[4] || 844
const out = process.argv[5] || 'page.png'
const exe = await chromium.executablePath()
const br = await puppeteer.launch({ args: chromium.args, executablePath: exe, headless: 'shell' })
const p = await br.newPage()
await p.setViewport({ width: w, height: h, deviceScaleFactor: 2 })
await p.evaluateOnNewDocument((s) => { localStorage.setItem('sb-haxmgtflegsfpxieaydv-auth-token', JSON.stringify(s)); localStorage.setItem('lang', 'ru') }, session)
await p.setRequestInterception(true)
p.on('request', (r) => {
  const u = r.url()
  if (u.includes('.supabase.co')) {
    const single = (r.headers()['accept'] || '').includes('vnd.pgrst.object')
    const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' }
    if (r.method() === 'OPTIONS') return r.respond({ status: 204, headers: cors })
    if (u.includes('/auth/v1/user')) return r.respond({ status: 200, contentType: 'application/json', headers: cors, body: JSON.stringify(session.user) })
    const prof = { user_id: uid, onboarded: true, display_name: 'Тест', customization: null, favorite_pages: null }
    const isProf = u.includes('/rest/v1/profiles')
    return r.respond({ status: 200, contentType: 'application/json', headers: cors, body: isProf ? JSON.stringify(single ? prof : [prof]) : single ? '{}' : '[]' })
  }
  if (u.startsWith('http://localhost:8099')) return r.continue()
  return r.abort()
})
p.on('pageerror', (e) => console.log('PAGEERR', String(e).slice(0, 160)))
await p.goto('http://localhost:8099' + target, { waitUntil: 'networkidle2', timeout: 30000 }).catch((e) => console.log('goto', String(e).slice(0, 100)))
await new Promise((r) => setTimeout(r, 2500))
console.log('URL', p.url())
const info = await p.evaluate(() => {
  const t = document.querySelector('.qn-toggle')
  const s = t && t.querySelector('svg')
  const r = s && s.getBoundingClientRect()
  return { toggle: !!t, svg: r && [r.width, r.height], fav: !!document.querySelector('[data-test=favorite-heart]'), badges: document.querySelectorAll('.gh-badge').length }
})
console.log(JSON.stringify(info))
await p.screenshot({ path: out })
await br.close()
