<script setup lang="ts">
import EmojiText from './EmojiText.vue'
import { computed, ref } from 'vue'
import { t, getLang } from '../lib/i18n'
import { fmtDate } from '../lib/date'
import { bodySurfaceAreaM2 } from '../lib/waterGoal'
import type { Metric } from '../lib/types'
import WaterSavedAnim from './WaterSavedAnim.vue'
import { MAX_DAY_ML, dayLogEntries, fmtDelta, fmtEntryTime, parseTotalInput, type UndoEntry } from '../lib/waterUndo'

// Портировано из openWaterModal() в dashboard.js: дата по умолчанию сегодня (можно выбрать
// прошлый день), быстрые кнопки +200мл/+1л, своя сумма, редактирование дневной нормы.
const props = defineProps<{
  metric: Metric
  currentMl: number
  normMl: number
  autoNormMl: number | null
  weightKg: number | null
  getMlForDate: (dateStr: string) => Promise<number>
  savedTick?: number // растёт после каждой подтверждённой записи выпитого — запускает анимацию «записалось»
  goalSavedTick?: number // то же после смены дневной нормы
  heightCm?: number | null // рост из профиля (см) — для авто-нормы по площади поверхности тела
  goalSavedMsg?: 'manual' | 'auto' | 'height' // что именно подтвердить: «Дневная норма изменена» или «Норма снова считается по весу»
  saveError?: string | null
  // «Отменить последнее добавление» и правка суммы за день (BACKLOG 12). Необязательные: без них блок не показывается.
  canUndo?: (dateStr: string, currentMl: number) => boolean
  undoLast?: (dateStr: string) => Promise<number | null>
  setTotal?: (ml: number, dateStr: string) => Promise<number | null>
  // Журнал добавлений за дату со временем (BACKLOG 2.2): только записи этого устройства. Необязательный.
  dayLog?: (dateStr: string) => UndoEntry[]
}>()
const emit = defineEmits<{
  close: []
  add: [ml: number, dateStr: string]
  saveGoal: [ml: number]
  resetGoal: []
  saveHeight: [cm: number]
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
  editing.value = false
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

// --- отмена последнего добавления и правка суммы за день (BACKLOG 12) ---
const busy = ref(false)
// Журнал выбранного дня: последние записи со временем, от новых к старым (зависит от dateStr и от стека в композабле).
const logRows = computed(() =>
  dayLogEntries(props.dayLog ? props.dayLog(dateStr.value) : []).map((e) => ({ time: fmtEntryTime(e.at), delta: fmtDelta(e.prev, e.next), total: e.next, at: e.at })),
)
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
  <div class="modal-backdrop" @click.self="emit('close')">
    <div class="modal relative">
      <WaterSavedAnim :tick="savedTick ?? 0" />
      <h3><EmojiText :text="'💧 ' + t('dash_water_modal_title')" /></h3>

      <label class="mt-2 block text-sm">{{ t('dash_water_date_label') }}</label>
      <input type="date" :value="dateStr" :max="today" min="2000-01-01" class="w-full" @change="onDateChange" />

      <p class="mt-2.5 text-lg font-bold">{{ amountMl }} / {{ normMl }} {{ unitLabel }} ({{ pct }}%)</p>
      <div class="mb-3.5 h-3.5 overflow-hidden rounded-lg" style="background: var(--bg); border: 1px solid var(--border)">
        <div class="h-full transition-all" style="background: var(--accent)" :style="{ width: pct + '%' }"></div>
      </div>

      <div class="flex flex-wrap gap-2">
        <button class="secondary" data-test="add-200" @click="addMl(200)">+ 200 {{ unitLabel }}</button>
        <button class="secondary" @click="addMl(1000)">+ 1 {{ getLang() === 'en' ? 'l' : 'л' }}</button>
        <button class="secondary" @click="addCustom">{{ t('dash_water_add_custom_btn') }}</button>
      </div>

      <div v-if="undoLast || setTotal" class="mt-2 flex flex-wrap items-center gap-2" data-test="water-day-tools">
        <button v-if="undoLast" type="button" class="secondary" data-test="undo-last" :disabled="!undoAvailable || busy" @click="onUndo">
          <EmojiText :text="'↶ ' + t('dash_water_undo_btn')" />
        </button>
        <button
          v-if="setTotal"
          type="button"
          class="secondary"
          data-test="edit-total"
          :title="t('dash_water_edit_total_btn')"
          :aria-label="t('dash_water_edit_total_btn')"
          @click="editing ? (editing = false) : startEdit()"
        >
          <EmojiText text="✎" />
        </button>
      </div>
      <div v-if="editing && setTotal" class="mt-2" data-test="edit-total-form">
        <label class="block text-sm">{{ t('dash_water_edit_total_label') }}</label>
        <input
          v-model="editValue"
          type="number"
          inputmode="numeric"
          min="0"
          :max="MAX_DAY_ML"
          class="w-full"
          data-test="edit-total-input"
          @keydown.enter.prevent="saveEdit"
          @keydown.esc.stop.prevent="editing = false"
        />
        <p v-if="editError" class="mt-1 text-sm" style="color: var(--danger, #d6336c)" data-test="edit-total-invalid">{{ t('dash_water_edit_invalid') }}</p>
        <div class="mt-2 flex gap-2">
          <button type="button" class="secondary" data-test="edit-total-save" :disabled="busy" @click="saveEdit">{{ t('dash_water_edit_save') }}</button>
          <button type="button" class="secondary" data-test="edit-total-cancel" @click="editing = false">{{ t('dash_water_edit_cancel') }}</button>
        </div>
      </div>

      <div v-if="logRows.length" class="mt-3" data-test="water-log">
        <div class="text-sm font-semibold">{{ t('dash_water_log_title') }}</div>
        <ul class="m-0 mt-1 list-none p-0 text-sm">
          <li v-for="r in logRows" :key="r.at" class="flex items-center gap-3 py-0.5" data-test="water-log-row">
            <span class="dim tabular-nums">{{ r.time }}</span>
            <span class="tabular-nums" :style="r.delta.startsWith('\u2212') ? 'color: var(--danger)' : ''">{{ r.delta }} {{ unitLabel }}</span>
          </li>
        </ul>
        <p class="dim m-0 mt-1 text-xs">{{ t('dash_water_log_note') }}</p>
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
      <button type="button" class="secondary mt-2" data-test="change-goal" @click="saveGoal">{{ t('dash_water_goal_save_btn') }}</button>
      <button v-if="metric.goal_value != null && autoNormMl" type="button" class="secondary mt-2 ml-2" data-test="auto-goal" @click="emit('resetGoal')">{{ t('dash_water_goal_auto_btn') }} ({{ autoNormMl }} {{ unitLabel }})</button>
      <span v-if="goalSavedTick" :key="goalSavedTick" class="ml-2 text-sm" style="color: var(--accent)" data-test="goal-saved">✓ {{ goalSavedMsg === 'auto' ? t('dash_water_goal_auto_done') : goalSavedMsg === 'height' ? t('dash_water_height_saved') : t('dash_water_goal_saved') }}</span>
      <label class="mt-3 block text-sm">
        {{ t('dash_water_height_label') }}
        <div class="mt-1 flex gap-2">
          <input v-model="heightInput" type="number" min="100" max="250" class="w-full" data-test="height-input" />
          <button type="button" class="secondary" data-test="save-height" @click="saveHeightClick">{{ t('dash_water_height_save') }}</button>
        </div>
      </label>
      <p v-if="heightError" class="mt-1 text-xs" style="color: #d6336c" data-test="height-error">{{ t('dash_water_height_invalid') }}</p>
      <p v-if="saveError" class="mt-2 text-sm" style="color: var(--danger, #d6336c)" data-test="water-save-error">{{ saveError }}</p>

      <div class="modal-actions">
        <button @click="emit('close')">{{ t('dash_close_btn') }}</button>
      </div>
    </div>
  </div>
</template>
