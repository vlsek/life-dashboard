<script setup lang="ts">
import { computed, ref } from 'vue'
import { t } from '../lib/i18n'
import { computeCumulativeStats } from '../lib/challenges'
import Icon from './Icon.vue'
import type { Challenge, ChallengeEntry } from '../lib/types'
import EmojiText from './EmojiText.vue'

const props = defineProps<{ challenge: Challenge; entries: ChallengeEntry[] }>()
const emit = defineEmits<{
  abandon: [ch: Challenge]
  edit: [ch: Challenge]
  markCompleted: [ch: Challenge]
  addEntry: [challengeId: string, note: string]
  deleteEntry: [id: string]
}>()

const stats = computed(() => computeCumulativeStats(props.challenge, props.entries))
const sortedEntries = computed(() => props.entries.slice().reverse())
const noteInput = ref('')

function fmtRu(iso: string): string {
  const [y, m, d] = iso.split('-')
  return `${d}.${m}.${y}`
}

function onAdd() {
  emit('addEntry', props.challenge.id, noteInput.value.trim())
  noteInput.value = ''
}

const placeholder = computed(() =>
  props.challenge.item_label ? `${t('ch_item_placeholder_prefix')} ${props.challenge.item_label}` : t('ch_item_placeholder_generic'),
)
</script>

<template>
  <div class="card mb-3.5">
    <div class="flex flex-wrap items-center gap-2">
      <strong>{{ challenge.icon }} {{ challenge.title }}</strong>
      <button class="secondary ml-auto px-2 py-0.5" :title="t('ch_edit_btn')" :aria-label="t('ch_edit_btn')" data-testid="edit-challenge" @click="emit('edit', challenge)"><Icon name="edit" /></button>
      <button class="danger px-2 py-0.5" @click="emit('abandon', challenge)"><Icon name="trash" /></button>
    </div>

    <div class="dim my-1.5 text-sm">{{ stats.count }} / {{ stats.target }} {{ stats.itemWord }}</div>

    <div class="mb-2.5 h-2 overflow-hidden rounded-md" style="background: var(--bg)">
      <div class="h-full" :style="{ background: 'var(--accent)', width: stats.pct + '%' }"></div>
    </div>

    <button v-if="stats.canComplete" class="mb-2.5" @click="emit('markCompleted', challenge)"><EmojiText :text="t('ch_mark_completed_btn')" /></button>

    <div class="mb-2.5 flex gap-1.5">
      <input v-model="noteInput" type="text" class="flex-1" :placeholder="placeholder" @keyup.enter="onAdd" />
      <button class="secondary" @click="onAdd"><Icon name="plus" /></button>
    </div>

    <div v-if="sortedEntries.length > 0" class="max-h-40 overflow-y-auto">
      <table class="w-full text-sm">
        <tbody>
          <tr v-for="e in sortedEntries" :key="e.id" class="align-top">
            <td class="whitespace-nowrap py-1 pr-3">{{ fmtRu(e.date) }}</td>
            <td class="py-1 pr-3">{{ e.note || '—' }}</td>
            <td class="py-1 text-right">
              <button class="danger px-2 py-0.5" @click="emit('deleteEntry', e.id)"><Icon name="x" /></button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
