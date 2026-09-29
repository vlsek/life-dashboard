<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import Icon from './Icon.vue'
import PlannedAddGoalModal from './PlannedAddGoalModal.vue'
import PlannedCarryOverModal from './PlannedCarryOverModal.vue'
import { usePlanned } from '../lib/usePlanned'
import { goalRowKind, stageLabel, type CarryCandidate, type PlanGoal, type PlannedEntry } from '../lib/planned'
import { todayStr } from '../lib/date'
import { t } from '../lib/i18n'
import { notifyPermission, requestNotifyPermission, type NotifyPermission } from '../lib/browserNotify'

// Блок «Планы» (раньше «Цели на сегодня»): план на день (пункты из целей и свои), звёздочка «доп. пункт»,
// перенос незавершённого за 7 дней. `date` — день плана (по умолчанию сегодня): когда карточка дня
// появится в пилоте, этот компонент встраивается в неё с той же датой, что и дневные метрики.
// Кнопка переноса — только для сегодняшнего дня, как в оригинале.
const props = defineProps<{ userId: string | null; date?: string }>()
const day = computed(() => props.date ?? todayStr())
const { planned, goals, loaded, error, load, addCustomItem, addGoalItem, removeItem, toggleItemBonus, setItemDone, setItemTime, setGoalDone, loadCarryOver, carryOver, availableGoals } = usePlanned()

watch(
  [() => props.userId, day],
  ([uid, d]) => {
    if (uid) load(uid, d)
  },
  { immediate: true },
)

const newText = ref('')
const newTime = ref('')
const perm = ref<NotifyPermission>(notifyPermission())
async function enableNotifications() {
  perm.value = await requestNotifyPermission()
}
const onTimeChange = (i: number, e: Event) => setItemTime(i, (e.target as HTMLInputElement).value || null)
const notice = ref<string | null>(null)
const goalPicker = ref<PlanGoal[] | null>(null)
const carryCandidates = ref<CarryCandidate[] | null>(null)

const goalOf = (item: PlannedEntry) => goals.value.find((g) => g.name === item.text)

async function addCustom() {
  const text = newText.value
  if (!text.trim()) return
  const time = newTime.value || null
  newText.value = ''
  newTime.value = ''
  await addCustomItem(text, time)
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
  await addGoalItem(name)
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

async function addCarried(texts: string[]) {
  carryCandidates.value = null
  if (texts.length) await carryOver(texts)
}
</script>

<template>
  <section v-if="loaded" class="mb-5" data-test="planned">
    <h2 class="mb-2 text-lg font-semibold">{{ t('dash_planned_h2') }}</h2>
    <div class="card">
    <p class="dim mb-2.5 text-xs">{{ t('dash_planned_bonus_hint') }}</p>

    <p v-if="planned.length === 0" class="dim">{{ t('dash_planned_empty') }}</p>
    <table v-else>
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
                <input v-if="goalRowKind(goalOf(item)) === 'single'" type="checkbox" :checked="!!goalOf(item)!.done" data-test="goal-check" @change="setGoalDone(goalOf(item)!, ($event.target as HTMLInputElement).checked, todayStr())" />
                <span v-else class="dim">{{ stageLabel(goalOf(item)!) }}</span>
              </td>
              <td :class="{ 'line-through opacity-60': goalOf(item)!.done }">{{ item.text }}</td>
              <td>
                <button type="button" class="secondary px-2 py-0.5" :title="t('dash_planned_bonus_toggle_title')" data-test="bonus" @click="toggleItemBonus(i)">
                  <Icon name="star" :extra-style="item.bonus ? 'color:#e0a93b; fill:#e0a93b;' : 'opacity:0.55;'" />
                </button>
              </td>
            </template>
          </template>
          <template v-else>
            <td><input type="checkbox" :checked="!!item.done" data-test="custom-check" @change="setItemDone(i, ($event.target as HTMLInputElement).checked)" /></td>
            <td :class="{ 'line-through opacity-60': item.done }">{{ item.text }}</td>
            <td>
              <button type="button" class="secondary px-2 py-0.5" :title="t('dash_planned_bonus_toggle_title')" data-test="bonus" @click="toggleItemBonus(i)">
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

    <div class="mt-2 flex flex-wrap gap-2">
      <input v-model="newText" type="text" class="min-w-40 flex-1" :placeholder="t('dash_planned_custom_placeholder')" data-test="custom-input" @keydown.enter.prevent="addCustom" />
      <input v-model="newTime" type="time" class="plan-time" :title="t('plan_time_label')" data-test="new-time" />
      <button type="button" class="secondary" data-test="add-custom" @click="addCustom">{{ t('add_btn') }}</button>
      <button type="button" data-test="add-goal" @click="openGoalPicker">{{ t('dash_planned_add_from_goals_btn') }}</button>
    </div>

    <button v-if="day === todayStr()" type="button" class="secondary mt-2" data-test="carry" @click="openCarryOver">{{ t('dash_planned_carry_over_btn') }}</button>

    <div v-if="perm !== 'unsupported' && perm !== 'granted'" class="mt-2 text-sm" data-test="notify">
      <button v-if="perm === 'default'" type="button" class="secondary" data-test="notify-enable" @click="enableNotifications">{{ t('plan_notify_enable_btn') }}</button>
      <p class="dim mt-1 text-xs">{{ perm === 'denied' ? t('plan_notify_denied') : t('plan_notify_hint') }}</p>
    </div>

    <p v-if="notice" class="dim mt-2 text-sm" data-test="notice">{{ notice }}</p>
    <p v-if="error" class="mt-2 text-sm" style="color: var(--danger)" data-test="error">{{ error }}</p>
    </div>
  </section>

  <PlannedAddGoalModal v-if="goalPicker" :goals="goalPicker" @close="goalPicker = null" @pick="pickGoal" />
  <PlannedCarryOverModal v-if="carryCandidates" :candidates="carryCandidates" @close="carryCandidates = null" @add="addCarried" />
</template>

<style scoped>
.plan-time {
  width: 7.5rem;
}
</style>
