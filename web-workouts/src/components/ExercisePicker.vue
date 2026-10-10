<script setup lang="ts">
import { computed, ref } from 'vue'
import { t, type DictKey } from '../lib/i18n'
import { EXERCISE_REFERENCE, MUSCLE_IDS, musclesForExercise, type MuscleId } from '../lib/muscles'
import { BACK_SHAPES, BODY_OUTLINE, FRONT_SHAPES, type MuscleShape } from '../lib/muscleShapes'
import { VARIANT_BASES, baseForName, baseName } from '../lib/exerciseVariants'
import { getLang } from '../lib/i18n'

// Подбор типового упражнения по схеме тела (BACKLOG 763, срез 1): зелёные мышцы работали за последние 4 дня, серые — «что не зелёное».
// Нажатие на мышцу выбирает её (повторное — снимает); ниже — типовые упражнения (из справочника формы, VARIANT_BASES), где эта мышца
// задействована, плюс упражнения из справочника карты мышц, для которых нет «типового» (напр. икры); нажатие шлёт наружу название и
// id типового (если есть) — форма подставляет название и поля так же, как при выборе из списка.
// recent — мышцы, тренированные за последние 4 дня (считает родитель из истории тренировок, без БД).
const props = defineProps<{ recent: readonly MuscleId[] }>()
const emit = defineEmits<{ pick: [name: string, baseId: string | null]; close: [] }>()

const selected = ref<MuscleId[]>([])
const recentSet = computed(() => new Set(props.recent))
const untrained = computed(() => MUSCLE_IDS.filter((m) => !recentSet.value.has(m)))
const muscleName = (m: MuscleId) => t(`workouts_muscle_${m}` as DictKey)

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
  const out: Suggestion[] = VARIANT_BASES.map((b) => ({ key: 'base:' + b.id, name: baseName(b), baseId: b.id }))
  for (const r of EXERCISE_REFERENCE) {
    const name = getLang() === 'en' ? r.en : r.ru
    if (!baseForName(name) && !baseForName(r.ru) && !baseForName(r.en)) out.push({ key: 'ref:' + r.id, name, baseId: null })
  }
  return out
})()
const suggestions = computed(() => {
  if (!selected.value.length) return []
  return catalog.filter((c) => musclesForExercise(c.name).some((m) => selected.value.includes(m)))
})

const views: { key: 'front' | 'back'; label: DictKey; shapes: MuscleShape[] }[] = [
  { key: 'front', label: 'workouts_muscles_front', shapes: FRONT_SHAPES },
  { key: 'back', label: 'workouts_muscles_back', shapes: BACK_SHAPES },
]
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
    <p class="mb-2 mt-0 text-sm font-bold">{{ t('workouts_pick_body_title') }}</p>
    <p class="mb-2 mt-0 text-xs" style="color: var(--text-dim)">{{ t('workouts_pick_body_hint') }}</p>
    <div class="flex flex-wrap justify-center gap-3">
      <figure v-for="v in views" :key="v.key" class="m-0 text-center">
        <svg viewBox="0 0 100 190" class="h-48 w-24" role="group" :aria-label="t(v.label)">
          <circle cx="50" cy="14" r="9" fill="none" stroke="var(--border)" stroke-width="1.2" />
          <path :d="BODY_OUTLINE" fill="none" stroke="var(--border)" stroke-width="1.2" stroke-linejoin="round" />
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
        <figcaption class="text-[0.75em]" style="color: var(--text-dim)">{{ t(v.label) }}</figcaption>
      </figure>
    </div>
    <div class="mt-1 flex flex-wrap items-center justify-center gap-3 text-[0.75em]" style="color: var(--text-dim)">
      <span><span style="color: var(--success)">■</span> {{ t('workouts_muscles_legend_done') }}</span>
      <span><span style="opacity: 0.5">■</span> {{ t('workouts_muscles_legend_idle') }}</span>
    </div>
    <div class="mt-2 flex flex-wrap justify-center gap-2">
      <button type="button" class="rounded-lg border px-2.5 py-1 text-xs" style="border-color: var(--border); color: var(--text)" data-testid="picker-untrained" @click="selectUntrained">{{ t('workouts_pick_body_untrained') }}</button>
      <button v-if="selected.length" type="button" class="rounded-lg border px-2.5 py-1 text-xs" style="border-color: var(--border); color: var(--text-dim)" data-testid="picker-clear" @click="selected = []">{{ t('workouts_pick_body_clear') }}</button>
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
      <p v-else class="m-0 text-xs" style="color: var(--text-dim)" data-testid="picker-none">{{ t('workouts_pick_body_none') }}</p>
    </div>
    <div class="mt-2 text-right">
      <button type="button" class="text-xs underline" style="color: var(--text-dim); background: none" data-testid="picker-close" @click="emit('close')">{{ t('workouts_pick_body_close') }}</button>
    </div>
  </div>
</template>
