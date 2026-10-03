<script setup lang="ts">
import EmojiText from './EmojiText.vue'
import { computed, onBeforeUnmount, ref } from 'vue'
import { t } from '../lib/i18n'
import { dropIndex, moveTo, rowShift } from '../lib/dragReorder'
import { toggleBlock, type DashboardBlockKey, type LayoutItem } from '../lib/layout'

// Копия web-dashboard/src/components/BlockOrderList.vue на стилях gh-* (в шапке нет Tailwind). Карточки блоков с ручкой ☰
// (перетаскивание пальцем/мышью), переключателем видимости и кнопками ↑/↓. Логика жеста — lib/dragReorder.ts (тоже копия).
const props = defineProps<{ modelValue: LayoutItem[]; labels: Record<DashboardBlockKey, { title: string; desc: string }> }>()
const emit = defineEmits<{ 'update:modelValue': [LayoutItem[]] }>()

const rows = ref<HTMLElement[]>([])
const drag = ref<{ from: number; to: number; dy: number; mids: number[]; startY: number; step: number } | null>(null)
let handleEl: HTMLElement | null = null
let pointerId: number | null = null

const commit = (next: LayoutItem[]) => emit('update:modelValue', next)

function onDown(e: PointerEvent, index: number) {
  if (e.button !== undefined && e.button > 0) return
  const rects = rows.value.filter(Boolean).map((el) => el.getBoundingClientRect())
  const gap = rects.length > 1 ? Math.max(0, rects[1].top - rects[0].bottom) : 0
  drag.value = { from: index, to: index, dy: 0, startY: e.clientY, mids: rects.map((r) => r.top + r.height / 2), step: (rects[index]?.height ?? 0) + gap }
  handleEl = e.currentTarget as HTMLElement
  pointerId = e.pointerId ?? null
  if (pointerId !== null) handleEl.setPointerCapture?.(pointerId)
}
function onMove(e: PointerEvent) {
  const d = drag.value
  if (!d) return
  d.dy = e.clientY - d.startY
  d.to = dropIndex(d.mids, d.from, d.mids[d.from] + d.dy)
}
function finish(apply: boolean) {
  const d = drag.value
  if (!d) return
  drag.value = null
  if (handleEl && pointerId !== null) handleEl.releasePointerCapture?.(pointerId)
  handleEl = null
  pointerId = null
  if (apply && d.to !== d.from) commit(moveTo(props.modelValue, d.from, d.to))
}
function onKey(e: KeyboardEvent, index: number) {
  const dir = e.key === 'ArrowUp' ? -1 : e.key === 'ArrowDown' ? 1 : 0
  if (!dir) return
  e.preventDefault()
  commit(moveTo(props.modelValue, index, index + dir))
}
function rowStyle(j: number) {
  const d = drag.value
  if (!d) return {}
  if (j === d.from) return { transform: `translateY(${d.dy}px)`, zIndex: 2, boxShadow: '0 8px 22px rgba(0,0,0,0.35)', transition: 'none' }
  const shift = rowShift(j, d.from, d.to, d.step)
  return { transform: shift ? `translateY(${shift}px)` : undefined, transition: 'transform 0.15s ease' }
}
const dragging = computed(() => drag.value !== null)
onBeforeUnmount(() => finish(false))
</script>

<template>
  <div class="gh-blocks" :style="{ userSelect: dragging ? 'none' : undefined }" data-test="block-list">
    <div v-for="(item, i) in modelValue" :key="item.key" :ref="(el) => (rows[i] = el as HTMLElement)" class="gh-block" :style="rowStyle(i)" data-test="layout-row">
      <button
        type="button"
        class="gh-block-handle"
        data-test="drag-handle"
        :aria-label="t('dash_layout_drag')"
        :title="t('dash_layout_drag')"
        @pointerdown.prevent="onDown($event, i)"
        @pointermove="onMove"
        @pointerup="finish(true)"
        @pointercancel="finish(false)"
        @keydown="onKey($event, i)"
      >☰</button>
      <div class="gh-block-text" :style="{ opacity: item.visible ? 1 : 0.5 }">
        <div style="font-weight: 600"><EmojiText :text="labels[item.key].title" /></div>
        <div class="gh-dim" style="font-size: 12px">{{ labels[item.key].desc }}</div>
      </div>
      <button type="button" class="gh-btn gh-btn-icon" data-test="up" :disabled="i === 0" :aria-label="t('dash_layout_up')" @click="commit(moveTo(modelValue, i, i - 1))">↑</button>
      <button type="button" class="gh-btn gh-btn-icon" data-test="down" :disabled="i === modelValue.length - 1" :aria-label="t('dash_layout_down')" @click="commit(moveTo(modelValue, i, i + 1))">↓</button>
      <button type="button" role="switch" :aria-checked="item.visible" class="gh-switch" :class="{ 'gh-switch-on': item.visible }" data-test="toggle" :title="item.visible ? t('dash_layout_hide') : t('dash_layout_show')" :aria-label="item.visible ? t('dash_layout_hide') : t('dash_layout_show')" @click="commit(toggleBlock(modelValue, i))">
        <span></span>
      </button>
    </div>
  </div>
</template>
