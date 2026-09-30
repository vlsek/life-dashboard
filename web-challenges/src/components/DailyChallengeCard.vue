<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { t } from '../lib/i18n'
import { computeDailyStats } from '../lib/challenges'
import { todayStr } from '../lib/date'
import Icon from './Icon.vue'
import type { Challenge, ChallengeEntry } from '../lib/types'

const props = defineProps<{ challenge: Challenge; entries: ChallengeEntry[] }>()
const emit = defineEmits<{
  abandon: [ch: Challenge]
  edit: [ch: Challenge]
  markCompleted: [ch: Challenge]
  setToday: [challengeId: string, value: number]
}>()

const stats = computed(() => computeDailyStats(props.challenge, props.entries, todayStr()))

const numberValue = ref<string>('')
watch(
  () => stats.value.todayEntryValue,
  (v) => {
    numberValue.value = v == null ? '' : String(v)
  },
  { immediate: true },
)

function onCheckbox(e: Event) {
  const checked = (e.target as HTMLInputElement).checked
  emit('setToday', props.challenge.id, checked ? 1 : 0)
}
function onNumberChange() {
  const value = numberValue.value === '' ? 0 : parseFloat(numberValue.value) || 0
  emit('setToday', props.challenge.id, value)
}

function dotStyle(d: { isFuture: boolean; done: boolean; isToday: boolean }): Record<string, string> {
  const bg = d.isFuture ? 'var(--border)' : d.done ? 'var(--success)' : 'var(--danger)'
  return {
    width: '10px',
    height: '10px',
    borderRadius: '50%',
    display: 'inline-block',
    background: bg,
    opacity: !d.isFuture && !d.done ? '0.6' : '1',
    boxShadow: d.isToday ? '0 0 0 2px var(--accent)' : 'none',
  }
}
</script>

<template>
  <div class="card mb-3.5">
    <div class="flex flex-wrap items-center gap-2">
      <strong>{{ challenge.icon }} {{ challenge.title }}</strong>
      <button class="secondary ml-auto px-2 py-0.5" :title="t('ch_edit_btn')" :aria-label="t('ch_edit_btn')" data-testid="edit-challenge" @click="emit('edit', challenge)"><Icon name="edit" /></button>
      <button class="danger px-2 py-0.5" @click="emit('abandon', challenge)"><Icon name="trash" /></button>
    </div>

    <div class="dim my-1.5 text-sm">
      {{ t('ch_day_label') }} {{ Math.min(stats.todayIdx + 1, stats.duration) }}/{{ stats.duration }} ·
      {{ t('ch_completed_days') }} {{ stats.completedCount }}/{{ stats.duration }}
    </div>

    <div class="mb-2.5 flex flex-wrap gap-[3px]">
      <span v-for="d in stats.doneDays" :key="d.i" :title="d.dateStr" :style="dotStyle(d)"></span>
    </div>

    <div v-if="!stats.isOver" class="flex items-center gap-2">
      <label v-if="stats.isBoolean" class="flex cursor-pointer items-center gap-1.5">
        <input type="checkbox" :checked="stats.todayEntryValue === 1" @change="onCheckbox" />
        {{ t('ch_done_today_label') }}
      </label>
      <template v-else>
        <span class="dim text-sm">{{ t('ch_target_today') }} {{ stats.todayTarget }}{{ challenge.unit ? ' ' + challenge.unit : '' }}:</span>
        <input v-model="numberValue" type="number" step="any" class="w-[90px]" placeholder="0" @change="onNumberChange" />
      </template>
    </div>
    <template v-else>
      <p class="dim text-sm">{{ t('ch_duration_over_note') }}</p>
      <button @click="emit('markCompleted', challenge)">{{ t('ch_mark_completed_btn') }}</button>
    </template>
  </div>
</template>
