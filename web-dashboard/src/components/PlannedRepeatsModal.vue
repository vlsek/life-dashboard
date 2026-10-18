<script setup lang="ts">
import { ref } from 'vue'
import { friendlyError } from '../lib/friendlyError'
import { t } from '../lib/i18n'
import { WEEK_ORDER, buildRepeatSchedule, repeatKindOf, repeatSummary, type PlanRepeat, type RepeatKind, type RepeatSchedule } from '../lib/planRepeats'

// Повторяющиеся пункты «Планов» (BACKLOG 1054, миграция 087): список + добавление + правка (срез 2: ✎ переносит пункт в форму, «Сохранить» пишет изменения). Расписание — как у метрик: каждый день / по дням недели / N раз в неделю.
// add — запись пункта (родитель пишет в базу); её ошибка показывается ПОД полями, окно остаётся открытым, введённое не пропадает.
const props = defineProps<{
  repeats: PlanRepeat[]
  add: (text: string, time: string | null, schedule: RepeatSchedule) => Promise<void>
  update: (id: string, text: string, time: string | null, schedule: RepeatSchedule) => Promise<void>
  remove: (id: string) => Promise<boolean>
}>()
const emit = defineEmits<{ close: [] }>()

const text = ref('')
const time = ref('')
const kind = ref<RepeatKind>('daily')
const days = ref<number[]>([1, 3, 5])
const perWeek = ref(3)
const saving = ref(false)
const editingId = ref<string | null>(null) // id пункта, который сейчас правится (форма заполнена его значениями); null — добавление нового
const problem = ref<string | null>(null)

const weekdayNames = () => t('dash_weekdays_short').split(',')
const summary = (r: PlanRepeat) => repeatSummary(r.schedule, weekdayNames(), t('dash_repeat_every_day'), (n) => `${n}${t('dash_schedule_weekly_short')}`)
function toggleDay(d: number) {
  days.value = days.value.includes(d) ? days.value.filter((x) => x !== d) : [...days.value, d]
  problem.value = null
}

function resetForm() {
  editingId.value = null
  text.value = ''
  time.value = ''
  kind.value = 'daily'
  days.value = [1, 3, 5]
  perWeek.value = 3
  problem.value = null
}
function startEdit(r: PlanRepeat) {
  editingId.value = r.id
  text.value = r.text
  time.value = r.time ?? ''
  kind.value = repeatKindOf(r.schedule)
  days.value = r.schedule?.type === 'days' ? [...r.schedule.days] : [1, 3, 5]
  perWeek.value = r.schedule?.type === 'weekly' ? r.schedule.min : 3
  problem.value = null
}
async function removeItem(id: string) {
  if (await props.remove(id)) if (editingId.value === id) resetForm() // удалили то, что правили, — форму очищаем
}

async function submit() {
  if (saving.value) return
  if (!text.value.trim()) {
    problem.value = t('dash_repeat_text_required')
    return
  }
  if (kind.value === 'days' && days.value.length === 0) {
    problem.value = t('dash_repeat_days_required')
    return
  }
  problem.value = null
  saving.value = true
  try {
    const schedule = buildRepeatSchedule(kind.value, days.value, perWeek.value)
    if (editingId.value) await props.update(editingId.value, text.value, time.value || null, schedule)
    else await props.add(text.value, time.value || null, schedule)
    resetForm()
  } catch (e) {
    problem.value = friendlyError(e)
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="modal-backdrop" @click.self="emit('close')">
    <div class="modal" data-test="repeats-modal">
      <h3>{{ t('dash_repeat_title') }}</h3>

      <p v-if="!repeats.length" class="dim mt-2 text-sm" data-test="repeat-empty">{{ t('dash_repeat_empty') }}</p>
      <ul v-else class="m-0 mt-2 flex list-none flex-col gap-1 p-0 text-sm" data-test="repeat-list">
        <li v-for="r in repeats" :key="r.id" class="flex items-center gap-2" :aria-current="editingId === r.id ? 'true' : undefined" :style="editingId === r.id ? 'outline: 1px solid var(--accent); border-radius: 6px' : undefined" data-test="repeat-item">
          <span class="min-w-0 flex-1 break-words">{{ r.text }}<span v-if="r.time" class="dim"> · {{ r.time }}</span></span>
          <span class="dim text-xs" data-test="repeat-summary">{{ summary(r) }}</span>
          <button type="button" class="secondary" :aria-label="t('dash_repeat_edit')" data-test="repeat-edit" @click="startEdit(r)">✎</button>
          <button type="button" class="secondary" :aria-label="t('dash_repeat_delete')" data-test="repeat-delete" @click="removeItem(r.id)">✕</button>
        </li>
      </ul>

      <p v-if="editingId" class="dim mb-0 mt-3 text-xs" data-test="repeat-editing-hint">{{ t('dash_repeat_editing_hint') }}</p>
      <label class="mt-3 block text-sm">{{ t('dash_repeat_text') }}</label>
      <input v-model="text" type="text" class="w-full" maxlength="120" data-test="repeat-text" @input="problem = null" @keydown.enter.prevent="submit" />

      <label class="mt-2 block text-sm">{{ t('dash_repeat_kind') }}</label>
      <select v-model="kind" class="w-full" data-test="repeat-kind" @change="problem = null">
        <option value="daily">{{ t('dash_repeat_kind_daily') }}</option>
        <option value="days">{{ t('dash_repeat_kind_days') }}</option>
        <option value="weekly">{{ t('dash_repeat_kind_weekly') }}</option>
      </select>

      <div v-if="kind === 'days'" class="mt-2 flex flex-wrap gap-1" data-test="repeat-days">
        <label v-for="d in WEEK_ORDER" :key="d" class="inline-flex items-center gap-1 text-sm">
          <input type="checkbox" :checked="days.includes(d)" :data-test="'repeat-day-' + d" @change="toggleDay(d)" />
          {{ weekdayNames()[WEEK_ORDER.indexOf(d)] }}
        </label>
      </div>
      <template v-if="kind === 'weekly'">
        <label class="mt-2 block text-sm">{{ t('dash_repeat_times') }}</label>
        <input v-model.number="perWeek" type="number" min="1" max="7" class="w-full" data-test="repeat-times" />
      </template>

      <label class="mt-2 block text-sm">{{ t('plan_time_label') }}</label>
      <input v-model="time" type="time" class="plan-time" data-test="repeat-time" />

      <p v-if="problem" class="mt-2 text-sm" style="color: var(--danger)" data-test="repeat-error">{{ problem }}</p>

      <div class="modal-actions">
        <button type="button" class="secondary" data-test="repeat-close" @click="emit('close')">{{ t('cancel') }}</button>
        <button v-if="editingId" type="button" class="secondary" data-test="repeat-edit-cancel" @click="resetForm">{{ t('dash_repeat_edit_cancel') }}</button>
        <button type="button" data-test="repeat-add" :disabled="saving" @click="submit">{{ editingId ? t('dash_repeat_save_btn') : t('dash_repeat_add_btn') }}</button>
      </div>
    </div>
  </div>
</template>
