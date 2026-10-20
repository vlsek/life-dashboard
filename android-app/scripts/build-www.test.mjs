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
