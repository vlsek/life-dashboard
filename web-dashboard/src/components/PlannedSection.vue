<script setup lang="ts">
import { plannedSummary } from '../lib/collapseSummaries'
import EmojiText from './EmojiText.vue'
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import Icon from './Icon.vue'
import SectionHeading from './SectionHeading.vue'
import DateStepper from './DateStepper.vue'
import SavedTick from './SavedTick.vue'
import { vCollapse } from '../lib/collapseMotion'
import PlannedAddGoalModal from './PlannedAddGoalModal.vue'
import PlannedCarryOverModal from './PlannedCarryOverModal.vue'
import PlanTemplatesModal from './PlanTemplatesModal.vue'
import PlanWrapUpModal from './PlanWrapUpModal.vue'
import PlannedNewGoalModal from './PlannedNewGoalModal.vue'
import PlannedRepeatsModal from './PlannedRepeatsModal.vue'
import { ensureCategory, hasHorizonColumn, hasWeightColumn, loadBodyWeight, loadMyCategories, type GoalFormInput } from '../lib/newGoal'
import { usePlanned } from '../lib/usePlanned'
import { PLAN_MARK, PLAN_REQUEST, planSnapshotOf, publishPlanSnapshot, type PlanMarkDetail } from '../lib/planBridge'
import { canPostpone, postponeCandidates } from '../lib/planPostpone'
import { useRowSwipe } from '../lib/useRowSwipe'
import { usePlanRepeats } from '../lib/usePlanRepeats'
import { usePlanTemplates } from '../lib/usePlanTemplates'
import { itemsFromPlan, type PlanTemplate } from '../lib/planTemplates'
import { doneOnDay, goalRowKind, stageLabel, type CarryCandidate, type PlanGoal, type PlannedEntry } from '../lib/planned'
import { todayStr } from '../lib/date'
import { t } from '../lib/i18n'
import { notifyPermission, requestNotifyPermission, type NotifyPermission } from '../lib/browserNotify'
import { stripEmoji } from '../lib/emojiText'

// Блок «Планы» (раньше «Цели на сегодня»): план на день (пункты из целей и свои), звёздочка «доп. пункт»,
// перенос незавершённого за 7 дней. `date` — день плана (по умолчанию сегодня): когда карточка дня
// появится в пилоте, этот компонент встраивается в неё с той же датой, что и дневные метрики.
// Кнопка переноса — только для сегодняшнего дня, как в оригинале.
// BACKLOG 07:51: в шапке блока своя «переключалка дня» (DateStepper), как у «Дневных метрик». Дата общая с родителем
// (v-model:date): листаем здесь или там — меняются оба блока. Без родителя (нет слушателя) листание не показываем.
const props = defineProps<{ userId: string | null; date?: string; switchable?: boolean }>()
const emit = defineEmits<{ 'update:date': [value: string] }>()
const day = computed(() => props.date ?? todayStr())
const { planned, goals, loaded, loadedDate, error, postponeItem, postponeMany, applyTemplateItems, savedTick, load, addCustomItem, addGoalItem, createGoalInPlan, removeItem, toggleItemBonus, setItemDone, editItem, setItemTime, setGoalDone, loadCarryOver, carryOver, availableGoals, monthGoals: monthGoalsOf } = usePlanned()

// Мост со списком «Осталось на сегодня» (BACKLOG 75.2, срез 2): публикуем снимок своих невыполненных пунктов и принимаем просьбу отметить.
// Пишет в план только этот блок, поэтому второй копии состояния и гонки записей нет. Дату берём из loadedDate (а не из props): при листании
// до ответа базы в `planned` ещё прошлый день.
function publishSnapshot() {
  if (loadedDate.value) publishPlanSnapshot(planSnapshotOf(loadedDate.value, planned.value, goals.value))
}
watch([planned, goals, loadedDate], publishSnapshot)
function onPlanMark(e: Event) {
  const d = (e as CustomEvent<PlanMarkDetail>).detail
  const it = d && d.date === loadedDate.value ? planned.value[d.index] : undefined
  if (!it || it.text !== d.text) return // пункт уже изменился — не отмечаем чужой
  if (d.goal) {
    // одноэтапная цель, ещё не выполненная: тот же путь, что у чекбокса в строке плана
    const g = it.type === 'goal' ? goalOf(it) : undefined
    if (!g || goalRowKind(g) !== 'single' || g.done) return
    d.handled = true
    void setGoalDone(g, true, loadedDate.value)
    return
  }
  if (it.type === 'goal' || it.done) return
  d.handled = true
  void setItemDone(d.index, true)
}
onMounted(() => {
  window.addEventListener(PLAN_REQUEST, publishSnapshot)
  window.addEventListener(PLAN_MARK, onPlanMark)
  publishSnapshot()
})
onBeforeUnmount(() => {
  window.removeEventListener(PLAN_REQUEST, publishSnapshot)
  window.removeEventListener(PLAN_MARK, onPlanMark)
})

// Свайп по строке плана (BACKLOG 75.9, срез 2): вправо — выполнить, влево — перенести на завтра. Жест — ускоритель: у строки есть ✓ и кнопка «на завтра».
// Только свои невыполненные пункты (пункт-цель и повторяющийся не двигаем — см. planPostpone.ts).
async function postpone(i: number) {
  const ok = await postponeItem(i)
  if (ok) notice.value = t('plan_postponed')
}
const swipe = useRowSwipe({
  canRight: (i) => planned.value[i]?.type !== 'goal' && !planned.value[i]?.done,
  canLeft: (i) => canPostpone(planned.value[i]),
  onRight: (i) => void setItemDone(i, true),
  onLeft: (i) => void postpone(i),
})
onBeforeUnmount(() => swipe.cancel())

// Вечерний шаг (BACKLOG 75.12, срез 2): окно «что перенести на завтра» — только по кнопке, без всплывающих напоминаний.
const wrapUpOpen = ref(false)
const wrapUpError = ref('')
const wrapUpBusy = ref(false)
const wrapUpItems = computed(() => postponeCandidates(planned.value))
async function wrapUpMove(indices: number[]) {
  if (wrapUpBusy.value) return
  wrapUpBusy.value = true
  wrapUpError.value = ''
  const r = await postponeMany(indices)
  wrapUpBusy.value = false
  if (!r) {
    wrapUpError.value = t('wu_err')
    return
  }
  wrapUpOpen.value = false
  notice.value = `${t('wu_moved')} ${r.moved}` + (r.alreadyThere ? ` · ${t('wu_already')} ${r.alreadyThere}` : '')
}
// Шаблоны дня (BACKLOG 75.12, миграция 115): нет таблицы — кнопка и окно просто не показываются. Список грузим один раз на пользователя
// (в отличие от повторов он не зависит от дня).
const tpl = usePlanTemplates()
const templatesOpen = ref(false)
watch(() => props.userId, (uid) => { if (uid) void tpl.load(uid) }, { immediate: true })
async function saveTemplate(name: string): Promise<'ok' | 'duplicate' | 'limit' | 'other'> {
  const items = itemsFromPlan(planned.value)
  if (!items.length || !props.userId) return 'other'
  const r = await tpl.save(props.userId, name, items)
  return r.ok ? 'ok' : r.reason
}
async function applyTpl(t0: PlanTemplate) {
  templatesOpen.value = false
  const r = await applyTemplateItems(t0.items)
  if (!r) return // запись не удалась — ошибка уже показана
  notice.value = r.added === 0 ? t('pt_applied_none') : `${t('pt_applied')} ${r.added}` + (r.skipped ? ` · ${t('pt_skipped')} ${r.skipped}` : '')
}

// Повторяющиеся пункты (BACKLOG 1054, миграция 087): нет таблицы — блок и кнопка просто не показываются
const rep = usePlanRepeats()
const repeatsOpen = ref(false)
watch(
  [() => props.userId, day],
  ([uid, d]) => {
    if (uid) {
      load(uid, d)
      void rep.load(uid, d)
    }
  },
  { immediate: true },
)

// Правка пункта, добавленного вручную (BACKLOG 61.3): открывается в строке таблицы, сохраняется целиком кнопкой «Сохранить»
const editing = ref<number | null>(null)
const editText = ref('')
const editTime = ref('')
const editDoneAt = ref('')
function startEdit(i: number) {
  const it = planned.value[i]
  editing.value = i
  editText.value = it.text
  editTime.value = it.time ?? ''
  editDoneAt.value = it.doneAt ?? ''
}
async function saveEdit() {
  const i = editing.value
  if (i === null || !editText.value.trim()) return
  editing.value = null
  await editItem(i, { text: editText.value, time: editTime.value || null, doneAt: editDoneAt.value || null })
}

const newText = ref('')
const newTime = ref('')
const newDone = ref(false)
const perm = ref<NotifyPermission>(notifyPermission())
async function enableNotifications() {
  perm.value = await requestNotifyPermission()
}
const onTimeChange = (i: number, e: Event) => setItemTime(i, (e.target as HTMLInputElement).value || null)
const notice = ref<string | null>(null)
const goalPicker = ref<PlanGoal[] | null>(null)
const carryCandidates = ref<CarryCandidate[] | null>(null)

// BACKLOG 1052: «Цели месяца» под таблицей (только сегодня); зависит от goals/planned, поэтому пересчитывается сама
const monthGoalRows = computed(() => (goals.value, planned.value, monthGoalsOf()))
// «Повторяющиеся на сегодня»: предлагаются только на сегодняшнем дне; отметка создаёт обычный выполненный пункт плана с repeat
const repeatRows = computed(() => (planned.value, rep.repeats.value, rep.weekNotes.value, day.value === todayStr() ? rep.dueOn(day.value, planned.value) : []))
// Будущий день (BACKLOG 1054 срез 2): что придётся на него по расписанию — просто список, без чекбокса (отметить можно только сегодня)
const repeatPreview = computed(() => (planned.value, rep.repeats.value, day.value > todayStr() ? rep.scheduledOn(day.value, planned.value) : []))
const doneGoals = computed(() => doneOnDay(goals.value, planned.value, day.value))
// «Карточка со сводкой» (BACKLOG 498 срез 3): «Выполнено N из M» у свёрнутого блока
const plannedSummaryText = computed(() => plannedSummary(planned.value, goals.value))
const goalOf = (item: PlannedEntry) => goals.value.find((g) => g.name === item.text)

// «Добавить» с пустым планом (BACKLOG 38, апд37): поле подсвечивается, получает фокус и слегка «встряхивается», как у незаполненного обязательного поля.
// emptyInvalid держится, пока человек не начнёт печатать; встряска короткая (≈300 мс), при «уменьшить движение» и «отключить анимации» — только подсветка.
const textInput = ref<HTMLInputElement | null>(null)
const emptyInvalid = ref(false)
const shaking = ref(false)
let shakeTimer: ReturnType<typeof setTimeout> | undefined
async function flagEmptyPlan() {
  emptyInvalid.value = true
  shaking.value = false
  await nextTick()
  textInput.value?.focus()
  void textInput.value?.offsetWidth // перезапуск анимации при повторном нажатии
  shaking.value = true
  clearTimeout(shakeTimer)
  shakeTimer = setTimeout(() => (shaking.value = false), 350)
}

async function addCustom() {
  const text = newText.value
  if (!text.trim()) {
    await flagEmptyPlan()
    return
  }
  emptyInvalid.value = false
  const time = newTime.value || null
  const done = newDone.value
  newText.value = ''
  newTime.value = ''
  newDone.value = false
  await addCustomItem(text, time, done)
}

function openGoalPicker() {
  const options = availableGoals()
  if (options.length === 0) {
    notice.value = t('dash_planned_no_goals_toast')
    return
  }
  notice.value = null
  goalPicker.value = options
}

async function pickGoal(name: string) {
  goalPicker.value = null
  // Время из поля рядом с «Добавить» распространяется и на цель из списка (раньше терялось: BACKLOG 14, 11:08).
  const time = newTime.value || null
  newTime.value = ''
  await addGoalItem(name, time)
}

// «Новая цель» (BACKLOG раздел 38): то же окно, что в «Целях» (название, баллы, категория, этапы, сложность, дедлайн). Цель создаётся в «Целях»
// и сразу встаёт в план открытого дня; время из поля рядом с «Добавить» уходит в пункт плана (как у цели из списка).
const newGoalOpen = ref(false)
const weightColumn = ref(false) // есть ли колонки цели на вес (миграция 085): без них в окне нет выбора «Сбросить/Набрать вес»
const bodyWeight = ref<number | null>(null) // последний вес тела — старт цели на вес по умолчанию
const horizonColumn = ref(false) // есть ли колонка горизонта (миграция 084): без неё в окне только «Сейчас» и «В конкретный день»
const myCategories = ref<string[]>([])
let storedCategories: string[] = []
const noCategoryLabels = () => ['Без категории', 'No category', t('goals_no_category')]
async function openNewGoal() {
  notice.value = null
  if (props.userId) {
    const found = await loadMyCategories(props.userId, noCategoryLabels())
    myCategories.value = found.list
    storedCategories = found.stored
  }
  horizonColumn.value = await hasHorizonColumn()
  weightColumn.value = await hasWeightColumn()
  bodyWeight.value = weightColumn.value && props.userId ? await loadBodyWeight(props.userId) : null
  newGoalOpen.value = true
}
async function submitNewGoal(res: GoalFormInput) {
  const time = newTime.value || null
  await createGoalInPlan(res, t('goals_no_category'), time) // ошибка записи цели летит в окно
  newTime.value = ''
  newGoalOpen.value = false
  if (props.userId) void ensureCategory(props.userId, res.category ?? '', storedCategories, noCategoryLabels()) // новая категория запоминается; сбой цель не задевает
}

async function openCarryOver() {
  const found = await loadCarryOver()
  if (found.length === 0) {
    notice.value = t('dash_planned_carry_over_empty')
    return
  }
  notice.value = null
  carryCandidates.value = found
}

async function addCarried(items: { text: string; time?: string }[]) {
  carryCandidates.value = null
  if (items.length) await carryOver(items)
}
const collapsed = ref(false)
</script>

<template>
  <section v-if="loaded" class="mb-5" data-test="planned">
    <SectionHeading v-model:collapsed="collapsed" :title="t('dash_planned_h2')" storage-key="planned" :summary="plannedSummaryText" />
    <div v-collapse="!collapsed" class="card relative">
    <SavedTick :show="savedTick" />
    <DateStepper v-if="switchable" :model-value="day" @update:model-value="emit('update:date', $event)" />
    <p v-if="planned.length === 0" class="dim">{{ t('dash_planned_empty') }}</p>
    <div v-else class="table-scroll overflow-x-auto" data-test="table-scroll">
      <table>
        <tbody>
          <tr
            v-for="(item, i) in planned"
            :key="i + item.text"
            class="plan-row"
            :class="{ 'swipe-right': swipe.hintFor(i) === 'right', 'swipe-left': swipe.hintFor(i) === 'left' }"
            :style="swipe.styleFor(i)"
            v-bind="swipe.bind(i)"
            data-test="item"
          >
            <template v-if="item.type === 'goal'">
              <template v-if="goalRowKind(goalOf(item)) === 'missing'">
                <td style="color: #e0a93b"><Icon name="alert" /></td>
                <td>{{ item.text }}{{ t('dash_goal_deleted_suffix') }}</td>
                <td></td>
              </template>
              <template v-else>
                <td>
                  <input v-if="goalRowKind(goalOf(item)) === 'single'" type="checkbox" :checked="!!goalOf(item)!.done" data-test="goal-check" @change="setGoalDone(goalOf(item)!, ($event.target as HTMLInputElement).checked, day)" />
                  <span v-else class="dim">{{ stageLabel(goalOf(item)!) }}</span>
                </td>
                <td :class="{ 'line-through opacity-60': goalOf(item)!.done }">{{ item.text }}<span v-if="goalOf(item)!.done && item.doneAt" class="dim ml-2 text-xs" :title="t('plan_done_at_title')" data-test="done-at">✓ {{ item.doneAt }}</span></td>
                <td>
                  <button type="button" class="secondary px-2 py-0.5" :title="stripEmoji(t('dash_planned_bonus_toggle_title'))" data-test="bonus" @click="toggleItemBonus(i)">
                    <Icon name="star" :extra-style="item.bonus ? 'color:#e0a93b; fill:#e0a93b;' : 'opacity:0.55;'" />
                  </button>
                </td>
              </template>
            </template>
            <template v-else>
              <td><input type="checkbox" :checked="!!item.done" data-test="custom-check" @change="setItemDone(i, ($event.target as HTMLInputElement).checked)" /></td>
              <td v-if="editing === i" colspan="2" data-test="edit-row">
                <div class="flex flex-wrap items-center gap-2">
                  <input v-model="editText" type="text" class="min-w-40 flex-1" :aria-label="t('plan_edit_text')" data-test="edit-text" @keydown.enter.prevent="saveEdit" @keydown.esc.prevent="editing = null" />
                  <input v-model="editTime" type="time" class="plan-time" :title="t('plan_time_label')" data-test="edit-time" />
                  <label v-if="item.done" class="inline-flex items-center gap-1 text-xs dim">{{ t('plan_edit_done_at') }}<input v-model="editDoneAt" type="time" class="plan-time" data-test="edit-done-at" /></label>
                  <button type="button" class="secondary px-2 py-0.5" :disabled="!editText.trim()" data-test="edit-save" @click="saveEdit">{{ t('plan_edit_save') }}</button>
                  <button type="button" class="secondary px-2 py-0.5" data-test="edit-cancel" @click="editing = null">{{ t('plan_edit_cancel') }}</button>
                </div>
              </td>
              <template v-else>
                <td :class="{ 'line-through opacity-60': item.done }">{{ item.text }}<span v-if="item.done && item.doneAt" class="dim ml-2 text-xs no-underline" :title="t('plan_done_at_title')" data-test="done-at">✓ {{ item.doneAt }}</span></td>
                <td class="whitespace-nowrap">
                  <button type="button" class="secondary px-2 py-0.5" :title="t('plan_edit_title')" :aria-label="t('plan_edit_title')" data-test="edit" @click="startEdit(i)"><Icon name="edit" /></button>
                  <button type="button" class="secondary px-2 py-0.5" :title="stripEmoji(t('dash_planned_bonus_toggle_title'))" data-test="bonus" @click="toggleItemBonus(i)">
                    <Icon name="star" :extra-style="item.bonus ? 'color:#e0a93b; fill:#e0a93b;' : 'opacity:0.55;'" />
                  </button>
                  <button v-if="canPostpone(item)" type="button" class="secondary px-2 py-0.5" :title="t('plan_postpone_title')" :aria-label="t('plan_postpone_title')" data-test="postpone" @click="postpone(i)"><Icon name="chevron_right" /></button>
                </td>
              </template>
            </template>
            <td>
              <input
                v-if="!(item.type === 'goal' && goalRowKind(goalOf(item)) === 'missing')"
                type="time"
                class="plan-time"
                :value="item.time ?? ''"
                :title="item.time ? t('plan_time_clear') : t('plan_time_set')"
                data-test="time"
                @change="onTimeChange(i, $event)"
              />
            </td>
            <td><button type="button" class="secondary px-2 py-0.5" data-test="remove" @click="removeItem(i)"><Icon name="x" /></button></td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- BACKLOG 1078: цели, выполненные в этот день, но не стоявшие в плане, — чтобы выполненное не пропадало с главной -->
    <details v-if="doneGoals.length" class="mt-2" data-test="done-goals">
      <summary class="dim cursor-pointer text-xs">{{ t('dash_planned_done_goals_h') }} {{ doneGoals.length }}</summary>
      <ul class="m-0 mt-1 flex list-none flex-col gap-1 p-0 text-sm">
        <li v-for="g in doneGoals" :key="g.id" class="flex items-center gap-2" data-test="done-goal">
          <span style="color: var(--success)" aria-hidden="true">✓</span>
          <span class="line-through opacity-60">{{ g.name }}</span>
        </li>
      </ul>
    </details>

    <!-- BACKLOG 1052: цели с горизонтом «В ближайший месяц», которых нет в плане, — подтягиваются сами; отметка пишется в саму цель -->
    <div v-if="monthGoalRows.length" class="mt-2" data-test="month-goals">
      <p class="dim mb-1 text-xs">{{ t('dash_planned_month_goals_h') }}</p>
      <ul class="m-0 flex list-none flex-col gap-1 p-0 text-sm">
        <li v-for="g in monthGoalRows" :key="g.id" class="flex items-center gap-2" data-test="month-goal">
          <input v-if="goalRowKind(g) === 'single'" type="checkbox" :checked="!!g.done" data-test="month-goal-check" @change="setGoalDone(g, ($event.target as HTMLInputElement).checked, day)" />
          <span v-else class="dim text-xs">{{ stageLabel(g) }}</span>
          <span class="min-w-0 flex-1 break-words">{{ g.name }}</span>
        </li>
      </ul>
    </div>

    <!-- BACKLOG 1054: повторяющиеся пункты, которые сегодня «по расписанию»; отметка ставит в план обычный выполненный пункт -->
    <div v-if="repeatRows.length" class="mt-2" data-test="repeat-due">
      <p class="dim mb-1 text-xs">{{ t('dash_repeat_due_h') }}</p>
      <ul class="m-0 flex list-none flex-col gap-1 p-0 text-sm">
        <li v-for="r in repeatRows" :key="r.id" class="flex items-center gap-2" data-test="repeat-due-item">
          <input type="checkbox" :checked="false" data-test="repeat-due-check" @change="addCustomItem(r.text, r.time, true, r.id)" />
          <span class="min-w-0 flex-1 break-words">{{ r.text }}</span>
          <span v-if="r.time" class="dim text-xs">{{ r.time }}</span>
        </li>
      </ul>
    </div>

    <div v-if="repeatPreview.length" class="mt-2" data-test="repeat-preview">
      <p class="dim mb-1 text-xs">{{ t('dash_repeat_future_h') }}</p>
      <ul class="m-0 flex list-none flex-col gap-1 p-0 text-sm">
        <li v-for="r in repeatPreview" :key="r.id" class="flex items-center gap-2" data-test="repeat-preview-item">
          <span class="min-w-0 flex-1 break-words">{{ r.text }}</span>
          <span v-if="r.time" class="dim text-xs">{{ r.time }}</span>
        </li>
      </ul>
    </div>

    <div class="mt-2 flex flex-wrap gap-2" data-test="add-row">
      <input ref="textInput" v-model="newText" type="text" class="min-w-40 flex-1" :class="{ 'plan-invalid': emptyInvalid, 'plan-shake': shaking }" :aria-invalid="emptyInvalid ? 'true' : undefined" :placeholder="t('dash_planned_custom_placeholder')" data-test="custom-input" @input="emptyInvalid = false" @keydown.enter.prevent="addCustom" />
      <button type="button" class="secondary" data-test="add-custom" @click="addCustom"><EmojiText :text="t('add_btn')" /></button>
    </div>
    <div class="mt-2 flex flex-wrap gap-2" data-test="add-links">
      <button type="button" class="secondary" data-test="add-goal" @click="openGoalPicker"><EmojiText :text="t('dash_planned_add_from_goals_btn')" /></button>
      <button type="button" class="secondary" data-test="new-goal" @click="openNewGoal"><EmojiText :text="t('dash_planned_new_goal_btn')" /></button>
      <button v-if="day === todayStr()" type="button" class="secondary" data-test="carry" @click="openCarryOver"><EmojiText :text="t('dash_planned_carry_over_btn')" /></button>
    </div>

    <details class="mt-2 text-sm" data-test="plan-more">
      <summary class="dim cursor-pointer text-xs">{{ t('dash_planned_more') }}</summary>
      <div class="mt-2 flex flex-wrap items-center gap-2">
        <input v-model="newTime" type="time" class="plan-time" :title="t('plan_time_label')" data-test="new-time" />
        <label class="inline-flex items-center gap-1 text-sm" :title="t('dash_planned_done_already_title')">
          <input v-model="newDone" type="checkbox" data-test="new-done" />
          {{ t('dash_planned_done_already') }}
        </label>
      </div>
      <p class="dim mb-0 mt-2 text-xs"><EmojiText :text="t('dash_planned_bonus_hint')" /></p>
      <button v-if="rep.available.value" type="button" class="secondary mt-2" data-test="repeats-open" @click="repeatsOpen = true"><EmojiText :text="t('dash_repeat_manage_btn')" /></button>
      <button v-if="tpl.available.value" type="button" class="secondary mt-2" data-test="templates-open" @click="templatesOpen = true">{{ t('pt_btn') }}</button>
      <button v-if="wrapUpItems.length > 0" type="button" class="secondary mt-2" data-test="wrapup-open" @click="wrapUpOpen = true">{{ t('wu_btn') }}</button>

      <div v-if="perm !== 'unsupported' && perm !== 'granted'" class="mt-2 text-sm" data-test="notify">
        <button v-if="perm === 'default'" type="button" class="secondary" data-test="notify-enable" @click="enableNotifications"><EmojiText :text="t('plan_notify_enable_btn')" /></button>
        <p class="dim mt-1 text-xs">{{ perm === 'denied' ? t('plan_notify_denied') : t('plan_notify_hint') }}</p>
      </div>
    </details>

    <p v-if="notice" class="dim mt-2 text-sm" data-test="notice">{{ notice }}</p>
    <p v-if="error" class="mt-2 text-sm" style="color: var(--danger)" data-test="error">{{ error }}</p>
    </div>
  </section>

  <PlannedAddGoalModal v-if="goalPicker" :goals="goalPicker" @close="goalPicker = null" @pick="pickGoal" />
  <PlanWrapUpModal v-if="wrapUpOpen" :items="wrapUpItems" :busy="wrapUpBusy" :error="wrapUpError" @close="wrapUpOpen = false; wrapUpError = ''" @move="wrapUpMove" />
  <PlanTemplatesModal v-if="templatesOpen" :templates="tpl.templates.value" :savable-count="itemsFromPlan(planned).length" :save="saveTemplate" :remove="tpl.remove" @close="templatesOpen = false" @apply="applyTpl" />
  <PlannedRepeatsModal v-if="repeatsOpen" :repeats="rep.repeats.value" :add="(text, time, schedule) => rep.add(userId as string, text, time, schedule)" :update="rep.update" :remove="rep.remove" @close="repeatsOpen = false" />
  <PlannedNewGoalModal v-if="newGoalOpen" :categories="myCategories" :no-category-labels="noCategoryLabels()" :horizon-column="horizonColumn" :weight-column="weightColumn" :current-weight="bodyWeight" :submit="submitNewGoal" @close="newGoalOpen = false" />
  <PlannedCarryOverModal v-if="carryCandidates" :candidates="carryCandidates" @close="carryCandidates = null" @add="addCarried" />
</template>

<style scoped>
.plan-time {
  width: 7.5rem;
}
/* Пустой план при «Добавить» (BACKLOG 38): красная рамка + короткая встряска. Без движения при prefers-reduced-motion и data-motion="off" — остаётся подсветка. */
.plan-invalid {
  border-color: var(--danger, #e5484d);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--danger, #e5484d) 28%, transparent);
}
.plan-shake {
  animation: plan-shake 0.3s ease-in-out;
}
@keyframes plan-shake {
  0%, 100% { transform: translateX(0); }
  20% { transform: translateX(-5px); }
  40% { transform: translateX(5px); }
  60% { transform: translateX(-3px); }
  80% { transform: translateX(3px); }
}
@media (prefers-reduced-motion: reduce) {
  .plan-shake { animation: none; }
}
:global(html[data-motion='off']) .plan-shake {
  animation: none;
}
/* Отступ между чекбоксом и текстом плана (BACKLOG 14, 11:08): чекбокс стоит в своей ячейке таблицы. */
[data-test='item'] > td:first-child {
  width: 1%;
  padding-right: 0.75rem;
  white-space: nowrap;
}
/* Свайп по строке (75.9, срез 2): вертикальный скролл остаётся за браузером, горизонтальное движение — наше; подсказка направления — цветом фона */
.plan-row { touch-action: pan-y; transition: transform 0.15s ease; }
.plan-row.swipe-right { background: color-mix(in srgb, var(--success) 22%, transparent); }
.plan-row.swipe-left { background: color-mix(in srgb, var(--accent) 22%, transparent); }
@media (prefers-reduced-motion: reduce) { .plan-row { transition: none; } }
:global(html[data-motion='off']) .plan-row { transition: none; }
</style>
