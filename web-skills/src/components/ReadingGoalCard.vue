<script setup lang="ts">
// Годовая цель чтения (BACKLOG 77.4, срез 1): кольцо прогресса, подпись «опережаешь/отстаёшь», средний темп и книги по месяцам. Цель хранится на устройстве.
import { computed, ref } from 'vue'
import { getLang, locale, t } from '../lib/i18n'
import { booksWord, loadGoal, readingStats, saveGoal, type DoneBookLike } from '../lib/readingGoal'

const props = defineProps<{ books: DoneBookLike[] }>()

const year = new Date().getFullYear()
const goal = ref(loadGoal(year))
const editing = ref(false)
const draft = ref(goal.value > 0 ? String(goal.value) : '')
const stats = computed(() => readingStats(props.books, goal.value))
const lang = getLang()

const monthLabels = Array.from({ length: 12 }, (_, i) => new Date(2026, i, 1).toLocaleDateString(locale(), { month: 'narrow' }))
const maxMonth = computed(() => Math.max(1, ...stats.value.perMonth))
const R = 34
const C = 2 * Math.PI * R
const caption = computed(() => {
  const s = stats.value
  if (s.state === 'ahead') return `${t('rg_ahead')} ${s.gap} ${booksWord(s.gap, lang)}`
  if (s.state === 'behind') return `${t('rg_behind')} ${s.gap} ${booksWord(s.gap, lang)}`
  if (s.state === 'even') return t('rg_even')
  if (s.state === 'done') return t('rg_done')
  return t('rg_no_goal')
})

function save() {
  goal.value = saveGoal(year, Number(draft.value))
  draft.value = goal.value > 0 ? String(goal.value) : ''
  editing.value = false
}
</script>

<template>
  <section class="mb-4 rounded-xl border p-3" style="border-color: var(--border); background: var(--bg-card)" data-test="reading-goal">
    <div class="flex items-center gap-3">
      <svg width="84" height="84" viewBox="0 0 84 84" role="img" :aria-label="`${stats.done}${stats.goal ? ' / ' + stats.goal : ''}`" class="shrink-0">
        <circle cx="42" cy="42" :r="R" fill="none" stroke="var(--border)" stroke-width="8" />
        <circle cx="42" cy="42" :r="R" fill="none" stroke="var(--accent)" stroke-width="8" stroke-linecap="round" :stroke-dasharray="C" :stroke-dashoffset="C * (1 - stats.pct / 100)" transform="rotate(-90 42 42)" data-test="rg-ring" />
        <text x="42" y="47" text-anchor="middle" font-size="16" font-weight="600" fill="currentColor" data-test="rg-count">{{ stats.done }}<tspan v-if="stats.goal" font-size="11" fill="var(--text-dim)"> / {{ stats.goal }}</tspan></text>
      </svg>
      <div class="min-w-0 flex-1">
        <h3 class="m-0 text-sm font-semibold">{{ t('rg_title') }} {{ year }}</h3>
        <p class="m-0 mt-0.5 text-sm" data-test="rg-caption">{{ caption }}</p>
        <p class="m-0 mt-0.5 text-xs" style="color: var(--text-dim)" data-test="rg-avg">{{ t('rg_avg') }}: {{ stats.avgPerMonth }} {{ t('rg_per_month') }}</p>
        <button v-if="!editing" type="button" class="secondary mt-1.5 px-2 py-1 text-xs" data-test="rg-edit" @click="editing = true">{{ goal > 0 ? t('rg_edit') : t('rg_set') }}</button>
        <div v-else class="mt-1.5 flex items-center gap-2">
          <input v-model="draft" type="number" min="0" max="999" inputmode="numeric" class="w-24 px-2 py-1 text-sm" :placeholder="t('rg_placeholder')" data-test="rg-input" @keyup.enter="save" />
          <button type="button" class="px-2 py-1 text-xs" style="background: var(--accent); color: var(--accent-text); border-radius: 8px" data-test="rg-save" @click="save">{{ t('rg_save') }}</button>
        </div>
      </div>
    </div>
    <div class="mt-3 flex items-end gap-1" style="height: 44px" aria-hidden="true" data-test="rg-months">
      <div v-for="(n, i) in stats.perMonth" :key="i" class="flex flex-1 flex-col items-center justify-end" style="height: 100%">
        <div :style="{ height: n ? Math.max(4, Math.round((n / maxMonth) * 30)) + 'px' : '2px', background: n ? 'var(--accent)' : 'var(--border)', width: '100%', borderRadius: '3px' }" :title="`${n}`"></div>
        <span class="mt-0.5 text-[10px]" style="color: var(--text-dim)">{{ monthLabels[i] }}</span>
      </div>
    </div>
  </section>
</template>
