<script setup lang="ts">
import { ref } from 'vue'
import { t } from '../lib/i18n'
import { newPastDraft, type ActiveDraft } from '../lib/activeWorkout'
import { nowHHMM, todayStr } from '../lib/date'

// Окно «Добавить прошедшую» (BACKLOG 69.2, срез 3): дата, время начала и длительность, дальше — тот же экран тренировки.
const emit = defineEmits<{ start: [ActiveDraft]; close: [] }>()
const date = ref(todayStr())
const time = ref(nowHHMM())
const minutes = ref('60')
const bad = ref(false)
function go() {
  const d = newPastDraft(crypto.randomUUID(), date.value, time.value, Math.round(Number(minutes.value)))
  if (!d) { bad.value = true; return }
  emit('start', d)
}
const field = 'w-full rounded-md border px-3 py-2'
const fieldStyle = 'border-color: var(--border); background: var(--bg); color: var(--text); min-height: 44px'
</script>

<template>
  <div class="fixed inset-0 z-[70] flex items-end justify-center sm:items-center" style="background: rgba(0, 0, 0, 0.6)" @click.self="emit('close')">
    <form class="w-full max-w-sm rounded-t-2xl border p-5 sm:rounded-2xl" style="background: var(--bg-card); border-color: var(--border); color: var(--text)" data-testid="past-form" @submit.prevent="go">
      <h2 class="mb-3 text-lg font-bold">{{ t('aw_past_title') }}</h2>
      <label class="mb-2 block text-sm">{{ t('aw_past_date') }}<input v-model="date" type="date" :max="todayStr()" :class="field" :style="fieldStyle" data-testid="past-date" /></label>
      <label class="mb-2 block text-sm">{{ t('aw_past_time') }}<input v-model="time" type="time" :class="field" :style="fieldStyle" data-testid="past-time" /></label>
      <label class="mb-3 block text-sm">{{ t('aw_past_minutes') }}<input v-model="minutes" type="text" inputmode="numeric" :class="field" :style="fieldStyle" data-testid="past-minutes" /></label>
      <p v-if="bad" class="mb-2 text-sm" style="color: var(--danger)">{{ t('aw_past_bad') }}</p>
      <div class="flex gap-2">
        <button type="button" class="flex-1 rounded-lg border py-2" style="border-color: var(--border); color: var(--text-dim); min-height: 44px" @click="emit('close')">{{ t('aw_cancel') }}</button>
        <button type="submit" class="flex-1 rounded-lg py-2 font-semibold" style="background: var(--accent); color: var(--accent-text); min-height: 44px" data-testid="past-ok">{{ t('aw_past_ok') }}</button>
      </div>
    </form>
  </div>
</template>
