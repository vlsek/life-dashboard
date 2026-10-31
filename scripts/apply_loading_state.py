#!/usr/bin/env python3
"""BACKLOG 74.3/73.5 срез 3b: «Загрузка…» вместо ложной пустоты («нет активных целей», пока цели ещё грузятся).

В composable: флаг `loaded` (первая загрузка закончилась успехом ИЛИ ошибкой) — `load` оборачивается в try/finally.
В App.vue: перед каждым «пустым» <p v-if="X.length === 0"> появляется <p v-if="!loaded" role="status">Загрузка…</p>, пустое состояние — v-else-if.
Идемпотентен. Магазин и сообщество сделаны вручную (там своя структура), этот скрипт — для пилотов с одной функцией load().
Страж: web-dashboard/src/loadingStateSites.test.ts."""
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

# пилот -> composable'ы, правки деструктуризации в App.vue (было -> стало) и пустые состояния (условие, флаг)
SITES = {
    'web-goals': {
        'composables': ['lib/useGoals.ts'],
        'app': [('const { auth, items, error, hasHorizon,', 'const { auth, items, error, loaded, hasHorizon,')],
        'empties': [('active.length === 0', 'loaded'), ('done.length === 0', 'loaded')],
    },
    'web-challenges': {
        'composables': ['lib/useChallenges.ts'],
        'app': [('  error,\n  init,\n  reload,\n', '  error,\n  loaded,\n  init,\n  reload,\n')],
        'empties': [('active.length === 0', 'loaded'), ('completed.length === 0', 'loaded')],
    },
    'web-milestones': {
        'composables': ['lib/useMilestones.ts'],
        'app': [('const { auth, items, error, init, reload,', 'const { auth, items, error, loaded, init, reload,')],
        'empties': [('active.length === 0', 'loaded'), ('done.length === 0', 'loaded')],
    },
    'web-skills': {
        'composables': ['lib/useSkills.ts', 'lib/useBooks.ts'],
        'app': [
            ('error: skillsError, init,', 'error: skillsError, loaded: skillsLoaded, init,'),
            ('error: booksError, load: loadBooks,', 'error: booksError, loaded: booksLoaded, load: loadBooks,'),
        ],
        'empties': [('active.length === 0', 'skillsLoaded'), ('mastered.length === 0', 'skillsLoaded'), ('activeBooks.length === 0', 'booksLoaded'), ('doneBooks.length === 0', 'booksLoaded')],
    },
}

LOADING = {'en': 'Loading…', 'ru': 'Загрузка…'}


def patch_composable(path: Path) -> bool:
    s = path.read_text(encoding='utf-8')
    if 'const loaded = ref(false)' in s:
        return False
    m = re.search(r"^([ \t]*)const error = ref<[^\n]*\n", s, re.M)
    if not m:
        raise SystemExit(f'{path}: нет const error = ref')
    s = s[:m.end()] + f"{m.group(1)}const loaded = ref(false) // первая загрузка закончилась (успехом или ошибкой): до этого «нет …» показывать нельзя — ложная пустота\n" + s[m.end():]
    m = re.search(r"^([ \t]*)async function load\(userId: string\) \{\n", s, re.M)
    if not m:
        raise SystemExit(f'{path}: нет async function load(userId: string)')
    ind = m.group(1)
    wrapper = (f"{ind}async function load(userId: string) {{\n"
               f"{ind}  try {{\n{ind}    await loadData(userId)\n{ind}  }} finally {{\n{ind}    loaded.value = true\n{ind}  }}\n{ind}}}\n\n")
    s = s[:m.start()] + wrapper + f"{ind}async function loadData(userId: string) {{\n" + s[m.end():]
    # return: добавляем loaded после error
    s2, n = re.subn(r"(return \{[^}]*?\berror,)", r"\1 loaded,", s, count=1, flags=re.S)
    if n != 1:
        raise SystemExit(f'{path}: не нашёл error в return')
    path.write_text(s2, encoding='utf-8')
    return True


def patch_i18n(path: Path) -> bool:
    s = path.read_text(encoding='utf-8')
    if 'load_loading:' in s:
        return False
    out, seen = [], 0
    for ln in s.split('\n'):
        out.append(ln)
        m = re.match(r"^(\s*)load_offline: (.*)$", ln)
        if m:
            q = "'" if m.group(2).startswith("'") else '"'
            out.append(f"{m.group(1)}load_loading: {q}{LOADING['en' if seen == 0 else 'ru']}{q},")
            seen += 1
    if seen != 2:
        raise SystemExit(f'{path}: ожидалось 2 load_offline, найдено {seen}')
    path.write_text('\n'.join(out), encoding='utf-8')
    return True


def patch_app(path: Path, spec: dict) -> bool:
    s = path.read_text(encoding='utf-8')
    orig = s
    for old, new in spec['app']:
        if new in s:
            continue
        if old not in s:
            raise SystemExit(f'{path}: не найдено «{old[:60]}»')
        s = s.replace(old, new, 1)
    for cond, flag in spec['empties']:
        if f'<p v-else-if="{cond}"' in s:
            continue
        pat = re.compile(rf'([ \t]*)<p v-if="{re.escape(cond)}" (class="[^"]*")>')
        m = pat.search(s)
        if not m:
            raise SystemExit(f'{path}: не найдено пустое состояние «{cond}»')
        ind = m.group(1)
        key = cond.split('.')[0]
        new = (f'{ind}<p v-if="!{flag}" class="dim" role="status" data-testid="loading-{key}">{{{{ t(\'load_loading\') }}}}</p>\n'
               f'{ind}<p v-else-if="{cond}" {m.group(2)}>')
        s = s[:m.start()] + new + s[m.end():]
    if s != orig:
        path.write_text(s, encoding='utf-8')
        return True
    return False


def main() -> None:
    changed = []
    for pilot, spec in SITES.items():
        src = ROOT / pilot / 'src'
        for rel in spec['composables']:
            if patch_composable(src / rel):
                changed.append(f'{pilot}: {rel}')
        if patch_i18n(src / 'lib' / 'i18n.ts'):
            changed.append(f'{pilot}: i18n')
        if patch_app(src / 'App.vue', spec):
            changed.append(f'{pilot}: App.vue')
    print('\n'.join(changed) if changed else 'уже применено, изменений нет')


if __name__ == '__main__':
    main()
