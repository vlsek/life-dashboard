// Собирает папку www для Capacitor из КОРНЯ репозитория (BACKLOG 66.6): тот же собранный сайт, что раздаётся в вебе.
// Исходники (web-*), документы, миграции и служебное не копируются. В каждую .html добавляется <script src="/native-shell.js"> —
// кнопка «назад», цвет системной строки состояния, заставка (работает только внутри приложения, в браузере сам выходит).
// Запуск: node scripts/build-www.mjs   (из android-app/; результат — android-app/www, в git не коммитится)
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
export const WWW = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'www')
// Папки, которые НИКОГДА не попадают в приложение.
const SKIP_DIRS = new Set(['docs', 'migrations', 'scripts', 'shared', 'node_modules', 'android-app', 'android'])
// Корневые файлы сайта (кроме *.html — их берём все, кроме pwa-check.html).
const ROOT_FILES = ['config.js', 'datacache.js', 'offline-cache.js', 'i18n.js', 'theme.js', 'style.css', 'manifest.json', 'sw.js', 'sw-assets.js', 'version.json', 'favicon.svg']
const SCRIPT_TAG = '<script src="/native-shell.js"></script>'

// Какие каталоги корня копировать: собранные страницы (есть index.html), header-widgets, legacy, icons, languages…
export function siteDirs(root = ROOT) {
  return readdirSync(root).filter((name) => {
    if (name.startsWith('.') || name.startsWith('web-') || SKIP_DIRS.has(name)) return false
    const full = path.join(root, name)
    if (!statSync(full).isDirectory()) return false
    return existsSync(path.join(full, 'index.html')) || ['header-widgets', 'legacy', 'icons'].includes(name)
  })
}

export function injectShell(html) {
  if (html.includes('/native-shell.js')) return html
  return html.includes('</head>') ? html.replace('</head>', SCRIPT_TAG + '</head>') : SCRIPT_TAG + html
}

function walkHtml(dir, out = []) {
  for (const n of readdirSync(dir)) {
    const f = path.join(dir, n)
    if (statSync(f).isDirectory()) walkHtml(f, out)
    else if (n.endsWith('.html')) out.push(f)
  }
  return out
}

export function build(root = ROOT, www = WWW) {
  rmSync(www, { recursive: true, force: true })
  mkdirSync(www, { recursive: true })
  for (const d of siteDirs(root)) cpSync(path.join(root, d), path.join(www, d), { recursive: true })
  for (const f of ROOT_FILES) if (existsSync(path.join(root, f))) cpSync(path.join(root, f), path.join(www, f))
  for (const f of readdirSync(root)) if (f.endsWith('.html') && f !== 'pwa-check.html') cpSync(path.join(root, f), path.join(www, f))
  cpSync(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'native-shell.js'), path.join(www, 'native-shell.js'))
  for (const f of walkHtml(www)) writeFileSync(f, injectShell(readFileSync(f, 'utf-8')))
  return { dirs: siteDirs(root), htmlFiles: walkHtml(www).length }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const r = build()
  console.log(`www готов: ${r.dirs.length} папок, ${r.htmlFiles} html-страниц`)
}
