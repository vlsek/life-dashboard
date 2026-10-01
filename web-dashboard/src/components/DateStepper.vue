<script setup lang="ts">
import { computed } from 'vue'
import Icon from './Icon.vue'
import { addDaysIso, todayStr } from '../lib/date'
import { getLang, t } from '../lib/i18n'

// Переключатель даты (BACKLOG 16, 13:43): «‹ [вт, 30 сентября] ›» + чип «Сегодня», который активен
// только когда выбран не сегодняшний день. Тап по дате открывает системный выбор из календаря
// (прозрачный <input type="date"> поверх подписи — работает и на телефоне, и на десктопе без
// своей модалки). «›» НЕ блокируется на сегодня: «Планы» на завтра — рабочий сценарий.
// Тач-цели не меньше 40 px (.date-stepper-btn в style.css). v-model — строка YYYY-MM-DD.
const props = defineProps<{ modelValue: string }>()
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

const isToday = computed(() => props.modelValue === todayStr())

// Короткая подпись: день недели + число + месяц; год — только если не текущий.
const label = computed(() => {
  const [y, m, d] = props.modelValue.split('-').map(Number)
  const sameYear = y === Number(todayStr().slice(0, 4))
  return new Date(y, m - 1, d).toLocaleDateString(getLang() === 'en' ? 'en-US' : 'ru-RU', {
    weekday: 'short',
    day: 'numeric',
    month: 'long',
    ...(sameYear ? {} : { year: 'numeric' }),
  })
})

const step = (delta: number) => emit('update:modelValue', addDaysIso(props.modelValue, delta))
function onPick(e: Event) {
  const v = (e.target as HTMLInputElement).value
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) emit('update:modelValue', v) // очистка поля ('') игнорируется
}
</script>

<template>
  <div class="date-stepper" data-test="date-stepper">
    <div class="date-stepper-pill">
      <button type="button" class="date-stepper-btn" :aria-label="t('prev_day')" data-test="date-prev" @click="step(-1)">
        <Icon name="chevron_left" />
      </button>
      <label class="date-stepper-label" :title="t('date_pick_title')">
        <span data-test="date-label">{{ label }}</span>
        <input type="date" class="date-stepper-input" :value="modelValue" :aria-label="t('date_pick_title')" data-test="date-input" @change="onPick" />
      </label>
      <button type="button" class="date-stepper-btn" :aria-label="t('next_day')" data-test="date-next" @click="step(1)">
        <Icon name="chevron_right" />
      </button>
    </div>
    <button type="button" class="date-stepper-today" :disabled="isToday" data-test="date-today" @click="emit('update:modelValue', todayStr())">
      {{ t('today_btn') }}
    </button>
  </div>
</template>
