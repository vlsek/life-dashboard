<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { t } from '../lib/i18n'
import { computeDailyStats, defaultDayIdx, hasAutoSource, isMetricEntry } from '../lib/challenges'
import { todayStr } from '../lib/date'
import Icon from './Icon.vue'
import type { Challenge, ChallengeEntry } from '../lib/types'
import EmojiText from './EmojiText.vue'

const props = defineProps<{ challenge: Challenge; entries: ChallengeEntry[]; sourceName?: string | null }>()
const emit = defineEmits<{
  abandon: [ch: Challenge]
  edit: [ch: Challenge]
  markCompleted: [ch: Challenge]
  setDay: [challengeId: string, dateStr: string, value: number]
}>()

const stats = computed(() => computeDailyStats(props.challenge, props.entries, todayStr()))

// Выбранный день: null — по умолчанию (сегодня; после конца челленджа — последний день).
// Клик по кружку прошедшего дня выбирает его — значение вносится/правится за этот день (BACKLOG 14, 11:28).
const selectedIdx = ref<number | null>(null)
const idx = computed(() => selectedIdx.value ?? defaultDayIdx(stats.value.todayIdx, stats.value.duration))
const day = computed(() => stats.value.doneDays[idx.value])
// Значение выбранного дня взято из метрики (а не введено вручную) — показываем подсказку, как его заменить.
const dayFromMetric = computed(() => !!day.value && props.entries.some((e) => e.date === day.value!.dateStr && isMetricEntry(e)))

const numberValue = ref<string>('')
watch(
  () => [idx.value, day.value?.value] as const,
  () => {
    numberValue.value = day.value?.value == null ? '' : String(day.value.value)
  },
  { immediate: true },
)

const shortDate = (iso: string) => `${iso.slice(8, 10)}.${iso.slice(5, 7)}`
const unitText = computed(() => (props.challenge.unit ? ' ' + props.challenge.unit : ''))
const dayLabel = computed(() => {
  const d = day.value
  if (!d) return ''
  if (stats.value.isBoolean) return d.isToday ? t('ch_done_today_label') : `${t('ch_done_on')} ${shortDate(d.dateStr)}`
  const head = d.isToday ? t('ch_target_today') : `${t('ch_target_for')} ${shortDate(d.dateStr)}:`
  return `${head.replace(/:$/, '')} ${d.target ?? ''}${unitText.value}:`
})

function onCheckbox(e: Event) {
  const d = day.value
  if (!d || d.isFuture) return
  emit('setDay', props.challenge.id, d.dateStr, (e.target as HTMLInputElement).checked ? 1 : 0)
}
function onNumberChange() {
  const d = day.value
  if (!d || d.isFuture) return
  const value = numberValue.value === '' ? 0 : parseFloat(numberValue.value) || 0
  emit('setDay', props.challenge.id, d.dateStr, value)
}

function dotStyle(d: { i: number; isFuture: boolean; done: boolean; isToday: boolean }): Record<string, string> {
  const bg = d.isFuture ? 'var(--border)' : d.done ? 'var(--success)' : 'var(--danger)'
  return {
    width: '12px',
    height: '12px',
    borderRadius: '50%',
    display: 'inline-block',
    padding: '0',
    border: 'none',
    background: bg,
    opacity: !d.isFuture && !d.done ? '0.6' : '1',
    cursor: d.isFuture ? 'default' : 'pointer',
    boxShadow: d.i === idx.value ? '0 0 0 2px var(--text)' : d.isToday ? '0 0 0 2px var(--accent)' : 'none',
  }
}
</script>

<template>
  <div class="card mb-3.5">
    <div class="flex flex-wrap items-center gap-2">
      <strong><EmojiText :text="`${challenge.icon} ${challenge.title}`" /></strong>
      <span v-if="hasAutoSource(challenge)" class="dim rounded-full border px-2 py-0.5 text-xs" style="border-color: var(--border)" data-testid="source-badge">
        ↻ {{ t(challenge.source_exercise_id ? 'ch_source_badge_workout' : 'ch_source_badge') }}{{ sourceName ? ' · ' + sourceName : '' }}
      </span>
      <button class="secondary ml-auto px-2 py-0.5" :title="t('ch_edit_btn')" :aria-label="t('ch_edit_btn')" data-testid="edit-challenge" @click="emit('edit', challenge)"><Icon name="edit" /></button>
      <button class="danger px-2 py-0.5" @click="emit('abandon', challenge)"><Icon name="trash" /></button>
    </div>

    <div class="dim my-1.5 text-sm">
      {{ t('ch_day_label') }} {{ Math.min(stats.todayIdx + 1, stats.duration) }}/{{ stats.duration }} ·
      {{ t('ch_completed_days') }} {{ stats.completedCount }}/{{ stats.duration }}
    </div>

    <div class="mb-2.5 flex flex-wrap gap-[3px]">
      <button
        v-for="d in stats.doneDays"
        :key="d.i"
        type="button"
        :title="d.dateStr"
        :aria-label="d.dateStr"
        :disabled="d.isFuture"
        :data-day="d.dateStr"
        :data-selected="d.i === idx"
        :style="dotStyle(d)"
        @click="selectedIdx = d.i"
      ></button>
    </div>

    <p class="dim mb-2 text-xs">{{ t('ch_pick_day_hint') }}</p>

    <div v-if="day && !day.isFuture" class="flex flex-wrap items-center gap-2" data-testid="day-input">
      <label
        v-if="stats.isBoolean"
        class="flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-2"
        style="border: 1.5px solid var(--accent); background: var(--bg)"
      >
        <input type="checkbox" :checked="day.value === 1" data-testid="day-checkbox" @change="onCheckbox" />
        <span data-testid="day-label">{{ dayLabel }}</span>
      </label>
      <template v-else>
        <span class="dim text-sm" data-testid="day-label">{{ dayLabel }}</span>
        <!-- рамка акцентом и фон отличаются от карточки: раньше ячейка сливалась с фоном (владелец, 11:28) -->
        <input
          v-model="numberValue"
          type="number"
          step="any"
          class="w-[110px] rounded-lg px-2.5 py-1.5 font-semibold"
          style="border: 2px solid var(--accent); background: var(--bg); color: var(--text)"
          placeholder="0"
          data-testid="day-value"
          @change="onNumberChange"
        />
      </template>
    </div>

    <p v-if="dayFromMetric" class="dim mt-1.5 text-xs" data-testid="day-from-metric">{{ t(challenge.source_exercise_id ? 'ch_source_day_hint_workout' : 'ch_source_day_hint') }}</p>

    <template v-if="stats.isOver">
      <p class="dim mt-2 text-sm">{{ t('ch_duration_over_note') }}</p>
      <button @click="emit('markCompleted', challenge)"><EmojiText :text="t('ch_mark_completed_btn')" /></button>
    </template>
  </div>
</template>
