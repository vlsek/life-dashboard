<script setup lang="ts">
// Превью платных анимаций воды в карточке предмета (BACKLOG 54.9): стакан с водой и знак вида — струйки дождя, волна прилива, искры.
// Статичное (сама анимация играет после надевания во вкладке «Анимация воды» и при записи выпитого); цвета воды — из токенов темы.
defineProps<{ variant: 'rain' | 'tide' | 'sparkle' }>()
const GLASS = 'M4.6 5.3h14.8l-1.5 17.8q-.25 3.2-3.4 3.2h-5q-3.15 0-3.4-3.2L4.6 5.3z'
</script>

<template>
  <svg width="54" height="68" viewBox="0 0 24 30" aria-hidden="true" :data-variant="variant" data-testid="water-preview-svg">
    <defs>
      <clipPath id="wp-clip"><path :d="GLASS" /></clipPath>
    </defs>
    <g clip-path="url(#wp-clip)">
      <rect x="0" y="0" width="24" height="30" style="fill: var(--water-bottom); fill-opacity: 0.1" />
      <path v-if="variant === 'tide'" d="M-2 13 q3 -3.2 6 0 t6 0 t6 0 t6 0 t6 0 V34 H-2 Z" style="fill: var(--water-top)" />
      <path v-else d="M-2 14 q3 -1.2 6 0 t6 0 t6 0 t6 0 t6 0 V34 H-2 Z" style="fill: var(--water-top)" />
    </g>
    <g v-if="variant === 'rain'" style="stroke: var(--water-top)" stroke-width="0.9" stroke-linecap="round">
      <line x1="8" y1="-1" x2="8" y2="2.4" />
      <line x1="12" y1="-3" x2="12" y2="0.6" />
      <line x1="16" y1="-1" x2="16" y2="2.4" />
    </g>
    <g v-if="variant === 'sparkle'" fill="var(--water-line)">
      <path d="M4 3l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7z" />
      <path d="M19.5 -1.5l.55 1.6 1.6.55-1.6.55-.55 1.6-.55-1.6-1.6-.55 1.6-.55z" />
      <path d="M12 -3l.45 1.3 1.3.45-1.3.45-.45 1.3-.45-1.3-1.3-.45 1.3-.45z" />
    </g>
    <path :d="GLASS" fill="none" style="stroke: var(--water-line)" stroke-width="1.2" stroke-linejoin="round" />
    <ellipse cx="12" cy="5.3" rx="7.4" ry="1.2" fill="none" style="stroke: var(--water-line)" stroke-width="0.9" />
  </svg>
</template>
