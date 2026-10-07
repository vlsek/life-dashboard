<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { RECORDS_EVENT, formatRecordDate, formatRecordValue, recordsEnabled } from '../lib/records'
import { getLang, t } from '../lib/i18n'
import type { VariationRecord } from '../lib/variationChart'

// Рекорд за один подход по каждой особенности — строка у карточки метрики-подходов (BACKLOG раздел 28). Прячется выключателем «рекорды у метрик».
const props = defineProps<{ records: readonly VariationRecord[] | null | undefined }>()

const on = ref(recordsEnabled('metrics'))
const sync = () => (on.value = recordsEnabled('metrics'))
onMounted(() => window.addEventListener(RECORDS_EVENT, sync))
onBeforeUnmount(() => window.removeEventListener(RECORDS_EVENT, sync))

// Одна «без особенности» (у метрики нет именованных) — просто число, без подписи; иначе у каждой своя подпись.
const items = computed(() => {
  const list = props.records ?? []
  const onlyNone = list.length === 1 && list[0].label === null
  return list.map((r) => ({
    key: r.label ?? '\u0000none',
    label: onlyNone ? '' : (r.label ?? t('chart_legend_none')),
    value: formatRecordValue(r.y, getLang()),
    title: t('chart_legend_record_title') + ' · ' + formatRecordDate(r.date, getLang()),
  }))
})
</script>

<template>
  <div v-if="on && items.length" class="variation-records dim" data-test="variation-records">
    <svg class="trophy" viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M8 4h8v5a4 4 0 0 1-8 0V4Z" />
      <path d="M8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4" />
      <path d="M12 13v4M9 20h6M10 17h4" />
    </svg>
    <span>{{ t('records_per_set_label') }}</span>
    <span v-for="it in items" :key="it.key" class="variation-record" :title="it.title" data-test="variation-record">
      <template v-if="it.label">{{ it.label }}{{ ' ' }}</template><strong>{{ it.value }}</strong>
    </span>
  </div>
</template>

<style scoped>
.variation-records {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 2px 10px;
  font-size: 0.78em;
  line-height: 1.5;
  margin: -6px 0 14px 2px; /* карточка выше имеет mb-3.5: подтягиваем строку к ней и возвращаем отступ вниз */
}
.trophy {
  flex: none;
  color: var(--accent);
}
.variation-record strong {
  color: var(--text);
  font-weight: 600;
}
</style>
