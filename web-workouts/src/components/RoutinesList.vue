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
    <h2 class="mb-2 text-sm font-semibold" style="color: var(--text-dim)">{{ t('rt_title') }}</h2>
    <div class="flex flex-col gap-2">
      <div v-for="r in rt.routines.value" :key="r.id" class="flex items-center gap-2 rounded-xl border p-3" style="border-color: var(--border); background: var(--bg-card)" :data-testid="'routine-' + r.id">
        <div class="min-w-0 flex-1">
          <div class="truncate font-semibold">{{ r.name }}</div>
          <div class="truncate text-xs" style="color: var(--text-dim)">{{ t('rt_count').replace('{n}', String(r.items.length)) }}<template v-if="brief(r)"> · {{ brief(r) }}</template></div>
        </div>
        <button type="button" class="rounded-lg px-4 py-2 text-sm font-semibold" style="background: var(--success); color: #fff; min-height: 44px" :disabled="disabled" :data-testid="'routine-start-' + r.id" @click="emit('start', r)">{{ t('rt_start') }}</button>
        <button type="button" class="px-2 py-2" style="color: var(--text-dim); min-width: 40px; min-height: 44px" :aria-label="t('rt_delete')" @click="remove(r)">✕</button>
      </div>
    </div>
    <p class="mt-1 text-xs" style="color: var(--text-dim)">{{ t('rt_device_note') }}</p>
  </section>
</template>
