<script setup lang="ts">
// Мини-картинка «как это выглядит» для предметов «Вид сворачивания блоков» (карточка в «Кастомизации»): три блока, один раскрыт.
// Аккордеон — раскрыт только один, остальные свёрнуты; сводка — у свёрнутых справа короткая строка итога.
defineProps<{ variant: 'accordion' | 'summary' }>()
</script>

<template>
  <svg viewBox="0 0 80 56" width="80" height="56" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" :data-variant="variant">
    <rect x="2" y="2" width="76" height="26" rx="5" style="stroke: var(--accent)" />
    <path d="M10 11h30M10 20h44" style="stroke: var(--accent)" />
    <path d="M66 8l4 4 4-4" style="stroke: var(--accent)" />
    <rect x="2" y="33" width="76" height="9" rx="4.5" opacity="0.7" />
    <path d="M66 37.5l4 3 4-3" opacity="0.7" />
    <rect x="2" y="46" width="76" height="9" rx="4.5" opacity="0.7" />
    <path d="M66 50.5l4 3 4-3" opacity="0.7" />
    <path v-if="variant === 'summary'" d="M42 37.5h16M42 50.5h12" opacity="0.7" />
  </svg>
</template>
