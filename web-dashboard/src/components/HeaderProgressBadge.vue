<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { circleGeometry, squareGeometry } from '../lib/ringPlacement'
import type { WeekDaySegment } from '../lib/progress'
import WeekHeptagon from './WeekHeptagon.vue'

// Бейдж прогресса в шапке (режим "header") — рисуется в #topbar-right из AppShell через Teleport.
// День — круг, неделя — скруглённый квадрат с пунктирной дорожкой, чтобы отличались с первого взгляда
// (портировано из renderHeaderProgressBadge()/renderHeaderWeekBadge() в dashboard.js).
const props = defineProps<{ kind: 'day' | 'week'; basePct: number; bonusPct: number; totalPct: number; title: string; shape?: 'heptagon' | 'classic'; days?: WeekDaySegment[] | null }>()
const emit = defineEmits<{ click: [] }>()

// цель Teleport должна уже быть в DOM — включаем бейдж после монтирования
const ready = ref(false)
onMounted(() => (ready.value = !!document.getElementById('topbar-right')))

const circle = computed(() => circleGeometry(13, props.basePct, props.bonusPct))
// Неделя — семиугольник по дням (как в шапке остальных страниц, BACKLOG 53.3), если вид не «классика» и есть данные по 7 дням
const hept = computed(() => props.kind === 'week' && props.shape !== 'classic' && props.days?.length === 7)
const square = computed(() => squareGeometry(24, 6, props.basePct, props.bonusPct))
</script>

<template>
  <Teleport v-if="ready" to="#topbar-right">
    <button
      type="button"
      class="relative shrink-0 p-0"
      :data-kind="kind"
      :title="title"
      style="background: transparent; border: none; width: 32px; height: 32px; min-height: 0"
      @click="emit('click')"
    >
      <WeekHeptagon v-if="hept && days" :days="days" :size="32" :radius="13.5" :stroke="3.2" />
      <svg v-else width="32" height="32" viewBox="0 0 32 32" style="transform: rotate(-90deg); display: block">
        <template v-if="kind === 'day'">
          <circle cx="16" cy="16" r="13" fill="none" stroke="var(--border)" stroke-width="3" />
          <circle cx="16" cy="16" r="13" fill="none" stroke="var(--accent)" stroke-width="3" stroke-linecap="round" :stroke-dasharray="circle.circumference" :stroke-dashoffset="circle.offsetBase" />
          <circle v-if="bonusPct > 0" cx="16" cy="16" r="13" fill="none" class="ring-bonus" stroke-width="3" stroke-linecap="round" :stroke-dasharray="circle.circumference" :stroke-dashoffset="circle.offsetBonus" />
        </template>
        <template v-else>
          <rect x="4" y="4" width="24" height="24" rx="6" fill="none" stroke="var(--border)" stroke-width="4" stroke-dasharray="3 3" />
          <rect x="4" y="4" width="24" height="24" rx="6" fill="none" stroke="var(--accent)" stroke-width="4" stroke-linecap="round" :stroke-dasharray="square.perimeter" :stroke-dashoffset="square.offsetBase" />
          <rect v-if="bonusPct > 0" x="4" y="4" width="24" height="24" rx="6" fill="none" class="ring-bonus" stroke-width="4" stroke-linecap="round" :stroke-dasharray="square.perimeter" :stroke-dashoffset="square.offsetBonus" />
        </template>
      </svg>
      <span class="absolute inset-0 flex items-center justify-center text-[9px] font-bold" style="color: var(--text)">{{ totalPct }}%</span>
    </button>
  </Teleport>
</template>
