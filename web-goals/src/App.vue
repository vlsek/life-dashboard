<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import AppShell from './components/AppShell.vue'
import GoalCard from './components/GoalCard.vue'
import GoalForm from './components/GoalForm.vue'
import SavedTick from './components/SavedTick.vue'
import Icon from './components/Icon.vue'
import PointsFloat from './components/PointsFloat.vue'
import GoalInvites from './components/GoalInvites.vue'
import { useGoalInvites, incomingPending, outgoingNotices } from './lib/goalInvites'
import { limitChoices, loadInviteLimit, saveInviteLimit } from './lib/inviteLimit'
import { useGoals } from './lib/useGoals'
import { groupActiveByCategory, sortDone, pointsSummary } from './lib/goals'
import { mergeCategories, savedCategories } from './lib/categories'
import { useGoalCategories } from './lib/useGoalCategories'
import { t } from './lib/i18n'
import type { Goal, GoalFormInitial, GoalFormInput } from './lib/types'
import EmojiText from './components/EmojiText.vue'
import { confirmDialog } from './lib/confirmDialog'
import { friendlyError } from './lib/friendlyError'
import { isDeadlineReminderEnabled, setDeadlineReminderEnabled } from './lib/deadlineReminderSetting'

const { auth, items, error, flashed, init, reload, addGoal, updateGoal, deleteGoal, toggleGoal, stepGoal, setStage } = useGoals()
onMounted(init)

// Предложения целей и задач от друзей (миграция 063): грузим, когда вход выполнен; принятая цель сразу появляется в списке.
const invites = useGoalInvites(reload)
const incomingInvites = computed(() => incomingPending(invites.rows.value))
const inviteNotices = computed(() => outgoingNotices(invites.rows.value))
// Настройка «сколько предложений в день принимаю» (profiles.goal_invites_per_day, миграция 063): нет колонки — не показываем.
const inviteLimit = ref<number | null>(null)
const inviteLimitError = ref(false)
const inviteLimitOptions = computed(() => (inviteLimit.value === null ? [] : limitChoices(inviteLimit.value)))
async function onInviteLimitChange(e: Event) {
  const next = Number((e.target as HTMLSelectElement).value)
  const prev = inviteLimit.value
  if (auth.value.status !== 'ready' || prev === null) return
  inviteLimit.value = next
  inviteLimitError.value = false
  if (!(await saveInviteLimit(auth.value.userId, next))) {
    inviteLimit.value = prev
    inviteLimitError.value = true
  }
}
watch(
  () => auth.value.status,
  async (st) => {
    if (st !== 'ready') return
    void invites.load()
    const r = await loadInviteLimit((auth.value as { userId: string }).userId)
    inviteLimit.value = r.status === 'ok' ? r.value : null
  },
  { immediate: true },
)

function undoDone(g: Goal) {
  return (g.stages ?? 1) > 1 ? stepGoal(g, -1) : toggleGoal(g)
}

const noCategory = computed(() => t('goals_no_category'))
const active = computed(() => items.value.filter((g) => !g.done))
const done = computed(() => sortDone(items.value.filter((g) => g.done)))
const grouped = computed(() => groupActiveByCategory(active.value, noCategory.value))
// Свои категории для выбора в форме цели (BACKLOG раздел 35): из ВСЕХ целей, в том числе выполненных; «Без категории» на обоих языках не в счёт.
const noCategoryLabels = ['Без категории', 'No category', noCategory.value]
// + сохранённый список из таблицы goal_categories (миграция 050): категория не пропадает, когда последнюю цель с ней удалили.
const goalCats = useGoalCategories()
watch(
  () => auth.value.status,
  (st) => {
    if (st === 'ready') void goalCats.load((auth.value as { userId: string }).userId)
  },
  { immediate: true },
)
const myCategories = computed(() => mergeCategories(savedCategories(items.value, noCategoryLabels), goalCats.saved.value, noCategoryLabels))
const summary = computed(() => pointsSummary(items.value))
const remindEnabled = ref(isDeadlineReminderEnabled())
function onRemindToggle(e: Event) {
  remindEnabled.value = (e.target as HTMLInputElement).checked
  setDeadlineReminderEnabled(remindEnabled.value)
}
const loadError = computed(() => (error.value ? friendlyError({ message: error.value }) : ''))

function fmtRu(iso: string | null): string {
  if (!iso) return ''
  const [y, m, d] = iso.split('-')
  return `${d}.${m}.${y}`
}

// Форма добавления/редактирования
const formTarget = ref<Goal | 'new' | null>(null)
const formInitial = computed<GoalFormInitial>(() => {
  const g = formTarget.value
  if (g && g !== 'new') {
    return { name: g.name, points: g.points ?? 5, category: g.category, stages: g.stages ?? 1, difficulty: g.difficulty, deadline: g.deadline ?? '' }
  }
  return { name: '', points: 5, category: '', stages: 1, difficulty: null, deadline: '' }
})
// Ошибка записи НЕ глотается здесь: она летит в GoalForm, который покажет понятный текст и оставит форму открытой.
async function onSaveForm(res: GoalFormInput) {
  const target = formTarget.value
  if (target === 'new') await addGoal((auth.value as { userId: string }).userId, res, noCategory.value)
  else if (target) await updateGoal(target, res, noCategory.value)
  void goalCats.ensure(res.category ?? '', noCategoryLabels) // новая категория запоминается в списке; сбой записи цель не задевает
  formTarget.value = null
}

async function onDelete(g: Goal) {
  if (!(await confirmDialog(t('goals_confirm_delete')))) return
  await deleteGoal(g.id)
}
</script>

<template>
  <AppShell :user-email="auth.status === 'ready' ? auth.userEmail : null" />
  <PointsFloat />

  <main class="mx-auto max-w-3xl px-4 pb-16 pt-4">
    <div class="mb-4 flex items-center justify-between">
      <h1 class="text-xl font-semibold"><EmojiText :text="t('goals_h1')" /></h1>
      <button class="rounded-lg px-3 py-1.5 text-sm" data-test="goal-add" @click="formTarget = 'new'"><EmojiText :text="t('goals_add_btn')" /></button>
    </div>

    <label class="dim mb-3 flex items-center gap-2 text-xs" data-test="deadline-remind">
      <input type="checkbox" :checked="remindEnabled" data-test="deadline-remind-toggle" @change="onRemindToggle" />
      {{ t('goals_deadline_remind') }}
    </label>

    <div v-if="inviteLimit !== null" class="mb-3" data-test="invite-limit">
      <label class="dim flex flex-wrap items-center gap-2 text-xs">
        {{ t('inv_limit_label') }}
        <select :value="inviteLimit" data-test="invite-limit-select" @change="onInviteLimitChange">
          <option v-for="n in inviteLimitOptions" :key="n" :value="n">{{ n === 0 ? t('inv_limit_none') : n }}</option>
        </select>
      </label>
      <p class="dim m-0 mt-1 text-xs">{{ t('inv_limit_hint') }}</p>
      <p v-if="inviteLimitError" class="m-0 mt-1 text-xs" style="color: var(--danger, #e5484d)" role="alert" data-test="invite-limit-error">{{ t('inv_limit_error') }}</p>
    </div>

    <p v-if="auth.status === 'loading'" class="dim">…</p>

    <template v-else-if="auth.status === 'ready'">
      <p v-if="error" class="dim">{{ t('comm_load_error') }} {{ loadError }}</p>

      <GoalInvites
        v-if="invites.available.value"
        :incoming="incomingInvites"
        :notices="inviteNotices"
        :busy-id="invites.busyId.value"
        :error="invites.actionError.value"
        @accept="invites.respond($event, true)"
        @decline="invites.respond($event, false)"
        @dismiss="invites.dismiss($event)"
      />

      <template v-else>
        <p v-if="active.length === 0" class="dim">{{ t('goals_no_active') }}</p>

        <div v-for="[cat, list] in grouped" :key="cat" class="mb-5">
          <h3 class="mb-2 flex items-center gap-2 text-base font-medium">
            {{ cat }}
            <span class="dim text-xs font-normal">{{ list.length }}</span>
          </h3>
          <div class="flex flex-col gap-2">
            <GoalCard
              v-for="g in list"
              :key="g.id"
              :goal="g"
              :saved="!!flashed[g.id]"
              @toggle="toggleGoal(g)"
              @stage="setStage(g, $event)"
              @edit="formTarget = g"
              @delete="onDelete(g)"
            />
          </div>
        </div>

        <p class="dim text-sm">{{ t('goals_points_earned') }} {{ summary.earned }} / {{ summary.possible }}</p>

        <h3 class="mb-2 mt-6 text-base font-medium"><EmojiText :text="t('goals_done_h2')" /></h3>
        <p v-if="done.length === 0" class="dim">{{ t('goals_no_done') }}</p>
        <ul v-else class="m-0 flex list-none flex-col gap-1.5 p-0" data-test="goals-done">
          <li
            v-for="g in done"
            :key="g.id"
            class="relative flex items-center gap-2 rounded-xl border px-3 py-2"
            style="border-color: var(--border); background: var(--bg-card)"
            data-test="goal-done-row"
          >
            <SavedTick :show="!!flashed[g.id]" />
            <!-- Галочка выполненной цели — кнопка «снять отметку» (случайный тап по цели можно отменить): простая цель возвращается в активные,
                 многоэтапная откатывается на один этап назад (иначе осталась бы «выполненной» с полным прогрессом). -->
            <button
              type="button"
              role="checkbox"
              aria-checked="true"
              class="goal-done-mark goal-done-undo"
              :title="t('goals_undo_done_aria')"
              :aria-label="t('goals_undo_done_aria')"
              data-test="goal-undo"
              @click="undoDone(g)"
            >
              <Icon name="check" />
            </button>
            <span class="done-text min-w-0 flex-1 break-words">{{ g.name }}</span>
            <span class="dim whitespace-nowrap text-xs">{{ fmtRu(g.done_date) }}</span>
            <button type="button" class="secondary icon-btn" :title="t('goals_edit_aria')" :aria-label="t('goals_edit_aria')" @click="formTarget = g"><Icon name="edit" /></button>
            <button type="button" class="danger icon-btn" :title="t('goals_delete_aria')" :aria-label="t('goals_delete_aria')" @click="onDelete(g)"><Icon name="trash" /></button>
          </li>
        </ul>
      </template>
    </template>

    <GoalForm v-if="formTarget" :is-edit="formTarget !== 'new'" :initial="formInitial" :categories="myCategories" :no-category-labels="noCategoryLabels" :submit="onSaveForm" @close="formTarget = null" />
  </main>
</template>

<style scoped>
.icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  padding: 0;
  border-radius: 0.5rem;
  background: transparent;
}
.goal-done-undo {
  padding: 0;
  border: 0;
  cursor: pointer;
  transition: opacity 0.15s ease;
}
.goal-done-undo:hover {
  opacity: 0.7;
}
.goal-done-mark {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.35rem;
  height: 1.35rem;
  border-radius: 9999px;
  background: var(--accent);
  color: var(--accent-text);
  flex-shrink: 0;
}
</style>
