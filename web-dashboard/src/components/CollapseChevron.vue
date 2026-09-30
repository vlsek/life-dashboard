<script setup lang="ts">
// Шеврон сворачивания: указывает вниз у развёрнутого блока и плавно поворачивается вправо у свёрнутого.
// Поворот и цвет — в style.css (.collapse-chevron); при prefers-reduced-motion анимация отключается.
defineProps<{ collapsed: boolean }>()
</script>

<template>
  <svg
    class="collapse-chevron"
    :data-collapsed="String(collapsed)"
    viewBox="0 0 24 24"
    width="18"
    height="18"
    fill="none"
    stroke="currentColor"
    stroke-width="2.2"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <path d="M6 9l6 6 6-6" />
  </svg>
</template>
