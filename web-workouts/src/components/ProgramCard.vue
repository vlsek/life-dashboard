<script setup lang="ts">
import { computed, ref } from 'vue'
import { t } from '../lib/i18n'
import { programStatus, type ActiveProgram } from '../lib/program'
import { todayStr } from '../lib/date'
import type { WorkoutTemplate } from '../lib/types'
import EmojiText from './EmojiText.vue'

// Карточка активной программы (BACKLOG 3.3, остаток): неделя N из M и нагрузка этой недели (по дате старта),
// список недель с отметкой «пройдена», прогресс и завершение программы. Данные не меняет — шлёт события родителю.
const props = defineProps<{ program: ActiveProgram; template: WorkoutTemplate; today?: string }>()
const emit = defineEmits<{ 'toggle-week': [number]; finish: [] }>()

const weeks = computed(() => props.template.weeks ?? [])
const status = computed(() => programStatus(props.program, weeks.value.length, props.today ?? todayStr()))
const current = computed(() => weeks.value[status.value.weekIndex])
const asking = ref(false)

function fill(key: Parameters<typeof t>[0], vars: Record<string, string | number>): string {
  return Object.entries(vars).reduce((s, [k, v]) => s.replace(`{${k}}`, String(v)), t(key))
}
</script>

<template>
  <section class="mb-4 rounded-xl border p-4" style="border-color: var(--border); background: var(--bg-card)" data-testid="program-card">
    <div class="mb-2 flex items-start justify-between gap-3">
      <div>
        <div class="text-[0.8em]" style="color: var(--text-dim)">{{ t('workouts_program_title') }}</div>
        <strong class="text-base">{{ template.title }}</strong>
      </div>
      <button
        v-if="!asking"
        type="button"
        class="rounded-lg border px-3 py-1.5 text-[0.8em]"
        style="border-color: var(--border); background: var(--bg); color: var(--text-dim)"
        data-testid="program-finish"
        @click="asking = true"
      >
        {{ t('workouts_program_finish_btn') }}
      </button>
    </div>

    <div v-if="asking" class="mb-3 rounded-lg border p-3 text-[0.9em]" style="border-color: var(--border); background: var(--bg)" data-testid="program-finish-ask">
      <p class="mb-2">{{ t('workouts_program_finish_ask') }}</p>
      <div class="flex gap-2">
        <button type="button" class="rounded-lg px-3 py-1.5 text-sm" style="background: var(--accent); color: var(--accent-text)" data-testid="program-finish-yes" @click="emit('finish')">
          {{ t('workouts_program_finish_yes') }}
        </button>
        <button type="button" class="rounded-lg border px-3 py-1.5 text-sm" style="border-color: var(--border); background: var(--bg-card); color: var(--text)" @click="asking = false">
          {{ t('workouts_program_finish_no') }}
        </button>
      </div>
    </div>

    <div v-if="status.state === 'finished'" class="mb-3 font-medium" data-testid="program-finished"><EmojiText :text="t('workouts_program_done_all')" /></div>
    <div v-else class="mb-3" data-testid="program-current">
      <div class="font-medium">
        {{ fill('workouts_program_week_of', { n: status.weekIndex + 1, m: status.total }) }}<span v-if="current"> · {{ current.scheme }}</span>
      </div>
      <div class="text-[0.8em]" style="color: var(--text-dim)">{{ fill('workouts_program_days_left', { n: status.daysLeftInWeek }) }}</div>
    </div>

    <div class="mb-1 text-[0.8em]" style="color: var(--text-dim)">{{ fill('workouts_program_progress', { done: status.doneCount, m: status.total }) }}</div>
    <div class="mb-3 h-1.5 overflow-hidden rounded-full" style="background: var(--border)" role="progressbar" :aria-valuenow="status.doneCount" aria-valuemin="0" :aria-valuemax="status.total">
      <div class="h-full rounded-full" :style="{ width: (status.total ? (status.doneCount / status.total) * 100 : 0) + '%', background: 'var(--accent)' }" />
    </div>

    <ul class="m-0 list-none p-0">
      <li
        v-for="(w, i) in weeks"
        :key="w.label"
        class="flex items-center gap-3 border-t py-1.5 text-[0.9em]"
        style="border-color: var(--border)"
        :data-current="status.state === 'active' && i === status.weekIndex ? 'true' : undefined"
      >
        <input
          type="checkbox"
          class="h-4 w-4 shrink-0"
          :checked="program.doneWeeks.includes(i)"
          :aria-label="fill('workouts_program_week_check', { label: w.label })"
          :data-testid="'program-week-' + i"
          @change="emit('toggle-week', i)"
        />
        <span :style="{ fontWeight: status.state === 'active' && i === status.weekIndex ? '700' : '400', color: program.doneWeeks.includes(i) ? 'var(--text-dim)' : 'var(--text)' }">
          {{ w.label }}<span v-if="status.state === 'active' && i === status.weekIndex"> — {{ t('workouts_program_this_week') }}</span>
        </span>
        <span class="ml-auto font-medium" style="color: var(--text-dim)">{{ w.scheme }}</span>
      </li>
    </ul>
  </section>
</template>
