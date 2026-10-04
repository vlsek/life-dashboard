<script setup lang="ts">
import { t } from '../lib/i18n'
import type { ShopFilter } from '../lib/shopGroups'

defineProps<{ modelValue: ShopFilter; counts: Record<ShopFilter, number> }>()
const emit = defineEmits<{ 'update:modelValue': [filter: ShopFilter] }>()

const chips: { value: ShopFilter; labelKey: 'shop_filter_all' | 'shop_filter_affordable' | 'shop_filter_saving' | 'shop_filter_bought' }[] = [
  { value: 'all', labelKey: 'shop_filter_all' },
  { value: 'affordable', labelKey: 'shop_filter_affordable' },
  { value: 'saving', labelKey: 'shop_filter_saving' },
  { value: 'bought', labelKey: 'shop_filter_bought' },
]
</script>

<template>
  <div class="my-3 flex flex-wrap gap-1.5" role="group" data-testid="shop-filters">
    <button
      v-for="c in chips"
      :key="c.value"
      type="button"
      class="rounded-full border px-3 py-1 text-sm"
      :aria-pressed="modelValue === c.value"
      :data-filter="c.value"
      :style="
        modelValue === c.value
          ? 'background: var(--accent); color: var(--accent-text); border-color: var(--accent)'
          : 'background: transparent; color: var(--text-dim); border-color: var(--border)'
      "
      @click="emit('update:modelValue', c.value)"
    >
      {{ t(c.labelKey) }} {{ counts[c.value] }}
    </button>
  </div>
</template>
