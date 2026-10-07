<script setup lang="ts">
import EmojiText from './EmojiText.vue'
import { computed, ref, onMounted, nextTick } from 'vue'
import { t, getLang } from '../lib/i18n'
import { fmtDate } from '../lib/date'
import { bodySurfaceAreaM2 } from '../lib/waterGoal'
import type { Metric } from '../lib/types'
import WaterSavedAnim from './WaterSavedAnim.vue'
import { MAX_DAY_ML, parseTotalInput } from '../lib/waterUndo'
import { fmtDeltaMl, fmtLogTime, timeToMs, type DayLogView } from '../lib/waterLog'

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
  // «Крестик» у записи журнала (BACKLOG 23:17): удалить именно эту запись; возвращает сумму дня после удаления или null. Необязательный.
  removeEntry?: (dateStr: string, id: string) => Promise<number | null>
  setTotal?: (ml: number, dateStr: string) => Promise<number | null>
  // Журнал воды за дату со временем (BACKLOG 2.2): из БД (water_log) или, пока таблицы нет, записи этого устройства. Необязательные.
  dayLog?: (dateStr: string) => DayLogView
  loadDayLog?: (dateStr: string) => Promise<void>
}>()
const emit = defineEmits<{
  close: []
  add: [ml: number, dateStr: string, drankAt?: number]
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
  timeStr.value = ''
  timeTouched.value = false
  void props.loadDayLog?.(picked)
  amountMl.value = await props.getMlForDate(picked)
}

function addMl(ml: number) {
  emit('add', ml, dateStr.value, pickedDrankAt())
  amountMl.value = Math.max(0, amountMl.value + ml)
}

// «Своё количество»: поле ввода прямо в окне воды (раньше — системное окно prompt(), BACKLOG 573); как и правка суммы дня — Enter
// добавляет, Esc закрывает, неверное число показывает подсказку и ничего не пишет.
const customOpen = ref(false)
const customValue = ref('')
const customError = ref(false)
const customInput = ref<HTMLInputElement | null>(null)

function toggleCustom() {
  customOpen.value = !customOpen.value
  customValue.value = ''
  customError.value = false
  if (customOpen.value) {
    editing.value = false
    void nextTick(() => customInput.value?.focus())
  }
}

function submitCustom() {
  const ml = Math.floor(Number(customValue.value))
  if (!Number.isFinite(ml) || ml <= 0 || ml > MAX_DAY_ML) {
    customError.value = true
    return
  }
  addMl(ml)
  customOpen.value = false
  customValue.value = ''
  customError.value = false
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

async function onRemoveRow(id: string) {
  if (!props.removeEntry || busy.value) return
  busy.value = true
  const v = await props.removeEntry(dateStr.value, id)
  if (v !== null) amountMl.value = v
  busy.value = false
}

async function onUndo() {
  if (!props.undoLast || busy.value || !undoAvailable.value) return
  busy.value = true
  const v = await props.undoLast(dateStr.value)
  if (v !== null) amountMl.value = v
  busy.value = false
}

function startEdit() {
  customOpen.value = false
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

// Справка о норме — встроенная плашка под подписью (раньше был системный alert); повторный клик по «i» скрывает её.
const infoText = ref('')
function showInfo() {
  if (infoText.value) {
    infoText.value = ''
    return
  }
  const main =
    props.metric.goal_value != null
      ? `${t('dash_water_info_manual')}${props.autoNormMl ? `\n\n${fmt('dash_water_info_would', { norm: props.autoNormMl })}` : ''}`
      : `${autoExplanation()}\n\n${t('dash_water_info_editable')}`
  infoText.value = `${main}\n\n${t('dash_water_info_food')}`
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

      <label class="mt-2 block text-sm">{{ t('dash_water_time_label') }}</label>
      <input v-model="timeStr" type="time" class="w-full" data-test="water-time" @input="timeTouched = true" />
      <p class="dim m-0 mt-0.5 text-xs">{{ t('dash_water_time_hint') }}</p>

      <p class="mt-2.5 text-lg font-bold">{{ amountMl }} / {{ normMl }} {{ unitLabel }} ({{ pct }}%)</p>
      <div class="mb-3.5 h-3.5 overflow-hidden rounded-lg" style="background: var(--bg); border: 1px solid var(--border)">
        <div class="h-full transition-all" style="background: var(--accent)" :style="{ width: pct + '%' }"></div>
      </div>

      <div class="flex flex-wrap gap-2">
        <button class="secondary" data-test="add-200" @click="addMl(200)">+ 200 {{ unitLabel }}</button>
        <button class="secondary" @click="addMl(1000)">+ 1 {{ getLang() === 'en' ? 'l' : 'л' }}</button>
        <button class="secondary" data-test="add-custom" :aria-expanded="customOpen" @click="toggleCustom">{{ t('dash_water_add_custom_btn') }}</button>
      </div>
      <div v-if="customOpen" class="mt-2" data-test="custom-form">
        <label class="block text-sm">{{ t('dash_water_add_custom_prompt') }}</label>
        <input
          ref="customInput"
          v-model="customValue"
          type="number"
          inputmode="numeric"
          min="1"
          :max="MAX_DAY_ML"
          class="w-full"
          data-test="custom-input"
          @keydown.enter.prevent="submitCustom"
          @keydown.esc.stop.prevent="customOpen = false"
        />
        <p v-if="customError" class="mt-1 text-sm" style="color: var(--danger, #d6336c)" data-test="custom-invalid">{{ t('dash_water_custom_invalid') }}</p>
        <div class="mt-2 flex gap-2">
          <button type="button" class="secondary" data-test="custom-add" @click="submitCustom">{{ t('dash_water_custom_add') }}</button>
          <button type="button" class="secondary" data-test="custom-cancel" @click="customOpen = false">{{ t('dash_water_edit_cancel') }}</button>
        </div>
      </div>

      <div v-if="undoLast || setTotal" class="mt-2 flex flex-wrap items-center gap-2" data-test="water-day-tools">
        <!-- «Отменить последнее добавление» — компактная иконка-стрелка с подсказкой, а не большая кнопка (BACKLOG раздел 30) -->
        <button
          v-if="undoLast"
          type="button"
          class="secondary"
          data-test="undo-last"
          :title="t('dash_water_undo_btn')"
          :aria-label="t('dash_water_undo_btn')"
          :disabled="!undoAvailable || busy"
          @click="onUndo"
        >
          <svg viewBox="0 0 24 24" width="1.1em" height="1.1em" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 14 4 9l5-5" /><path d="M4 9h10a6 6 0 0 1 0 12h-3" /></svg>
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
          <li v-for="r in logRows" :key="r.id" class="flex items-center gap-3 py-0.5" data-test="water-log-row">
            <span class="dim tabular-nums">{{ r.time }}</span>
            <span class="tabular-nums" :style="r.delta.startsWith('\u2212') ? 'color: var(--danger)' : ''">{{ r.delta }} {{ unitLabel }}</span>
            <button
              v-if="removeEntry"
              type="button"
              class="secondary ml-auto"
              style="width: 1.75rem; height: 1.75rem; padding: 0; border-radius: 9999px; line-height: 1"
              data-test="water-log-remove"
              :title="t('dash_water_log_remove')"
              :aria-label="t('dash_water_log_remove')"
              :disabled="busy"
              @click="onRemoveRow(r.id)"
            >✕</button>
          </li>
        </ul>
        <p class="dim m-0 mt-1 text-xs">{{ logView.source === 'server' ? t('dash_water_log_note_server') : t('dash_water_log_note') }}</p>
      </div>

      <label class="mt-4 block text-sm">
        <span class="inline-flex items-center gap-1">
          {{ t('dash_water_goal_label') }}
          <button type="button" class="secondary" style="width: 18px; height: 18px; min-height: 0; padding: 0; border-radius: 50%" @click="showInfo">
            i
          </button>
        </span>
      </label>
      <p v-if="infoText" data-test="water-info" class="mt-2 whitespace-pre-line rounded-lg border p-2.5 text-xs" style="border-color: var(--border, rgba(128, 128, 128, 0.35))">{{ infoText }}</p>
      <input v-model.number="goalInput" type="number" class="w-full" />
      <p class="dim mt-1 text-xs">{{ goalHint }}</p>
      <button type="button" class="secondary mt-2" data-test="change-goal" @click="saveGoal">{{ t('dash_water_goal_save_btn') }}</button>
      <button v-if="metric.goal_value != null && autoNormMl" type="button" class="secondary mt-2 ml-2" data-test="auto-goal" @click="emit('resetGoal')">{{ t('dash_water_goal_auto_btn') }} ({{ autoNormMl }} {{ unitLabel }})</button>
      <span v-if="goalSavedTick" :key="goalSavedTick" class="ml-2 text-sm" style="color: var(--accent)" data-test="goal-saved">✓ {{ goalSavedMsg === 'auto' ? t('dash_water_goal_auto_done') : goalSavedMsg === 'height' ? t('dash_water_height_saved') : t('dash_water_goal_saved') }}</span>
      <label class="mt-3 block text-sm">
        {{ t('dash_water_height_label') }}
        <div class="mt-1 flex gap-2">
          <input v-model="heightInput" type="number" min="100" max="250" class="w-full" data-test="height-input" />
          <!-- «Сохранить рост» — маленькая иконка-галочка с подсказкой вместо широкой кнопки (BACKLOG раздел 30) -->
          <button
            type="button"
            class="secondary shrink-0"
            data-test="save-height"
            :title="t('dash_water_height_save')"
            :aria-label="t('dash_water_height_save')"
            @click="saveHeightClick"
          >
            <svg viewBox="0 0 24 24" width="1.1em" height="1.1em" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5 10 17.5 19 7.5" /></svg>
          </button>
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
