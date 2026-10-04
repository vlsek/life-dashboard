<script setup lang="ts">
import EmojiText from './EmojiText.vue'
import { computed, ref } from 'vue'
import Icon from './Icon.vue'
import CollapseChevron from './CollapseChevron.vue'
import { vCollapse } from '../lib/collapseMotion'
import { hasStoredCollapsed, readCollapsed, writeCollapsed } from '../lib/collapsed'
import { t } from '../lib/i18n'

// Порт блока «Что полезного сделал за день» из renderDay(): список произвольных пунктов дня
// (daily_notes.items) + поле добавления (Enter или кнопка).
// BACKLOG 23:00: блок свёрнут по умолчанию (раскрываемый), в заголовке — сколько пунктов за выбранный день.
// Явный выбор человека (развернул/свернул) запоминается и сильнее «по умолчанию» — как у остальных секций (lib/collapsed.ts).
const props = defineProps<{ items: string[] }>()
const emit = defineEmits<{ add: [string]; remove: [number] }>()

const STORAGE_KEY = 'useful_today'
const collapsed = ref(hasStoredCollapsed(STORAGE_KEY) ? readCollapsed(STORAGE_KEY) : true)
const count = computed(() => props.items.length)

function toggle() {
  const next = !collapsed.value
  collapsed.value = next
  writeCollapsed(STORAGE_KEY, next)
}

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
    <div
      class="title collapse-head flex items-center gap-2"
      role="button"
      tabindex="0"
      data-test="useful-toggle"
      :aria-expanded="!collapsed"
      :title="collapsed ? t('dash_expand_btn') : t('dash_collapse_btn')"
      @click="toggle"
      @keydown.enter.prevent="toggle"
      @keydown.space.prevent="toggle"
    >
      <EmojiText :text="t('dash_useful_today_title')" />
      <span v-if="count > 0" class="dim count" data-test="useful-count">({{ count }})</span>
      <CollapseChevron :collapsed="collapsed" />
    </div>
    <div v-collapse="!collapsed" data-test="useful-body">
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
  </div>
</template>

<style scoped>
.wrap { margin: 14px 0 0; padding: 10px 12px; border: 1px solid var(--border); border-radius: 10px; }
.title { cursor: pointer; user-select: none; }
.count { font-size: 0.9em; }
.title + div { margin-top: 6px; }
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
