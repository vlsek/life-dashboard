<script setup lang="ts">
import { plannedSummary } from '../lib/collapseSummaries'
import EmojiText from './EmojiText.vue'
import { computed, nextTick, ref, watch } from 'vue'
import Icon from './Icon.vue'
import SectionHeading from './SectionHeading.vue'
import DateStepper from './DateStepper.vue'
import SavedTick from './SavedTick.vue'
import { vCollapse } from '../lib/collapseMotion'
import PlannedAddGoalModal from './PlannedAddGoalModal.vue'
import PlannedCarryOverModal from './PlannedCarryOverModal.vue'
import PlannedNewGoalModal from './PlannedNewGoalModal.vue'
import { ensureCategory, loadMyCategories, type GoalFormInput } from '../lib/newGoal'
import { usePlanned } from '../lib/usePlanned'
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
const { planned, goals, loaded, error, savedTick, load, addCustomItem, addGoalItem, createGoalInPlan, removeItem, toggleItemBonus, setItemDone, setItemTime, setGoalDone, loadCarryOver, carryOver, availableGoals } = usePlanned()

watch(
  [() => props.userId, day],
  ([uid, d]) => {
    if (uid) load(uid, d)
  },
  { immediate: true },
)

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
    <SectionHeading v-model:collapsed="collapsed" :title="stripEmoji(t('dash_planned_h2'))" storage-key="planned" :summary="plannedSummaryText" />
    <div v-collapse="!collapsed" class="card relative">
    <SavedTick :show="savedTick" />
    <DateStepper v-if="switchable" :model-value="day" @update:model-value="emit('update:date', $event)" />
    <p class="dim mb-2.5 text-xs"><EmojiText :text="t('dash_planned_bonus_hint')" /></p>

    <p v-if="planned.length === 0" class="dim">{{ t('dash_planned_empty') }}</p>
    <div v-else class="table-scroll overflow-x-auto" data-test="table-scroll">
      <table>
        <tbody>
          <tr v-for="(item, i) in planned" :key="i + item.text" data-test="item">
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
                <td :class="{ 'line-through opacity-60': goalOf(item)!.done }">{{ item.text }}</td>
                <td>
                  <button type="button" class="secondary px-2 py-0.5" :title="stripEmoji(t('dash_planned_bonus_toggle_title'))" data-test="bonus" @click="toggleItemBonus(i)">
                    <Icon name="star" :extra-style="item.bonus ? 'color:#e0a93b; fill:#e0a93b;' : 'opacity:0.55;'" />
                  </button>
                </td>
              </template>
            </template>
            <template v-else>
              <td><input type="checkbox" :checked="!!item.done" data-test="custom-check" @change="setItemDone(i, ($event.target as HTMLInputElement).checked)" /></td>
              <td :class="{ 'line-through opacity-60': item.done }">{{ item.text }}</td>
              <td>
                <button type="button" class="secondary px-2 py-0.5" :title="stripEmoji(t('dash_planned_bonus_toggle_title'))" data-test="bonus" @click="toggleItemBonus(i)">
                  <Icon name="star" :extra-style="item.bonus ? 'color:#e0a93b; fill:#e0a93b;' : 'opacity:0.55;'" />
                </button>
              </td>
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
    <div v-if="doneGoals.length" class="mt-2" data-test="done-goals">
      <p class="dim mb-1 text-xs">{{ t('dash_planned_done_goals_h') }}</p>
      <ul class="m-0 flex list-none flex-col gap-1 p-0 text-sm">
        <li v-for="g in doneGoals" :key="g.id" class="flex items-center gap-2" data-test="done-goal">
          <span style="color: var(--success)" aria-hidden="true">✓</span>
          <span class="line-through opacity-60">{{ g.name }}</span>
        </li>
      </ul>
    </div>

    <div class="mt-2 flex flex-wrap gap-2">
      <input ref="textInput" v-model="newText" type="text" class="min-w-40 flex-1" :class="{ 'plan-invalid': emptyInvalid, 'plan-shake': shaking }" :aria-invalid="emptyInvalid ? 'true' : undefined" :placeholder="t('dash_planned_custom_placeholder')" data-test="custom-input" @input="emptyInvalid = false" @keydown.enter.prevent="addCustom" />
      <input v-model="newTime" type="time" class="plan-time" :title="t('plan_time_label')" data-test="new-time" />
      <label class="inline-flex items-center gap-1 text-sm" :title="t('dash_planned_done_already_title')">
        <input v-model="newDone" type="checkbox" data-test="new-done" />
        {{ t('dash_planned_done_already') }}
      </label>
      <button type="button" class="secondary" data-test="add-custom" @click="addCustom"><EmojiText :text="t('add_btn')" /></button>
      <button type="button" data-test="add-goal" @click="openGoalPicker"><EmojiText :text="t('dash_planned_add_from_goals_btn')" /></button>
      <button type="button" data-test="new-goal" @click="openNewGoal"><EmojiText :text="t('dash_planned_new_goal_btn')" /></button>
    </div>

    <button v-if="day === todayStr()" type="button" class="secondary mt-2" data-test="carry" @click="openCarryOver"><EmojiText :text="t('dash_planned_carry_over_btn')" /></button>

    <div v-if="perm !== 'unsupported' && perm !== 'granted'" class="mt-2 text-sm" data-test="notify">
      <button v-if="perm === 'default'" type="button" class="secondary" data-test="notify-enable" @click="enableNotifications"><EmojiText :text="t('plan_notify_enable_btn')" /></button>
      <p class="dim mt-1 text-xs">{{ perm === 'denied' ? t('plan_notify_denied') : t('plan_notify_hint') }}</p>
    </div>

    <p v-if="notice" class="dim mt-2 text-sm" data-test="notice">{{ notice }}</p>
    <p v-if="error" class="mt-2 text-sm" style="color: var(--danger)" data-test="error">{{ error }}</p>
    </div>
  </section>

  <PlannedAddGoalModal v-if="goalPicker" :goals="goalPicker" @close="goalPicker = null" @pick="pickGoal" />
  <PlannedNewGoalModal v-if="newGoalOpen" :categories="myCategories" :no-category-labels="noCategoryLabels()" :submit="submitNewGoal" @close="newGoalOpen = false" />
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
</style>
