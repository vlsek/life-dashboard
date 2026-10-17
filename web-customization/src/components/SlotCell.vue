<script setup lang="ts">
import EmojiText from './EmojiText.vue'

// Ячейка витрины «Кастомизации» (BACKLOG 64.1, срез 2): слот — место, где видна вещь. Показывает, что надето сейчас, и «открыто/всего».
// Только показ и переход: ничего не покупает и не меняет.
defineProps<{ id: string; title: string; value: string; count: string; custom: boolean }>()
const emit = defineEmits<{ open: [id: string] }>()
</script>

<template>
  <button
    type="button"
    class="slot-cell flex min-w-0 flex-col items-start gap-1 rounded-xl border p-3 text-left"
    :style="{ background: 'var(--bg-card)', borderColor: custom ? 'var(--accent)' : 'var(--border)', color: 'var(--text)' }"
    :data-testid="'slot-cell-' + id"
    :data-custom="custom"
    @click="emit('open', id)"
  >
    <span class="text-sm font-medium"><EmojiText :text="title" /></span>
    <span class="min-w-0 max-w-full break-words text-xs" :style="{ color: custom ? 'var(--accent)' : 'var(--text-dim)' }" data-testid="slot-value">{{ value }}</span>
    <span v-if="count" class="dim text-xs" data-testid="slot-count">{{ count }}</span>
  </button>
</template>
