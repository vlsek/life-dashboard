<script setup lang="ts">
// Мини-картинка «как это выглядит» для предметов «Вид сворачивания блоков» (карточка в «Кастомизации»): три блока, один раскрыт.
// Аккордеон — раскрыт только один, остальные свёрнуты; сводка — у свёрнутых справа короткая строка итога.
defineProps<{ variant: 'accordion' | 'summary' | 'plus' | 'caret' | 'dot' | 'double' | 'square' | 'burger' | 'arrow' | 'ring' | 'diamond' | 'star' }>()
</script>

<template>
  <svg viewBox="0 0 80 56" width="80" height="56" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" :data-variant="variant">
    <rect x="2" y="2" width="76" height="26" rx="5" style="stroke: var(--accent)" />
    <path d="M10 11h30M10 20h44" style="stroke: var(--accent)" />
    <path v-if="variant === 'plus'" d="M66 11h8" style="stroke: var(--accent)" />
    <path v-else-if="variant === 'caret'" d="M66 8h8l-4 5z" fill="currentColor" style="stroke: var(--accent); fill: var(--accent)" />
    <circle v-else-if="variant === 'dot'" cx="70" cy="10" r="3.5" fill="currentColor" style="stroke: var(--accent); fill: var(--accent)" />
    <path v-else-if="variant === 'double'" d="M66 5l4 4 4-4M66 10l4 4 4-4" style="stroke: var(--accent)" />
    <rect v-else-if="variant === 'square'" x="66" y="6.5" width="8" height="8" rx="2" fill="currentColor" style="stroke: var(--accent); fill: var(--accent)" />
    <path v-else-if="variant === 'burger'" d="M66 8h8M66 13h8" style="stroke: var(--accent)" />
    <path v-else-if="variant === 'arrow'" d="M70 5v9M66 10.5l4 4 4-4" style="stroke: var(--accent)" />
    <circle v-else-if="variant === 'ring'" cx="70" cy="10" r="4.5" style="stroke: var(--accent)" />
    <path v-else-if="variant === 'diamond'" d="M12 4l7 8-7 8-7-8z" transform="translate(70 10) scale(0.36) translate(-12 -12)" style="stroke: var(--accent); fill: var(--accent)" />
    <path v-else-if="variant === 'star'" d="M12 4l2.4 5 5.4.7-4 3.8 1 5.4L12 16.2 7.2 18.9l1-5.4-4-3.8 5.4-.7z" transform="translate(70 10) scale(0.36) translate(-12 -12)" style="stroke: var(--accent); fill: var(--accent)" />
    <path v-else d="M66 8l4 4 4-4" style="stroke: var(--accent)" />
    <rect x="2" y="33" width="76" height="9" rx="4.5" opacity="0.7" />
    <path v-if="variant === 'plus'" d="M67 37.5h6M70 34.5v6" opacity="0.7" />
    <path v-else-if="variant === 'caret'" d="M67 35h6l-3 4z" fill="currentColor" opacity="0.7" />
    <circle v-else-if="variant === 'dot'" cx="70" cy="37.5" r="3" opacity="0.7" />
    <path v-else-if="variant === 'double'" d="M66 33l4 3 4-3M66 37l4 3 4-3" opacity="0.7" />
    <rect v-else-if="variant === 'square'" x="67" y="34.5" width="6" height="6" rx="1.5" opacity="0.7" />
    <path v-else-if="variant === 'burger'" d="M67 35h6M67 37.5h6M67 40h6" opacity="0.7" />
    <path v-else-if="variant === 'arrow'" d="M70 34v6M67 37.5l3 3 3-3" opacity="0.7" />
    <g v-else-if="variant === 'ring'" opacity="0.7"><circle cx="70" cy="37.5" r="3.4" /><circle cx="70" cy="37.5" r="1.1" fill="currentColor" /></g>
    <path v-else-if="variant === 'diamond'" d="M12 4l7 8-7 8-7-8z" transform="translate(70 37.5) scale(0.3) translate(-12 -12)" fill="none" opacity="0.7" />
    <path v-else-if="variant === 'star'" d="M12 4l2.4 5 5.4.7-4 3.8 1 5.4L12 16.2 7.2 18.9l1-5.4-4-3.8 5.4-.7z" transform="translate(70 37.5) scale(0.3) translate(-12 -12)" fill="none" opacity="0.7" />
    <path v-else d="M66 37.5l4 3 4-3" opacity="0.7" />
    <rect x="2" y="46" width="76" height="9" rx="4.5" opacity="0.7" />
    <path v-if="variant === 'plus'" d="M67 50.5h6M70 47.5v6" opacity="0.7" />
    <path v-else-if="variant === 'caret'" d="M67 48h6l-3 4z" fill="currentColor" opacity="0.7" />
    <circle v-else-if="variant === 'dot'" cx="70" cy="50.5" r="3" opacity="0.7" />
    <path v-else-if="variant === 'double'" d="M66 46l4 3 4-3M66 50l4 3 4-3" opacity="0.7" />
    <rect v-else-if="variant === 'square'" x="67" y="47.5" width="6" height="6" rx="1.5" opacity="0.7" />
    <path v-else-if="variant === 'burger'" d="M67 48h6M67 50.5h6M67 53h6" opacity="0.7" />
    <path v-else-if="variant === 'arrow'" d="M70 47v6M67 50.5l3 3 3-3" opacity="0.7" />
    <g v-else-if="variant === 'ring'" opacity="0.7"><circle cx="70" cy="50.5" r="3.4" /><circle cx="70" cy="50.5" r="1.1" fill="currentColor" /></g>
    <path v-else-if="variant === 'diamond'" d="M12 4l7 8-7 8-7-8z" transform="translate(70 50.5) scale(0.3) translate(-12 -12)" fill="none" opacity="0.7" />
    <path v-else-if="variant === 'star'" d="M12 4l2.4 5 5.4.7-4 3.8 1 5.4L12 16.2 7.2 18.9l1-5.4-4-3.8 5.4-.7z" transform="translate(70 50.5) scale(0.3) translate(-12 -12)" fill="none" opacity="0.7" />
    <path v-else d="M66 50.5l4 3 4-3" opacity="0.7" />
    <path v-if="variant === 'summary'" d="M42 37.5h16M42 50.5h12" opacity="0.7" />
  </svg>
</template>
