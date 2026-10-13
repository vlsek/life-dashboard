<script setup lang="ts">
import { computed } from 'vue'
import { t } from '../lib/i18n'
import { stripEmoji } from '../lib/emojiText'
import { customCount, type SelectionRow } from '../lib/currentSelection'

// «Сейчас выбрано» (BACKLOG 61.6 срез 1): сводка вверху страницы. Каждая строка — раздел и то, что в нём включено; тап ведёт к разделу.
// Только показ: ничего не покупает и не меняет, поэтому безопасна для любого состояния (нет сети, нет баланса).
const props = defineProps<{ rows: SelectionRow[]; collapsed: boolean }>()
const emit = defineEmits<{ toggle: []; go: [section: string] }>()

const changed = computed(() => t('cust_now_changed').replace('{n}', String(customCount(props.rows))).replace('{total}', String(props.rows.length)))
const title = (r: SelectionRow): string => stripEmoji(t(r.titleKey as never))
const value = (r: SelectionRow): string => [r.valueKey, ...(r.extraKeys ?? [])].map((k) => stripEmoji(t(k as never))).join(' · ')
</script>

<template>
  <section class="mb-4 rounded-xl border" style="background: var(--bg-card); border-color: var(--border)" data-testid="current-selection">
    <h2 class="text-base font-medium">
      <button type="button" class="flex w-full items-baseline justify-between gap-2 p-3 text-left" :aria-expanded="!collapsed" :aria-label="t('cust_now_toggle')" style="background: transparent; color: inherit; border: 0" data-testid="now-toggle" @click="emit('toggle')">
        <span>{{ t('cust_now_title') }}</span>
        <span class="dim text-xs" data-testid="now-changed">{{ changed }}</span>
      </button>
    </h2>
    <ul v-show="!collapsed" class="m-0 list-none px-3 pb-2" data-testid="now-list">
      <li v-for="r in rows" :key="r.key ?? r.section" class="border-t py-1.5" style="border-color: var(--border)" :data-now="r.key ?? r.section" :data-custom="r.custom">
        <button
          type="button"
          class="flex w-full items-baseline justify-between gap-3 text-left text-sm"
          style="background: transparent; border: 0; padding: 0"
          :style="{ color: 'var(--text)' }"
          :aria-label="t('cust_now_go').replace('{name}', title(r)) + ': ' + value(r)"
          @click="emit('go', r.section)"
        >
          <span class="dim">{{ title(r) }}</span>
          <span :style="r.custom ? 'color: var(--accent)' : 'color: var(--text-dim)'" data-testid="now-value">{{ value(r) }}</span>
        </button>
      </li>
    </ul>
  </section>
</template>
