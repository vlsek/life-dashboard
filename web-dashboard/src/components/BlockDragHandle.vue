<script setup lang="ts">
import Icon from './Icon.vue'
import { t } from '../lib/i18n'
import type { DashboardBlockKey } from '../lib/layout'

// Ручка ☰ в заголовке блока Дашборда: за неё блок берут и тянут вверх/вниз прямо на главной (lib/blockDrag.ts).
// touch-action: none — чтобы палец на ручке не начинал прокрутку страницы; клик и клавиши не всплывают к заголовку-«сворачивалке».
defineProps<{ blockKey: DashboardBlockKey }>()
const emit = defineEmits<{
  down: [e: PointerEvent, key: DashboardBlockKey]
  move: [e: PointerEvent]
  up: []
  cancel: []
  key: [e: KeyboardEvent, key: DashboardBlockKey]
}>()
</script>

<template>
  <button
    type="button"
    class="grid h-9 w-9 flex-none cursor-grab place-items-center rounded-lg text-lg leading-none"
    style="touch-action: none; background: transparent; border: none; color: var(--text-dim); -webkit-touch-callout: none; user-select: none"
    data-test="block-drag-handle"
    :data-block="blockKey"
    :aria-label="t('dash_block_drag')"
    :title="t('dash_block_drag')"
    @pointerdown.prevent="emit('down', $event, blockKey)"
    @pointermove="emit('move', $event)"
    @pointerup="emit('up')"
    @pointercancel="emit('cancel')"
    @click.stop
    @keydown.stop="emit('key', $event, blockKey)"
    @contextmenu.prevent
  ><Icon name="menu" /></button>
</template>
