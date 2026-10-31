<script setup lang="ts">
// Импорт книг из CSV Goodreads (BACKLOG 77.9). Файл читается на устройстве; перед вставкой показываем, что будет добавлено и сколько дублей пропустим.
import { computed, ref } from 'vue'
import { t } from '../lib/i18n'
import { parseGoodreads, planImport, type ImportedBook } from '../lib/importGoodreads'

const props = defineProps<{ existing: { title: string; author: string | null }[]; busy: boolean; error: string }>()
const emit = defineEmits<{ close: []; confirm: [ImportedBook[]] }>()

const parsed = ref<ImportedBook[] | null>(null)
const fileError = ref('')
const plan = computed(() => (parsed.value ? planImport(parsed.value, props.existing) : null))

async function onFile(e: Event) {
  fileError.value = ''
  parsed.value = null
  const f = (e.target as HTMLInputElement).files?.[0]
  if (!f) return
  try {
    const r = parseGoodreads(await f.text())
    if (r.error === 'noColumns') fileError.value = t('gr_err_columns')
    else if (r.error) fileError.value = t('gr_err_empty')
    else parsed.value = r.books
  } catch {
    fileError.value = t('gr_err_read')
  }
}
</script>

<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" @click.self="emit('close')">
    <div class="w-full max-w-sm rounded-2xl border p-5" style="background: var(--bg-card); border-color: var(--border); color: var(--text)" data-test="import-books">
      <h3 class="mb-2 text-lg font-bold">{{ t('gr_title') }}</h3>
      <p class="mb-3 text-sm" style="color: var(--text-dim)">{{ t('gr_hint') }}</p>
      <input type="file" accept=".csv,text/csv" class="mb-3 w-full text-sm" data-test="gr-file" @change="onFile" />
      <p v-if="fileError" class="mb-2 text-sm" style="color: var(--danger)" role="alert" data-test="gr-file-error">{{ fileError }}</p>
      <div v-if="plan" class="mb-3 text-sm" data-test="gr-plan">
        <p class="m-0">{{ t('gr_will_add') }} <b>{{ plan.toAdd.length }}</b> ({{ t('gr_done') }}: {{ plan.done }}, {{ t('gr_to_read') }}: {{ plan.toRead }})</p>
        <p v-if="plan.duplicates" class="m-0 mt-1" style="color: var(--text-dim)">{{ t('gr_dups') }}: {{ plan.duplicates }}</p>
        <p class="m-0 mt-1 text-xs" style="color: var(--text-dim)">{{ t('gr_no_points') }}</p>
      </div>
      <p v-if="error" class="mb-2 text-sm" style="color: var(--danger)" role="alert" data-test="gr-error">{{ error }}</p>
      <div class="mt-2 flex justify-end gap-2">
        <button type="button" class="rounded-lg border px-4 py-2 text-sm" style="border-color: var(--border); background: var(--bg); color: var(--text)" @click="emit('close')">{{ t('cancel') }}</button>
        <button type="button" class="rounded-lg px-4 py-2 text-sm" style="background: var(--accent); color: var(--accent-text)" :disabled="busy || !plan || plan.toAdd.length === 0" data-test="gr-confirm" @click="plan && emit('confirm', plan.toAdd)">{{ t('gr_import_btn') }}</button>
      </div>
    </div>
  </div>
</template>
