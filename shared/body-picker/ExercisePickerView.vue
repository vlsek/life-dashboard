<script setup lang="ts">
import { computed, ref } from 'vue'
import { EXERCISE_REFERENCE, MUSCLE_IDS, musclesForExercise, type MuscleId } from './muscles'
import type { MuscleShape } from './muscleShapes'
import { bodyGeometry, type BodyModel } from './bodyModel'
import { VARIANT_BASES, baseForName, baseName } from './exerciseVariants'

// Общий компонент (BACKLOG 762 срез 2, вариант Б): им пользуются Тренировки и Дашборд. Тексты, язык и названия мышц приходят
// пропсами — компонент не зависит от словаря пилота.
// Подбор типового упражнения по схеме тела (BACKLOG 763, срез 1): зелёные мышцы работали за последние 4 дня, серые — «что не зелёное».
// Нажатие на мышцу выбирает её (повторное — снимает); ниже — типовые упражнения (из справочника формы, VARIANT_BASES), где эта мышца
// задействована, плюс упражнения из справочника карты мышц, для которых нет «типового» (напр. икры); нажатие шлёт наружу название и
// id типового (если есть) — форма подставляет название и поля так же, как при выборе из списка.
// recent — мышцы, тренированные за последние 4 дня (считает родитель из истории тренировок, без БД).
export interface PickerLabels {
  title: string
  hint: string
  front: string
  back: string
  legendDone: string
  legendIdle: string
  untrained: string
  clear: string
  none: string
  close: string
}
const props = defineProps<{ recent: readonly MuscleId[]; model?: BodyModel; lang: 'ru' | 'en'; labels: PickerLabels; muscleName: (m: MuscleId) => string }>()
const emit = defineEmits<{ pick: [name: string, baseId: string | null]; close: [] }>()

const selected = ref<MuscleId[]>([])
const recentSet = computed(() => new Set(props.recent))
const untrained = computed(() => MUSCLE_IDS.filter((m) => !recentSet.value.has(m)))
const muscleName = (m: MuscleId) => props.muscleName(m)

function toggle(m: MuscleId) {
  selected.value = selected.value.includes(m) ? selected.value.filter((x) => x !== m) : [...selected.value, m]
}
// «Что не тренировал»: выделить сразу все серые мышцы
function selectUntrained() {
  selected.value = [...untrained.value]
}

interface Suggestion {
  key: string
  name: string
  baseId: string | null
}
// Все упражнения, которые мы умеем предлагать: типовые (с автозаполнением полей) + справочник мышц без типового двойника (без дублей по названию)
const catalog: Suggestion[] = (() => {
  const out: Suggestion[] = VARIANT_BASES.map((b) => ({ key: 'base:' + b.id, name: baseName(b, props.lang), baseId: b.id }))
  for (const r of EXERCISE_REFERENCE) {
    const name = props.lang === 'en' ? r.en : r.ru
    if (!baseForName(name) && !baseForName(r.ru) && !baseForName(r.en)) out.push({ key: 'ref:' + r.id, name, baseId: null })
  }
  return out
})()
const suggestions = computed(() => {
  if (!selected.value.length) return []
  return catalog.filter((c) => musclesForExercise(c.name).some((m) => selected.value.includes(m)))
})

const geometry = computed(() => bodyGeometry(props.model ?? 'male'))
const views = computed<{ key: 'front' | 'back'; label: string; shapes: MuscleShape[] }[]>(() => [
  { key: 'front', label: props.labels.front, shapes: geometry.value.front },
  { key: 'back', label: props.labels.back, shapes: geometry.value.back },
])
function shapeStyle(m: MuscleId) {
  const isDone = recentSet.value.has(m)
  return {
    fill: isDone ? 'var(--success)' : 'var(--text-dim)',
    opacity: isDone ? 0.9 : 0.35,
    stroke: selected.value.includes(m) ? 'var(--accent)' : 'transparent',
    strokeWidth: 2.2,
    cursor: 'pointer',
  }
}
</script>

<template>
  <div class="rounded-lg border p-3" style="border-color: var(--border); background: var(--bg)" data-testid="exercise-picker">
    <p class="mb-2 mt-0 text-sm font-bold">{{ labels.title }}</p>
    <p class="mb-2 mt-0 text-xs" style="color: var(--text-dim)">{{ labels.hint }}</p>
    <div class="flex flex-wrap justify-center gap-3">
      <figure v-for="v in views" :key="v.key" class="m-0 text-center">
        <svg viewBox="0 0 100 190" class="h-48 w-24" role="group" :aria-label="v.label">
          <circle :cx="geometry.head.cx" :cy="geometry.head.cy" :r="geometry.head.r" fill="none" stroke="var(--border)" stroke-width="1.2" />
          <path :d="geometry.outline" fill="none" stroke="var(--border)" stroke-width="1.2" stroke-linejoin="round" />
          <g
            v-for="(s, i) in v.shapes"
            :key="v.key + i"
            :data-muscle="s.muscle"
            :data-state="selected.includes(s.muscle) ? 'selected' : recentSet.has(s.muscle) ? 'done' : 'idle'"
            role="button"
            tabindex="0"
            :aria-pressed="selected.includes(s.muscle)"
            :aria-label="muscleName(s.muscle)"
            @click="toggle(s.muscle)"
            @keydown.enter.prevent="toggle(s.muscle)"
            @keydown.space.prevent="toggle(s.muscle)"
          >
            <component :is="s.tag" v-bind="s.attrs" :style="shapeStyle(s.muscle)" />
          </g>
        </svg>
        <figcaption class="text-[0.75em]" style="color: var(--text-dim)">{{ v.label }}</figcaption>
      </figure>
    </div>
    <div class="mt-1 flex flex-wrap items-center justify-center gap-3 text-[0.75em]" style="color: var(--text-dim)">
      <span><span style="color: var(--success)">■</span> {{ labels.legendDone }}</span>
      <span><span style="opacity: 0.5">■</span> {{ labels.legendIdle }}</span>
    </div>
    <div class="mt-2 flex flex-wrap justify-center gap-2">
      <button type="button" class="rounded-lg border px-2.5 py-1 text-xs" style="border-color: var(--border); background: transparent; color: var(--text)" data-testid="picker-untrained" @click="selectUntrained">{{ labels.untrained }}</button>
      <button v-if="selected.length" type="button" class="rounded-lg border px-2.5 py-1 text-xs" style="border-color: var(--border); background: transparent; color: var(--text-dim)" data-testid="picker-clear" @click="selected = []">{{ labels.clear }}</button>
    </div>
    <div v-if="selected.length" class="mt-2" data-testid="picker-suggestions">
      <p class="mb-1 mt-0 text-xs" style="color: var(--text-dim)">{{ selected.map(muscleName).join(', ') }}</p>
      <div v-if="suggestions.length" class="flex flex-wrap gap-2">
        <button
          v-for="c in suggestions"
          :key="c.key"
          type="button"
          class="rounded-full border px-3 py-1 text-sm"
          style="border-color: var(--border); background: var(--bg-card); color: var(--text)"
          :data-testid="'suggest-' + c.key"
          @click="emit('pick', c.name, c.baseId)"
        >{{ c.name }}</button>
      </div>
      <p v-else class="m-0 text-xs" style="color: var(--text-dim)" data-testid="picker-none">{{ labels.none }}</p>
    </div>
    <div class="mt-2 text-right">
      <button type="button" class="text-xs underline" style="color: var(--text-dim); background: none" data-testid="picker-close" @click="emit('close')">{{ labels.close }}</button>
    </div>
  </div>
</template>
