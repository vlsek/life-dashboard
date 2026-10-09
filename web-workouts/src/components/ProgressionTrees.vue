<script setup lang="ts">
import { computed, ref } from 'vue'
import { getLang, t, type DictKey } from '../lib/i18n'
import { todayStr } from '../lib/date'
import { chainDoneCount, chainState, linkState, PROGRESSIONS, type StepState, type StepStatus } from '../lib/progressions'
import type { Exercise, WorkoutEntry } from '../lib/types'
import CollapseChevron from './CollapseChevron.vue'
import { useAccordionMember } from '../lib/useCollapseStyle'

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
// «Аккордеон» (BACKLOG 498): раскрыли другой блок страницы (категорию, карту мышц, деревья) — этот сворачивается
const announceOpened = useAccordionMember(
  'block:progressions',
  () => !open.value,
  () => {
    open.value = false
    try {
      localStorage.setItem(OPEN_KEY, '0')
    } catch {
      /* состояние блока не критично */
    }
  },
)
function toggle() {
  open.value = !open.value
  try {
    localStorage.setItem(OPEN_KEY, open.value ? '1' : '0')
  } catch {
    /* состояние блока не критично */
  }
  if (open.value) announceOpened()
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

        <ol class="ptree m-0 list-none p-0" data-testid="ptree">
          <li
            v-for="(s, i) in c.states"
            :key="s.step.id"
            class="ptree-row"
            :data-step="s.step.id"
            :data-status="s.status"
          >
            <div class="ptree-rail" aria-hidden="true">
              <span class="ptree-node" :data-status="s.status" data-testid="step-node">{{ ICON[s.status] }}</span>
              <span v-if="i < c.states.length - 1" class="ptree-link" :data-link="linkState(c.states, i)" data-testid="step-link"></span>
            </div>
            <div
              class="ptree-card text-sm"
              :style="{
                borderColor: s.status === 'current' ? 'var(--accent)' : 'var(--border)',
                opacity: s.status === 'locked' ? 0.55 : 1,
              }"
            >
            <div class="flex items-center gap-2">
              <span class="sr-only">{{ t(STATUS_KEY[s.status]) }}</span>
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
            </div>
          </li>
        </ol>
      </div>
    </div>
  </section>
</template>

<style scoped>
.ptree-row {
  display: flex;
  gap: 10px;
}
.ptree-rail {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex: none;
  width: 28px;
}
.ptree-node {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  flex: none;
  border-radius: 50%;
  border: 2px solid var(--border);
  background: var(--bg);
  color: var(--text);
  font-size: 0.8em;
  line-height: 1;
}
.ptree-node[data-status='done'] {
  border-color: var(--success);
  background: var(--success);
  color: var(--bg);
}
.ptree-node[data-status='current'] {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 25%, transparent);
}
.ptree-node[data-status='progress'] {
  border-color: var(--accent);
}
.ptree-node[data-status='locked'] {
  opacity: 0.55;
}
.ptree-link {
  flex: 1;
  width: 0;
  min-height: 10px;
  border-left: 2px dashed var(--border);
}
.ptree-link[data-link='open'] {
  border-left: 2px solid var(--success);
}
.ptree-link[data-link='next'] {
  border-left: 2px solid var(--accent);
}
.ptree-card {
  flex: 1;
  min-width: 0;
  margin-bottom: 8px;
  padding: 6px 10px;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--bg);
}
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
}
</style>
