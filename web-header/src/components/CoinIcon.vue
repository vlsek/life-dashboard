<script setup lang="ts">
// Монета с огоньком для слоя «+N / −N» (BACKLOG 469). Самодостаточная: цвета заданы атрибутами с запасными значениями
// (в шапке нет стилей `coin-*` Дашборда). Размер 1em, как у иконок.
</script>

<template>
  <svg class="gh-coin" viewBox="0 0 24 24" aria-hidden="true" data-test="coin-icon">
    <circle cx="12" cy="12" r="10.2" fill="var(--accent, #6c8cff)" />
    <circle cx="12" cy="12" r="8.9" fill="none" stroke="rgba(255,255,255,0.45)" stroke-width="0.8" stroke-dasharray="1.2 1.1" />
    <circle cx="12" cy="12" r="6.9" fill="none" stroke="rgba(0,0,0,0.25)" stroke-width="0.8" />
    <g transform="translate(12 12.3) scale(1.1) translate(-12 -6)">
      <path d="M12 1c.9 2.8 3.4 3.9 3.4 6.6a3.4 3.4 0 0 1-6.8 0c0-1.5.8-2.4 1.6-3.4.8-1 1.5-1.9 1.8-3.2z" fill="var(--accent-text, #fff)" />
      <path d="M12 4.3c.4 1.2 1.5 1.7 1.5 2.9a1.5 1.5 0 0 1-3 0c0-.7.4-1.1.7-1.6.4-.5.7-.8.8-1.3z" fill="var(--accent, #6c8cff)" />
    </g>
  </svg>
</template>
