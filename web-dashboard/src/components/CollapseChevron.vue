<script setup lang="ts">
// Шеврон сворачивания: указывает вниз у развёрнутого блока и плавно поворачивается вправо у свёрнутого.
// Поворот и цвет — в style.css (.collapse-chevron); при prefers-reduced-motion анимация отключается.
import { collapseStyle } from '../lib/useCollapseStyle'
defineProps<{ collapsed: boolean }>()
</script>

<template>
  <svg
    class="collapse-chevron"
    :data-marker="collapseStyle"
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
    <template v-if="collapseStyle === 'plus'">
      <path d="M6 12h12" />
      <path v-if="collapsed" d="M12 6v12" />
    </template>
    <path v-else-if="collapseStyle === 'caret'" d="M7 10h10l-5 6z" fill="currentColor" stroke-width="1.4" />
    <path v-else d="M6 9l6 6 6-6" />
  </svg>
</template>
