<script setup lang="ts">
import { computed, ref } from 'vue'
import { getLang, t } from '../lib/i18n'
import { fmtDate } from '../lib/date'
import type { Metric } from '../lib/types'
import WaterSavedAnim from './WaterSavedAnim.vue'

// Окно воды из шапки любой страницы: дата (по умолчанию сегодня, можно прошлые дни), быстрые +200 мл / +1 л, своя
// сумма, изменение дневной нормы. Порт WaterModal.vue Дашборда на собственные стили gh-* (Tailwind на других
// страницах не гарантирован). Анимацию «записалось» запускает родитель через savedTick — после записи в БД.
const props = defineProps<{
  metric: Metric
  currentMl: number
  normMl: number
  autoNormMl: number | null
  weightKg: number | null
  getMlForDate: (dateStr: string) => Promise<number>
  savedTick?: number
  goalSavedTick?: number
  goalSavedMsg?: 'manual' | 'auto'
  saveError?: string | null
}>()
const emit = defineEmits<{ close: []; add: [ml: number, dateStr: string]; saveGoal: [ml: number]; resetGoal: [] }>()

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
  const ml = parseInt(prompt(t('dash_water_add_custom_prompt')) || '', 10)
  if (!ml || ml <= 0) return
  addMl(ml)
}

function saveGoal() {
  const ml = goalInput.value
  if (!ml || ml <= 0) return
  emit('saveGoal', ml)
}

function showInfo() {
  const text =
    props.metric.goal_value != null
      ? `${t('dash_water_info_manual')}${props.autoNormMl && props.weightKg ? `\n\n${t('dash_water_info_auto_prefix')} ${props.weightKg} ${t('dash_water_info_auto_kg')} × 30 ${t('dash_water_info_auto_ml_per_kg')} = ${props.autoNormMl} ${unitLabel.value}.` : ''}`
      : props.autoNormMl && props.weightKg
        ? `${t('dash_water_info_auto_prefix')} ${props.weightKg} ${t('dash_water_info_auto_kg')} × 30 ${t('dash_water_info_auto_ml_per_kg')} = ${props.autoNormMl} ${unitLabel.value}.\n\n${t('dash_water_info_editable')}`
        : `${t('dash_water_info_no_weight')}\n\n${t('dash_water_info_editable')}`
  alert(text)
}
</script>

<template>
  <div class="gh-backdrop" data-test="water-modal" @click.self="emit('close')">
    <div class="gh-modal">
      <WaterSavedAnim :tick="savedTick ?? 0" />
      <h3>💧 {{ t('dash_water_modal_title') }}</h3>

      <label class="gh-dim" style="display: block; margin-top: 8px">{{ t('dash_water_date_label') }}</label>
      <input type="date" :value="dateStr" :max="today" min="2000-01-01" class="gh-input" @change="onDateChange" />

      <p style="margin: 10px 0 0; font-size: 18px; font-weight: 700">{{ amountMl }} / {{ normMl }} {{ unitLabel }} ({{ pct }}%)</p>
      <div class="gh-bar"><div :style="{ width: pct + '%' }"></div></div>

      <div class="gh-wrap">
        <button class="gh-btn" data-test="add-200" @click="addMl(200)">+ 200 {{ unitLabel }}</button>
        <button class="gh-btn" @click="addMl(1000)">+ 1 {{ getLang() === 'en' ? 'l' : 'л' }}</button>
        <button class="gh-btn" @click="addCustom">{{ t('dash_water_add_custom_btn') }}</button>
      </div>

      <label class="gh-row" style="margin-top: 16px">
        {{ t('dash_water_goal_label') }}
        <button type="button" class="gh-btn" style="width: 20px; height: 20px; padding: 0; border-radius: 50%; font-size: 12px" @click="showInfo">i</button>
      </label>
      <input v-model.number="goalInput" type="number" class="gh-input" style="margin-top: 4px" />
      <p class="gh-dim" style="margin: 4px 0 0; font-size: 12px">{{ goalHint }}</p>
      <div class="gh-row" style="margin-top: 8px">
        <button type="button" class="gh-btn" data-test="change-goal" @click="saveGoal">{{ t('dash_water_goal_save_btn') }}</button>
        <button v-if="metric.goal_value != null && autoNormMl" type="button" class="gh-btn" data-test="auto-goal" @click="emit('resetGoal')">{{ t('dash_water_goal_auto_btn') }} ({{ autoNormMl }} {{ unitLabel }})</button>
        <span v-if="goalSavedTick" :key="goalSavedTick" style="color: var(--accent, #6c8cff)" data-test="goal-saved">✓ {{ goalSavedMsg === 'auto' ? t('dash_water_goal_auto_done') : t('dash_water_goal_saved') }}</span>
      </div>
      <p v-if="saveError" style="color: #d6336c; margin: 8px 0 0" data-test="water-save-error">{{ saveError }}</p>

      <div class="gh-actions"><button class="gh-btn gh-btn-primary" @click="emit('close')">{{ t('dash_close_btn') }}</button></div>
    </div>
  </div>
</template>
