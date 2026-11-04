<script setup lang="ts">
import { computed, ref } from 'vue'
import { sb } from '../lib/supabase'
import { getLang, t } from '../lib/i18n'
import type { SbReader } from '../lib/dataExport'
import { MAX_BACKUP_BYTES, parseBackup, previewImport, summarizeBackup, type BackupSummary, type ImportPreview } from '../lib/dataImport'
import EmojiText from './EmojiText.vue'

// «Проверить файл» (BACKLOG 79.3, срез 1): читает JSON из «Мои данные» и показывает, что в нём и что было бы добавлено. НИЧЕГО не меняет.
const props = defineProps<{ userId: string }>()
const lang = getLang() === 'en' ? 'en' : 'ru'

const busy = ref(false)
const error = ref('')
const fileName = ref('')
const summary = ref<BackupSummary | null>(null)
const preview = ref<ImportPreview | null>(null)
const previewNote = ref('') // почему сравнение с базой не делалось

const ERRORS = { empty: 'acc_imp_err_empty', json: 'acc_imp_err_json', format: 'acc_imp_err_format', shape: 'acc_imp_err_shape' } as const
const when = computed(() => (summary.value?.exportedAt ? summary.value.exportedAt.slice(0, 10) : ''))

async function onFile(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = '' // тот же файл можно выбрать повторно
  if (!file || busy.value) return
  busy.value = true
  error.value = ''
  summary.value = null
  preview.value = null
  previewNote.value = ''
  fileName.value = file.name
  try {
    if (file.size > MAX_BACKUP_BYTES) {
      error.value = t('acc_imp_err_big')
      return
    }
    const parsed = parseBackup(await file.text())
    if (!parsed.ok) {
      error.value = t(ERRORS[parsed.error])
      return
    }
    summary.value = summarizeBackup(parsed.backup, props.userId)
    if (summary.value.sameAccount === true) preview.value = await previewImport(sb as unknown as SbReader, parsed.backup, props.userId)
    else previewNote.value = summary.value.sameAccount === false ? t('acc_imp_other_account') : t('acc_imp_no_owner')
  } catch (err) {
    error.value = t('acc_imp_err_read') + (err instanceof Error ? err.message : String(err))
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="mb-4 rounded-xl border p-4" style="border-color: var(--border); background: var(--bg-card)" data-test="import-check">
    <h3 class="mb-1 font-bold"><EmojiText :text="t('acc_imp_h3')" /></h3>
    <p class="mb-3 text-sm" style="color: var(--text-dim)">{{ t('acc_imp_hint') }}</p>
    <label class="secondary inline-block cursor-pointer rounded-lg px-4 py-2 text-sm" :aria-disabled="busy">
      {{ t('acc_imp_pick') }}
      <input type="file" accept=".json,application/json" class="sr-only" :disabled="busy" data-test="import-file" @change="onFile" />
    </label>
    <span v-if="fileName" class="ml-2 text-sm" style="color: var(--text-dim)" data-test="import-filename">{{ fileName }}</span>
    <p v-if="busy" class="mt-2 text-sm" style="color: var(--text-dim)" role="status" data-test="import-busy">{{ t('acc_imp_busy') }}</p>
    <p v-if="error" class="mt-2 text-sm" style="color: var(--danger)" role="alert" data-test="import-error">{{ error }}</p>

    <div v-if="summary" class="mt-3 text-sm" data-test="import-summary">
      <p class="m-0 mb-1"><b>{{ t('acc_imp_ok') }}</b><template v-if="when"> · {{ t('acc_imp_from') }} {{ when }}</template> · {{ summary.totalRows }} {{ t('acc_data_rows') }}</p>
      <p v-if="summary.skipped.length" class="m-0 mb-1" style="color: var(--text-dim)" data-test="import-skipped">{{ t('acc_imp_skipped') }}: {{ summary.skipped.join(', ') }}</p>
      <ul class="m-0 mb-2 list-none p-0">
        <li v-for="l in summary.lines" :key="l.name" data-test="import-line">{{ l[lang] }}: {{ l.rows }}<span v-if="!l.known" style="color: var(--text-dim)"> ({{ t('acc_imp_unknown') }})</span></li>
      </ul>
      <p v-if="previewNote" class="m-0 mb-1" style="color: var(--text-dim)" data-test="import-note">{{ previewNote }}</p>
      <div v-if="preview" data-test="import-preview">
        <p class="m-0" data-test="import-values">{{ t('acc_imp_values') }}: {{ t('acc_imp_new') }} {{ preview.values.fresh }}, {{ t('acc_imp_have') }} {{ preview.values.existing }}<template v-if="preview.values.duplicatesInFile"> · {{ t('acc_imp_dups') }} {{ preview.values.duplicatesInFile }}</template><template v-if="preview.values.invalid"> · {{ t('acc_imp_invalid') }} {{ preview.values.invalid }}</template></p>
        <p class="m-0" data-test="import-notes">{{ t('acc_imp_notes') }}: {{ t('acc_imp_new') }} {{ preview.notes.fresh }}, {{ t('acc_imp_have') }} {{ preview.notes.existing }}<template v-if="preview.notes.duplicatesInFile"> · {{ t('acc_imp_dups') }} {{ preview.notes.duplicatesInFile }}</template><template v-if="preview.notes.invalid"> · {{ t('acc_imp_invalid') }} {{ preview.notes.invalid }}</template></p>
        <p v-if="preview.orphanValues" class="m-0" style="color: var(--danger)" data-test="import-orphans">{{ t('acc_imp_orphans').replace('{n}', String(preview.orphanValues)) }}</p>
      </div>
      <p class="mt-2 mb-0 text-xs" style="color: var(--text-dim)" data-test="import-nochange">{{ t('acc_imp_nochange') }}</p>
    </div>
  </div>
</template>
