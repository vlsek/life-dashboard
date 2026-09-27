<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import AppShell from './components/AppShell.vue'
import GoalForm from './components/GoalForm.vue'
import { useGoals } from './lib/useGoals'
import { bar, deadlineLevel, groupActiveByCategory, sortDone, pointsSummary } from './lib/goals'
import { t } from './lib/i18n'
import type { Goal, GoalFormInput } from './lib/types'

const { auth, items, error, init, addGoal, updateGoal, deleteGoal, toggleGoal, stepGoal } = useGoals()
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

const diffColor: Record<string, string> = { easy: '#3fa66b', medium: '#e0a93b', hard: '#d6336c' }
function diffChip(g: Goal): { text: string; color: string } | null {
  if (!g.difficulty) return null
  return { text: t(`goals_diff_${g.difficulty}` as 'goals_diff_easy'), color: diffColor[g.difficulty] || 'var(--text-dim)' }
}
function deadlineChip(g: Goal): { text: string; color: string } | null {
  if (!g.deadline || g.done) return null
  const { level, days } = deadlineLevel(g.deadline)
  if (level === null || days === null) return null
  if (level === 'overdue') return { text: `${t('goals_deadline_overdue')} ${-days} ${t('goals_days_short')}`, color: '#d6336c' }
  if (level === 'today') return { text: t('goals_deadline_today'), color: '#d6336c' }
  const color = level === 'soon' ? '#e0a93b' : 'var(--text-dim)'
  return { text: `${t('goals_deadline_until')} ${fmtRu(g.deadline)} · ${days} ${t('goals_days_short')}`, color }
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

  <main class="mx-auto max-w-3xl px-4 pb-16 pt-4">
    <div class="mb-4 flex items-center justify-between">
      <h1 class="text-xl font-semibold">{{ t('goals_h1') }}</h1>
      <button class="rounded-lg px-3 py-1.5 text-sm" @click="formTarget = 'new'">{{ t('goals_add_btn') }}</button>
    </div>

    <p v-if="auth.status === 'loading'" class="dim">…</p>

    <template v-else-if="auth.status === 'ready'">
      <p v-if="error" class="dim">{{ t('comm_load_error') }} {{ error }}</p>

      <template v-else>
        <p v-if="active.length === 0" class="dim">{{ t('goals_no_active') }}</p>

        <div v-for="[cat, list] in grouped" :key="cat" class="mb-5">
          <h3 class="mb-2 text-base font-medium">{{ cat }}</h3>
          <table class="w-full">
            <tbody>
              <tr v-for="g in list" :key="g.id" class="align-top">
                <td class="w-24 whitespace-nowrap pr-2">
                  <input v-if="(g.stages ?? 1) <= 1" type="checkbox" :checked="g.done" @change="toggleGoal(g)" />
                  <template v-else>
                    <span class="font-mono text-sm">{{ bar(g.current_stage ?? 0, g.stages ?? 1) }}</span>
                    <span class="dim text-xs"> {{ g.current_stage ?? 0 }}/{{ g.stages }} </span>
                    <button class="secondary px-2" @click="stepGoal(g, -1)">−</button>
                    <button class="secondary ml-0.5 px-2" @click="stepGoal(g, 1)">+</button>
                  </template>
                </td>
                <td>
                  <span :class="{ 'done-text line-through opacity-60': g.done }">{{ g.name }}</span>
                  <div class="mt-1 flex flex-wrap gap-1.5 text-xs">
                    <span
                      v-if="diffChip(g)"
                      class="whitespace-nowrap rounded-full border px-2 py-0.5"
                      :style="{ borderColor: diffChip(g)!.color, color: diffChip(g)!.color }"
                      >{{ diffChip(g)!.text }}</span
                    >
                    <span
                      v-if="deadlineChip(g)"
                      class="whitespace-nowrap rounded-full border px-2 py-0.5"
                      :style="{ borderColor: deadlineChip(g)!.color, color: deadlineChip(g)!.color }"
                      >{{ deadlineChip(g)!.text }}</span
                    >
                  </div>
                </td>
                <td class="w-16 text-sm">{{ g.points ?? 5 }} 🪙</td>
                <td class="w-16 whitespace-nowrap text-right">
                  <button class="secondary px-2" @click="formTarget = g">✎</button>
                  <button class="danger ml-1 px-2" @click="onDelete(g)">✕</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <p class="dim text-sm">{{ t('goals_points_earned') }} {{ summary.earned }} / {{ summary.possible }}</p>

        <h3 class="mb-2 mt-6 text-base font-medium">{{ t('goals_done_h2') }}</h3>
        <p v-if="done.length === 0" class="dim">{{ t('goals_no_done') }}</p>
        <table v-else class="w-full">
          <tbody>
            <tr v-for="g in done" :key="g.id" class="align-top">
              <td class="done-text">{{ g.name }}</td>
              <td class="dim text-right text-xs">{{ fmtRu(g.done_date) }}</td>
              <td class="w-16 whitespace-nowrap text-right">
                <button class="secondary px-2" @click="formTarget = g">✎</button>
                <button class="danger ml-1 px-2" @click="onDelete(g)">✕</button>
              </td>
            </tr>
          </tbody>
        </table>
      </template>
    </template>

    <GoalForm v-if="formTarget" :is-edit="formTarget !== 'new'" :initial="formInitial" @close="formTarget = null" @save="onSaveForm" />
  </main>
</template>
