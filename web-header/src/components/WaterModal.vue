<script setup lang="ts">
import EmojiText from './EmojiText.vue'
import { computed, ref, onMounted } from 'vue'
import { getLang, t } from '../lib/i18n'
import { fmtDate } from '../lib/date'
import { bodySurfaceAreaM2 } from '../lib/waterGoal'
import { MAX_DAY_ML, parseTotalInput } from '../lib/waterUndo'
import { fmtDeltaMl, fmtLogTime, timeToMs, type DayLogView } from '../lib/waterLog'
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
  // «Отменить последнее добавление» и правка суммы за день (BACKLOG 12; копия из Дашборда). Необязательные: без них блок не показывается.
  canUndo?: (dateStr: string, currentMl: number) => boolean
  undoLast?: (dateStr: string) => Promise<number | null>
  setTotal?: (ml: number, dateStr: string) => Promise<number | null>
  // Журнал воды за дату со временем (BACKLOG 2.2): из БД (water_log) или, пока таблицы нет, записи этого устройства. Необязательные.
  dayLog?: (dateStr: string) => DayLogView
  loadDayLog?: (dateStr: string) => Promise<void>
}>()
const emit = defineEmits<{ close: []; add: [ml: number, dateStr: string, drankAt?: number]; saveGoal: [ml: number]; resetGoal: []; saveHeight: [cm: number] }>()

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
  editing.value = false
  timeStr.value = ''
  timeTouched.value = false
  void props.loadDayLog?.(picked)
  amountMl.value = await props.getMlForDate(picked)
}

function addMl(ml: number) {
  emit('add', ml, dateStr.value, pickedDrankAt())
  amountMl.value = Math.max(0, amountMl.value + ml)
}

function addCustom() {
  const ml = parseInt(prompt(t('dash_water_add_custom_prompt')) || '', 10)
  if (!ml || ml <= 0) return
  addMl(ml)
}

// --- отмена последнего добавления и правка суммы за день (BACKLOG 12) ---
const busy = ref(false)
// Журнал выбранного дня: записи со временем от новых к старым; источник — аккаунт (все устройства) или только это устройство.
const logView = computed<DayLogView>(() => (props.dayLog ? props.dayLog(dateStr.value) : { rows: [], source: 'local' }))
const logRows = computed(() => logView.value.rows.map((r) => ({ id: r.id, time: fmtLogTime(r.at), delta: fmtDeltaMl(r.delta) })))
onMounted(() => props.loadDayLog?.(dateStr.value))

// Время выпитого: пусто — «сейчас» (для прошлого дня — 12:00); можно указать вручную (вода задним числом или «пил час назад»).
const timeStr = ref('')
const timeTouched = ref(false)
function pickedDrankAt(): number | undefined {
  if (!timeTouched.value || !timeStr.value) return undefined
  const ms = timeToMs(dateStr.value, timeStr.value)
  if (ms === null) return undefined
  return dateStr.value === today ? Math.min(ms, Date.now()) : ms // сегодня — не из будущего
}
const undoAvailable = computed(() => !!props.canUndo && props.canUndo(dateStr.value, amountMl.value))
const editing = ref(false)
const editValue = ref('')
const editError = ref(false)

async function onUndo() {
  if (!props.undoLast || busy.value || !undoAvailable.value) return
  busy.value = true
  const v = await props.undoLast(dateStr.value)
  if (v !== null) amountMl.value = v
  busy.value = false
}

function startEdit() {
  editValue.value = String(amountMl.value)
  editError.value = false
  editing.value = true
}

async function saveEdit() {
  if (!props.setTotal || busy.value) return
  const ml = parseTotalInput(editValue.value)
  if (ml === null) {
    editError.value = true
    return
  }
  busy.value = true
  const v = await props.setTotal(ml, dateStr.value)
  busy.value = false
  if (v !== null) {
    amountMl.value = v
    editing.value = false
  }
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
      <h3><EmojiText :text="'💧 ' + t('dash_water_modal_title')" /></h3>

      <label class="gh-dim" style="display: block; margin-top: 8px">{{ t('dash_water_date_label') }}</label>
      <input type="date" :value="dateStr" :max="today" min="2000-01-01" class="gh-input" @change="onDateChange" />

      <label class="gh-dim" style="display: block; margin-top: 8px">{{ t('dash_water_time_label') }}</label>
      <input v-model="timeStr" type="time" class="gh-input" data-test="water-time" @input="timeTouched = true" />
      <p class="gh-dim" style="margin: 2px 0 0; font-size: 12px">{{ t('dash_water_time_hint') }}</p>

      <p style="margin: 10px 0 0; font-size: 18px; font-weight: 700">{{ amountMl }} / {{ normMl }} {{ unitLabel }} ({{ pct }}%)</p>
      <div class="gh-bar"><div :style="{ width: pct + '%' }"></div></div>

      <div class="gh-wrap">
        <button class="gh-btn" data-test="add-200" @click="addMl(200)">+ 200 {{ unitLabel }}</button>
        <button class="gh-btn" @click="addMl(1000)">+ 1 {{ getLang() === 'en' ? 'l' : 'л' }}</button>
        <button class="gh-btn" @click="addCustom">{{ t('dash_water_add_custom_btn') }}</button>
      </div>

      <div v-if="undoLast || setTotal" class="gh-wrap" style="margin-top: 8px; align-items: center" data-test="water-day-tools">
        <button v-if="undoLast" type="button" class="gh-btn" data-test="undo-last" :disabled="!undoAvailable || busy" @click="onUndo">
          <EmojiText :text="'↶ ' + t('dash_water_undo_btn')" />
        </button>
        <button
          v-if="setTotal"
          type="button"
          class="gh-btn"
          data-test="edit-total"
          :title="t('dash_water_edit_total_btn')"
          :aria-label="t('dash_water_edit_total_btn')"
          @click="editing ? (editing = false) : startEdit()"
        >
          <EmojiText text="✎" />
        </button>
      </div>
      <div v-if="editing && setTotal" style="margin-top: 8px" data-test="edit-total-form">
        <label class="gh-dim" style="display: block">{{ t('dash_water_edit_total_label') }}</label>
        <input
          v-model="editValue"
          type="number"
          inputmode="numeric"
          min="0"
          :max="MAX_DAY_ML"
          class="gh-input"
          data-test="edit-total-input"
          @keydown.enter.prevent="saveEdit"
          @keydown.esc.stop.prevent="editing = false"
        />
        <p v-if="editError" style="color: #d6336c; margin: 4px 0 0; font-size: 13px" data-test="edit-total-invalid">{{ t('dash_water_edit_invalid') }}</p>
        <div class="gh-wrap" style="margin-top: 8px">
          <button type="button" class="gh-btn" data-test="edit-total-save" :disabled="busy" @click="saveEdit">{{ t('dash_water_edit_save') }}</button>
          <button type="button" class="gh-btn" data-test="edit-total-cancel" @click="editing = false">{{ t('dash_water_edit_cancel') }}</button>
        </div>
      </div>

      <div v-if="logRows.length" style="margin-top: 12px" data-test="water-log">
        <div style="font-weight: 600">{{ t('dash_water_log_title') }}</div>
        <ul style="list-style: none; margin: 4px 0 0; padding: 0">
          <li v-for="r in logRows" :key="r.id" style="display: flex; gap: 12px; padding: 2px 0" data-test="water-log-row">
            <span class="gh-dim" style="font-variant-numeric: tabular-nums">{{ r.time }}</span>
            <span :style="'font-variant-numeric: tabular-nums;' + (r.delta.startsWith('\u2212') ? ' color: #d6336c' : '')">{{ r.delta }} {{ unitLabel }}</span>
          </li>
        </ul>
        <p class="gh-dim" style="margin: 4px 0 0; font-size: 12px">{{ logView.source === 'server' ? t('dash_water_log_note_server') : t('dash_water_log_note') }}</p>
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
