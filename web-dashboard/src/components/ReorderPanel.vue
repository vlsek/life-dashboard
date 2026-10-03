<script setup lang="ts">
import { computed } from 'vue'
import BlockOrderList from './BlockOrderList.vue'
import { t } from '../lib/i18n'
import type { DashboardBlockKey, LayoutItem } from '../lib/layout'

// Режим «Изменить порядок» на самой главной странице (BACKLOG 22, 11:53): вместо тяжёлых блоков показывается компактный
// список их карточек — перетаскивать за ☰ удобнее, чем двигать блоки в несколько экранов высотой. Тот же список и тот же код
// жеста, что в окне раскладки (BlockOrderList + lib/dragReorder). Порядок сохраняет родитель сразу при каждом изменении.
defineProps<{ modelValue: LayoutItem[]; error?: string; saved?: boolean }>()
const emit = defineEmits<{ 'update:modelValue': [LayoutItem[]]; done: [] }>()

const labels = computed<Record<DashboardBlockKey, { title: string; desc: string }>>(() => ({
  profile: { title: t('dash_block_profile'), desc: t('dash_layout_desc_profile') },
  charts: { title: t('dash_charts_h2'), desc: t('dash_layout_desc_charts') },
  daily: { title: t('dash_block_daily'), desc: t('dash_layout_desc_daily') },
}))
</script>

<template>
  <section class="mb-4 rounded-2xl border p-4" style="border-color: var(--border); background: var(--bg-card)" data-test="reorder-panel">
    <div class="mb-1 flex items-center gap-2">
      <h2 class="flex-1 text-lg font-semibold">{{ t('dash_reorder_title') }}</h2>
      <button type="button" class="rounded-lg px-4 py-1.5 text-sm font-medium" style="background: var(--accent); color: var(--accent-text)" data-test="reorder-done" @click="emit('done')">{{ t('dash_reorder_done') }}</button>
    </div>
    <p class="dim mb-3 text-sm">{{ t('dash_reorder_hint') }}</p>
    <BlockOrderList :model-value="modelValue" :labels="labels" @update:model-value="emit('update:modelValue', $event)" />
    <p v-if="saved && !error" class="mt-2 text-sm" style="color: var(--accent)" data-test="reorder-saved">✓ {{ t('dash_reorder_saved') }}</p>
    <p v-if="error" class="mt-2 text-sm" style="color: #d6336c" data-test="reorder-error">{{ t('dash_layout_save_error') }}{{ error }}</p>
  </section>
</template>
