<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
import EmojiText from './EmojiText.vue'
import { t } from '../lib/i18n'
import { dropIndex, moveTo, rowShift } from '../lib/dragReorder'
import { toggleBlock, type DashboardBlockKey, type LayoutItem } from '../lib/layout'

// Список блоков Дашборда: карточки с ручкой ☰ (перетаскивание пальцем/мышью), переключателем видимости и кнопками ↑/↓
// (клавиатура и точный порядок без жеста). Состояние — v-model; сохранение делает родитель.
const props = defineProps<{ modelValue: LayoutItem[]; labels: Record<DashboardBlockKey, { title: string; desc: string }> }>()
const emit = defineEmits<{ 'update:modelValue': [LayoutItem[]] }>()

const rows = ref<HTMLElement[]>([])
const drag = ref<{ from: number; to: number; dy: number; mids: number[]; heights: number[]; startY: number; step: number } | null>(null)
let handleEl: HTMLElement | null = null
let pointerId: number | null = null

function commit(next: LayoutItem[]) {
  emit('update:modelValue', next)
}

function onDown(e: PointerEvent, index: number) {
  if (e.button !== undefined && e.button > 0) return // только основная кнопка / касание
  const els = rows.value.filter(Boolean)
  const rects = els.map((el) => el.getBoundingClientRect())
  const gap = rects.length > 1 ? Math.max(0, rects[1].top - rects[0].bottom) : 0
  drag.value = {
    from: index,
    to: index,
    dy: 0,
    startY: e.clientY,
    mids: rects.map((r) => r.top + r.height / 2),
    heights: rects.map((r) => r.height),
    step: (rects[index]?.height ?? 0) + gap,
  }
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
const onUp = () => finish(true)
const onCancel = () => finish(false)

// Клавиатура на ручке: стрелки двигают на одну позицию
function onKey(e: KeyboardEvent, index: number) {
  const dir = e.key === 'ArrowUp' ? -1 : e.key === 'ArrowDown' ? 1 : 0
  if (!dir) return
  e.preventDefault()
  commit(moveTo(props.modelValue, index, index + dir))
}

function rowStyle(j: number) {
  const d = drag.value
  if (!d) return {}
  if (j === d.from) return { transform: `translateY(${d.dy}px)`, zIndex: 2, boxShadow: '0 8px 22px rgba(0,0,0,0.35)', transition: 'none', cursor: 'grabbing' }
  const shift = rowShift(j, d.from, d.to, d.step)
  return { transform: shift ? `translateY(${shift}px)` : undefined, transition: 'transform 0.15s ease' }
}

const dragging = computed(() => drag.value !== null)
onBeforeUnmount(() => finish(false))
</script>

<template>
  <div class="flex flex-col gap-2" :style="{ userSelect: dragging ? 'none' : undefined }" data-test="block-list">
    <div
      v-for="(item, i) in modelValue"
      :key="item.key"
      :ref="(el) => (rows[i] = el as HTMLElement)"
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
      >☰</button>

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
