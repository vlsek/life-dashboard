<script setup lang="ts">
import { computed, ref } from 'vue'
import { getLang, t, type DictKey } from '../lib/i18n'
import { todayStr } from '../lib/date'
import { chainDoneCount, chainState, PROGRESSIONS, type StepState, type StepStatus } from '../lib/progressions'
import type { Exercise, WorkoutEntry } from '../lib/types'
import CollapseChevron from './CollapseChevron.vue'

// Деревья прогрессии (BACKLOG 3.3, первый срез): цепочки ступеней от лёгкого к сложному.
// Ступень пройдена, когда в одном подходе набрана её цель (повторения). Данные — только из
// уже загруженных упражнений и записей; своих деревьев и сохранения в БД пока нет.
const props = defineProps<{ entries: WorkoutEntry[]; exercises: Exercise[]; today?: string }>()
const emit = defineEmits<{ 'add-entry': [exercise: Exercise] }>()

const OPEN_KEY = 'workouts_progressions_open'
function readOpen(): boolean {
  try {
    return localStorage.getItem(OPEN_KEY) === '1'
  } catch {
    return false
  }
}
const open = ref(readOpen())
function toggle() {
  open.value = !open.value
  try {
    localStorage.setItem(OPEN_KEY, open.value ? '1' : '0')
  } catch {
    /* состояние блока не критично */
  }
}

const lang = getLang()
const today = computed(() => props.today ?? todayStr())
const chains = computed(() =>
  PROGRESSIONS.map((c) => {
    const states = chainState(c, props.exercises, props.entries, today.value)
    return { id: c.id, title: lang === 'ru' ? c.ru : c.en, states, done: chainDoneCount(states) }
  }),
)

const label = (s: StepState) => (lang === 'ru' ? s.step.ru : s.step.en)
const ICON: Record<StepStatus, string> = { done: '✓', current: '▶', progress: '◐', locked: '🔒' }
const STATUS_KEY: Record<StepStatus, DictKey> = {
  done: 'workouts_prog_done',
  current: 'workouts_prog_current',
  progress: 'workouts_prog_progress',
  locked: 'workouts_prog_locked',
}
const unitLabel = (s: StepState) => t(s.step.unit === 'sec' ? 'workouts_prog_sec' : 'workouts_prog_reps')
function pct(s: StepState): number {
  return Math.min(100, Math.round((s.best / s.step.goal) * 100))
}
</script>

<template>
  <section class="mb-4 rounded-xl border p-3.5" style="border-color: var(--border); background: var(--bg-card)" data-testid="progressions">
    <div
      class="collapse-head flex items-center gap-2"
      role="button"
      tabindex="0"
      data-testid="progressions-toggle"
      :aria-expanded="open"
      @click="toggle"
      @keydown.enter.prevent="toggle"
      @keydown.space.prevent="toggle"
    >
      <h3 class="m-0 font-bold">{{ t('workouts_prog_title') }}</h3>
      <CollapseChevron :collapsed="!open" />
    </div>

    <div v-if="open" class="mt-3" data-testid="progressions-body">
      <p class="m-0 mb-3 text-[0.85em]" style="color: var(--text-dim)">{{ t('workouts_prog_hint') }}</p>

      <div v-for="c in chains" :key="c.id" class="mb-4" :data-chain="c.id">
        <div class="mb-1.5 flex items-baseline gap-2">
          <span class="font-semibold">{{ c.title }}</span>
          <span class="text-[0.8em]" style="color: var(--text-dim)" data-testid="chain-count">{{ c.done }}/{{ c.states.length }}</span>
        </div>

        <ol class="m-0 list-none p-0">
          <li
            v-for="s in c.states"
            :key="s.step.id"
            class="mb-1 rounded-lg border px-2.5 py-1.5 text-sm"
            :data-step="s.step.id"
            :data-status="s.status"
            :style="{
              borderColor: s.status === 'current' ? 'var(--accent)' : 'var(--border)',
              background: 'var(--bg)',
              opacity: s.status === 'locked' ? 0.55 : 1,
            }"
          >
            <div class="flex items-center gap-2">
              <span :title="t(STATUS_KEY[s.status])" :style="{ color: s.status === 'done' ? 'var(--success)' : 'var(--text)' }" aria-hidden="true">{{ ICON[s.status] }}</span>
              <span class="flex-1">{{ label(s) }}</span>
              <span class="text-[0.8em]" style="color: var(--text-dim)">{{ t('workouts_prog_goal') }} {{ s.step.goal }} {{ unitLabel(s) }}</span>
            </div>

            <template v-if="s.status === 'current' || s.status === 'progress'">
              <div class="mt-1.5 flex items-center gap-2 text-[0.8em]" style="color: var(--text-dim)">
                <span class="h-1.5 flex-1 overflow-hidden rounded" style="background: var(--border)">
                  <span class="block h-full rounded" style="background: var(--accent)" :style="{ width: pct(s) + '%' }" data-testid="step-bar"></span>
                </span>
                <span>{{ t('workouts_prog_best') }}: {{ s.best }} / {{ s.step.goal }} {{ unitLabel(s) }}</span>
              </div>
              <div class="mt-1.5">
                <button
                  v-if="s.exercises.length"
                  type="button"
                  class="rounded-lg border px-2 py-1 text-[0.8em]"
                  style="border-color: var(--border); color: var(--text)"
                  data-testid="step-add-entry"
                  @click="emit('add-entry', s.exercises[0])"
                >
                  {{ t('workouts_prog_add_entry') }}
                </button>
                <span v-else class="text-[0.8em]" style="color: var(--text-dim)" data-testid="step-no-ex">{{ t('workouts_prog_no_ex') }} «{{ label(s) }}»</span>
              </div>
            </template>
          </li>
        </ol>
      </div>
    </div>
  </section>
</template>
