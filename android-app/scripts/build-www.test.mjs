import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, existsSync, readFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import vm from 'node:vm'
import { build, injectShell, siteDirs } from './build-www.mjs'

function fakeSite() {
  const root = mkdtempSync(path.join(os.tmpdir(), 'site-'))
  const w = (f, c = 'x') => { mkdirSync(path.dirname(path.join(root, f)), { recursive: true }); writeFileSync(path.join(root, f), c) }
  w('index.html', '<html><head></head></html>'); w('goals.html', '<html><head></head></html>'); w('pwa-check.html')
  w('goals/index.html', '<html><head></head><body></body></html>'); w('goals/assets/a.js')
  w('header-widgets/header.js'); w('legacy/login.html', '<html><head></head></html>'); w('icons/icon-192.png')
  w('web-goals/src/main.ts'); w('docs/BACKLOG.md'); w('migrations/001.sql'); w('scripts/x.py'); w('shared/a.ts'); w('config.js'); w('sw.js'); w('schema.sql')
  w('android-app/foo'); w('.git/HEAD')
  return root
}

test('siteDirs берёт страницы и служебные каталоги сайта, но не исходники и документы', () => {
  assert.deepEqual(siteDirs(fakeSite()).sort(), ['goals', 'header-widgets', 'icons', 'legacy'])
})
test('build копирует сайт, добавляет native-shell.js и не тащит лишнее', () => {
  const root = fakeSite(), www = path.join(mkdtempSync(path.join(os.tmpdir(), 'www-')), 'www')
  build(root, www)
  for (const f of ['goals/index.html', 'goals/assets/a.js', 'header-widgets/header.js', 'config.js', 'sw.js', 'goals.html', 'native-shell.js']) assert.ok(existsSync(path.join(www, f)), f)
  for (const f of ['schema.sql', 'docs', 'migrations', 'web-goals', 'pwa-check.html', 'android-app']) assert.ok(!existsSync(path.join(www, f)), f + ' не должен попасть в приложение')
  assert.ok(readFileSync(path.join(www, 'goals/index.html'), 'utf-8').includes('<script src="/native-shell.js"></script></head>'))
  assert.ok(readFileSync(path.join(www, 'legacy/login.html'), 'utf-8').includes('/native-shell.js'))
})
test('injectShell не дублирует тег', () => {
  const once = injectShell('<head></head>')
  assert.equal(injectShell(once), once)
})
test('native-shell: «назад» закрывает приложение на корневых страницах, цвет строки состояния', () => {
  const ctx = { globalThis: {}, location: {}, document: { addEventListener() {}, querySelector() {} }, history: {} }
  ctx.globalThis = ctx
  vm.createContext(ctx)
  vm.runInContext(readFileSync(new URL('../native-shell.js', import.meta.url), 'utf-8'), ctx)
  const n = ctx.__ldNative
  assert.equal(n.shouldExitOnBack('/dashboard/', 5), true)
  assert.equal(n.shouldExitOnBack('/goals/', 5), false)
  assert.equal(n.shouldExitOnBack('/goals/', 1), true)
  assert.equal(n.isLightColor('#f7f4ef'), true)
  assert.equal(n.isLightColor('#121212'), false)
  assert.equal(n.isLightColor('red'), false)
})

// ---- BACKLOG 66.9: вибро и локальные напоминания (плагины подменены, телефона нет — проверяем план и порядок вызовов) ----
function loadShell(extra = {}) {
  const ctx = { location: {}, document: { addEventListener() {}, querySelector() {}, documentElement: { lang: 'ru' } }, history: {}, ...extra }
  ctx.globalThis = ctx
  vm.createContext(ctx)
  vm.runInContext(readFileSync(new URL('../native-shell.js', import.meta.url), 'utf-8'), ctx)
  return ctx
}
const plain = (x) => JSON.parse(JSON.stringify(x)) // значения из vm-контекста имеют другие прототипы — сравниваем по структуре
const native = (plugins) => ({ Capacitor: { isNativePlatform: () => true, Plugins: plugins } })

test('напоминания: вода — каждые N часов в окне, id стабильны, лишнее отсекается', () => {
  const n = loadShell().__ldNative
  const p = n.reminderPlan({ water: { enabled: true, fromHour: 9, toHour: 15, everyHours: 3 } }, 'ru')
  assert.deepEqual(plain(p.map((x) => [x.id, x.on.hour, x.on.minute])), [[1000, 9, 0], [1001, 12, 0], [1002, 15, 0]])
  assert.equal(p[0].title, 'Пора выпить воды')
  assert.equal(n.reminderPlan({ water: { enabled: true, fromHour: 0, toHour: 23, everyHours: 1 } }).length, 24)
  assert.deepEqual(plain(n.reminderPlan({ water: { enabled: true, fromHour: 21, toHour: 9, everyHours: 6 } }).map((x) => x.on.hour)), [9, 15, 21]) // перепутанные границы
  assert.equal(n.reminderPlan({ water: { enabled: false } }).length, 0)
  assert.equal(n.reminderPlan(null).length, 0)
})
test('напоминания: тренировка — дни ISO (пн=1…вс=7) переводятся в Capacitor (вс=1), мусор отбрасывается', () => {
  const n = loadShell().__ldNative
  const p = n.reminderPlan({ workout: { enabled: true, time: '07:05', weekdays: [1, 7, 7, 3, 9, 'x', 2.5] } }, 'en')
  assert.deepEqual(plain(p.map((x) => [x.id, x.on.weekday, x.on.hour, x.on.minute])), [[2001, 2, 7, 5], [2007, 1, 7, 5], [2003, 4, 7, 5]])
  assert.equal(p[0].title, 'Workout time')
  assert.deepEqual(plain(n.reminderPlan({ workout: { enabled: true, time: 'oops' } })[0].on), { weekday: 2, hour: 18, minute: 30 })
})
test('в браузере (не приложение) вибро и напоминания ничего не делают', async () => {
  const n = loadShell().__ldNative
  assert.equal(n.isNative, false)
  assert.equal(loadShell(native({})).__ldNative.isNative, true)
  assert.equal(await n.haptic('light'), false)
  assert.equal(await n.applyReminders({ water: { enabled: true } }), false)
})
test('вибро: легко/средне/успех зовут нужный метод плагина, ошибка плагина не ломает', async () => {
  const calls = []
  const n = loadShell(native({ Haptics: { impact: async (a) => calls.push(['impact', a.style]), notification: async (a) => { calls.push(['notification', a.type]); throw new Error('x') } } })).__ldNative
  assert.equal(await n.haptic('light'), true)
  assert.equal(await n.haptic('medium'), true)
  assert.equal(await n.haptic('success'), false)
  assert.equal(await n.haptic('???'), true) // неизвестное — лёгкий
  assert.deepEqual(calls, [['impact', 'LIGHT'], ['impact', 'MEDIUM'], ['notification', 'SUCCESS'], ['impact', 'LIGHT']])
})
test('applyReminders: просит разрешение, отменяет старые и ставит новые; отказ — ничего не ставит; пустой план — только отмена', async () => {
  const log = []
  const mk = (granted) => loadShell(native({ LocalNotifications: {
    checkPermissions: async () => ({ display: 'prompt' }),
    requestPermissions: async () => { log.push('ask'); return { display: granted ? 'granted' : 'denied' } },
    cancel: async (a) => log.push('cancel:' + a.notifications.length),
    schedule: async (a) => log.push('schedule:' + a.notifications.length + ':' + JSON.stringify(a.notifications[0].schedule)),
  } })).__ldNative
  assert.equal(await mk(true).applyReminders({ water: { enabled: true, fromHour: 10, toHour: 12, everyHours: 2 } }), true)
  assert.deepEqual(log, ['ask', 'cancel:31', 'schedule:2:{"on":{"hour":10,"minute":0},"allowWhileIdle":true}'])
  log.length = 0
  assert.equal(await mk(false).applyReminders({ water: { enabled: true } }), false)
  assert.deepEqual(log, ['ask'])
  log.length = 0
  assert.equal(await mk(true).applyReminders({}), true)
  assert.deepEqual(log, ['cancel:31'])
})
