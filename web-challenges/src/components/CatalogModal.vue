<script setup lang="ts">
import { computed, ref } from 'vue'
import { challengeTemplates } from '../lib/templates'
import { categoryCounts, filterByCategory, templateFacts, TEMPLATE_CATEGORIES } from '../lib/catalogMeta'
import { getLang, t, type DictKey } from '../lib/i18n'
import type { ChallengeTemplate, ChallengeType, TemplateCategory } from '../lib/types'
import EmojiText from './EmojiText.vue'

// Каталог готовых челленджей (BACKLOG 44.6): чипы категорий со счётчиком, карточка с иконкой, значками типа и срока/цели.
const emit = defineEmits<{ close: []; select: [tpl: ChallengeTemplate] }>()
const templates = challengeTemplates()
const lang = getLang()
const cat = ref<TemplateCategory | 'all'>('all')
const counts = computed(() => categoryCounts(templates))
const shown = computed(() => filterByCategory(templates, cat.value))

const TYPE_BADGE: Record<ChallengeType, DictKey> = {
  daily_fixed: 'ch_badge_daily_fixed',
  daily_progressive: 'ch_badge_daily_progressive',
  daily_boolean: 'ch_badge_daily_boolean',
  cumulative_count: 'ch_badge_cumulative',
}
const catLabel = (c: TemplateCategory | 'all') => t(('ch_cat_' + c) as DictKey)
</script>

<template>
  <div class="modal-backdrop" @click.self="emit('close')">
    <div class="modal" style="max-width: 32rem">
      <h3><EmojiText :text="t('ch_catalog_title')" /></h3>

      <div class="cat-chips" role="tablist" data-test="catalog-chips">
        <button
          v-for="c in (['all', ...TEMPLATE_CATEGORIES] as const)"
          :key="c"
          type="button"
          role="tab"
          class="cat-chip"
          :aria-selected="cat === c"
          :data-active="cat === c ? 'true' : undefined"
          :data-test="'chip-' + c"
          @click="cat = c"
        >
          {{ catLabel(c) }} <span class="cat-n">{{ counts[c] }}</span>
        </button>
      </div>

      <div
        v-for="tpl in shown"
        :key="tpl.id"
        class="card tpl-card mb-2.5 cursor-pointer"
        data-test="catalog-card"
        :data-id="tpl.id"
        @click="emit('select', tpl)"
      >
        <strong><EmojiText :text="`${tpl.icon} ${tpl.title}`" /></strong>
        <div class="dim mt-1 text-sm">{{ tpl.description }}</div>
        <div class="mt-2 flex flex-wrap gap-1.5">
          <span class="tpl-badge" data-test="badge-type">{{ t(TYPE_BADGE[tpl.type]) }}</span>
          <span class="tpl-badge" data-test="badge-facts">{{ templateFacts(tpl, lang) }}</span>
        </div>
      </div>

      <div class="modal-actions">
        <button class="secondary" @click="emit('close')">{{ t('dash_close_btn') }}</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.cat-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin: 8px 0 12px;
}
.cat-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  border: 1px solid var(--border);
  border-radius: 9999px;
  background: transparent;
  color: var(--text);
  font-size: 0.85rem;
  cursor: pointer;
}
.cat-chip[data-active='true'] {
  border-color: var(--accent);
  background: var(--accent);
  color: var(--accent-text);
}
.cat-n {
  opacity: 0.7;
  font-size: 0.75rem;
}
.tpl-card {
  transition: border-color 0.15s ease, transform 0.15s ease;
}
.tpl-card:hover {
  border-color: var(--accent);
}
.tpl-badge {
  padding: 1px 8px;
  border: 1px solid var(--border);
  border-radius: 9999px;
  color: var(--text-dim);
  font-size: 0.75rem;
}
@media (prefers-reduced-motion: reduce) {
  .tpl-card {
    transition: none;
  }
}
</style>
