<script setup lang="ts">
import { t } from '../lib/i18n'
import type { ShopView } from '../lib/shopView'

defineProps<{ modelValue: ShopView }>()
const emit = defineEmits<{ 'update:modelValue': [view: ShopView] }>()

const options: { value: ShopView; labelKey: 'shop_view_grid' | 'shop_view_list' }[] = [
  { value: 'grid', labelKey: 'shop_view_grid' },
  { value: 'list', labelKey: 'shop_view_list' },
]
</script>

<template>
  <div class="inline-flex overflow-hidden rounded-lg border text-sm" style="border-color: var(--border)" role="radiogroup" :aria-label="t('shop_view_label')" data-testid="view-switch">
    <button
      v-for="o in options"
      :key="o.value"
      type="button"
      role="radio"
      class="px-3 py-1"
      :aria-checked="modelValue === o.value"
      :data-view="o.value"
      :style="modelValue === o.value ? 'background: var(--accent); color: var(--accent-text); border-radius: 0' : 'background: transparent; color: var(--text); border-radius: 0; border: none'"
      @click="emit('update:modelValue', o.value)"
    >
      {{ t(o.labelKey) }}
    </button>
  </div>
</template>
