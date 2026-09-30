<script setup lang="ts">
import { onMounted } from 'vue'
import { t } from '../lib/i18n'
import { readCollapsed, writeCollapsed } from '../lib/collapsed'
import CollapseChevron from './CollapseChevron.vue'

// Заголовок секции: кликабельна вся шапка, справа шеврон (BACKLOG 9; в классике createCollapsibleSection остаётся со стрелкой). Состояние — v-model:collapsed,
// тело секции родитель прячет сам через v-show (компоненты остаются смонтированными и не теряют данные).
const props = defineProps<{ title: string; storageKey: string }>()
const collapsed = defineModel<boolean>('collapsed', { default: false })

onMounted(() => {
  collapsed.value = readCollapsed(props.storageKey)
})

function toggle() {
  // при v-model от родителя collapsed.value обновится только после его перерисовки — пишем вычисленное значение
  const next = !collapsed.value
  collapsed.value = next
  writeCollapsed(props.storageKey, next)
}
</script>

<template>
  <div
    class="collapse-head mb-2 flex items-center gap-2"
    role="button"
    tabindex="0"
    data-test="collapse-toggle"
    :aria-expanded="!collapsed"
    :title="collapsed ? t('dash_expand_btn') : t('dash_collapse_btn')"
    @click="toggle"
    @keydown.enter.prevent="toggle"
    @keydown.space.prevent="toggle"
  >
    <h2 class="text-lg font-semibold">{{ title }}</h2>
    <CollapseChevron :collapsed="collapsed" />
  </div>
</template>
