<script setup lang="ts">
import EmojiText from './EmojiText.vue'
import { ref } from 'vue'
import Icon from './Icon.vue'
import { t } from '../lib/i18n'

// Порт блока «Что полезного сделал за день» из renderDay(): список произвольных пунктов дня
// (daily_notes.items) + поле добавления (Enter или кнопка).
defineProps<{ items: string[] }>()
const emit = defineEmits<{ add: [string]; remove: [number] }>()

const text = ref('')
function add() {
  const v = text.value.trim()
  if (!v) return
  text.value = ''
  emit('add', v)
}
</script>

<template>
  <div class="wrap">
    <div class="title"><EmojiText :text="t('dash_useful_today_title')" /></div>
    <p v-if="items.length === 0" class="dim empty">{{ t('dash_useful_today_empty') }}</p>
    <div v-for="(item, idx) in items" :key="idx + item" class="item">
      <span class="text">• {{ item }}</span>
      <button type="button" class="danger" @click="emit('remove', idx)"><Icon name="x" /></button>
    </div>
    <div class="add-row">
      <input v-model="text" type="text" :placeholder="t('dash_useful_today_placeholder')" @keydown.enter.prevent="add" />
      <button type="button" class="secondary" @click="add"><EmojiText :text="t('add_btn')" /></button>
    </div>
  </div>
</template>

<style scoped>
.wrap { margin-bottom: 14px; }
.title { margin-bottom: 6px; }
.empty { margin: 0 0 8px; font-size: 0.9em; }
.item { display: flex; align-items: center; gap: 8px; padding: 4px 0; }
.text { flex: 1; }
.item button { padding: 2px 8px; }
.add-row { display: flex; gap: 8px; margin-top: 6px; }
.add-row input {
  flex: 1;
  min-width: 0;
  background: var(--bg);
  border: 1px solid var(--border);
  color: var(--text);
  padding: 8px 10px;
  border-radius: 8px;
  font-size: 0.95em;
}
</style>
