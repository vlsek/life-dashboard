<script setup lang="ts">
import { computed } from 'vue'
import { bodyGeometry } from '../lib/bodyModel'
import { sessionFill, sessionMuscles } from '../lib/sessionMuscles'
import { t, type DictKey } from '../lib/i18n'
import type { BodyModel } from '../lib/bodyModel'
import type { MuscleId } from '../lib/muscles'
import type { Exercise } from '../lib/types'

// Мини-карта в шапке активной тренировки (BACKLOG 80.8): мышцы сессии заливаются по мере выполненных подходов, остальные приглушены.
const props = defineProps<{ draft: { exercise_id: string; sets: { done?: boolean | null }[] }[]; exercises: Exercise[]; model?: BodyModel }>()
const geometry = computed(() => bodyGeometry(props.model ?? 'male'))
const stats = computed(() => sessionMuscles(props.draft, props.exercises))
const any = computed(() => Object.keys(stats.value).length > 0)
const views = computed(() => [
  { key: 'front', shapes: geometry.value.front },
  { key: 'back', shapes: geometry.value.back },
])
const name = (m: MuscleId) => t(('workouts_muscle_' + m) as DictKey)
function style(m: MuscleId): string {
  const f = sessionFill(stats.value[m])
  if (f === null) return 'fill: var(--border); fill-opacity: 0.18; stroke: none'
  // в сессии: контур акцентом, заливка растёт с долей выполненных подходов
  return `fill: var(--accent); fill-opacity: ${(0.12 + 0.78 * f).toFixed(2)}; stroke: var(--accent); stroke-width: 0.6`
}
// Подпись для скринридера: «Грудь 2/4 подходов, Спина 0/3 подходов»
const summary = computed(() =>
  (Object.entries(stats.value) as [MuscleId, { total: number; done: number }][])
    .sort((a, b) => b[1].total - a[1].total)
    .map(([m, s]) => `${name(m)} ${s.done}/${s.total}`)
    .join(', '),
)
</script>

<template>
  <div v-if="any" class="mx-auto flex max-w-3xl items-center justify-center gap-3 py-1" data-testid="session-map" role="img" :aria-label="t('aw_map_aria').replace('{list}', summary)">
    <svg v-for="v in views" :key="v.key" viewBox="0 0 100 190" class="h-20 w-10" aria-hidden="true" focusable="false">
      <path :d="geometry.outline" fill="none" stroke="var(--border)" stroke-width="1.6" stroke-linejoin="round" />
      <path v-for="(s, i) in v.shapes" :key="v.key + i" :d="String(s.attrs.d)" :data-muscle="s.muscle" :data-fill="sessionFill(stats[s.muscle]) ?? 'off'" :style="style(s.muscle)" />
    </svg>
  </div>
</template>
