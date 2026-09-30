<script setup lang="ts">
import { computed } from 'vue'
import Icon from './Icon.vue'
import { t, type DictKey } from '../lib/i18n'
import { isItemDone, itemSharePct, type ProgressSummary, type SummaryItem } from '../lib/progressSummary'

// Сводка по клику на кольцо дня/недели (BACKLOG 11): что сделано, что осталось, сколько процентов даёт каждый пункт.
// Значок настроек — только здесь; отсюда открывается ProgressSettingsModal (через событие settings).
const props = defineProps<{ kind: 'day' | 'week'; summary: ProgressSummary }>()
const emit = defineEmits<{ close: []; settings: [] }>()

// t() без параметров — подстановку {name} делаем тут
const f = (key: DictKey, vars: Record<string, string>) => Object.entries(vars).reduce((acc, [k, v]) => acc.replace(`{${k}}`, v), t(key))

const doneItems = computed(() => props.summary.items.filter(isItemDone))
const openItems = computed(() => props.summary.items.filter((i) => !isItemDone(i)))
const title = computed(() => (props.kind === 'day' ? t('dash_day_progress_label') : t('dash_week_progress_label')))

// «Пн 28.09» для пунктов недели; для дня даты нет
function when(i: { date?: string }): string {
  if (!i.date) return ''
  const [y, m, d] = i.date.split('-').map(Number)
  const wd = new Date(y, m - 1, d).getDay()
  const names = t('dash_summary_weekdays').split(',')
  return `${names[wd]} ${String(d).padStart(2, '0')}.${String(m).padStart(2, '0')}`
}

// сколько процентов даёт пункт: выполненная часть (для «готово») или недостающая (для «осталось»)
function share(i: SummaryItem, done: boolean): string {
  const w = done ? i.doneWeight : i.weight - i.doneWeight
  return `${done ? '+' : ''}${itemSharePct(props.summary, w)}%`
}
</script>

<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" @click.self="emit('close')">
    <div class="flex max-h-[85vh] w-full max-w-sm flex-col rounded-2xl border p-5" style="background: var(--bg-card); border-color: var(--border); color: var(--text)" data-test="summary-modal">
      <div class="mb-1 flex items-center gap-2">
        <h3 class="flex-1 text-lg font-bold">{{ title }}</h3>
        <button type="button" class="rounded-lg border px-2.5 py-1.5" style="border-color: var(--border); background: var(--bg); color: var(--text)" data-test="open-settings" :title="t('dash_day_progress_settings_title')" :aria-label="t('dash_day_progress_settings_title')" @click="emit('settings')">
          <Icon name="gear" />
        </button>
      </div>

      <p class="mb-3 text-2xl font-bold" data-test="summary-total">
        {{ summary.totalPct }}%
        <span class="dim text-sm font-normal">{{ f('dash_summary_done_of', { done: String(summary.done), total: String(summary.total) }) }}</span>
      </p>
      <p v-if="summary.bonusPct > 0" class="dim -mt-2 mb-3 text-xs" data-test="summary-bonus-line">{{ f('dash_summary_bonus_line', { base: String(summary.basePct), bonus: String(summary.bonusPct) }) }}</p>

      <div class="overflow-y-auto text-sm">
        <p v-if="summary.total === 0" class="dim" data-test="summary-empty">{{ t('dash_summary_empty') }}</p>

        <template v-if="doneItems.length">
          <h4 class="mb-1 font-semibold">{{ t('dash_summary_done_h') }}</h4>
          <ul class="mb-3">
            <li v-for="(i, k) in doneItems" :key="'d' + k" class="flex items-baseline gap-2 border-b py-1" style="border-color: var(--border)" data-test="done-item">
              <span class="flex-1">{{ i.name }}<span v-if="when(i)" class="dim"> · {{ when(i) }}</span><span v-if="i.note" class="dim"> · {{ i.note }}</span></span>
              <span class="dim">{{ share(i, true) }}</span>
            </li>
          </ul>
        </template>

        <template v-if="openItems.length">
          <h4 class="mb-1 font-semibold">{{ t('dash_summary_left_h') }}</h4>
          <ul class="mb-3">
            <li v-for="(i, k) in openItems" :key="'o' + k" class="flex items-baseline gap-2 border-b py-1" style="border-color: var(--border)" data-test="open-item">
              <span class="flex-1">{{ i.name }}<span v-if="when(i)" class="dim"> · {{ when(i) }}</span><span v-if="i.note" class="dim"> · {{ i.note }}</span></span>
              <span class="dim">{{ share(i, false) }}</span>
            </li>
          </ul>
        </template>

        <template v-if="summary.bonus.length">
          <h4 class="mb-1 font-semibold">{{ t('dash_summary_bonus_h') }}</h4>
          <ul class="mb-1">
            <li v-for="(b, k) in summary.bonus" :key="'b' + k" class="flex items-baseline gap-2 border-b py-1" style="border-color: var(--border)" data-test="bonus-item">
              <span class="flex-1" :style="{ opacity: b.done ? 1 : 0.6 }">{{ b.name }}<span v-if="when(b)" class="dim"> · {{ when(b) }}</span></span>
              <span class="dim">{{ b.done ? '+20%' : '—' }}</span>
            </li>
          </ul>
        </template>
      </div>

      <div class="mt-3 flex justify-end">
        <button type="button" class="rounded-lg border px-4 py-2 text-sm" style="border-color: var(--border); background: var(--bg); color: var(--text)" @click="emit('close')">{{ t('close') }}</button>
      </div>
    </div>
  </div>
</template>
