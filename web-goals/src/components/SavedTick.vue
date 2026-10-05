<script setup lang="ts">
import { t } from '../lib/i18n'

// Маленькая галочка «сохранено» в углу плашки (BACKLOG 23:25 / 815): появляется на ~0,9 с после ПОДТВЕРЖДЁННОЙ записи значения
// и мягко гаснет. Размещается внутри родителя с position: relative. Анимация — только в CSS; при `prefers-reduced-motion` и
// `html[data-motion=off]` галочка просто стоит на тот же срок без движения. Для скринридеров — вежливое «Сохранено».
defineProps<{ show: boolean }>()
</script>

<template>
  <span v-if="show" class="saved-tick" role="status" aria-live="polite" data-test="saved-tick">
    <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
      <circle cx="8" cy="8" r="8" fill="currentColor" />
      <path d="M4.6 8.3l2.2 2.2 4.6-4.9" fill="none" stroke="var(--bg-card)" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
    </svg>
    <span class="sr-only">{{ t('dash_saved_short') }}</span>
  </span>
</template>

<style scoped>
.saved-tick {
  position: absolute;
  top: 6px;
  right: 8px;
  display: inline-flex;
  color: var(--success);
  pointer-events: none;
  animation: saved-tick-pop 0.9s ease-out both;
}
@keyframes saved-tick-pop {
  0% { opacity: 0; transform: scale(0.4); }
  18% { opacity: 1; transform: scale(1.15); }
  32% { transform: scale(1); }
  75% { opacity: 1; }
  100% { opacity: 0; }
}
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  margin: -1px;
  padding: 0;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
@media (prefers-reduced-motion: reduce) {
  .saved-tick { animation: none; }
}
:global(html[data-motion='off']) .saved-tick { animation: none; }
</style>
