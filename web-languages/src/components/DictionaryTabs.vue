<script setup lang="ts">
import { ref } from 'vue'
import { t } from '../lib/i18n'
import type { VocabTab } from '../lib/vocab'

// Вкладки словарей по языкам (BACKLOG 14). Компонент ничего не хранит: какая вкладка открыта, какие вкладки
// есть и какие языки можно добавить — приходит снаружи, наружу уходят события.
const props = defineProps<{
  tabs: VocabTab[]
  active: string // 'all' или код языка
  totalCount: number
  addable: [string, string][]
}>()
const emit = defineEmits<{
  (e: 'select', code: string): void
  (e: 'add', code: string): void
  (e: 'remove', code: string): void
}>()

const picking = ref(false)
const pickedLang = ref('')

function openPicker() {
  pickedLang.value = props.addable[0]?.[0] ?? ''
  picking.value = true
}
function create() {
  if (!pickedLang.value) return
  emit('add', pickedLang.value)
  picking.value = false
}
const activeTab = () => props.tabs.find((tab) => tab.code === props.active)
</script>

<template>
  <div class="mb-3" data-test="dictionary-tabs">
    <div class="flex items-center gap-1.5 overflow-x-auto pb-1" role="tablist" :aria-label="t('eng_tabs_label')">
      <button
        v-if="tabs.length > 1"
        type="button"
        role="tab"
        data-test="tab-all"
        :aria-selected="active === 'all'"
        class="shrink-0 whitespace-nowrap rounded-full border px-3 py-1 text-xs"
        :style="{
          borderColor: 'var(--border)',
          background: active === 'all' ? 'var(--accent)' : 'var(--bg-card)',
          color: active === 'all' ? 'var(--accent-text)' : 'var(--text)',
        }"
        @click="emit('select', 'all')"
      >
        {{ t('eng_filter_all') }} · {{ totalCount }}
      </button>
      <button
        v-for="tab in tabs"
        :key="tab.code"
        type="button"
        role="tab"
        :data-test="`tab-${tab.code}`"
        :aria-selected="active === tab.code"
        class="shrink-0 whitespace-nowrap rounded-full border px-3 py-1 text-xs"
        :style="{
          borderColor: 'var(--border)',
          background: active === tab.code ? 'var(--accent)' : 'var(--bg-card)',
          color: active === tab.code ? 'var(--accent-text)' : 'var(--text)',
        }"
        @click="emit('select', tab.code)"
      >
        {{ tab.label }} · {{ tab.count }}
      </button>
      <button
        v-if="addable.length"
        type="button"
        data-test="tab-add"
        class="shrink-0 whitespace-nowrap rounded-full border border-dashed px-3 py-1 text-xs"
        style="border-color: var(--border); color: var(--text-dim); background: transparent"
        :title="t('eng_tab_add')"
        :aria-label="t('eng_tab_add')"
        @click="openPicker"
      >
        ＋
      </button>
    </div>

    <form
      v-if="picking"
      class="mt-2 flex flex-wrap items-end gap-2 rounded-xl border p-3 text-sm"
      style="border-color: var(--border); background: var(--bg-card)"
      data-test="tab-picker"
      @submit.prevent="create"
    >
      <label class="flex min-w-[10rem] flex-1 flex-col gap-1 text-xs" style="color: var(--text-dim)">
        {{ t('eng_tab_pick_lang') }}
        <select v-model="pickedLang" class="modal-input" data-test="tab-picker-select">
          <option v-for="[code, name] in addable" :key="code" :value="code">{{ name }}</option>
        </select>
      </label>
      <button type="submit" class="rounded-lg px-3 py-2 text-sm font-medium" style="background: var(--accent); color: var(--accent-text)" data-test="tab-picker-create">
        {{ t('eng_tab_create') }}
      </button>
      <button type="button" class="rounded-lg border px-3 py-2 text-sm" style="border-color: var(--border)" @click="picking = false">
        {{ t('eng_tab_cancel') }}
      </button>
    </form>

    <button
      v-if="activeTab() && activeTab()!.count === 0"
      type="button"
      data-test="tab-remove"
      class="mt-1 text-xs underline"
      style="color: var(--text-dim)"
      @click="emit('remove', active)"
    >
      {{ t('eng_tab_remove') }}
    </button>
  </div>
</template>
