<script setup lang="ts">
import { computed } from 'vue'
import { t, type DictKey } from '../lib/i18n'
import { bodyGeometry, type BodyModel } from '../lib/bodyModel'

// Мини-карта тела (спереди/сзади): закрашены переданные мышцы, остальные — контуром. Общая для итогов тренировки и окна упражнения (69.10, 69.12).
const props = defineProps<{ muscles: readonly string[]; model?: BodyModel }>()
const geometry = computed(() => bodyGeometry(props.model ?? 'male'))
const bodyViews = computed(() => [{ key: 'front', label: 'workouts_muscles_front' as DictKey, shapes: geometry.value.front }, { key: 'back', label: 'workouts_muscles_back' as DictKey, shapes: geometry.value.back }])
const worked = computed(() => new Set<string>(props.muscles))
</script>

<template>
  <div class="mb-2 flex justify-center gap-4" data-testid="body-highlight">
    <figure v-for="v in bodyViews" :key="v.key" class="m-0 text-center">
      <svg viewBox="0 0 100 190" class="h-40 w-20" role="img" :aria-label="t(v.label)">
        <circle :cx="geometry.head.cx" :cy="geometry.head.cy" :r="geometry.head.r" fill="none" stroke="var(--border)" />
        <path :d="geometry.outline" fill="none" stroke="var(--border)" stroke-width="1.2" stroke-linejoin="round" />
        <path v-for="(sh, i) in v.shapes" :key="v.key + i" v-bind="sh.attrs" :data-muscle="sh.muscle" :data-state="worked.has(sh.muscle) ? 'done' : 'idle'" :fill="worked.has(sh.muscle) ? 'var(--accent)' : 'transparent'" :fill-opacity="worked.has(sh.muscle) ? 0.75 : 1" stroke="var(--text-dim)" stroke-width="0.6" />
      </svg>
      <figcaption class="text-xs" style="color: var(--text-dim)">{{ t(v.label) }}</figcaption>
    </figure>
  </div>
</template>
