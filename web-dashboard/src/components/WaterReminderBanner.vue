<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import Icon from './Icon.vue'
import { getLang, t } from '../lib/i18n'
import { parseCustomMl, requestWaterAdd } from '../lib/waterQuickAdd'

// Мягкая плашка «пора выпить воды» (BACKLOG 18.5). Показывается только при открытии страницы, не чаще раза в 3 часа
// (логика — lib/waterReminder.ts), закрывается крестиком. BACKLOG 67.1: в плашке можно сразу добавить воду — «+200 мл», «+1 л» или своё число;
// запись делает блок «Вода» (через событие, lib/waterQuickAdd.ts), плашка после добавления закрывается. Цвет — синий воды (--water-line), не акцент темы.
const props = defineProps<{ ml: number; goal: number }>()
const emit = defineEmits<{ dismiss: [] }>()
const unit = computed(() => (getLang() === 'en' ? 'ml' : 'мл'))
const litre = computed(() => (getLang() === 'en' ? 'l' : 'л'))
const customOpen = ref(false)
const customValue = ref('')
const customError = ref(false)
const customInput = ref<HTMLInputElement | null>(null)
function add(ml: number) {
  if (requestWaterAdd(ml)) emit('dismiss')
}
function toggleCustom() {
  customOpen.value = !customOpen.value
  customValue.value = ''
  customError.value = false
  if (customOpen.value) void nextTick(() => customInput.value?.focus())
}
function submitCustom() {
  const ml = parseCustomMl(customValue.value)
  if (ml === null) {
    customError.value = true
    return
  }
  add(ml)
}
// Числа в тексте всегда конечные и неотрицательные: NaN/отрицательное значение никогда не попадает на экран.
// «Осталось» — округлённая РАЗНОСТЬ (а не разность округлённых): 1999,6 из 2000,4 даёт «осталось 1 мл», как и раньше.
const fin = (n: number) => (Number.isFinite(n) && n > 0 ? n : 0)
const left = computed(() => Math.max(0, Math.round(fin(props.goal) - fin(props.ml))))
const text = computed(() =>
  t('water_reminder_text')
    .replace('{ml}', String(Math.round(fin(props.ml))))
    .replace('{goal}', String(Math.round(fin(props.goal))))
    .replace('{left}', String(left.value)),
)
</script>

<template>
  <div
    class="mb-3 rounded-lg border p-2.5"
    data-test="water-reminder"
    :style="{ borderColor: 'var(--border)', borderLeftColor: 'var(--water-line, #1359b0)', borderLeftWidth: '3px', background: 'var(--bg-card)' }"
  >
    <div class="flex items-center gap-2.5">
      <div class="flex-1 text-sm">
        <strong class="flex items-center gap-1"><Icon name="droplet" />{{ t('water_reminder_title') }}</strong>
        <span class="dim mt-0.5 block" data-test="water-reminder-text">{{ text }}</span>
      </div>
      <button type="button" class="secondary px-2" data-test="water-reminder-dismiss" :aria-label="t('dash_close_btn')" @click="emit('dismiss')">
        <Icon name="x" />
      </button>
    </div>
    <div class="mt-2 flex flex-wrap items-center gap-2" data-test="water-reminder-actions">
      <button type="button" class="secondary" data-test="water-reminder-add-200" @click="add(200)">+ 200 {{ unit }}</button>
      <button type="button" class="secondary" data-test="water-reminder-add-1000" @click="add(1000)">+ 1 {{ litre }}</button>
      <button type="button" class="secondary" data-test="water-reminder-custom-toggle" :aria-expanded="customOpen" @click="toggleCustom">{{ t('dash_water_add_custom_btn') }}</button>
    </div>
    <form v-if="customOpen" class="mt-2 flex items-center gap-2" data-test="water-reminder-custom" @submit.prevent="submitCustom">
      <input ref="customInput" v-model="customValue" type="number" inputmode="numeric" min="1" step="1" class="w-28" :placeholder="unit" :aria-label="t('dash_water_add_custom_prompt')" data-test="water-reminder-custom-input" @keydown.esc="toggleCustom" />
      <button type="submit" class="secondary" data-test="water-reminder-custom-add">{{ t('dash_water_custom_add') }}</button>
      <span v-if="customError" class="dim text-xs" data-test="water-reminder-custom-error">{{ t('dash_water_custom_invalid') }}</span>
    </form>
  </div>
</template>
