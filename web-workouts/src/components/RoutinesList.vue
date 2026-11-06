<script setup lang="ts">
import { computed } from 'vue'
import { t } from '../lib/i18n'
import { useRoutines } from '../lib/useRoutines'
import { confirmDialog } from '../lib/confirmDialog'
import type { Routine } from '../lib/routines'
import type { Exercise } from '../lib/types'

// Список рутин на странице (BACKLOG 69.7, срез 1): карточка = название, упражнения кратко, «Начать». Старт из рутины делает App.vue.
const props = defineProps<{ exercises: Exercise[]; disabled: boolean }>()
const emit = defineEmits<{ start: [Routine] }>()
const rt = useRoutines()
const names = computed(() => new Map(props.exercises.map((e) => [e.id, e.name])))
const brief = (r: Routine) => r.items.map((i) => names.value.get(i.exercise_id)).filter(Boolean).slice(0, 3).join(' · ')
async function remove(r: Routine) {
  if (await confirmDialog(t('rt_confirm_delete').replace('{name}', r.name))) rt.remove(r.id)
}
</script>

<template>
  <section v-if="rt.routines.value.length" class="mb-4" data-testid="routines">
    <h2 class="mb-2 text-xs font-semibold uppercase tracking-wide" style="color: var(--text-dim)">{{ t('rt_title') }}</h2>
    <!-- карусель карточек (69.17, срез 3, макет v2): горизонтальная прокрутка с привязкой; на ПК карточки фиксированной ширины -->
    <div class="-mx-4 flex scroll-pl-4 snap-x snap-mandatory gap-2 overflow-x-auto px-4 pb-1" data-testid="routines-carousel">
      <div v-for="r in rt.routines.value" :key="r.id" class="flex w-[72%] shrink-0 snap-start flex-col rounded-xl border p-3 sm:w-64" style="border-color: var(--border); background: var(--bg-card)" :data-testid="'routine-' + r.id">
        <div class="truncate font-semibold">{{ r.name }}</div>
        <div class="text-xs" style="color: var(--text-dim)">{{ t('rt_count').replace('{n}', String(r.items.length)) }}</div>
        <div class="mt-1 line-clamp-2 min-h-[2rem] text-xs" style="color: var(--text-dim)" data-testid="routine-brief">{{ brief(r) }}</div>
        <div class="mt-2 flex items-center gap-1">
          <button type="button" class="flex-1 rounded-lg px-4 py-2 text-sm font-bold" style="background: var(--accent); color: var(--accent-text); min-height: 44px" :disabled="disabled" :data-testid="'routine-start-' + r.id" @click="emit('start', r)">{{ t('rt_start') }}</button>
          <button type="button" class="px-2 py-2" style="color: var(--text-dim); min-width: 40px; min-height: 44px" :aria-label="t('rt_duplicate')" :data-testid="'routine-dup-' + r.id" @click="rt.duplicate(r.id, t('rt_copy_suffix'))">⧉</button>
          <button type="button" class="px-2 py-2" style="color: var(--text-dim); min-width: 40px; min-height: 44px" :aria-label="t('rt_delete')" :data-testid="'routine-del-' + r.id" @click="remove(r)">✕</button>
        </div>
      </div>
    </div>
    <p v-if="!rt.synced.value" class="mt-1 text-xs" style="color: var(--text-dim)">{{ t('rt_device_note') }}</p>
  </section>
</template>
