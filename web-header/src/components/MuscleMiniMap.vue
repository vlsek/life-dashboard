<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { t, type DictKey } from '../lib/i18n'
import type { MuscleShape } from '../lib/muscleShapes'
import { bodyGeometry, readBodyModelChoice, resolveBodyModel } from '../lib/bodyModel'
import { sb } from '../lib/supabase'
import type { MuscleId } from '../lib/muscles'

// Компактная карта мышц для правой панели (BACKLOG 3.2): спереди и сзади, зелёные — мышцы, задействованные за последние
// 4 дня, серые — нет. Нажатие на мышцу — название и когда её тренировали в последний раз + ссылка на «Тренировки».
// Схематичная 2D-фигура и её формы — копия web-workouts (MuscleMap.vue / muscleShapes.ts).
const props = defineProps<{ done: Set<MuscleId>; last: Partial<Record<MuscleId, string>> }>()

const selected = ref<MuscleId | null>(null)
// Модель тела (BACKLOG 54.5): выбор из «Тренировок» (localStorage, общий origin) главнее, иначе пол из профиля, иначе мужская.
const gender = ref<string | null>(null)
onMounted(async () => {
  try {
    const { data: s } = await sb.auth.getSession()
    const uid = s?.session?.user?.id
    if (!uid) return
    const { data, error } = await sb.from('profiles').select('gender').eq('user_id', uid).maybeSingle()
    if (!error) gender.value = (data as { gender?: string | null } | null)?.gender ?? null
  } catch {
    /* без пола — мужская модель */
  }
})
const geometry = computed(() => bodyGeometry(resolveBodyModel(readBodyModelChoice(), gender.value)))
const views = computed<{ key: 'front' | 'back'; label: DictKey; shapes: MuscleShape[] }[]>(() => [
  { key: 'front', label: 'workouts_muscles_front', shapes: geometry.value.front },
  { key: 'back', label: 'workouts_muscles_back', shapes: geometry.value.back },
])
const name = (m: MuscleId) => t(`workouts_muscle_${m}` as DictKey)
function select(m: MuscleId) {
  selected.value = selected.value === m ? null : m
}
function shapeStyle(m: MuscleId) {
  const isDone = props.done.has(m)
  return {
    fill: isDone ? 'var(--success, #4caf6a)' : 'var(--text-dim, #999)',
    opacity: isDone ? 0.9 : 0.35,
    stroke: selected.value === m ? 'var(--accent, #6c8cff)' : 'transparent',
    strokeWidth: 1.6,
    cursor: 'pointer',
  }
}
</script>

<template>
  <div data-test="muscle-mini">
    <div class="gh-wrap" style="justify-content: space-around">
      <figure v-for="v in views" :key="v.key" style="margin: 0; text-align: center">
        <svg viewBox="0 0 100 190" width="96" height="182" role="group" :aria-label="t(v.label)">
          <circle cx="50" cy="14" r="9" fill="none" stroke="var(--border, #333)" stroke-width="1.2" />
          <path :d="geometry.outline" fill="none" stroke="var(--border, #333)" stroke-width="1.2" stroke-linejoin="round" data-testid="body-outline" />
          <g
            v-for="(s, i) in v.shapes"
            :key="v.key + i"
            :data-muscle="s.muscle"
            :data-state="done.has(s.muscle) ? 'done' : 'idle'"
            role="button"
            tabindex="0"
            :aria-label="name(s.muscle)"
            @click="select(s.muscle)"
            @keydown.enter.prevent="select(s.muscle)"
            @keydown.space.prevent="select(s.muscle)"
          >
            <component :is="s.tag" v-bind="s.attrs" :style="shapeStyle(s.muscle)" />
          </g>
        </svg>
        <figcaption class="gh-dim" style="font-size: 12px">{{ t(v.label) }}</figcaption>
      </figure>
    </div>

    <div class="gh-wrap gh-dim" style="justify-content: center; gap: 16px; font-size: 12px; margin-top: 6px">
      <span><span style="color: var(--success, #4caf6a)">■</span> {{ t('workouts_muscles_legend_done') }}</span>
      <span><span style="opacity: 0.5">■</span> {{ t('workouts_muscles_legend_idle') }}</span>
    </div>

    <p v-if="!selected" class="gh-dim" style="font-size: 12px; margin: 8px 0 0" data-test="muscle-hint">{{ t('hdr_panel_muscles_hint') }}</p>
    <div v-else style="margin-top: 8px; font-size: 13px" data-test="muscle-detail">
      <b>{{ name(selected) }}</b>
      <div class="gh-dim">{{ t('workouts_muscles_last') }} {{ last[selected] ?? t('workouts_muscles_never') }}</div>
    </div>
    <a href="/workouts/" class="gh-btn" style="display: inline-block; margin-top: 8px; text-decoration: none; font-size: 13px" data-test="muscle-open-workouts">{{ t('hdr_panel_muscles_open') }}</a>
  </div>
</template>
