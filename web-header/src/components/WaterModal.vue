<script setup lang="ts">
import { computed, ref } from 'vue'
import { getLang, t } from '../lib/i18n'
import { fmtDate } from '../lib/date'
import { bodySurfaceAreaM2 } from '../lib/waterGoal'
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
  heightCm?: number | null
  goalSavedMsg?: 'manual' | 'auto' | 'height'
  saveError?: string | null
}>()
const emit = defineEmits<{ close: []; add: [ml: number, dateStr: string]; saveGoal: [ml: number]; resetGoal: []; saveHeight: [cm: number] }>()

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

function fmt(key: Parameters<typeof t>[0], vars: Record<string, string | number>): string {
  return Object.entries(vars).reduce((acc, [k, v]) => acc.replace(`{${k}}`, String(v)), t(key))
}

function autoExplanation(): string {
  const w = props.weightKg
  if (!w || !props.autoNormMl) return t('dash_water_info_no_weight')
  if (props.heightCm) {
    return fmt('dash_water_info_auto_body', { weight: w, height: props.heightCm, bsa: bodySurfaceAreaM2(w, props.heightCm).toFixed(2), norm: props.autoNormMl })
  }
  return fmt('dash_water_info_auto_weight', { weight: w, norm: props.autoNormMl })
}

function showInfo() {
  const text =
    props.metric.goal_value != null
      ? `${t('dash_water_info_manual')}${props.autoNormMl ? `\n\n${fmt('dash_water_info_would', { norm: props.autoNormMl })}` : ''}`
      : `${autoExplanation()}\n\n${t('dash_water_info_editable')}`
  alert(text)
}

const heightInput = ref<number | string>(props.heightCm ?? '')
const heightError = ref(false)
function saveHeightClick() {
  const h = Number(heightInput.value)
  heightError.value = !(h >= 100 && h <= 250)
  if (!heightError.value) emit('saveHeight', h)
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
        <span v-if="goalSavedTick" :key="goalSavedTick" style="color: var(--accent, #6c8cff)" data-test="goal-saved">✓ {{ goalSavedMsg === 'auto' ? t('dash_water_goal_auto_done') : goalSavedMsg === 'height' ? t('dash_water_height_saved') : t('dash_water_goal_saved') }}</span>
      </div>
      <label class="gh-field" style="margin-top: 12px">
        <span>{{ t('dash_water_height_label') }}</span>
        <div class="gh-row">
          <input v-model="heightInput" type="number" min="100" max="250" class="gh-input" data-test="height-input" />
          <button type="button" class="gh-btn" data-test="save-height" @click="saveHeightClick">{{ t('dash_water_height_save') }}</button>
        </div>
      </label>
      <p v-if="heightError" style="color: #d6336c; margin: 4px 0 0; font-size: 12px" data-test="height-error">{{ t('dash_water_height_invalid') }}</p>
      <p v-if="saveError" style="color: #d6336c; margin: 8px 0 0" data-test="water-save-error">{{ saveError }}</p>

      <div class="gh-actions"><button class="gh-btn gh-btn-primary" @click="emit('close')">{{ t('dash_close_btn') }}</button></div>
    </div>
  </div>
</template>
