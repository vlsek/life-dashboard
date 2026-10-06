<script setup lang="ts">
import EmojiText from './EmojiText.vue'
import { t } from '../lib/i18n'
import { moveTo } from '../lib/dragReorder'
import { useRowDrag } from '../lib/useRowDrag'
import { toggleBlock, type DashboardBlockKey, type LayoutItem } from '../lib/layout'
import Icon from './Icon.vue'

// Список блоков Дашборда: карточки с ручкой ☰ (перетаскивание пальцем/мышью), переключателем видимости и кнопками ↑/↓
// (клавиатура и точный порядок без жеста). Состояние — v-model; сохранение делает родитель.
const props = defineProps<{ modelValue: LayoutItem[]; labels: Record<DashboardBlockKey, { title: string; desc: string }> }>()
const emit = defineEmits<{ 'update:modelValue': [LayoutItem[]] }>()

const { setListEl, drag, dragging, onDown, onMove, onUp, onCancel, onKey, rowStyle } = useRowDrag(
  () => props.modelValue,
  (next) => emit('update:modelValue', next),
)

function commit(next: LayoutItem[]) {
  emit('update:modelValue', next)
}
</script>

<template>
  <div :ref="setListEl" class="flex flex-col gap-2" :style="{ userSelect: dragging ? 'none' : undefined }" data-test="block-list">
    <div
      v-for="(item, i) in modelValue"
      :key="item.key"
      class="relative flex items-center gap-2 rounded-xl border p-2.5"
      :class="{ 'is-dragging': drag?.from === i }"
      :style="{ borderColor: 'var(--border)', background: 'var(--bg)', ...rowStyle(i) }"
      data-test="layout-row"
    >
      <button
        type="button"
        class="grid h-9 w-8 flex-none cursor-grab place-items-center rounded-lg text-lg leading-none"
        style="touch-action: none; background: transparent; border: none; color: var(--text-dim)"
        data-test="drag-handle"
        :aria-label="t('dash_layout_drag')"
        :title="t('dash_layout_drag')"
        @pointerdown.prevent="onDown($event, i)"
        @pointermove="onMove"
        @pointerup="onUp"
        @pointercancel="onCancel"
        @keydown="onKey($event, i)"
      ><Icon name="menu" /></button>

      <div class="min-w-0 flex-1" :style="{ opacity: item.visible ? 1 : 0.5 }">
        <div class="font-medium"><EmojiText :text="labels[item.key].title" /></div>
        <div class="dim text-xs">{{ labels[item.key].desc }}</div>
      </div>

      <button type="button" class="rounded-md border px-2 py-1 text-sm" style="border-color: var(--border); background: var(--bg-card); color: var(--text)" data-test="up" :disabled="i === 0" :aria-label="t('dash_layout_up')" @click="commit(moveTo(modelValue, i, i - 1))">↑</button>
      <button type="button" class="rounded-md border px-2 py-1 text-sm" style="border-color: var(--border); background: var(--bg-card); color: var(--text)" data-test="down" :disabled="i === modelValue.length - 1" :aria-label="t('dash_layout_down')" @click="commit(moveTo(modelValue, i, i + 1))">↓</button>

      <button
        type="button"
        role="switch"
        :aria-checked="item.visible"
        class="relative h-6 w-11 flex-none rounded-full border transition-colors"
        :style="{ borderColor: 'var(--border)', background: item.visible ? 'var(--accent)' : 'var(--bg-card)' }"
        data-test="toggle"
        :title="item.visible ? t('dash_layout_hide') : t('dash_layout_show')"
        :aria-label="item.visible ? t('dash_layout_hide') : t('dash_layout_show')"
        @click="commit(toggleBlock(modelValue, i))"
      >
        <span class="absolute top-0.5 h-4 w-4 rounded-full transition-all" :style="{ left: item.visible ? '22px' : '2px', background: item.visible ? 'var(--accent-text)' : 'var(--text-dim)' }"></span>
      </button>
    </div>
  </div>
</template>
