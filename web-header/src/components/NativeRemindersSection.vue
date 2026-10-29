<script setup lang="ts">
// Напоминания на телефоне (BACKLOG 66.9, срез 2). Виден только внутри приложения Android; в браузере раздела нет.
import { ref } from 'vue'
import { t, type DictKey } from '../lib/i18n'
import { loadNativeReminders, nativeRemindersAvailable, saveAndApplyNativeReminders, type NativeReminders } from '../lib/nativeReminders'
import { trackWater } from '../lib/waterTracking'

const available = nativeRemindersAvailable()
const s = ref<NativeReminders>(loadNativeReminders())
const denied = ref(false)
const hours = Array.from({ length: 24 }, (_, i) => i)
const steps = [1, 2, 3, 4, 6, 8, 12]
const wd = (d: number) => t(('nr_wd' + d) as DictKey)

async function commit() {
  denied.value = false
  const ok = await saveAndApplyNativeReminders(s.value)
  s.value = loadNativeReminders() // показываем то, что реально сохранено (границы упорядочены, время нормализовано)
  const wantsAny = s.value.water.enabled || s.value.workout.enabled
  denied.value = wantsAny && !ok
}
function num(e: Event): number {
  return Number((e.target as HTMLSelectElement).value)
}
function toggleDay(d: number) {
  const set = new Set(s.value.workout.weekdays)
  if (set.has(d)) set.delete(d)
  else set.add(d)
  s.value = { ...s.value, workout: { ...s.value.workout, weekdays: [...set].sort((a, b) => a - b) } }
  void commit()
}
function patchWater(p: Partial<NativeReminders['water']>) {
  s.value = { ...s.value, water: { ...s.value.water, ...p } }
  void commit()
}
function patchWorkout(p: Partial<NativeReminders['workout']>) {
  s.value = { ...s.value, workout: { ...s.value.workout, ...p } }
  void commit()
}
</script>

<template>
  <div v-if="available" data-test="native-reminders">
    <h4 style="margin-top: 16px">{{ t('nr_title') }}</h4>
    <p class="gh-dim" style="margin: 0 0 6px; font-size: 12px">{{ t('nr_hint') }}</p>

    <template v-if="trackWater">
      <label class="gh-check">
        <input type="checkbox" :checked="s.water.enabled" data-test="nr-water" @change="patchWater({ enabled: ($event.target as HTMLInputElement).checked })" />
        {{ t('nr_water') }}
      </label>
      <div v-if="s.water.enabled" style="display: flex; flex-wrap: wrap; gap: 6px; align-items: center; margin: 4px 0 8px 24px; font-size: 13px">
        <span>{{ t('nr_from') }}</span>
        <select class="gh-input" :value="s.water.fromHour" data-test="nr-water-from" @change="patchWater({ fromHour: num($event) })">
          <option v-for="h in hours" :key="h" :value="h">{{ String(h).padStart(2, '0') }}:00</option>
        </select>
        <span>{{ t('nr_to') }}</span>
        <select class="gh-input" :value="s.water.toHour" data-test="nr-water-to" @change="patchWater({ toHour: num($event) })">
          <option v-for="h in hours" :key="h" :value="h">{{ String(h).padStart(2, '0') }}:00</option>
        </select>
        <span>{{ t('nr_every') }}</span>
        <select class="gh-input" :value="s.water.everyHours" data-test="nr-water-every" @change="patchWater({ everyHours: num($event) })">
          <option v-for="n in steps" :key="n" :value="n">{{ n }} {{ t('nr_hours') }}</option>
        </select>
      </div>
    </template>

    <label class="gh-check">
      <input type="checkbox" :checked="s.workout.enabled" data-test="nr-workout" @change="patchWorkout({ enabled: ($event.target as HTMLInputElement).checked })" />
      {{ t('nr_workout') }}
    </label>
    <div v-if="s.workout.enabled" style="display: flex; flex-wrap: wrap; gap: 6px; align-items: center; margin: 4px 0 8px 24px; font-size: 13px">
      <span>{{ t('nr_time') }}</span>
      <input class="gh-input" type="time" :value="s.workout.time" data-test="nr-workout-time" @change="patchWorkout({ time: ($event.target as HTMLInputElement).value })" />
      <span style="display: flex; flex-wrap: wrap; gap: 4px">
        <label v-for="d in 7" :key="d" class="gh-check" style="gap: 3px">
          <input type="checkbox" :checked="s.workout.weekdays.includes(d)" :data-test="'nr-day-' + d" @change="toggleDay(d)" />
          {{ wd(d) }}
        </label>
      </span>
    </div>
    <p v-if="denied" style="color: #d6336c; margin: 0 0 6px; font-size: 12px" data-test="nr-denied">{{ t('nr_denied') }}</p>
  </div>
</template>
