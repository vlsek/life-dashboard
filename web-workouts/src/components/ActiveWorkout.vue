<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import { useActiveWorkout } from '../lib/useActiveWorkout'
import { doneSetCount, formatElapsed, previousSet, previousText } from '../lib/activeWorkout'
import { parseNum } from '../lib/entrySets'
import { setType, SET_TYPES } from '../lib/sessionContract'
import { t, type DictKey } from '../lib/i18n'
import { prSetText, setRecords, topKind } from '../lib/records'
import { showToast } from '../lib/toast'
import { haptic } from '../lib/nativeFeedback'
import type { Exercise, WorkoutEntry } from '../lib/types'

// Экран активной тренировки (BACKLOG 69.2, макет A): липкая шапка с секундомером, блоки упражнений со строками подходов «№ · прошлый раз · вес · повторы · ✓».
// Данные черновика — useActiveWorkout (localStorage); сохранение в Supabase делает App.vue по событию finish.
const props = defineProps<{ exercises: Exercise[]; entries: WorkoutEntry[]; unit: string; busy: boolean }>()
const emit = defineEmits<{ finish: []; cancel: [] }>()
const aw = useActiveWorkout()
const draft = computed(() => aw.draft.value)
const exById = computed(() => new Map(props.exercises.map((e) => [e.id, e])))
// Рекорды (69.9): по каждому упражнению — какие рекорды побил каждый выполненный подход (история = записи ДО даты тренировки)
const prMap = computed(() => {
  const m = new Map<string, ReturnType<typeof setRecords>>()
  const d = draft.value
  if (!d) return m
  for (const e of d.exercises) m.set(e.id, setRecords(props.entries.filter((x) => x.exercise_id === e.exercise_id && x.date < d.date), e.sets))
  return m
})
const prKind = (entryId: string, i: number) => topKind(prMap.value.get(entryId)?.[i] ?? [])
async function onTick(entryId: string, i: number) {
  aw.toggleDone(entryId, i)
  await nextTick()
  const k = prKind(entryId, i)
  const e = draft.value?.exercises.find((x) => x.id === entryId)
  if (k && e) {
    showToast(t('aw_pr_toast').replace('{x}', prSetText(e.sets[i], unitOf(exById.value.get(e.exercise_id)))))
    haptic('success')
  }
}
const picking = ref(false)
const query = ref('')
const pickList = computed(() => {
  const q = query.value.trim().toLowerCase()
  return props.exercises.filter((e) => !q || e.name.toLowerCase().includes(q))
})
const unitOf = (ex: Exercise | undefined) => ex?.unit || props.unit
const TYPE_MARK: Record<string, string> = { normal: '', warmup: 'W', drop: 'D', failure: 'F' }
const TYPE_LABEL = (ty: string): string => (ty === 'warmup' ? t('aw_type_warmup') : ty === 'drop' ? t('aw_type_drop') : ty === 'failure' ? t('aw_type_failure') : '')
function cycleType(entryId: string, i: number, current: string) {
  const next = SET_TYPES[(SET_TYPES.indexOf(current as (typeof SET_TYPES)[number]) + 1) % SET_TYPES.length]
  aw.setType(entryId, i, next)
}
// Номер показываем только по рабочим подходам: разминка — буква W
function label(entryId: string, i: number): string {
  const e = draft.value?.exercises.find((x) => x.id === entryId)
  if (!e) return ''
  const ty = setType(e.sets[i])
  if (ty !== 'normal') return TYPE_MARK[ty]
  return String(e.sets.slice(0, i + 1).filter((s) => setType(s) === 'normal').length)
}
const onNum = (entryId: string, i: number, field: 'weight' | 'reps' | 'duration', ev: Event) => aw.update(entryId, i, { [field]: parseNum((ev.target as HTMLInputElement).value) })
function pick(id: string) {
  aw.addExercise(id)
  picking.value = false
  query.value = ''
}
const inputCls = 'w-full rounded-md border px-2 py-2 text-center text-base'
const inputStyle = 'border-color: var(--border); background: var(--bg); color: var(--text); min-height: 44px'
</script>

<template>
  <div v-if="draft" class="fixed inset-0 z-50 overflow-y-auto" style="background: var(--bg); color: var(--text)" data-testid="active-workout" role="dialog" aria-modal="true">
    <header class="sticky top-0 z-10 border-b px-4 py-3" style="background: var(--bg-card); border-color: var(--border)">
      <div class="mx-auto flex max-w-3xl items-center gap-3">
        <button type="button" class="rounded-lg border px-3 py-2 text-sm" style="border-color: var(--border); color: var(--text-dim); min-height: 44px" data-testid="aw-cancel" @click="emit('cancel')">
          {{ t('aw_cancel') }}
        </button>
        <div class="min-w-0 flex-1 text-center">
          <div class="text-xl font-bold tabular-nums" data-testid="aw-timer" aria-live="off">{{ formatElapsed(aw.elapsed.value) }}</div>
          <input
            :value="draft.name ?? ''"
            :placeholder="t('aw_title_ph')"
            maxlength="80"
            class="w-full bg-transparent text-center text-sm outline-none"
            style="color: var(--text-dim)"
            :aria-label="t('aw_title_ph')"
            @input="aw.setName(($event.target as HTMLInputElement).value)"
          />
        </div>
        <button
          type="button"
          class="rounded-lg px-4 py-2 text-sm font-semibold"
          style="background: var(--success); color: #fff; min-height: 44px"
          :disabled="busy"
          data-testid="aw-finish"
          @click="emit('finish')"
        >
          {{ t('aw_finish') }}
        </button>
      </div>
      <div class="mx-auto mt-1 max-w-3xl text-center text-xs" style="color: var(--text-dim)">{{ t('aw_done_sets').replace('{n}', String(doneSetCount(draft))) }}</div>
    </header>

    <main class="mx-auto max-w-3xl px-4 pb-24 pt-4">
      <p v-if="draft.exercises.length === 0" class="py-6 text-center text-sm" style="color: var(--text-dim)">{{ t('aw_empty') }}</p>

      <section v-for="(e, ei) in draft.exercises" :key="e.id" class="mb-4 rounded-xl border p-3" style="border-color: var(--border); background: var(--bg-card)" :data-testid="'aw-ex-' + ei">
        <div class="mb-2 flex items-center gap-1">
          <h2 class="min-w-0 flex-1 truncate font-semibold">{{ exById.get(e.exercise_id)?.name ?? '—' }}</h2>
          <button type="button" class="px-2 py-2 text-sm" style="color: var(--text-dim); min-width: 40px; min-height: 40px" :aria-label="t('aw_move_up')" :disabled="ei === 0" @click="aw.move(e.id, -1)">↑</button>
          <button type="button" class="px-2 py-2 text-sm" style="color: var(--text-dim); min-width: 40px; min-height: 40px" :aria-label="t('aw_move_down')" :disabled="ei === draft.exercises.length - 1" @click="aw.move(e.id, 1)">↓</button>
          <button type="button" class="px-2 py-2 text-sm" style="color: var(--danger); min-width: 40px; min-height: 40px" :aria-label="t('aw_remove_exercise')" @click="aw.removeExercise(e.id)">✕</button>
        </div>
        <div class="grid items-center gap-2 text-xs" style="grid-template-columns: 40px 1fr 1fr 1fr 44px 28px; color: var(--text-dim)">
          <span class="text-center">#</span>
          <span class="text-center">{{ t('aw_prev') }}</span>
          <span class="text-center">{{ exById.get(e.exercise_id)?.tracks_weight ? t('aw_weight') + ', ' + unitOf(exById.get(e.exercise_id)) : t('aw_value') }}</span>
          <span class="text-center">{{ exById.get(e.exercise_id)?.tracks_duration ? t('aw_minutes') : t('aw_reps') }}</span>
          <span></span><span></span>
        </div>
        <template v-for="(s, i) in e.sets" :key="i">
        <div
          class="mt-1 grid items-center gap-2 rounded-md"
          :style="'grid-template-columns: 40px 1fr 1fr 1fr 44px 28px;' + (s.done === true ? 'background: color-mix(in srgb, var(--success) 18%, transparent)' : '')"
          :data-testid="'aw-set-' + ei + '-' + i"
        >
          <button type="button" class="rounded-md text-sm font-semibold" style="min-height: 44px; color: var(--text-dim)" :aria-label="t('aw_set_type') + (TYPE_LABEL(setType(s)) ? ': ' + TYPE_LABEL(setType(s)) : '')" :title="TYPE_LABEL(setType(s))" @click="cycleType(e.id, i, setType(s))">
            {{ label(e.id, i) }}
          </button>
          <span class="truncate text-center text-xs" style="color: var(--text-dim)">{{ previousText(previousSet(entries, e.exercise_id, draft.date, i), unitOf(exById.get(e.exercise_id))) || '—' }}</span>
          <input
            v-if="exById.get(e.exercise_id)?.tracks_weight"
            type="text"
            inputmode="decimal"
            :value="s.weight ?? ''"
            :class="inputCls"
            :style="inputStyle"
            :aria-label="t('aw_weight')"
            @input="onNum(e.id, i, 'weight', $event)"
          />
          <input v-else type="text" inputmode="decimal" :value="s.weight ?? ''" :class="inputCls" :style="inputStyle" :aria-label="t('aw_value')" @input="onNum(e.id, i, 'weight', $event)" />
          <input
            v-if="exById.get(e.exercise_id)?.tracks_duration"
            type="text"
            inputmode="numeric"
            :value="s.duration ?? ''"
            :class="inputCls"
            :style="inputStyle"
            :aria-label="t('aw_minutes')"
            @input="onNum(e.id, i, 'duration', $event)"
          />
          <input v-else type="text" inputmode="numeric" :value="s.reps ?? ''" :class="inputCls" :style="inputStyle" :aria-label="t('aw_reps')" @input="onNum(e.id, i, 'reps', $event)" />
          <button
            type="button"
            class="rounded-md border text-lg"
            :style="'min-height: 44px; border-color: var(--border);' + (s.done === true ? 'background: var(--success); color: #fff' : 'color: var(--text-dim)')"
            :aria-pressed="s.done === true"
            :aria-label="t('aw_set_done')"
            @click="onTick(e.id, i)"
          >
            ✓
          </button>
          <button type="button" class="text-sm" style="color: var(--text-dim); min-height: 44px" :aria-label="t('aw_remove_set')" @click="aw.removeSet(e.id, i)">×</button>
        </div>
        <div v-if="prKind(e.id, i)" class="mt-0.5 text-xs font-semibold" style="color: var(--accent)" :data-testid="'aw-pr-' + ei + '-' + i">
          ★ {{ t(('aw_pr_' + prKind(e.id, i)) as DictKey) }} · {{ prSetText(s, unitOf(exById.get(e.exercise_id))) }}
        </div>
        </template>
        <button type="button" class="mt-2 w-full rounded-md border py-2 text-sm" style="border-color: var(--border); color: var(--accent); min-height: 44px" @click="aw.addSet(e.id)">{{ t('aw_add_set') }}</button>
      </section>

      <button type="button" class="w-full rounded-xl border-2 border-dashed py-3 text-sm font-medium" style="border-color: var(--accent); color: var(--accent); min-height: 48px" data-testid="aw-add-exercise" @click="picking = true">
        {{ t('aw_add_exercise') }}
      </button>
    </main>

    <div v-if="picking" class="fixed inset-0 z-[60] flex items-end justify-center sm:items-center" style="background: rgba(0, 0, 0, 0.6)" @click.self="picking = false">
      <div class="flex max-h-[80vh] w-full max-w-md flex-col rounded-t-2xl border p-4 sm:rounded-2xl" style="background: var(--bg-card); border-color: var(--border)" role="dialog" :aria-label="t('aw_pick_title')">
        <div class="mb-2 flex items-center justify-between">
          <h3 class="font-semibold">{{ t('aw_pick_title') }}</h3>
          <button type="button" class="px-2 py-1" style="color: var(--text-dim); min-height: 40px" @click="picking = false">✕</button>
        </div>
        <input v-model="query" type="text" :placeholder="t('aw_search')" class="mb-2 w-full rounded-md border px-3 py-2" style="border-color: var(--border); background: var(--bg); color: var(--text); min-height: 44px" data-testid="aw-search" />
        <p v-if="exercises.length === 0" class="py-4 text-sm" style="color: var(--text-dim)">{{ t('aw_no_exercises') }}</p>
        <ul class="overflow-y-auto">
          <li v-for="ex in pickList" :key="ex.id">
            <button type="button" class="w-full rounded-md px-3 py-3 text-left" style="min-height: 48px" :data-testid="'aw-pick-' + ex.id" @click="pick(ex.id)">{{ ex.name }}</button>
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>
