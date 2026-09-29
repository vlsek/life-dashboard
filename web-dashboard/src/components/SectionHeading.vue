<script setup lang="ts">
import { onMounted } from 'vue'
import { t } from '../lib/i18n'
import { readCollapsed, writeCollapsed } from '../lib/collapsed'

// Заголовок секции со стрелкой ▼/▶ (как createCollapsibleSection в классике). Состояние — v-model:collapsed,
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
  <div class="mb-2 flex items-center gap-2">
    <h2 class="text-lg font-semibold">{{ title }}</h2>
    <button
      type="button"
      class="secondary"
      style="padding: 2px 9px; font-size: 0.8em"
      data-test="collapse-toggle"
      :aria-expanded="!collapsed"
      :title="collapsed ? t('dash_expand_btn') : t('dash_collapse_btn')"
      @click="toggle"
    >
      {{ collapsed ? '▶' : '▼' }}
    </button>
  </div>
</template>
