<script setup lang="ts">
import { TABS, type TabKey } from '../lib/tabs'
import { t } from '../lib/i18n'
import type { DictKey } from '../lib/i18n'

// Полоса вкладок «Сообщества»; на «Друзьях» — число входящих заявок (BACKLOG 44.13, срез 1)
defineProps<{ modelValue: TabKey; requests?: number }>()
const emit = defineEmits<{ 'update:modelValue': [TabKey] }>()
</script>

<template>
  <div class="mb-4 flex gap-1 overflow-x-auto border-b" style="border-color: var(--border)" role="tablist" :aria-label="t('comm_tabs_label')" data-testid="comm-tabs">
    <button
      v-for="k in TABS"
      :key="k"
      type="button"
      role="tab"
      class="tab-btn whitespace-nowrap rounded-none border-0 px-3 py-2 text-sm"
      :class="{ 'tab-btn-on': modelValue === k }"
      :aria-selected="modelValue === k"
      data-testid="comm-tab"
      :data-tab="k"
      @click="emit('update:modelValue', k)"
    >
      {{ t(('comm_tab_' + k) as DictKey) }}
      <span v-if="k === 'friends' && requests" class="tab-count ml-1 rounded-full px-1.5 text-xs" data-testid="comm-tab-requests">{{ requests }}</span>
    </button>
  </div>
</template>

<style scoped>
.tab-btn {
  background: transparent;
  color: var(--text-dim);
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
}
.tab-btn-on {
  color: var(--text);
  font-weight: 600;
  border-bottom-color: var(--accent);
}
.tab-count {
  background: var(--accent);
  color: var(--accent-text);
}
</style>
