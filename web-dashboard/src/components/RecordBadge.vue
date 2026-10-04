<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { getLang, t } from '../lib/i18n'
import { RECORDS_EVENT, formatRecordDate, formatRecordValue, recordsEnabled, type RecordInfo } from '../lib/records'

// «Рекорд: 5 200 мл · 12 сент. 2026» — лучшее значение за всё время (BACKLOG раздел 28). Сам скрывается, если человек
// выключил рекорды в «Настроить Дашборд» (реагирует сразу, без перезагрузки) или рекорда ещё нет.
const props = defineProps<{ record: RecordInfo | null | undefined; unit?: string }>()
const on = ref(recordsEnabled())
const sync = () => (on.value = recordsEnabled())
onMounted(() => window.addEventListener(RECORDS_EVENT, sync))
onBeforeUnmount(() => window.removeEventListener(RECORDS_EVENT, sync))

const value = computed(() => (props.record ? `${formatRecordValue(props.record.y, getLang())}${props.unit ?? ''}` : ''))
const date = computed(() => (props.record ? formatRecordDate(props.record.date, getLang()) : ''))
</script>

<template>
  <span v-if="on && record" class="record-badge" data-test="record-badge" :title="t('records_title')">
    <svg class="trophy" viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M8 4h8v5a4 4 0 0 1-8 0V4Z" />
      <path d="M8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4" />
      <path d="M12 13v4M9 20h6M10 17h4" />
    </svg>
    <span data-test="record-text">{{ t('records_label') }} {{ value }} · {{ date }}</span>
  </span>
</template>

<style scoped>
.record-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 0.78em;
  line-height: 1.4;
  color: var(--text-dim);
}
.trophy {
  flex: none;
  color: var(--accent);
}
</style>
