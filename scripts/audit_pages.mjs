// Автопрогон страниц пилотов в Chromium (BACKLOG 60.2 п.4): телефон 390 и десктоп 1280, светлая и тёмная тема, мок-данные Supabase.
// Запуск: python3 -m http.server 8765 (в корне репозитория) и  node scripts/audit_pages.mjs [страница ...]
// Нужен playwright (глобально) и chromium: PLAYWRIGHT_PATH (по умолчанию глобальный) и CHROMIUM (по умолчанию /opt/pw-browsers/chromium).
// Что ищет: горизонтальную прокрутку страницы, элементы, вылезающие за экран (вне горизонтальных контейнеров прокрутки),
// ошибки консоли и страницы, цели нажатия мельче 32 px на телефоне, пустые страницы (мало текста). Пишет JSON в /tmp/audit.json и сводку в консоль.
import { createRequire } from 'module'
import fs from 'fs'
const require = createRequire(process.env.PLAYWRIGHT_PATH || '/home/claude/.npm-global/lib/node_modules/playwright/')
const { chromium } = require('playwright')

const BASE = process.env.BASE || 'http://localhost:8765'
const ALL = ['dashboard', 'goals', 'skills', 'workouts', 'challenges', 'calendar', 'history', 'shop', 'milestones', 'achievements', 'community', 'customization', 'languages', 'account']
const pages = process.argv.slice(2).length ? process.argv.slice(2) : ALL
const VIEWPORTS = [{ name: 'phone', width: 390, height: 844 }, { name: 'desktop', width: 1280, height: 800 }]
const THEMES = ['light', 'dark']

const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url')
const jwt = [b64({ alg: 'HS256', typ: 'JWT' }), b64({ sub: 'u1', exp: Math.floor(Date.now() / 1000) + 3600, role: 'authenticated' }), 'sig'].join('.')
const user = { id: 'u1', aud: 'authenticated', role: 'authenticated', email: 'a@b.c', created_at: '2026-01-01T00:00:00Z', app_metadata: {}, user_metadata: {} }
const session = { access_token: jwt, refresh_token: 'r', token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, user }
const profile = { user_id: 'u1', onboarded: true, customization: {}, display_name: 'Тест', gender: 'female', timezone: null }

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium' })
const results = []

for (const vp of VIEWPORTS) {
  for (const theme of THEMES) {
    const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, hasTouch: vp.name === 'phone' })
    await ctx.addInitScript(([s, th]) => {
      localStorage.setItem('sb-haxmgtflegsfpxieaydv-auth-token', JSON.stringify(s))
      localStorage.setItem('site_lang', 'ru')
      localStorage.setItem('site_theme', th)
      localStorage.setItem('welcome_tour_seen', '1')
      localStorage.setItem('shop_idea_seen', '1')
    }, [session, theme])
    await ctx.route(/supabase\.co/, async (r) => {
      const u = r.request().url()
      if (u.includes('/auth/v1/user')) return r.fulfill({ json: user })
      const obj = (r.request().headers()['accept'] || '').includes('vnd.pgrst.object')
      const prof = u.includes('/profiles')
      const body = prof ? (obj ? profile : [profile]) : obj ? null : []
      r.fulfill({ status: 200, headers: { 'content-range': '0-0/0', 'access-control-allow-origin': '*' }, json: body })
    })
    for (const name of pages) {
      const pg = await ctx.newPage()
      const errors = []
      pg.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource|net::ERR/.test(m.text())) errors.push(m.text().slice(0, 160)) })
      pg.on('pageerror', (e) => errors.push('pageerror: ' + String(e).slice(0, 160)))
      let navError = null
      try {
        await pg.goto(`${BASE}/${name}/`, { waitUntil: 'load', timeout: 20000 })
        await pg.waitForTimeout(2200)
      } catch (e) {
        navError = String(e).slice(0, 120)
      }
      const m = navError ? null : await pg.evaluate((w) => {
        const doc = document.documentElement
        const inScroller = (el) => { for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) { const o = getComputedStyle(p).overflowX; if (o === 'auto' || o === 'scroll' || o === 'hidden') return true } return false }
        const wide = []
        for (const el of document.querySelectorAll('body *')) {
          const r = el.getBoundingClientRect()
          if (r.width === 0 || r.height === 0) continue
          if (getComputedStyle(el).position === 'fixed') continue
          if (r.right > w + 1 && !inScroller(el)) wide.push((el.tagName + '.' + String(el.className).split(' ')[0] + (el.dataset?.test ? '[' + el.dataset.test + ']' : '')).slice(0, 60))
          if (wide.length >= 6) break
        }
        const small = []
        for (const el of document.querySelectorAll('button, a[href], input[type=checkbox], select')) {
          const r = el.getBoundingClientRect()
          if (r.width === 0 || r.height === 0) continue
          if (r.width < 28 || r.height < 28) small.push((el.tagName + ':' + (el.getAttribute('aria-label') || el.textContent || '').trim().slice(0, 20)).slice(0, 40))
        }
        return { scrollW: doc.scrollWidth, innerW: window.innerWidth, wide, small: small.slice(0, 8), smallCount: small.length, textLen: document.body.innerText.trim().length, path: location.pathname }
      }, vp.width)
      results.push({ page: name, vp: vp.name, theme, navError, errors: [...new Set(errors)].slice(0, 4), ...(m || {}) })
      await pg.close()
    }
    await ctx.close()
  }
}
await browser.close()
fs.writeFileSync('/tmp/audit.json', JSON.stringify(results, null, 1))
let bad = 0
for (const r of results) {
  const issues = []
  if (r.navError) issues.push('NAV: ' + r.navError)
  if (r.scrollW > r.innerW + 1) issues.push(`hscroll ${r.scrollW}>${r.innerW}`)
  if (r.wide?.length) issues.push('wide: ' + r.wide.join(', '))
  if (r.errors?.length) issues.push('errors: ' + r.errors.join(' | '))
  if (r.vp === 'phone' && r.smallCount > 0) issues.push(`small(${r.smallCount}): ` + r.small.slice(0, 4).join(', '))
  if (r.textLen !== undefined && r.textLen < 80) issues.push('почти пусто, текста ' + r.textLen)
  if (r.path && !r.path.startsWith('/' + r.page + '/')) issues.push('редирект на ' + r.path)
  if (issues.length) { bad++; console.log(`${r.page} ${r.vp} ${r.theme}: ${issues.join(' ; ')}`) }
}
console.log(`страниц×режимов: ${results.length}, с замечаниями: ${bad}`)
