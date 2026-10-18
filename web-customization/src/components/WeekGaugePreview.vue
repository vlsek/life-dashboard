<script setup lang="ts">
// Мини-картинка «как это выглядит» для предметов «Спидометр прогресса недели» (BACKLOG 53.2): классическое кольцо и семь столбиков на примере недели
// (пн–чт прошли, сегодня — пятница, дальше пусто). Только превью, настоящие виды рисуют шапка и Дашборд.
defineProps<{ variant: 'classic' | 'bars' | 'dots' | 'steps' | 'wave' | 'teeth' | 'valley' | 'slope' | 'peak' | 'saw' | 'towers' | 'weekend' }>()
const dotFill = [1, 0.7, 0.9, 0.5, 0.25, 0, 0]
// Высота столбика дня i в долях: «Волна» — дугой, «Долина» — перевёрнутой дугой, «Спуск» — лесенкой вниз (как в WeekAlt.vue шапки/Дашборда)
const trackPct = (variant: string, i: number): number => {
  const arc = Math.sin(Math.PI * (i + 0.5) / 7)
  return variant === 'valley' ? 1 - 0.6 * arc : variant === 'slope' ? 0.34 + 0.66 * (6 - i) / 6 : variant === 'peak' ? 0.34 + 0.66 * (1 - Math.abs(i - 3) / 3) : variant === 'saw' ? 0.4 + 0.3 * (i % 3) : variant === 'towers' ? (i % 3 === 1 ? 1 : 0.4) : variant === 'weekend' ? (i >= 5 ? 1 : 0.5) : 0.4 + 0.6 * arc
}
const dotPos = dotFill.map((_, i) => [28 + 20 * Math.cos(-Math.PI / 2 + (i * 2 * Math.PI) / 7), 28 + 20 * Math.sin(-Math.PI / 2 + (i * 2 * Math.PI) / 7)])
const fills = [1, 0.7, 0.9, 0.5, 0.25, 0, 0]
const C = 2 * Math.PI * 22
</script>

<template>
  <svg v-if="variant === 'classic'" viewBox="0 0 56 56" width="56" height="56" fill="none" stroke-linecap="round" aria-hidden="true" style="transform: rotate(-90deg)">
    <circle cx="28" cy="28" r="22" stroke="var(--border)" stroke-width="5" />
    <circle cx="28" cy="28" r="22" stroke="var(--accent)" stroke-width="5" :stroke-dasharray="`${C * 0.58} ${C}`" />
  </svg>
  <svg v-else-if="variant === 'dots'" viewBox="0 0 56 56" width="56" height="56" fill="none" aria-hidden="true" data-testid="week-preview-dots">
    <g v-for="(p, i) in dotPos" :key="i">
      <circle :cx="p[0]" :cy="p[1]" r="5.5" fill="var(--border)" />
      <circle v-if="dotFill[i] > 0" :cx="p[0]" :cy="p[1]" :r="5.5 * Math.sqrt(dotFill[i])" fill="var(--accent)" />
      <circle v-if="i === 4" :cx="p[0]" :cy="p[1]" r="7.5" stroke="var(--text-dim)" stroke-width="1" />
    </g>
  </svg>
  <svg v-else-if="variant === 'steps'" viewBox="0 0 70 56" width="70" height="56" fill="none" aria-hidden="true" data-testid="week-preview-steps">
    <g v-for="(f, i) in dotFill" :key="i">
      <rect :x="3 + i * 9.5" :y="52 - (16 + 36 * i / 6)" width="6" :height="16 + 36 * i / 6" rx="2" fill="var(--border)" />
      <rect v-if="f > 0" :x="3 + i * 9.5" :y="52 - (16 + 36 * i / 6) * f" width="6" :height="(16 + 36 * i / 6) * f" rx="2" fill="var(--accent)" />
      <rect v-if="i === 4" :x="1.5 + i * 9.5" :y="50.5 - (16 + 36 * i / 6)" width="9" :height="(16 + 36 * i / 6) + 3" rx="3" stroke="var(--text-dim)" stroke-width="1" />
    </g>
  </svg>
  <svg v-else-if="variant === 'wave' || variant === 'valley' || variant === 'slope' || variant === 'peak' || variant === 'saw' || variant === 'towers' || variant === 'weekend'" viewBox="0 0 70 56" width="70" height="56" fill="none" aria-hidden="true" :data-testid="'week-preview-' + variant">
    <g v-for="(f, i) in dotFill" :key="i">
      <rect :x="3 + i * 9.5" :y="52 - 52 * trackPct(variant, i)" width="6" :height="52 * trackPct(variant, i)" rx="2" fill="var(--border)" />
      <rect v-if="f > 0" :x="3 + i * 9.5" :y="52 - 52 * trackPct(variant, i) * f" width="6" :height="52 * trackPct(variant, i) * f" rx="2" fill="var(--accent)" />
    </g>
  </svg>
  <svg v-else-if="variant === 'teeth'" viewBox="0 0 70 56" width="70" height="56" fill="none" aria-hidden="true" data-testid="week-preview-teeth">
    <g v-for="(f, i) in dotFill" :key="i">
      <rect :x="3 + i * 9.5" :y="52 - 52 * (i % 2 === 0 ? 1 : 0.55)" width="6" :height="52 * (i % 2 === 0 ? 1 : 0.55)" rx="2" fill="var(--border)" />
      <rect v-if="f > 0" :x="3 + i * 9.5" :y="52 - 52 * (i % 2 === 0 ? 1 : 0.55) * f" width="6" :height="52 * (i % 2 === 0 ? 1 : 0.55) * f" rx="2" fill="var(--accent)" />
    </g>
  </svg>
  <svg v-else viewBox="0 0 70 56" width="70" height="56" fill="none" aria-hidden="true">
    <g v-for="(f, i) in fills" :key="i">
      <rect :x="3 + i * 9.5" y="4" width="6" height="48" rx="3" fill="var(--border)" />
      <rect v-if="f > 0" :x="3 + i * 9.5" :y="52 - 48 * f" width="6" :height="48 * f" rx="3" fill="var(--accent)" />
      <rect v-if="i === 4" :x="1.5 + i * 9.5" y="2.5" width="9" height="51" rx="4.5" stroke="var(--text-dim)" stroke-width="1" />
    </g>
  </svg>
</template>
