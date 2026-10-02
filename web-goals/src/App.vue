<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import AppShell from './components/AppShell.vue'
import GoalCard from './components/GoalCard.vue'
import GoalForm from './components/GoalForm.vue'
import Icon from './components/Icon.vue'
import PointsFloat from './components/PointsFloat.vue'
import { useGoals } from './lib/useGoals'
import { groupActiveByCategory, sortDone, pointsSummary } from './lib/goals'
import { t } from './lib/i18n'
import type { Goal, GoalFormInput } from './lib/types'
import EmojiText from './components/EmojiText.vue'

const { auth, items, error, init, addGoal, updateGoal, deleteGoal, toggleGoal, setStage } = useGoals()
onMounted(init)

const noCategory = computed(() => t('goals_no_category'))
const active = computed(() => items.value.filter((g) => !g.done))
const done = computed(() => sortDone(items.value.filter((g) => g.done)))
const grouped = computed(() => groupActiveByCategory(active.value, noCategory.value))
const summary = computed(() => pointsSummary(items.value))

function fmtRu(iso: string | null): string {
  if (!iso) return ''
  const [y, m, d] = iso.split('-')
  return `${d}.${m}.${y}`
}

// Форма добавления/редактирования
const formTarget = ref<Goal | 'new' | null>(null)
const formInitial = computed<GoalFormInput>(() => {
  const g = formTarget.value
  if (g && g !== 'new') {
    return { name: g.name, points: g.points ?? 5, category: g.category, stages: g.stages ?? 1, difficulty: g.difficulty, deadline: g.deadline ?? '' }
  }
  return { name: '', points: 5, category: '', stages: 1, difficulty: null, deadline: '' }
})
async function onSaveForm(res: GoalFormInput) {
  const target = formTarget.value
  if (target === 'new') await addGoal((auth.value as { userId: string }).userId, res, noCategory.value)
  else if (target) await updateGoal(target, res, noCategory.value)
  formTarget.value = null
}

async function onDelete(g: Goal) {
  if (!confirm(t('goals_confirm_delete'))) return
  await deleteGoal(g.id)
}
</script>

<template>
  <AppShell :user-email="auth.status === 'ready' ? auth.userEmail : null" />
  <PointsFloat />

  <main class="mx-auto max-w-3xl px-4 pb-16 pt-4">
    <div class="mb-4 flex items-center justify-between">
      <h1 class="text-xl font-semibold"><EmojiText :text="t('goals_h1')" /></h1>
      <button class="rounded-lg px-3 py-1.5 text-sm" @click="formTarget = 'new'"><EmojiText :text="t('goals_add_btn')" /></button>
    </div>

    <p v-if="auth.status === 'loading'" class="dim">…</p>

    <template v-else-if="auth.status === 'ready'">
      <p v-if="error" class="dim">{{ t('comm_load_error') }} {{ error }}</p>

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
            class="flex items-center gap-2 rounded-xl border px-3 py-2"
            style="border-color: var(--border); background: var(--bg-card)"
            data-test="goal-done-row"
          >
            <span class="goal-done-mark" aria-hidden="true"><Icon name="check" /></span>
            <span class="done-text min-w-0 flex-1 break-words">{{ g.name }}</span>
            <span class="dim whitespace-nowrap text-xs">{{ fmtRu(g.done_date) }}</span>
            <button type="button" class="secondary icon-btn" :title="t('goals_edit_aria')" :aria-label="t('goals_edit_aria')" @click="formTarget = g"><Icon name="edit" /></button>
            <button type="button" class="danger icon-btn" :title="t('goals_delete_aria')" :aria-label="t('goals_delete_aria')" @click="onDelete(g)"><Icon name="trash" /></button>
          </li>
        </ul>
      </template>
    </template>

    <GoalForm v-if="formTarget" :is-edit="formTarget !== 'new'" :initial="formInitial" @close="formTarget = null" @save="onSaveForm" />
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
