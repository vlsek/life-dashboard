<script setup lang="ts">
import EmojiText from './EmojiText.vue'
import Icon from './Icon.vue'
import { CARD_GAP, CARD_H, CARD_STEP } from '../lib/blockDrag'
import type { BlockDragState } from '../lib/blockDrag'
import { rowShift } from '../lib/dragReorder'
import type { DashboardBlockKey } from '../lib/layout'

// Слой «перетаскивание блоков»: затемнение + компактные карточки видимых блоков. Только рисует — жестом управляет useBlockDrag
// (pointer capture остаётся на ручке в заголовке блока), поэтому pointer-events здесь отключены.
const props = defineProps<{ items: { key: DashboardBlockKey; title: string }[]; drag: BlockDragState }>()

function cardStyle(j: number) {
  const d = props.drag
  const base = { height: CARD_H + 'px', marginBottom: j < props.items.length - 1 ? CARD_GAP + 'px' : '0' }
  if (j === d.from) {
    return { ...base, transform: `translateY(${d.dy}px) scale(1.02)`, zIndex: 2, boxShadow: '0 10px 26px rgba(0,0,0,0.4)', borderColor: 'var(--accent)', transition: 'none' }
  }
  const shift = rowShift(j, d.from, d.to, CARD_STEP)
  return { ...base, transform: shift ? `translateY(${shift}px)` : undefined, transition: 'transform 0.15s ease' }
}
</script>

<template>
  <div class="fixed inset-0" style="z-index: 90; pointer-events: none; background: rgba(0, 0, 0, 0.45)" data-test="block-drag-overlay">
    <div class="mx-auto max-w-md px-4" :style="{ position: 'absolute', left: 0, right: 0, top: drag.top + 'px' }">
      <div
        v-for="(item, j) in items"
        :key="item.key"
        class="relative flex items-center gap-3 rounded-2xl border px-4"
        :class="{ 'is-dragging': j === drag.from }"
        :style="{ background: 'var(--bg-card)', borderColor: 'var(--border)', color: 'var(--text)', ...cardStyle(j) }"
        data-test="block-drag-card"
      >
        <span class="dim"><Icon name="menu" /></span>
        <span class="min-w-0 flex-1 truncate font-medium"><EmojiText :text="item.title" /></span>
      </div>
    </div>
  </div>
</template>
