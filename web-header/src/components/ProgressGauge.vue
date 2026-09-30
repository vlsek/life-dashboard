<script setup lang="ts">
import { computed } from 'vue'

// «Спидометр» прогресса для правой панели: дуга в 270° (разрыв внизу), основная доля — цветом акцента, бонус ⭐ — золотым
// поверх, процент в центре.
const props = defineProps<{ kind: 'day' | 'week'; basePct: number; bonusPct: number; totalPct: number; label: string; detail: string }>()
const emit = defineEmits<{ click: [] }>()

// день — со скруглёнными концами, неделя — с прямыми (угловатее), как круг и квадрат в шапке
const cap = computed(() => (props.kind === 'week' ? 'butt' : 'round'))
const R = 42
const SWEEP = 0.75 // доля окружности под дугу
const full = 2 * Math.PI * R
const arc = full * SWEEP
const baseLen = computed(() => arc * Math.min(1, Math.max(0, props.basePct)))
const bonusLen = computed(() => arc * Math.min(1, Math.max(0, props.bonusPct / 100)))
</script>

<template>
  <button type="button" class="gh-gauge" :data-kind="kind" :aria-label="`${label}: ${totalPct}%`" @click="emit('click')">
    <div style="position: relative; width: 104px; height: 104px">
      <svg width="104" height="104" viewBox="0 0 104 104" style="transform: rotate(135deg); display: block">
        <circle cx="52" cy="52" :r="R" fill="none" stroke="var(--border, #333)" stroke-width="8" :stroke-linecap="cap" :stroke-dasharray="`${arc} ${full}`" />
        <circle cx="52" cy="52" :r="R" fill="none" stroke="var(--accent, #6c8cff)" stroke-width="8" :stroke-linecap="cap" :stroke-dasharray="`${baseLen} ${full}`" />
        <circle v-if="bonusLen > 0" cx="52" cy="52" :r="R" fill="none" stroke="#f5b301" stroke-width="4" stroke-linecap="round" :stroke-dasharray="`${bonusLen} ${full}`" />
      </svg>
      <div class="gh-gauge-pct">{{ totalPct }}%</div>
    </div>
    <div style="font-weight: 600; margin-top: 2px">{{ label }}</div>
    <div class="gh-dim" style="font-size: 12px">{{ detail }}</div>
  </button>
</template>
