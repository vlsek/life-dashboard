<script setup lang="ts">
import { computed } from 'vue'
import { collapseStyle } from '../lib/useCollapseStyle'

// «Карточка со сводкой» (BACKLOG 498, предмет «Кастомизации»): у СВЁРНУТОГО блока справа от заголовка — короткая строка итога.
// Показывается только при выбранном виде «сводка», свёрнутом блоке и непустом тексте; иначе блок выглядит как обычно (базовый шеврон).
// Одинаковая копия в web-dashboard и web-workouts (изоляция пилотов; страж collapseStyleCopies.test.ts в web-customization).
const props = defineProps<{ text?: string | null; collapsed: boolean }>()
const shown = computed(() => collapseStyle.value === 'summary' && props.collapsed && !!props.text?.trim())
</script>

<template>
  <span v-if="shown" class="collapse-summary" data-test="collapse-summary">{{ text }}</span>
</template>
