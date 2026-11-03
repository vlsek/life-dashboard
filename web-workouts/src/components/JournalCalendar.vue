<script setup lang="ts">
import { computed } from 'vue'
import { monthGrid } from '../lib/journal'

// Мини-календарь месяца в «Журнале» (BACKLOG 69.11, срез 4): точка у дней с тренировками, тап по такому дню — показать только его, повторный тап снимает.
const props = defineProps<{ month: string; activeDates: string[]; selected: string | null }>()
const emit = defineEmits<{ (e: 'select', date: string | null): void }>()
const weeks = computed(() => monthGrid(props.month, new Set(props.activeDates)))
const pick = (date: string | null, active: boolean) => {
  if (!date || !active) return
  emit('select', props.selected === date ? null : date)
}
</script>

<template>
  <div class="mb-3 inline-block rounded-xl border p-2" style="border-color: var(--border); background: var(--bg-card)" data-testid="journal-calendar">
    <div v-for="(w, wi) in weeks" :key="wi" class="grid grid-cols-7">
      <button
        v-for="(c, ci) in w"
        :key="ci"
        type="button"
        class="relative h-8 w-8 rounded-lg border-0 bg-transparent p-0 text-xs"
        :disabled="!c.active"
        :style="{ color: c.date ? 'var(--text)' : 'transparent', background: c.date && c.date === selected ? 'var(--accent, #4f8cff)' : 'transparent', opacity: c.date && !c.active ? 0.45 : 1 }"
        :data-testid="c.date ? 'journal-cal-day' : undefined"
        :data-date="c.date ?? undefined"
        :aria-pressed="c.date === selected"
        @click="pick(c.date, c.active)"
      >
        {{ c.day || '' }}
        <span v-if="c.active" class="absolute bottom-0.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full" style="background: var(--accent, #4f8cff)" data-testid="journal-cal-dot"></span>
      </button>
    </div>
  </div>
</template>
