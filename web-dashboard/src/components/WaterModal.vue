<script setup lang="ts">
import { computed, ref } from 'vue'
import { t, getLang } from '../lib/i18n'
import { fmtDate } from '../lib/date'
import type { Metric } from '../lib/types'

// Портировано из openWaterModal() в dashboard.js: дата по умолчанию сегодня (можно выбрать
// прошлый день), быстрые кнопки +200мл/+1л, своя сумма, редактирование дневной нормы.
const props = defineProps<{
  metric: Metric
  currentMl: number
  normMl: number
  autoNormMl: number | null
  weightKg: number | null
  getMlForDate: (dateStr: string) => Promise<number>
}>()
const emit = defineEmits<{
  close: []
  add: [ml: number, dateStr: string]
  saveGoal: [ml: number]
}>()

const today = fmtDate(new Date())
const dateStr = ref(today)
const amountMl = ref(props.currentMl)
const goalInput = ref(props.metric.goal_value ?? props.normMl)
const unitLabel = computed(() => (getLang() === 'en' ? 'ml' : 'мл'))

const pct = computed(() => (props.normMl > 0 ? Math.min(100, Math.round((amountMl.value / props.normMl) * 100)) : 0))

const goalHint = computed(() => (props.metric.goal_value != null ? t('dash_water_goal_manual_hint') : t('dash_water_goal_auto_hint')))

async function onDateChange(e: Event) {
  const picked = (e.target as HTMLInputElement).value
  if (!picked || picked > today) {
    ;(e.target as HTMLInputElement).value = dateStr.value
    return
  }
  dateStr.value = picked
  amountMl.value = await props.getMlForDate(picked)
}

function addMl(ml: number) {
  emit('add', ml, dateStr.value)
  amountMl.value = Math.max(0, amountMl.value + ml)
}

function addCustom() {
  const val = prompt(t('dash_water_add_custom_prompt'))
  const ml = parseInt(val || '', 10)
  if (!ml || ml <= 0) return
  addMl(ml)
}

function saveGoal() {
  const ml = goalInput.value
  if (!ml || ml <= 0) return
  emit('saveGoal', ml)
}

function showInfo() {
  const text = props.metric.goal_value != null
    ? t('dash_water_info_manual')
    : props.autoNormMl && props.weightKg
      ? `${t('dash_water_info_auto_prefix')} ${props.weightKg} ${t('dash_water_info_auto_kg')} × 30 ${t('dash_water_info_auto_ml_per_kg')} = ${props.autoNormMl} ${unitLabel.value}.\n\n${t('dash_water_info_editable')}`
      : `${t('dash_water_info_no_weight')}\n\n${t('dash_water_info_editable')}`
  alert(text)
}
</script>

<template>
  <div class="modal-backdrop" @click.self="emit('close')">
    <div class="modal">
      <h3>💧 {{ t('dash_water_modal_title') }}</h3>

      <label class="mt-2 block text-sm">{{ t('dash_water_date_label') }}</label>
      <input type="date" :value="dateStr" :max="today" min="2000-01-01" class="w-full" @change="onDateChange" />

      <p class="mt-2.5 text-lg font-bold">{{ amountMl }} / {{ normMl }} {{ unitLabel }} ({{ pct }}%)</p>
      <div class="mb-3.5 h-3.5 overflow-hidden rounded-lg" style="background: var(--bg); border: 1px solid var(--border)">
        <div class="h-full transition-all" style="background: var(--accent)" :style="{ width: pct + '%' }"></div>
      </div>

      <div class="flex flex-wrap gap-2">
        <button class="secondary" @click="addMl(200)">+ 200 {{ unitLabel }}</button>
        <button class="secondary" @click="addMl(1000)">+ 1 {{ getLang() === 'en' ? 'l' : 'л' }}</button>
        <button class="secondary" @click="addCustom">{{ t('dash_water_add_custom_btn') }}</button>
      </div>

      <label class="mt-4 block text-sm">
        <span class="inline-flex items-center gap-1">
          {{ t('dash_water_goal_label') }}
          <button type="button" class="secondary" style="width: 18px; height: 18px; min-height: 0; padding: 0; border-radius: 50%" @click="showInfo">
            i
          </button>
        </span>
      </label>
      <input v-model.number="goalInput" type="number" class="w-full" />
      <p class="dim mt-1 text-xs">{{ goalHint }}</p>

      <div class="modal-actions">
        <button class="secondary" @click="emit('close')">{{ t('dash_close_btn') }}</button>
        <button @click="saveGoal">{{ t('dash_water_goal_save_btn') }}</button>
      </div>
    </div>
  </div>
</template>
