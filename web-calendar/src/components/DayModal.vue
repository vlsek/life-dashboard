<script setup lang="ts">
import { ref } from 'vue'
import { t, getLang } from '../lib/i18n'
import type { PlannedItem } from '../lib/types'

const props = defineProps<{ dateStr: string; initial: PlannedItem[] }>()
const emit = defineEmits<{ close: []; save: [items: PlannedItem[]] }>()

const items = ref<PlannedItem[]>(props.initial.map((p) => ({ ...p })))
const newText = ref('')

function fmtHeader(iso: string): string {
  const [y, m, d] = iso.split('-')
  const dm = getLang() === 'en' ? `${m}/${d}/${y}` : `${d}.${m}.${y}`
  return `${t('cal_plan_for')} ${dm}`
}

function addItem() {
  const text = newText.value.trim()
  if (!text) return
  items.value.push({ type: 'custom', text, done: false })
  newText.value = ''
}

function removeItem(idx: number) {
  items.value.splice(idx, 1)
}

function save() {
  emit('save', items.value)
}
</script>

<template>
  <div class="modal-backdrop" @click.self="emit('close')">
    <div class="modal">
      <h3>{{ fmtHeader(props.dateStr) }}</h3>

      <p v-if="items.length === 0" class="dim">{{ t('cal_empty') }}</p>
      <div v-for="(item, idx) in items" :key="idx" class="flex items-center gap-2 py-1">
        <input type="checkbox" v-model="item.done" :disabled="item.type === 'goal'" />
        <span class="flex-1" :class="{ 'line-through opacity-60': item.done }">
          {{ item.text }}<template v-if="item.type === 'goal'"> ({{ t('cal_goal_suffix') }})</template>
        </span>
        <button class="danger" @click="removeItem(idx)">✕</button>
      </div>

      <div class="mt-2.5 flex gap-2">
        <input
          v-model="newText"
          type="text"
          class="flex-1"
          :placeholder="t('cal_new_item_placeholder')"
          @keydown.enter.prevent="addItem"
        />
        <button class="secondary" @click="addItem">+</button>
      </div>
      <p class="dim mt-1.5 text-xs">{{ t('cal_hint') }}</p>

      <div class="modal-actions">
        <button class="secondary" @click="emit('close')">{{ t('cancel') }}</button>
        <button @click="save">{{ t('save') }}</button>
      </div>
    </div>
  </div>
</template>
