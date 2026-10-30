#!/usr/bin/env python3
"""BACKLOG 74.3 срез 1: «ошибка загрузки с кнопкой "Повторить"» в пилотах.

Было: <p class="dim">Не удалось загрузить: …</p> — серый текст без повтора и без role="alert".
Стало: <LoadError :message="…" :retry="reload" /> (components/LoadError.vue — копия в каждом пилоте, бандлы независимы).
Скрипт идемпотентен: повторный запуск ничего не меняет. Пилоты и места — в SITES. Страж: web-dashboard/src/loadErrorSites.test.ts."""
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

COMPONENT = '''<script setup lang="ts">
import { ref } from 'vue'
import { t } from '../lib/i18n'

// BACKLOG 74.3: ошибка загрузки с кнопкой «Повторить». Копия в каждом пилоте (scripts/apply_load_error.py — править там).
// message — уже понятный текст (через friendlyError), в слот можно добавить подсказку («— попробуй позже»).
// retry — перезагрузка данных; пока она идёт, кнопка занята, чтобы не плодить запросы.
const props = defineProps<{ message?: string; retry: () => unknown }>()
const busy = ref(false)
async function onRetry() {
  if (busy.value) return
  busy.value = true
  try {
    await props.retry()
  } finally {
    busy.value = false
  }
}
const offline = () => typeof navigator !== 'undefined' && navigator.onLine === false
</script>

<template>
  <div class="mb-3 flex flex-col items-start gap-2" role="alert" data-testid="load-error">
    <p class="dim m-0">{{ t('comm_load_error') }} {{ message }} <slot /></p>
    <p v-if="offline()" class="dim m-0 text-sm" data-testid="load-error-offline">{{ t('load_offline') }}</p>
    <button type="button" class="secondary min-h-11 px-4" :disabled="busy" data-testid="load-retry" @click="onRetry">{{ t('load_retry') }}</button>
  </div>
</template>
'''

KEYS = {
    'en': ("load_retry", "Try again", "load_offline", "You are offline — check your connection and try again."),
    'ru': ("load_retry", "Повторить", "load_offline", "Нет сети — проверь подключение и повтори."),
}

# пилот -> [(старая строка, новая строка)], плюс правки скрипта App.vue (старая подстрока -> новая)
SITES = {
    'web-shop': {
        'html': [('<p v-if="error" class="dim">{{ t(\'comm_load_error\') }} {{ error }}</p>', '<LoadError v-if="error" :message="error" :retry="reload" />')],
        'script': [('buyItem, claimReward,', 'buyItem, claimReward, reload,')],
    },
    'web-goals': {
        'html': [('<p v-if="error" class="dim">{{ t(\'comm_load_error\') }} {{ loadError }}</p>', '<LoadError v-if="error" :message="loadError" :retry="reload" />')],
        'script': [],
    },
    'web-skills': {
        'html': [
            ('<p v-if="skillsError" class="dim">{{ t(\'comm_load_error\') }} {{ skillsError }}</p>', '<LoadError v-if="skillsError" :message="skillsError" :retry="reloadSkills" />'),
            ('<p v-if="booksError" class="dim">{{ t(\'comm_load_error\') }} {{ booksError }}</p>', '<LoadError v-if="booksError" :message="booksError" :retry="reloadBooks" />'),
        ],
        'script': [('error: skillsError, init,', 'error: skillsError, init, reload: reloadSkills,'), ('load: loadBooks,', 'load: loadBooks, reload: reloadBooks,')],
    },
    'web-achievements': {
        'html': [('<p v-if="error" class="dim">{{ t(\'comm_load_error\') }} {{ error }}</p>', '<LoadError v-if="error" :message="error" :retry="reload" />')],
        'script': [('mode, error, loading, init }', 'mode, error, loading, init, reload }')],
    },
    'web-milestones': {
        'html': [('<p v-if="error" class="dim">{{ t(\'comm_load_error\') }} {{ error }}{{ errorHint }}</p>', '<LoadError v-if="error" :message="error" :retry="reload">{{ errorHint }}</LoadError>')],
        'script': [('const { auth, items, error, init, addMilestone', 'const { auth, items, error, init, reload, addMilestone')],
    },
    'web-challenges': {
        'html': [('<p v-if="error" class="dim">{{ t(\'comm_load_error\') }} {{ error }} — {{ t(\'ch_migration_hint\') }}</p>', '<LoadError v-if="error" :message="error" :retry="reload"> — {{ t(\'ch_migration_hint\') }}</LoadError>')],
        'script': [('  error,\n  init,\n', '  error,\n  init,\n  reload,\n')],
    },
    # срез 2 (74.3)
    'web-dashboard': {
        'html': [('<p v-if="loadError" class="dim">{{ t(\'comm_load_error\') }} {{ loadError }}</p>', '<LoadError v-if="loadError" :message="loadError" :retry="refresh" />')],
        'script': [('accountCreatedAt, init, saveProgressSettings } = useDashboard()', 'accountCreatedAt, init, refresh, saveProgressSettings } = useDashboard()')],
        'extra': {
            'components/ChartsSection.vue': [('<p v-if="error" class="dim text-sm">{{ t(\'comm_load_error\') }} {{ error }}</p>', '<LoadError v-if="error" :message="error" :retry="reload" />')],
        },
    },
    'web-community': {
        'html': [
            ('<p v-if="leaderboardError" class="dim mb-5">{{ t(\'comm_load_error\') }} {{ leaderboardError }}</p>', '<LoadError v-if="leaderboardError" :message="leaderboardError" :retry="reload" />'),
            ('<p v-if="todayError" class="dim">{{ t(\'comm_load_error\') }} {{ todayError }}</p>', '<LoadError v-if="todayError" :message="todayError" :retry="reload" />'),
        ],
        'script': [('init, setPeriod, unfollow,', 'init, reload, setPeriod, unfollow,')],
        'extra': {
            'components/CategorySection.vue': [('<p v-else-if="error" class="dim">{{ t(\'comm_load_error\') }} {{ error }}</p>', '<LoadError v-else-if="error" :message="error" :retry="refresh" />')],
        },
    },
}


def patch_i18n(path: Path) -> bool:
    s = path.read_text(encoding='utf-8')
    if 'load_retry:' in s:
        return False
    lines = s.split('\n')
    out, seen = [], 0
    for ln in lines:
        out.append(ln)
        m = re.match(r'^(\s*)comm_load_error: (.*)$', ln)
        if m:
            lang = 'en' if seen == 0 else 'ru'
            seen += 1
            ind, q = m.group(1), ('"' if m.group(2).startswith('"') else "'")
            k1, v1, k2, v2 = KEYS[lang]
            out.append(f'{ind}{k1}: {q}{v1}{q},')
            out.append(f'{ind}{k2}: {q}{v2}{q},')
    if seen != 2:
        raise SystemExit(f'{path}: ожидалось 2 строки comm_load_error, найдено {seen}')
    path.write_text('\n'.join(out), encoding='utf-8')
    return True


def main() -> None:
    changed = []
    for pilot, spec in SITES.items():
        src = ROOT / pilot / 'src'
        comp = src / 'components' / 'LoadError.vue'
        if not comp.exists() or comp.read_text(encoding='utf-8') != COMPONENT:
            comp.write_text(COMPONENT, encoding='utf-8')
            changed.append(f'{pilot}: LoadError.vue')
        if patch_i18n(src / 'lib' / 'i18n.ts'):
            changed.append(f'{pilot}: i18n')
        app = src / 'App.vue'
        s = app.read_text(encoding='utf-8')
        orig = s
        for old, new in spec['html'] + spec['script']:
            if new in s:
                continue
            if old not in s:
                raise SystemExit(f'{pilot}/App.vue: не найдено «{old[:70]}»')
            s = s.replace(old, new, 1)
        if "import LoadError from './components/LoadError.vue'" not in s:
            m = re.search(r"^import \w+ from './components/\w+\.vue'\n", s, re.M)
            s = s[:m.end()] + "import LoadError from './components/LoadError.vue'\n" + s[m.end():]
        if s != orig:
            app.write_text(s, encoding='utf-8')
            changed.append(f'{pilot}: App.vue')
        for rel, edits in spec.get('extra', {}).items():
            f = src / rel
            t = f.read_text(encoding='utf-8')
            t0 = t
            for old, new in edits:
                if new in t:
                    continue
                if old not in t:
                    raise SystemExit(f'{pilot}/{rel}: не найдено «{old[:70]}»')
                t = t.replace(old, new, 1)
            if "import LoadError from './LoadError.vue'" not in t:
                m = re.search(r"^import \w+ from './\w+\.vue'\n", t, re.M)
                if m:
                    t = t[:m.end()] + "import LoadError from './LoadError.vue'\n" + t[m.end():]
                else:
                    m = re.search(r"^import [^\n]+\n(?!import)", t, re.M)
                    t = t[:m.end()] + "import LoadError from './LoadError.vue'\n" + t[m.end():]
            if t != t0:
                f.write_text(t, encoding='utf-8')
                changed.append(f'{pilot}: {rel}')
    print('\n'.join(changed) if changed else 'уже применено, изменений нет')


if __name__ == '__main__':
    main()
