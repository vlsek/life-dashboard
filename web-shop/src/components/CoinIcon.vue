<script setup lang="ts">
// Иконка баллов: монета с огоньком цвета темы (BACKLOG 14, 11:16 «монеты с огоньком»; перерисована в BACKLOG 16, 13:28 «монеты не похожи на монеты»).
// Вид спереди: круглый диск на всю клетку, ребристый кант (насечки `coin-rim`), внутренний бортик `coin-ring`, блик `coin-shine` и огонёк-тиснение
// в центре, который слегка мерцает (keyframes flame-flicker из style.css); при prefers-reduced-motion — статичный. Цвета — из темы (style.css).
// Размер 1em и вертикальная посадка — как у <Icon>, поэтому заменяет <Icon name="coin" /> один в один.
defineProps<{ extraStyle?: string }>()
</script>

<template>
  <svg
    class="coin-icon inline-block h-[1em] w-[1em] shrink-0 align-[-0.15em]"
    viewBox="0 0 24 24"
    fill="none"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
    data-test="coin-icon"
    :style="extraStyle"
  >
    <circle class="coin-body" cx="12" cy="12" r="10.2" />
    <circle class="coin-rim" cx="12" cy="12" r="8.9" />
    <circle class="coin-ring" cx="12" cy="12" r="6.9" />
    <g class="coin-emblem" transform="translate(12 12.3) scale(1.1) translate(-12 -6)">
      <path class="coin-flame-outer" d="M12 1c.9 2.8 3.4 3.9 3.4 6.6a3.4 3.4 0 0 1-6.8 0c0-1.5.8-2.4 1.6-3.4.8-1 1.5-1.9 1.8-3.2z" />
      <path class="coin-flame-inner" d="M12 4.3c.4 1.2 1.5 1.7 1.5 2.9a1.5 1.5 0 0 1-3 0c0-.7.4-1.1.7-1.6.4-.5.7-.8.8-1.3z" />
    </g>
    <path class="coin-shine" d="M4.84 8.66A7.9 7.9 0 0 1 8.66 4.84" />
  </svg>
</template>
