<script setup lang="ts">
import EmojiText from './EmojiText.vue'
import { computed } from 'vue'
import { t } from '../lib/i18n'
import { weekDaysAriaLabel, type WeekDaySegment } from '../lib/progress'
import type { WeekGaugeStyle } from '../lib/weekGauge'
import WeekHeptagon from './WeekHeptagon.vue'
import WeekBars from './WeekBars.vue'
import WeekAlt from './WeekAlt.vue'

// «Спидометр» прогресса для правой панели: дуга в 270° (разрыв внизу), основная доля — цветом акцента, бонус ⭐ — золотым
// поверх, процент в центре.
const props = defineProps<{ kind: 'day' | 'week'; basePct: number; bonusPct: number; totalPct: number; label: string; detail: string; shape?: WeekGaugeStyle; days?: WeekDaySegment[] | null }>()
const emit = defineEmits<{ click: [] }>()

// день — со скруглёнными концами, неделя — с прямыми (угловатее), как круг и квадрат в шапке
const cap = computed(() => (props.kind === 'week' ? 'butt' : 'round'))
const R = 42
const SWEEP = 0.75 // доля окружности под дугу
const full = 2 * Math.PI * R
const arc = full * SWEEP
const sevenDays = computed(() => props.kind === 'week' && props.days?.length === 7)
const hept = computed(() => sevenDays.value && (props.shape ?? 'heptagon') === 'heptagon')
const bars = computed(() => sevenDays.value && props.shape === 'bars')
const alt = computed(() => (sevenDays.value && (props.shape === 'dots' || props.shape === 'steps' || props.shape === 'wave') ? props.shape : null))
const aria = computed(() => ((hept.value || bars.value || alt.value) && props.days ? `${props.label}: ${props.totalPct}%. ${weekDaysAriaLabel(props.days, t('dash_summary_weekdays'))}` : `${props.label}: ${props.totalPct}%`))
const baseLen = computed(() => arc * Math.min(1, Math.max(0, props.basePct)))
const bonusLen = computed(() => arc * Math.min(1, Math.max(0, props.bonusPct / 100)))
</script>

<template>
  <button type="button" class="gh-gauge" :data-kind="kind" :aria-label="aria" @click="emit('click')">
    <div style="position: relative; width: 104px; height: 104px">
      <WeekHeptagon v-if="hept && days" :days="days" :size="104" :radius="44" :stroke="8" />
      <WeekBars v-else-if="bars && days" :days="days" :size="104" :stroke="10" />
      <WeekAlt v-else-if="alt && days" :days="days" :size="104" :variant="alt" />
      <svg v-else width="104" height="104" viewBox="0 0 104 104" style="transform: rotate(135deg); display: block">
        <circle cx="52" cy="52" :r="R" fill="none" stroke="var(--border, #333)" stroke-width="8" :stroke-linecap="cap" :stroke-dasharray="`${arc} ${full}`" />
        <circle cx="52" cy="52" :r="R" fill="none" stroke="var(--accent, #6c8cff)" stroke-width="8" :stroke-linecap="cap" :stroke-dasharray="`${baseLen} ${full}`" />
        <circle v-if="bonusLen > 0" cx="52" cy="52" :r="R" fill="none" stroke="#f5b301" stroke-width="4" stroke-linecap="round" :stroke-dasharray="`${bonusLen} ${full}`" />
      </svg>
      <div class="gh-gauge-pct">{{ totalPct }}%</div>
    </div>
    <div style="font-weight: 600; margin-top: 2px">{{ label }}</div>
    <div class="gh-dim" style="font-size: 12px"><EmojiText :text="detail" /></div>
  </button>
</template>
