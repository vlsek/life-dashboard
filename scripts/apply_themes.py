#!/usr/bin/env python3
"""Раскатывает темы из scripts/themes_data.py по всему сайту (BACKLOG 11:49). Идемпотентно. Запуск из корня: python3 scripts/apply_themes.py

Что обновляется:
  web-*/src/style.css      — блоки html.theme-* между маркерами `themes:start/end` (+ золото стакана в Дашборде, color-scheme)
  web-*/src/lib/theme.ts   — THEME_KEYS и THEME_BG_COLORS
  web-*/src/lib/i18n.ts    — подписи theme_* (ru/en)
  web-*/index.html         — карты bg/ac в предзагрузочном скрипте
  web-header/              — header.css (вода/золото по темам), prefs.ts, i18n; затем пересобрать header-widgets/
  корень                   — theme.js, i18n.js, style.css (только добавление новых тем, legacy-код не правится)
"""
import glob
import re
import sys

sys.path.insert(0, 'scripts')
from themes_data import CHAR, NEW, P, UNLOCK, chart_palette  # noqa: E402

KEYS = list(P)
OLD4 = ['dark', 'monet', 'light', 'pink']
START = '/* themes:start (генерируется scripts/apply_themes.py из scripts/themes_data.py — не править руками) */'
END = '/* themes:end */'
GOLD_START = '/* themes-gold:start (генерируется scripts/apply_themes.py) */'
GOLD_END = '/* themes-gold:end */'

# ---------- токены оформления (BACKLOG 50.1а, «большие темы», срез 0: БЕЗ видимых изменений) ----------
TOK_START = '/* design-tokens:start (генерируется scripts/apply_themes.py — не править руками; BACKLOG 50.1а) */'
TOK_END = '/* design-tokens:end */'
TOK_COMMENT = """/* «Характер» оформления (не цвета). Значения по умолчанию ровно равны прежнему виду сайта; «большая тема» переопределяет их в своём
   `html.theme-<ключ> { … }`. Скругления: у Tailwind-страниц `rounded-lg/xl/2xl/md` — это `var(--radius-lg/xl/2xl/md)`, поэтому тема меняет скругление
   ВСЕХ карточек, кнопок и полей, переопределив эти переменные (запасные значения нужны: Tailwind не выдаёт неиспользуемые переменные).
   Анимации и шрифт — тоже переменными Tailwind: `--default-transition-duration`, `--default-transition-timing-function`, `--font-sans`, `--font-mono`. */"""


def character_rules(tailwind):
    """«Характер» больших тем (CHAR в themes_data.py): блок `html.theme-<ключ>` + правила только под этой темой. Пусто, если больших тем нет."""
    out = []
    for k, c in CHAR.items():
        sel = 'html.theme-' + k
        out.append('\n\n/* большая тема: %s */\n%s {\n%s\n}' % (k, sel, c['tw'] if tailwind else c['root']))
        for sels, body in c.get('rules') or []:
            out.append('\n' + ', '.join(sel + ' ' + x for x in sels) + ' { ' + body + ' }')
        if tailwind and c.get('reduced'):
            out.append('\n@media (prefers-reduced-motion: reduce) {\n  %s {\n  %s\n  }\n}' % (sel, c['reduced'].strip()))
    return ''.join(out)


def tokens_region(tailwind):
    if tailwind:
        rad = ('  --radius-card: var(--radius-xl, 0.75rem);\n  --radius-modal: var(--radius-xl, 0.75rem);\n'
               '  --radius-control: var(--radius-lg, 0.5rem);\n')
    else:
        rad = '  --radius-card: 12px;\n  --radius-modal: 12px;\n  --radius-control: 8px;\n'
    return (TOK_START + '\n' + TOK_COMMENT + '\n:root {\n' + rad +
            '  --shadow-card: none; /* тень карточек и окон: glow (0 0 12px …) или жёсткая (4px 4px 0 #000) */\n'
            '  --shadow-active: none; /* тень/свечение активного: кнопка, переключатель, выбранный пункт */\n'
            '  --blur-glass: none; /* backdrop-filter стеклянных поверхностей: blur(10px) */\n'
            '  --bg-pattern: none; /* фоновая текстура: сетка точек, scanlines, шум */\n'
            '  --bg-pattern-size: auto;\n'
            '  --border-style: solid; /* solid | dashed | dotted */\n'
            '  --card-accent: none; /* акцентная полоса слева у карточки */\n'
            '  --font-heading: inherit; /* шрифт заголовков и чисел (моноширинный у терминальных тем) */\n'
            '}' + character_rules(tailwind) + '\n' + TOK_END)


def _swap_radius(rule, var, defaults):
    """В тексте одного правила: border-radius со значением по умолчанию -> var(токен). Другие значения не трогаем."""
    def sub(m):
        return m.group(1) + 'border-radius: ' + var + ';' if m.group(2).strip() in defaults else m.group(0)
    return re.sub(r'(\s)border-radius:\s*([^;]+);', sub, rule, count=1)


def tokenize(t, tailwind):
    reg = tokens_region(tailwind)
    if TOK_START in t:
        t = re.sub(re.escape(TOK_START) + r'.*?' + re.escape(TOK_END), lambda m: reg, t, count=1, flags=re.S)
    else:
        assert END in t, 'нет themes:end'
        # после themes-gold / themes-scheme блоков, если они идут сразу за themes:end: проще и надёжнее — прямо за themes:end
        t = t.replace(END, END + '\n\n' + reg, 1)

    def rule_edit(t, head_re, fn):
        m = re.search(head_re, t, re.S)
        return t if not m else t[:m.start()] + fn(m.group(0)) + t[m.end():]

    def add_shadow(rule):
        if 'var(--shadow-card)' in rule:
            return rule
        ind = re.search(r'\n(\s*)border-radius:', rule)
        ind = ind.group(1) if ind else '  '
        return rule[:-1].rstrip('\n') + '\n' + ind + 'box-shadow: var(--shadow-card);\n}' if rule.endswith('}') else rule

    rad_card = ('12px', '0.75rem')
    t = rule_edit(t, r'\n\.card \{[^}]*\}', lambda r: add_shadow(_swap_radius(r, 'var(--radius-card)', rad_card)))
    t = rule_edit(t, r'\n\.modal \{[^}]*\}', lambda r: add_shadow(_swap_radius(r, 'var(--radius-modal)', rad_card)))
    ctl = ('0.5rem', '8px')
    if tailwind:
        t = rule_edit(t, r'@layer base \{\s*button \{[^}]*\}', lambda r: _swap_radius(r, 'var(--radius-control)', ctl))
    else:
        t = rule_edit(t, r'\nbutton \{[^}]*\}', lambda r: _swap_radius(r, 'var(--radius-control)', ctl))
    t = rule_edit(t, r'\.modal textarea \{[^}]*\}', lambda r: _swap_radius(r, 'var(--radius-control)', ctl))
    return t

VARS = [('bg', 'bg'), ('bg-card', 'card'), ('border', 'border'), ('text', 'text'), ('text-dim', 'dim'), ('accent', 'accent'),
        ('accent-text', 'at'), ('success', 'ok'), ('danger', 'bad'), ('hist-ok', 'hist'), ('water-top', 'wt'), ('water-bottom', 'wb'), ('water-line', 'wl')]
changed = []


def rw(path, fn):
    t = open(path, encoding='utf-8').read()
    n = fn(t)
    if n != t:
        open(path, 'w', encoding='utf-8').write(n)
        changed.append(path)


def block(k):
    v = P[k][3]
    lines = ['  --%s: %s;' % (n, v[a]) for n, a in VARS]
    # палитра диаграмм особенностей подхода (BACKLOG 13:55): --chart-1…8, --chart-none, --chart-other
    pal = chart_palette(k)
    lines += ['  --chart-%d: %s;' % (i + 1, c) for i, c in enumerate(pal['c'])]
    lines += ['  --chart-none: %s;' % pal['none'], '  --chart-other: %s;' % pal['other']]
    return 'html.theme-%s {\n%s\n}\n' % (k, '\n'.join(lines))


def region(keys):
    return START + '\n' + '\n'.join(block(k) for k in keys) + END


def sel(keys, suffix=''):
    return ',\n'.join('html.theme-%s%s' % (k, suffix) for k in keys)


def scheme_rules(keys):
    out = []
    for kind in ('dark', 'light'):
        ks = [k for k in keys if P[k][0] == kind]
        if ks:
            out.append('%s { color-scheme: %s; }' % (sel(ks), kind))
    return '\n'.join(out)


def gold_rules(keys, suffix=''):
    out = []
    for kind, val in (('dark', '#f0b429'), ('light', '#b87900')):
        ks = [k for k in keys if P[k][0] == kind]
        if ks:
            out.append('%s {\n  --water-gold: %s;\n}' % (sel(ks, suffix), val))
    return '\n'.join(out)


# ---------- пилоты ----------
def pilot_css(t):
    reg = region(KEYS)
    if START in t:
        t = re.sub(re.escape(START) + r'.*?' + re.escape(END), lambda m: reg, t, count=1, flags=re.S)
    else:
        a = t.index('html.theme-dark {')
        m = re.search(r'html\.theme-pink \{[^}]*\}\n?', t[a:])
        t = t[:a] + reg + '\n' + t[a + m.end():]
    if 'themes-scheme' not in t:
        pass
    sch = '/* themes-scheme */\n' + scheme_rules(NEW)
    if '/* themes-scheme */' in t:
        t = re.sub(r'/\* themes-scheme \*/\n.*?(?=\n\n|\Z)', lambda m: sch, t, count=1, flags=re.S)
    else:
        t = t.replace(END, END + '\n' + sch, 1)
    if 'water-gold: #f0b429' in t and 'html.theme-dark,\nhtml.theme-monet {' in t or GOLD_START in t:
        g = GOLD_START + '\n' + gold_rules(KEYS) + '\n' + GOLD_END
        if GOLD_START in t:
            t = re.sub(re.escape(GOLD_START) + r'.*?' + re.escape(GOLD_END), lambda m: g, t, count=1, flags=re.S)
        else:
            t, n = re.subn(r'html\.theme-dark,\s*html\.theme-monet \{\s*--water-gold: [^}]*\}\s*html\.theme-light,\s*html\.theme-pink \{[^}]*\}', lambda m: g, t, count=1)
            assert n == 1, 'gold block'
    return t


UNLOCK_TS = r"""
// «Темы-награды» (решение владельца 2026-10-06): часть тем закрыта и открывается НАГРАДОЙ за достижение (THEME_UNLOCK: тема → ключ
// достижения; остальные темы открыты всегда). Какие темы открыты, страница сама не знает: список «открытых» ставит шапка при каждой
// загрузке (запрос к user_achievements), а также «Кастомизация»; хранится на устройстве. Нет данных → закрытые остаются закрытыми.
// Закрытая тема, которая УЖЕ включена у человека, остаётся включённой (в списке активная тема есть всегда): отнимать её нельзя.
export const THEME_UNLOCK: Partial<Record<ThemeKey, string>> = __UNLOCK_MAP__
export const UNLOCKED_THEMES_KEY = 'unlocked_themes'
export const UNLOCKED_THEMES_EVENT = 'unlocked-themes:changed'

export function sanitizeUnlockedThemes(raw: unknown): ThemeKey[] {
  const list = Array.isArray(raw) ? raw : []
  return [...new Set(list)].filter((k): k is ThemeKey => typeof k === 'string' && k in THEME_UNLOCK)
}

export function readUnlockedThemes(): ThemeKey[] {
  try {
    return sanitizeUnlockedThemes(JSON.parse(localStorage.getItem(UNLOCKED_THEMES_KEY) || '[]'))
  } catch {
    return []
  }
}

// Записывает список и сообщает странице, только если он изменился (чтобы список тем не «мигал» при каждой синхронизации).
export function writeUnlockedThemes(keys: unknown): ThemeKey[] {
  const clean = sanitizeUnlockedThemes(keys)
  const before = readUnlockedThemes()
  const same = before.length === clean.length && clean.every((k) => before.includes(k))
  try {
    localStorage.setItem(UNLOCKED_THEMES_KEY, JSON.stringify(clean))
  } catch {
    /* хранилище недоступно — список открытых не запомнится */
  }
  if (!same) window.dispatchEvent(new Event(UNLOCKED_THEMES_EVENT))
  return clean
}

export function isThemeLocked(key: ThemeKey, unlocked: ThemeKey[] = readUnlockedThemes()): boolean {
  return key in THEME_UNLOCK && !unlocked.includes(key)
}

// Какие закрытые темы открыты при данном наборе полученных достижений.
export function unlockedThemesFromAchievements(earned: Iterable<string>): ThemeKey[] {
  const have = new Set(earned)
  return (Object.keys(THEME_UNLOCK) as ThemeKey[]).filter((k) => have.has(THEME_UNLOCK[k] as string))
}
"""
UNLOCK_MAP = "{ " + ", ".join("%s: '%s'" % (k, v) for k, v in UNLOCK.items()) + " }"
UNLOCK_BLOCK = UNLOCK_TS.replace("__UNLOCK_MAP__", UNLOCK_MAP)


FAV_START = '/* favorites:start (генерируется scripts/apply_themes.py — не править руками) */'
FAV_END = '/* favorites:end */'
FAV_BLOCK = FAV_START + """
// «Любимые темы» (решение владельца 2026-10-04): отмечаются в «Кастомизации» (максимум 4), и ТОЛЬКО они показываются в выпадающем
// списке тем бокового меню. Хранятся на устройстве в localStorage; пусто/сломано — прежние четыре. Активная тема в списке всегда есть.
export const FAVORITE_THEMES_KEY = 'favorite_themes'
export const FAVORITE_THEMES_EVENT = 'favorite-themes:changed'
export const MAX_FAVORITE_THEMES = 4
export const DEFAULT_FAVORITE_THEMES: ThemeKey[] = ['dark', 'monet', 'light', 'pink']

export function sanitizeFavoriteThemes(raw: unknown): ThemeKey[] {
  const list = Array.isArray(raw) ? raw : []
  const out: ThemeKey[] = []
  for (const k of list) {
    if (typeof k === 'string' && k in THEME_KEYS && !out.includes(k as ThemeKey)) out.push(k as ThemeKey)
    if (out.length === MAX_FAVORITE_THEMES) break
  }
  return out.length ? out : [...DEFAULT_FAVORITE_THEMES]
}

export function readFavoriteThemes(): ThemeKey[] {
  try {
    return sanitizeFavoriteThemes(JSON.parse(localStorage.getItem(FAVORITE_THEMES_KEY) || 'null'))
  } catch {
    return [...DEFAULT_FAVORITE_THEMES]
  }
}

export function writeFavoriteThemes(keys: ThemeKey[]): ThemeKey[] {
  const clean = sanitizeFavoriteThemes(keys)
  try {
    localStorage.setItem(FAVORITE_THEMES_KEY, JSON.stringify(clean))
  } catch {
    /* хранилище недоступно — выбор не запомнится, список останется прежним */
  }
  window.dispatchEvent(new Event(FAVORITE_THEMES_EVENT))
  return clean
}

// Что показывать в выпадающем списке: любимые в их порядке (закрытые темы пропускаются) + активная тема, если её среди них нет
// (иначе select «потеряет» значение).
export function visibleThemes(active: ThemeKey): ThemeKey[] {
  const unlocked = readUnlockedThemes()
  const open = readFavoriteThemes().filter((k) => !isThemeLocked(k, unlocked))
  const fav = open.length ? open : [...DEFAULT_FAVORITE_THEMES]
  return fav.includes(active) ? fav : [...fav, active]
}
""" + UNLOCK_BLOCK + FAV_END + '\n'


def theme_ts(t):
    t = theme_ts_keys(t)
    if FAV_START in t:
        return re.sub(re.escape(FAV_START) + r'.*?' + re.escape(FAV_END) + r'\n', lambda m: FAV_BLOCK, t, count=1, flags=re.S)
    return t.rstrip('\n') + '\n\n' + FAV_BLOCK


def theme_ts_keys(t):
    keys = '{\n' + ''.join("  %s: 'theme_%s',\n" % (k, k) for k in KEYS) + '}'
    t, n = re.subn(r"(export const THEME_KEYS = )\{[^}]*\}", lambda m: m.group(1) + keys, t, count=1)
    assert n == 1
    bg = '{\n' + ''.join("  %s: '%s',\n" % (k, P[k][3]['bg']) for k in KEYS) + '}'
    t, n = re.subn(r"(const THEME_BG_COLORS: Record<ThemeKey, string> = )\{[^}]*\}", lambda m: m.group(1) + bg, t, count=1)
    assert n == 1
    return t


def i18n_ts(t, q="'", ind='    ', sep=','):
    for lang_anchor, idx in (("theme_pink: %s🌸 Pink%s" % (q, q), 1), ("theme_pink: %s🌸 Розовая%s" % (q, q), 2)):
        if 'theme_mint' in t and lang_anchor:
            pass
    def add(t, anchor, idx):
        if (ind + 'theme_mint:') in t and t.count('theme_mint:') >= 2:
            return t
        a = t.index(anchor)
        e = t.index('\n', a)
        lines = ''.join('\n%stheme_%s: %s%s%s%s' % (ind, k, q, P[k][idx], q, sep) for k in NEW)
        return t[:e] + lines + t[e:]
    if t.count('theme_mint:') >= 2:
        return add_missing(relabel(t, q), q, ind, sep)
    t = add(t, "theme_pink: %s🌸 Pink%s" % (q, q), 1)
    t = add(t, "theme_pink: %s🌸 Розовая%s" % (q, q), 2)
    return t


def add_missing(t, q, ind, sep):
    """Дописывает подписи тем, которых в файле ещё нет (темы, добавленные ПОСЛЕ первой раскатки — BACKLOG 45.4). Подпись вставляется сразу после
    подписи предыдущей по порядку темы: в файле каждая подпись встречается дважды — первая запись EN, вторая RU."""
    rx_of = lambda k: re.compile(r'(?<![A-Za-z0-9_])theme_%s: %s[^%s\n]*%s%s' % (k, q, q, q, re.escape(sep)))
    for i, k in enumerate(KEYS):
        if i == 0 or len(rx_of(k).findall(t)) >= 2:
            continue
        if rx_of(k).search(t):
            continue  # одна из двух записей уже есть — необычный файл, не трогаем
        prev = KEYS[i - 1]
        found = list(rx_of(prev).finditer(t))
        if len(found) != 2:
            raise SystemExit('apply_themes: не нашёл по две подписи темы %s для вставки после неё темы %s' % (prev, k))
        for idx, m in ((2, found[1]), (1, found[0])):  # с конца, чтобы смещения не сбивались
            line = '\n%stheme_%s: %s%s%s%s' % (ind, k, q, P[k][idx], q, sep)
            t = t[:m.end()] + line + t[m.end():]
    return t


def relabel(t, q):
    """Подписи уже добавленных тем приводит к themes_data.py (переименование темы без смены ключа). В файле подпись каждой темы
    встречается дважды: первая запись — EN, вторая — RU."""
    for k in KEYS:
        rx = re.compile(r'((?<![A-Za-z0-9_])theme_%s: %s)([^%s\n]*)(%s)' % (k, q, q, q))  # не трогать ach_reward_theme_<ключ> и т.п.
        found = list(rx.finditer(t))
        if len(found) != 2:
            continue
        labels = iter((P[k][1], P[k][2]))
        t = rx.sub(lambda m: m.group(1) + next(labels) + m.group(3), t)
    return t


def index_html(t):
    bg = '{ ' + ', '.join("%s: '%s'" % (k, P[k][3]['bg']) for k in KEYS) + ' }'
    ac = '{ ' + ', '.join("%s: '%s'" % (k, P[k][3]['accent']) for k in KEYS) + ' }'
    t, n1 = re.subn(r"var bg = \{[^}]*\}\[t\]", lambda m: 'var bg = ' + bg + '[t]', t, count=1)
    t, n2 = re.subn(r"var ac = \{[^}]*\}\[t\]", lambda m: 'var ac = ' + ac + '[t]', t, count=1)
    assert n1 == 1 and n2 == 1
    return t


for d in sorted(glob.glob('web-*')):
    if glob.glob(d + '/src/style.css') and glob.glob(d + '/src/lib/theme.ts'):
        rw(d + '/src/style.css', lambda t: tokenize(pilot_css(t), True))
        rw(d + '/src/lib/theme.ts', theme_ts)
        rw(d + '/src/lib/i18n.ts', i18n_ts)
        rw(d + '/index.html', index_html)

def write_preview():
    path = 'web-customization/src/lib/themePreview.ts'
    rows = ''.join("  %s: { bg: '%s', card: '%s', accent: '%s', text: '%s', success: '%s', water: '%s', kind: '%s' },\n"
                   % (k, P[k][3]['bg'], P[k][3]['card'], P[k][3]['accent'], P[k][3]['text'], P[k][3]['ok'], P[k][3]['wt'], P[k][0]) for k in KEYS)
    body = ("// Генерируется scripts/apply_themes.py из scripts/themes_data.py — не править руками.\n"
            "// Цвета для превью темы в «Кастомизации» (мини-диаграмма): фон страницы, карточка, акцент, текст, успех и вода.\n"
            "import type { ThemeKey } from './theme'\n\n"
            "export interface ThemePreview {\n  bg: string\n  card: string\n  accent: string\n  text: string\n  success: string\n  water: string\n  kind: 'dark' | 'light'\n}\n\n"
            "export const THEME_PREVIEW: Record<ThemeKey, ThemePreview> = {\n" + rows + "}\n")
    try:
        old = open(path, encoding='utf-8').read()
    except FileNotFoundError:
        old = None
    if old != body:
        open(path, 'w', encoding='utf-8').write(body)
        changed.append(path)


def app_shell(t):
    old_bottom = "const BOTTOM_KEYS = ['customization', 'history']\nconst sidebarPages = pages.filter((p) => !BOTTOM_KEYS.includes(p.key))\nconst bottomPages = pages.filter((p) => BOTTOM_KEYS.includes(p.key))"
    new_bottom = "const BOTTOM_KEYS = ['history', 'customization']\nconst sidebarPages = pages.filter((p) => !BOTTOM_KEYS.includes(p.key))\nconst bottomPages = BOTTOM_KEYS.map((k) => pages.find((p) => p.key === k)).filter((p): p is NavPage => !!p)"
    if old_bottom in t:
        t = t.replace(old_bottom, new_bottom, 1)
        t = t.replace('«Кастомизация» — под разделителем, рядом с «Историей» (решение владельца 2026-10-04: «в левом сайдбаре за черточку»)', '«Кастомизация» — в самом низу меню, под разделителем, после «Истории» (решение владельца 2026-10-04: «в самый низ за черту»)', 1)
    if 'themeOptions' in t:
        return t
    t, n = re.subn(r"import \{ getTheme, setTheme, THEME_KEYS, type ThemeKey \} from '\.\./lib/theme'",
                   "import { FAVORITE_THEMES_EVENT, getTheme, setTheme, THEME_KEYS, visibleThemes, type ThemeKey } from '../lib/theme'", t, count=1)
    assert n == 1, 'import'
    t, n = re.subn(r'<option v-for="\(labelKey, key\) in THEME_KEYS" :key="key" :value="key">\{\{ t\(labelKey as DictKey\) \}\}</option>',
                   '<option v-for="key in themeOptions" :key="key" :value="key">{{ t(THEME_KEYS[key] as DictKey) }}</option>', t, count=1)
    assert n == 1, 'option'
    anchor = "const lang = getLang()\n"
    assert anchor in t
    t = t.replace(anchor, """// Список тем — только любимые (отмечаются в «Кастомизации», максимум 4); активная тема остаётся в списке всегда.
const favTick = ref(0)
const themeOptions = computed(() => {
  void favTick.value
  return visibleThemes(themeVal.value)
})
const syncFavThemes = () => favTick.value++
onMounted(() => window.addEventListener(FAVORITE_THEMES_EVENT, syncFavThemes))
onUnmounted(() => window.removeEventListener(FAVORITE_THEMES_EVENT, syncFavThemes))
""" + anchor, 1)
    old = "const sidebarPages = pages.filter((p) => p.key !== 'history')\nconst bottomPages = pages.filter((p) => p.key === 'history')"
    assert old in t, 'pages'
    t = t.replace(old, "// «Кастомизация» — в самом низу меню, под разделителем, после «Истории» (решение владельца 2026-10-04: «в самый низ за черту»)\nconst BOTTOM_KEYS = ['history', 'customization']\nconst sidebarPages = pages.filter((p) => !BOTTOM_KEYS.includes(p.key))\nconst bottomPages = BOTTOM_KEYS.map((k) => pages.find((p) => p.key === k)).filter((p): p is NavPage => !!p)", 1)
    return t


def app_shell_unlock(t):
    """Боковое меню перерисовывает список тем и при открытии темы-награды (шапка узнаёт об этом после загрузки страницы)."""
    t = app_shell(t)
    if 'UNLOCKED_THEMES_EVENT' in t:
        return t
    for old, new in (
        ('import { FAVORITE_THEMES_EVENT, ', 'import { FAVORITE_THEMES_EVENT, UNLOCKED_THEMES_EVENT, '),
        ('onMounted(() => window.addEventListener(FAVORITE_THEMES_EVENT, syncFavThemes))',
         'onMounted(() => {\n  window.addEventListener(FAVORITE_THEMES_EVENT, syncFavThemes)\n  window.addEventListener(UNLOCKED_THEMES_EVENT, syncFavThemes)\n})'),
        ('onUnmounted(() => window.removeEventListener(FAVORITE_THEMES_EVENT, syncFavThemes))',
         'onUnmounted(() => {\n  window.removeEventListener(FAVORITE_THEMES_EVENT, syncFavThemes)\n  window.removeEventListener(UNLOCKED_THEMES_EVENT, syncFavThemes)\n})'),
    ):
        assert old in t, old
        t = t.replace(old, new, 1)
    return t


for f in sorted(glob.glob('web-*/src/components/AppShell.vue')):
    rw(f, app_shell_unlock)

# ---------- шапка ----------
def header_css(t):
    gold = gold_rules(NEW, ' .gh-root')
    water = '\n'.join('html.theme-%s .gh-root { --water-top: %s; --water-bottom: %s; --water-line: %s; }' % (k, P[k][3]['wt'], P[k][3]['wb'], P[k][3]['wl']) for k in NEW)
    reg = '/* themes-header:start (генерируется scripts/apply_themes.py) */\n' + water + '\n' + gold + '\n/* themes-header:end */'
    if '/* themes-header:start' in t:
        return re.sub(r'/\* themes-header:start.*?/\* themes-header:end \*/', lambda m: reg, t, count=1, flags=re.S)
    anchor = '/* Анимация «записалось»'
    assert anchor in t
    return t.replace(anchor, reg + '\n\n' + anchor, 1)


def header_prefs(t):
    keys = '{ ' + ', '.join("%s: 'theme_%s'" % (k, k) for k in KEYS) + ' }'
    t, n = re.subn(r"(export const THEME_KEYS = )\{[^}]*\}", lambda m: m.group(1) + keys, t, count=1)
    assert n == 1
    bg = '{ ' + ', '.join("%s: '%s'" % (k, P[k][3]['bg']) for k in KEYS) + ' }'
    t, n = re.subn(r"(const THEME_BG: Record<ThemeKey, string> = )\{[^}]*\}", lambda m: m.group(1) + bg, t, count=1)
    assert n == 1
    return t


rw('web-header/src/header.css', header_css)
rw('web-header/src/lib/prefs.ts', header_prefs)
rw('web-header/src/lib/i18n.ts', i18n_ts)


# Замки тем-наград в шапке: файл целиком генерируется (те же функции и карта, что в theme.ts пилотов); окно «Настройки» шапки берёт отсюда
# isThemeLocked, а App.vue шапки — unlockedThemesFromAchievements/writeUnlockedThemes при синхронизации с user_achievements.
HEADER_UNLOCK = ("// ГЕНЕРИРУЕТСЯ scripts/apply_themes.py из scripts/themes_data.py (UNLOCK) — не править руками.\n"
                 "import type { ThemeKey } from './prefs'\n" + UNLOCK_BLOCK)
_hp = 'web-header/src/lib/themeUnlock.ts'
try:
    _old = open(_hp, encoding='utf-8').read()
except FileNotFoundError:
    _old = None
if _old != HEADER_UNLOCK:
    open(_hp, 'w', encoding='utf-8').write(HEADER_UNLOCK)
    changed.append(_hp)

write_preview()

# ---------- общий сайт: только добавление ----------
def root_theme_js(t):
    if 'mint:' in t:
        # темы, добавленные ПОСЛЕ первой раскатки (BACKLOG 45.4): дописываем недостающие ключи после предыдущей по порядку темы
        for i, k in enumerate(KEYS):
            if i == 0 or re.search(r'^    %s: \"theme_%s\",$' % (k, k), t, re.M):
                continue
            prev = KEYS[i - 1]
            m1 = re.search(r'^    %s: \"theme_%s\",\n' % (prev, prev), t, re.M)
            m2 = re.search(r'^    %s: \"#[0-9a-fA-F]{6}\",\n' % prev, t, re.M)
            assert m1 and m2, 'theme.js: нет опорной темы ' + prev
            t = t[:m2.end()] + '    %s: \"%s\",\n' % (k, P[k][3]['bg']) + t[m2.end():]
            t = t[:m1.end()] + '    %s: \"theme_%s\",\n' % (k, k) + t[m1.end():]
        return t
    t = t.replace('    pink: "theme_pink",\n', '    pink: "theme_pink",\n' + ''.join('    %s: "theme_%s",\n' % (k, k) for k in NEW), 1)
    t = t.replace('    pink: "#fff0f5",\n', '    pink: "#fff0f5",\n' + ''.join('    %s: "%s",\n' % (k, P[k][3]['bg']) for k in NEW), 1)
    return t


def root_i18n_js(t):
    if 'theme_mint' in t:
        t = relabel(t, '"')
        for i, k in enumerate(KEYS):
            if i == 0 or len(re.findall(r'(?<![A-Za-z0-9_])theme_%s: \"' % k, t)) >= 2:
                continue
            prev = KEYS[i - 1]
            found = list(re.finditer(r'(?<![A-Za-z0-9_])theme_%s: \"[^\"\n]*\",' % prev, t))
            assert len(found) == 2, 'i18n.js: нет двух подписей опорной темы ' + prev
            for idx, m in ((2, found[1]), (1, found[0])):
                t = t[:m.end()] + '\n        theme_%s: \"%s\",' % (k, P[k][idx]) + t[m.end():]
        return t
    for anchor, idx in (('        theme_pink: "🌸 Pink",', 1), ('        theme_pink: "🌸 Розовая",', 2)):
        assert anchor in t
        t = t.replace(anchor, anchor + ''.join('\n        theme_%s: "%s",' % (k, P[k][idx]) for k in NEW), 1)
    return t


def root_css(t):
    reg = START + '\n' + '\n'.join(block(k) for k in NEW) + scheme_rules(NEW) + '\n' + END
    if START in t:
        return re.sub(re.escape(START) + r'.*?' + re.escape(END), lambda m: reg, t, count=1, flags=re.S)
    m = re.search(r'html\.theme-pink \{[^}]*\}\n?', t)
    return t[:m.end()] + '\n' + reg + '\n' + t[m.end():]


rw('theme.js', root_theme_js)
rw('i18n.js', root_i18n_js)
rw('style.css', lambda t: tokenize(root_css(t), False))
print('изменено файлов:', len(changed))
for c in changed:
    print(' ', c)
