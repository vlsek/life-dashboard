<script setup lang="ts">
import { SLOT_MODES, SLOT_SORTS, type SlotMode, type SlotSort } from '../lib/slotView'
import { t } from '../lib/i18n'

// Панель слота «Кастомизации» (BACKLOG 64.1, срез 3): «Все · Мои · Магазин» с числами, поиск по названию и сортировка. Только управление показом —
// ничего не покупает. Поиск и сортировка нужны слотам с предметами; у «бесплатных» выборов (всё уже у человека) панели нет вовсе.
defineProps<{ mode: SlotMode; counts: Record<SlotMode, number>; query: string; sort: SlotSort; priceSort: boolean }>()
const emit = defineEmits<{ 'update:mode': [m: SlotMode]; 'update:query': [q: string]; 'update:sort': [s: SlotSort] }>()
</script>

<template>
  <div class="mb-3 flex flex-col gap-2" data-testid="slot-toolbar">
    <div class="flex gap-1.5" role="radiogroup" :aria-label="t('cust_mode_label')">
      <button
        v-for="m in SLOT_MODES"
        :key="m"
        type="button"
        role="radio"
        :aria-checked="mode === m"
        class="rounded-full border px-3 py-1 text-sm"
        :style="{ background: mode === m ? 'var(--accent)' : 'var(--bg-card)', color: mode === m ? 'var(--accent-text)' : 'var(--text)', borderColor: mode === m ? 'var(--accent)' : 'var(--border)' }"
        :data-testid="'slot-mode-' + m"
        @click="emit('update:mode', m)"
      >
        {{ t(('cust_mode_' + m) as never) }} <span class="opacity-70">{{ counts[m] }}</span>
      </button>
    </div>
    <div class="flex gap-2">
      <input
        type="text"
        inputmode="search"
        enterkeyhint="search"
        autocomplete="off"
        class="min-w-0 flex-1 rounded-lg border px-3 py-1.5 text-sm"
        style="background: var(--bg-card); color: var(--text); border-color: var(--border)"
        :value="query"
        :placeholder="t('cust_search_ph')"
        :aria-label="t('cust_search_ph')"
        data-testid="slot-search"
        @input="emit('update:query', ($event.target as HTMLInputElement).value)"
      />
      <select class="rounded-lg border px-2 py-1.5 text-sm" style="background: var(--bg-card); color: var(--text); border-color: var(--border)" :value="sort" :aria-label="t('cust_sort_label')" data-testid="slot-sort" @change="emit('update:sort', ($event.target as HTMLSelectElement).value as SlotSort)">
        <option v-for="s in SLOT_SORTS.filter((x) => x !== 'price' || priceSort)" :key="s" :value="s">{{ t(('cust_sort_' + s) as never) }}</option>
      </select>
    </div>
  </div>
</template>
