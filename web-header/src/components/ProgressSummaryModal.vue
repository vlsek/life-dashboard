<script setup lang="ts">
import EmojiText from './EmojiText.vue'
import { computed } from 'vue'
import { t, type DictKey } from '../lib/i18n'
import { isItemDone, itemSharePct, type ProgressSummary, type SummaryItem } from '../lib/progressSummary'

// Сводка по клику на кольцо (копия ProgressSummaryModal.vue Дашборда на стилях gh-*): что сделано, что осталось,
// сколько процентов даёт пункт; шестерёнка — настройки прогресса.
const props = defineProps<{ kind: 'day' | 'week'; summary: ProgressSummary }>()
const emit = defineEmits<{ close: []; settings: [] }>()

const f = (key: DictKey, vars: Record<string, string>) => Object.entries(vars).reduce((acc, [k, v]) => acc.replace(`{${k}}`, v), t(key))
const doneItems = computed(() => props.summary.items.filter(isItemDone))
const openItems = computed(() => props.summary.items.filter((i) => !isItemDone(i)))
const title = computed(() => (props.kind === 'day' ? t('dash_day_progress_label') : t('dash_week_progress_label')))

function when(i: { date?: string }): string {
  if (!i.date) return ''
  const [y, m, d] = i.date.split('-').map(Number)
  const names = t('dash_summary_weekdays').split(',')
  return `${names[new Date(y, m - 1, d).getDay()]} ${String(d).padStart(2, '0')}.${String(m).padStart(2, '0')}`
}
function share(i: SummaryItem, done: boolean): string {
  const w = done ? i.doneWeight : i.weight - i.doneWeight
  return `${done ? '+' : ''}${itemSharePct(props.summary, w)}%`
}
</script>

<template>
  <div class="gh-backdrop" @click.self="emit('close')">
    <div class="gh-modal" data-test="summary-modal">
      <div class="gh-row">
        <h3 style="flex: 1; margin: 0">{{ title }}</h3>
        <button type="button" class="gh-btn gh-btn-icon" data-test="open-settings" :title="t('dash_day_progress_settings_title')" :aria-label="t('dash_day_progress_settings_title')" @click="emit('settings')">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
          </svg>
        </button>
      </div>

      <p class="gh-total" data-test="summary-total">
        {{ summary.totalPct }}%
        <small class="gh-dim">{{ f('dash_summary_done_of', { done: String(summary.done), total: String(summary.total) }) }}</small>
      </p>
      <p v-if="summary.bonusPct > 0" class="gh-dim" style="margin: -8px 0 12px; font-size: 12px" data-test="summary-bonus-line">{{ f('dash_summary_bonus_line', { base: String(summary.basePct), bonus: String(summary.bonusPct) }) }}</p>

      <p v-if="summary.total === 0" class="gh-dim" data-test="summary-empty">{{ t('dash_summary_empty') }}</p>

      <template v-if="doneItems.length">
        <h4>{{ t('dash_summary_done_h') }}</h4>
        <ul class="gh-list">
          <li v-for="(i, k) in doneItems" :key="'d' + k" data-test="done-item">
            <span>{{ i.name }}<span v-if="when(i)" class="gh-dim"> · {{ when(i) }}</span><span v-if="i.note" class="gh-dim"> · {{ i.note }}</span></span>
            <span class="gh-dim">{{ share(i, true) }}</span>
          </li>
        </ul>
      </template>
      <template v-if="openItems.length">
        <h4>{{ t('dash_summary_left_h') }}</h4>
        <ul class="gh-list">
          <li v-for="(i, k) in openItems" :key="'o' + k" data-test="open-item">
            <span>{{ i.name }}<span v-if="when(i)" class="gh-dim"> · {{ when(i) }}</span><span v-if="i.note" class="gh-dim"> · {{ i.note }}</span></span>
            <span class="gh-dim">{{ share(i, false) }}</span>
          </li>
        </ul>
      </template>
      <template v-if="summary.bonus.length">
        <h4><EmojiText :text="t('dash_summary_bonus_h')" /></h4>
        <ul class="gh-list">
          <li v-for="(b, k) in summary.bonus" :key="'b' + k" data-test="bonus-item">
            <span :style="{ opacity: b.done ? 1 : 0.6 }">{{ b.name }}<span v-if="when(b)" class="gh-dim"> · {{ when(b) }}</span></span>
            <span class="gh-dim">{{ b.done ? '+20%' : '—' }}</span>
          </li>
        </ul>
      </template>

      <div class="gh-actions"><button type="button" class="gh-btn" @click="emit('close')">{{ t('close') }}</button></div>
    </div>
  </div>
</template>
