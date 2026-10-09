<script setup lang="ts">
// Шеврон сворачивания: вниз у развёрнутого блока, плавно поворачивается вправо у свёрнутого.
// Стили — внутри компонента (общий style.css пилота не трогаем); при prefers-reduced-motion анимации нет.
defineProps<{ collapsed: boolean }>()
</script>

<template>
  <svg class="collapse-chevron" :data-collapsed="String(collapsed)" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d="M6 9l6 6 6-6" />
  </svg>
</template>

<style scoped>
.collapse-chevron {
  flex: none;
  color: var(--text-dim);
  transition: transform 0.2s ease, color 0.15s ease;
}
.collapse-chevron[data-collapsed='true'] {
  transform: rotate(-90deg);
}
@media (prefers-reduced-motion: reduce) {
  .collapse-chevron {
    transition: none;
  }
}
</style>
