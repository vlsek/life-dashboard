<script setup lang="ts">
import { computed, ref } from 'vue'
import CoinIcon from './CoinIcon.vue'
import Icon from './Icon.vue'
import SavedTick from './SavedTick.vue'
import { deadlineLevel, stagePercent, stageProgress, stageTapTarget } from '../lib/goals'
import { t } from '../lib/i18n'
import type { Goal } from '../lib/types'

// Карточка цели (BACKLOG 7.1 «Многоступенчатые цели»): вместо строки таблицы с текстовой полоской «█░» и кнопками −/+.
// Простая цель — круглая галочка. Многоэтапная — сегментированный прогресс (по сегменту на этап, а при >12 этапах — полоса),
// «2/5 · 40 %», кнопка «следующий этап» и раскрывающийся список этапов: тап по этапу выставляет прогресс до него,
// повторный тап по последнему выполненному — откат. Данные те же (`stages`, `current_stage`), миграция не нужна.
const props = defineProps<{ goal: Goal; saved?: boolean }>()
const emit = defineEmits<{ toggle: []; stage: [target: number]; edit: []; delete: [] }>()

const stages = computed(() => props.goal.stages ?? 1)
const multi = computed(() => stages.value > 1)
const current = computed(() => props.goal.current_stage ?? 0)
const progress = computed(() => stageProgress(current.value, stages.value))
const percent = computed(() => stagePercent(current.value, stages.value))
const open = ref(false)

function fmtRu(iso: string | null): string {
  if (!iso) return ''
  const [y, m, d] = iso.split('-')
  return `${d}.${m}.${y}`
}
const diffColor: Record<string, string> = { easy: '#3fa66b', medium: '#e0a93b', hard: '#d6336c' }
const diffChip = computed(() => {
  const g = props.goal
  if (!g.difficulty) return null
  return { text: t(`goals_diff_${g.difficulty}` as 'goals_diff_easy'), color: diffColor[g.difficulty] || 'var(--text-dim)' }
})
const deadlineChip = computed(() => {
  const g = props.goal
  if (!g.deadline || g.done) return null
  const { level, days } = deadlineLevel(g.deadline)
  if (level === null || days === null) return null
  if (level === 'overdue') return { text: `${t('goals_deadline_overdue')} ${-days} ${t('goals_days_short')}`, color: '#d6336c' }
  if (level === 'today') return { text: t('goals_deadline_today'), color: '#d6336c' }
  return { text: `${t('goals_deadline_until')} ${fmtRu(g.deadline)} · ${days} ${t('goals_days_short')}`, color: level === 'soon' ? '#e0a93b' : 'var(--text-dim)' }
})

function tapStage(k: number) {
  emit('stage', stageTapTarget(current.value, stages.value, k))
}
const iconBtn = 'display:inline-flex;align-items:center;justify-content:center;width:2rem;height:2rem;padding:0;border-radius:0.5rem;background:transparent;'
</script>

<template>
  <article class="goal-card relative rounded-xl border p-3" :class="{ 'goal-card-saved': saved }" style="border-color: var(--border); background: var(--bg-card)" data-test="goal-card">
    <SavedTick :show="!!saved" />
    <div class="flex items-start gap-3">
      <!-- простая цель: круглая галочка -->
      <button
        v-if="!multi"
        type="button"
        role="checkbox"
        :aria-checked="goal.done"
        :aria-label="t('goals_mark_done_aria')"
        class="goal-check mt-0.5 shrink-0"
        :class="{ 'goal-check-on': goal.done }"
        data-test="goal-check"
        @click="emit('toggle')"
      >
        <Icon v-if="goal.done" name="check" />
      </button>
      <!-- многоэтапная: процент кольцом-цифрой -->
      <div v-else class="goal-percent mt-0.5 shrink-0" data-test="goal-percent" aria-hidden="true">{{ percent }}%</div>

      <div class="min-w-0 flex-1">
        <div class="flex items-start justify-between gap-2">
          <h4 class="m-0 break-words text-base font-medium" :class="{ 'done-text line-through opacity-60': goal.done }" data-test="goal-name">{{ goal.name }}</h4>
          <span class="whitespace-nowrap rounded-full border px-2 py-0.5 text-xs" style="border-color: var(--border)" data-test="goal-points">{{ goal.points ?? 5 }} <CoinIcon /></span>
        </div>

        <div v-if="diffChip || deadlineChip" class="mt-1 flex flex-wrap gap-1.5 text-xs">
          <span v-if="diffChip" class="whitespace-nowrap rounded-full border px-2 py-0.5" :style="{ borderColor: diffChip.color, color: diffChip.color }" data-test="goal-diff">{{ diffChip.text }}</span>
          <span v-if="deadlineChip" class="whitespace-nowrap rounded-full border px-2 py-0.5" :style="{ borderColor: deadlineChip.color, color: deadlineChip.color }" data-test="goal-deadline">{{ deadlineChip.text }}</span>
        </div>

        <!-- прогресс этапов -->
        <div v-if="multi" class="mt-2 flex items-center gap-2" data-test="goal-progress">
          <div v-if="progress.mode === 'segments'" class="flex min-w-0 flex-1 gap-1" role="progressbar" :aria-valuenow="current" aria-valuemin="0" :aria-valuemax="stages">
            <span
              v-for="i in progress.total"
              :key="i"
              class="goal-seg h-2 flex-1 rounded-full"
              :class="{ 'goal-seg-on': i <= progress.filled }"
              data-test="goal-seg"
            ></span>
          </div>
          <div v-else class="goal-bar min-w-0 flex-1" role="progressbar" :aria-valuenow="current" aria-valuemin="0" :aria-valuemax="stages">
            <span class="goal-bar-fill" :style="{ width: progress.pct + '%' }" data-test="goal-bar-fill"></span>
          </div>
          <span class="dim whitespace-nowrap text-xs" data-test="goal-count">{{ current }}/{{ stages }}</span>
          <button
            v-if="!goal.done"
            type="button"
            class="goal-next shrink-0"
            :title="t('goals_stage_next')"
            :aria-label="t('goals_stage_next')"
            data-test="goal-next"
            @click="tapStage(current + 1)"
          >
            +
          </button>
        </div>

        <button
          v-if="multi"
          type="button"
          class="mt-1 flex items-center gap-1 border-0 bg-transparent p-0 text-xs"
          style="color: var(--text-dim); background: transparent"
          :aria-expanded="open"
          data-test="goal-expand"
          @click="open = !open"
        >
          <Icon name="chevron_down" :extra-style="open ? 'transform:rotate(180deg);' : ''" />
          {{ open ? t('goals_stages_hide') : t('goals_stages_show') }}
        </button>
      </div>

      <div class="flex shrink-0 gap-0.5">
        <button type="button" class="secondary" :style="iconBtn" :title="t('goals_edit_aria')" :aria-label="t('goals_edit_aria')" data-test="goal-edit" @click="emit('edit')"><Icon name="edit" /></button>
        <button type="button" class="danger" :style="iconBtn" :title="t('goals_delete_aria')" :aria-label="t('goals_delete_aria')" data-test="goal-delete" @click="emit('delete')"><Icon name="trash" /></button>
      </div>
    </div>

    <!-- этапы: тап выставляет прогресс до этапа, повторный тап по последнему выполненному — откат -->
    <Transition name="goal-stages">
      <ol v-if="multi && open" class="m-0 mt-3 list-none p-0" data-test="goal-stages">
        <li v-for="k in stages" :key="k">
          <button
            type="button"
            class="goal-stage flex w-full items-center gap-3 text-left"
            :class="{ 'goal-stage-on': k <= current }"
            :aria-label="`${t('goals_stage_n')} ${k}: ${k <= current ? t('goals_stage_done_aria') : t('goals_stage_todo_aria')}`"
            data-test="goal-stage"
            @click="tapStage(k)"
          >
            <span class="goal-check goal-check-sm shrink-0" :class="{ 'goal-check-on': k <= current }"><Icon v-if="k <= current" name="check" /></span>
            <span class="text-sm">{{ t('goals_stage_n') }} {{ k }}</span>
          </button>
        </li>
      </ol>
    </Transition>
  </article>
</template>

<style scoped>
.goal-card-saved {
  animation: goal-card-saved 0.9s ease-out;
}
@keyframes goal-card-saved {
  0% { border-color: var(--success); box-shadow: 0 0 0 0 var(--success); }
  30% { border-color: var(--success); box-shadow: 0 0 0 3px color-mix(in srgb, var(--success) 35%, transparent); }
  100% { box-shadow: 0 0 0 0 transparent; }
}
@media (prefers-reduced-motion: reduce) {
  .goal-card-saved { animation: none; border-color: var(--success) !important; }
}
:global(html[data-motion='off']) .goal-card-saved { animation: none; border-color: var(--success) !important; }
.goal-check {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.65rem;
  height: 1.65rem;
  padding: 0;
  border-radius: 9999px;
  border: 2px solid var(--border);
  background: transparent;
  color: var(--accent-text);
  cursor: pointer;
}
.goal-check-sm {
  width: 1.35rem;
  height: 1.35rem;
  border-width: 2px;
}
.goal-check-on {
  background: var(--accent);
  border-color: var(--accent);
}
.goal-percent {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 2.6rem;
  height: 1.65rem;
  padding: 0 0.4rem;
  border-radius: 9999px;
  border: 2px solid var(--accent);
  color: var(--text);
  font-size: 0.75rem;
  font-weight: 600;
}
.goal-seg {
  background: var(--border);
}
.goal-seg-on {
  background: var(--accent);
}
.goal-bar {
  height: 0.5rem;
  border-radius: 9999px;
  background: var(--border);
  overflow: hidden;
}
.goal-bar-fill {
  display: block;
  height: 100%;
  border-radius: 9999px;
  background: var(--accent);
}
.goal-next {
  width: 1.75rem;
  height: 1.75rem;
  padding: 0;
  border-radius: 9999px;
  font-size: 1.1rem;
  line-height: 1;
  cursor: pointer;
}
.goal-stage {
  padding: 0.4rem 0.25rem;
  border: 0;
  border-radius: 0.5rem;
  background: transparent;
  color: var(--text);
  cursor: pointer;
}
.goal-stage-on span:last-child {
  opacity: 0.7;
}
.goal-stages-enter-active,
.goal-stages-leave-active {
  transition: opacity 0.18s ease;
}
.goal-stages-enter-from,
.goal-stages-leave-to {
  opacity: 0;
}
</style>
