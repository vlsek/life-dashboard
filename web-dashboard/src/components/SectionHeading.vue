<script setup lang="ts">
import { onMounted, watch } from 'vue'
import { t } from '../lib/i18n'
import { hasStoredCollapsed, readCollapsed, writeCollapsed } from '../lib/collapsed'
import { useAccordionMember } from '../lib/useCollapseStyle'
import CollapseChevron from './CollapseChevron.vue'
import CollapseSummary from './CollapseSummary.vue'
import { collapseStyle } from '../lib/useCollapseStyle'
import EmojiText from './EmojiText.vue'

// Заголовок секции: кликабельна вся шапка, справа шеврон (BACKLOG 9; в классике createCollapsibleSection остаётся со стрелкой). Состояние — v-model:collapsed,
// тело секции родитель прячет сам через v-show (компоненты остаются смонтированными и не теряют данные).
// defaultCollapsed — «свернуть по умолчанию» (например, график, который ещё не построен: BACKLOG 17). Действует ТОЛЬКО пока
// пользователь сам не разворачивал/сворачивал секцию (нет записи в localStorage) — явный выбор всегда сильнее.
const props = defineProps<{ title: string; storageKey: string; defaultCollapsed?: boolean; summary?: string }>()
const collapsed = defineModel<boolean>('collapsed', { default: false })

onMounted(() => {
  collapsed.value = hasStoredCollapsed(props.storageKey) ? readCollapsed(props.storageKey) : !!props.defaultCollapsed
})
watch(
  () => props.defaultCollapsed,
  (v) => {
    if (!hasStoredCollapsed(props.storageKey)) collapsed.value = !!v
  },
)

// «Аккордеон» (BACKLOG 498, предмет «Кастомизации»): раскрыли другой блок — этот сворачивается. При базовом шевроне ничего не происходит.
const announceOpened = useAccordionMember(
  props.storageKey,
  () => collapsed.value,
  () => {
    collapsed.value = true
    writeCollapsed(props.storageKey, true)
  },
)

function toggle() {
  // при v-model от родителя collapsed.value обновится только после его перерисовки — пишем вычисленное значение
  const next = !collapsed.value
  collapsed.value = next
  writeCollapsed(props.storageKey, next)
  if (!next) announceOpened()
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
    <h2 class="text-lg font-semibold"><EmojiText :text="title" /></h2>
    <CollapseChevron :collapsed="collapsed" />
    <!-- «карточка со сводкой» (BACKLOG 498 срез 3): итог свёрнутого блока справа от заголовка -->
    <CollapseSummary :text="summary" :collapsed="collapsed" />
    <!-- слот под ручку перетаскивания блока (BlockDragHandle): клик/клавиши внутри не сворачивают секцию -->
    <span v-if="$slots.actions" class="flex items-center" :class="collapseStyle === 'summary' && collapsed && summary ? 'ml-2' : 'ml-auto'" @click.stop @keydown.stop><slot name="actions" /></span>
  </div>
</template>
