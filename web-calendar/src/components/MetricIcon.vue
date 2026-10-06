<script setup lang="ts">
import { computed } from 'vue'
import { metricIconKey } from '../../../web-history/src/lib/icons'
import Icon from './Icon.vue'

// Порт iconHtml(icon, style) из config.js: метрика хранит либо эмодзи, либо
// "svg:<имя>" — эта обёртка решает, что показать, не трогая сами данные метрики.
const props = defineProps<{ icon: string | null | undefined; extraStyle?: string }>()

const svgName = computed(() => metricIconKey(props.icon))
</script>

<template>
  <Icon v-if="svgName" :name="svgName" :extra-style="extraStyle" />
  <template v-else-if="icon && !icon.startsWith('svg:')">{{ icon }}</template>
</template>
