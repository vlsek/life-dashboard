<script setup lang="ts">
// Иконка огонька стрика — два разных SVG (не один тусклый generic-icon), как в dashboard.js:
// STREAK_SOLID_ICON (lit, двухслойное пламя, окрашено через .fl-outer/.fl-inner + CSS-мерцание)
// и STREAK_OUTLINE_ICON (unlit, пунктирный контур). Разметка путей скопирована дословно.
defineProps<{ lit: boolean }>()
</script>

<template>
  <svg
    v-if="lit"
    class="streak-flame"
    viewBox="0 0 32 32"
    width="18"
    height="18"
    aria-hidden="true"
  >
    <g transform="translate(16 16) scale(1.04) translate(-16 -16) translate(3.3 0.7)">
      <path
        class="fl-outer"
        d="M16.5 0.5c1.2 5.3-3.2 6.8-3.5 11a3.2 3.2 0 0 0 6.4 0.2c2.1 1.1 3.1 4.3 3.1 7.5a9.5 10.5 0 1 1-19.5 0.3c-0.1-6.4 4.2-9.7 6.3-14 1.1-2.2 2.1-3.5 7.2-5z"
      />
      <path
        class="fl-inner"
        d="M16.3 11.2c.6 3.2-1.6 3.8-1.6 6a1.6 1.6 0 0 0 3.2 0c1.1 3.2-.5 7-3.7 7a5.3 5.3 0 0 1-5.3-5.4c0-3.7 3.2-5.3 5.3-9 .4-.7.9-1.3 2.1-2.6z"
      />
    </g>
  </svg>
  <svg
    v-else
    viewBox="0 0 32 32"
    width="18"
    height="18"
    fill="none"
    stroke="currentColor"
    stroke-width="1.8"
    stroke-dasharray="2.6 2.2"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <path
      d="M16 2c1 5-3 6-3 10a3 3 0 0 0 6 0c2 1 3 4 3 7a9 9 0 1 1-18 0c0-6 4-9 6-13 1-2 2-3 6-4z"
    />
  </svg>
</template>
