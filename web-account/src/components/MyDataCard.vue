<script setup lang="ts">
// «Мои данные» (BACKLOG 79.2): скачать всё, что хранится о пользователе, файлом JSON или архивом CSV. Файл собирается на устройстве.
import { computed, ref } from 'vue'
import { sb } from '../lib/supabase'
import { getLang, t } from '../lib/i18n'
import { buildJson, collectExport, exportCsvZip, exportFileName, totalRows, type ExportResult, type SbReader } from '../lib/dataExport'
import EmojiText from './EmojiText.vue'

const props = defineProps<{ userId: string }>()

const busy = ref(false)
const progress = ref('')
const error = ref('')
const last = ref<ExportResult | null>(null)
const skippedCount = computed(() => (last.value ? Object.keys(last.value.skipped).length : 0))

function save(data: BlobPart, name: string, type: string) {
  const url = URL.createObjectURL(new Blob([data], { type }))
  const a = document.createElement('a')
  a.href = url
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

async function run(kind: 'json' | 'zip') {
  if (busy.value) return
  busy.value = true
  error.value = ''
  last.value = null
  progress.value = ''
  try {
    const now = new Date()
    const r = await collectExport(sb as unknown as SbReader, props.userId, now, undefined, (d, n) => (progress.value = `${d} / ${n}`))
    last.value = r
    if (kind === 'json') save(buildJson(r), exportFileName('json', now), 'application/json;charset=utf-8')
    else save(exportCsvZip(r, getLang(), now) as unknown as BlobPart, exportFileName('zip', now), 'application/zip')
  } catch (e) {
    error.value = t('acc_data_fail') + (e instanceof Error ? e.message : String(e))
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="mb-4 rounded-xl border p-4" style="border-color: var(--border); background: var(--bg-card)" data-test="my-data">
    <h3 class="mb-1 font-bold"><EmojiText :text="t('acc_data_h3')" /></h3>
    <p class="mb-3 text-sm" style="color: var(--text-dim)">{{ t('acc_data_hint') }}</p>
    <div class="flex flex-wrap gap-2">
      <button type="button" class="rounded-lg px-4 py-2 text-sm font-medium" style="background: var(--accent); color: var(--accent-text)" :disabled="busy" data-test="export-json" @click="run('json')">{{ t('acc_data_json') }}</button>
      <button type="button" class="secondary rounded-lg px-4 py-2 text-sm" :disabled="busy" data-test="export-zip" @click="run('zip')">{{ t('acc_data_csv') }}</button>
    </div>
    <p v-if="busy" class="mt-2 text-sm" style="color: var(--text-dim)" role="status" data-test="export-progress">{{ t('acc_data_progress') }} {{ progress }}</p>
    <p v-else-if="last" class="mt-2 text-sm" role="status" data-test="export-done">
      {{ t('acc_data_done') }}: {{ Object.keys(last.tables).length }} {{ t('acc_data_tables') }}, {{ totalRows(last) }} {{ t('acc_data_rows') }}<template v-if="skippedCount"> · {{ t('acc_data_skipped') }}: {{ skippedCount }}</template>
    </p>
    <p v-if="error" class="mt-2 text-sm" style="color: var(--danger)" role="alert" data-test="export-error">{{ error }}</p>
  </div>
</template>
