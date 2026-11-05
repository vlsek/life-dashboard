<script setup lang="ts">
import { nextTick, onMounted, ref } from 'vue'
import { t } from '../lib/i18n'
import type { PlannedEntry } from '../lib/planned'

// Вечерний шаг «что перенести» (BACKLOG 75.12, срез 2): список невыполненных своих пунктов дня. По умолчанию все отмечены «перенести»;
// снять галочку — оставить на сегодня. Окно ничего не пишет само: выбранные позиции отдаёт родителю. Открывается только по кнопке.
const props = defineProps<{ items: { index: number; item: PlannedEntry }[]; busy?: boolean; error?: string }>()
const emit = defineEmits<{ close: []; move: [number[]] }>()

const checked = ref<Record<number, boolean>>(Object.fromEntries(props.items.map((x) => [x.index, true])))
const root = ref<HTMLElement | null>(null)
onMounted(() => nextTick(() => root.value?.querySelector<HTMLElement>('input, button')?.focus()))
const selected = () => props.items.filter((x) => checked.value[x.index]).map((x) => x.index)
const count = () => selected().length
</script>

<template>
  <div class="modal-backdrop" @click.self="emit('close')" @keydown.esc.stop="emit('close')">
    <div ref="root" class="modal" role="dialog" aria-modal="true" :aria-label="t('wu_title')" data-test="wrapup-modal">
      <h3>{{ t('wu_title') }}</h3>
      <p class="dim mb-0 mt-1 text-sm">{{ t('wu_hint') }}</p>
      <ul class="m-0 mt-2 flex list-none flex-col gap-1 p-0 text-sm" data-test="wu-list">
        <li v-for="x in items" :key="x.index" data-test="wu-row">
          <label class="flex items-center gap-2">
            <input v-model="checked[x.index]" type="checkbox" data-test="wu-check" />
            <span class="min-w-0 flex-1 break-words">{{ x.item.text }}</span>
            <span v-if="x.item.time" class="dim">{{ x.item.time }}</span>
          </label>
        </li>
      </ul>
      <p v-if="error" class="mb-0 mt-2 text-sm" style="color: var(--danger)" role="alert" data-test="wu-error">{{ error }}</p>
      <div class="mt-3 flex flex-wrap justify-end gap-2">
        <button type="button" class="secondary" data-test="wu-close" @click="emit('close')">{{ t('close') }}</button>
        <button type="button" :disabled="busy || count() === 0" data-test="wu-move" @click="emit('move', selected())">{{ t('wu_move') }} ({{ count() }})</button>
      </div>
    </div>
  </div>
</template>
