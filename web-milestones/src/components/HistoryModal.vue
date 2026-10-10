<script setup lang="ts">
import { computed } from 'vue'
import { locale, t } from '../lib/i18n'
import type { Milestone } from '../lib/types'

const props = defineProps<{ milestone: Milestone }>()
const emit = defineEmits<{ close: [] }>()

// Новые сверху — портировано из showHistory() в milestones.js.
const rows = computed(() =>
  (Array.isArray(props.milestone.history) ? props.milestone.history : [])
    .slice()
    .sort((a, b) => (b.date || '').localeCompare(a.date || '')),
)

function fmtRu(iso: string | null): string {
  if (!iso) return ''
  const [y, m, d] = iso.split('-')
  return `${d}.${m}.${y}`
}

function fmtKm(n: number | null): string {
  if (!n) return ''
  return Number(n).toLocaleString(locale()) + ' ' + t('ms_km')
}
</script>

<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" @click.self="emit('close')">
    <div class="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-2xl border p-5" style="background: var(--bg-card); border-color: var(--border); color: var(--text)">
      <h3 class="mb-3 text-lg font-bold">{{ t('ms_history_title') }} — {{ milestone.name }}</h3>

      <p v-if="rows.length === 0" class="dim">{{ t('ms_history_empty') }}</p>
      <div v-else class="table-scroll overflow-x-auto" data-test="table-scroll">
        <table class="w-full text-sm">
          <tbody>
            <tr v-for="(h, i) in rows" :key="i" class="align-top">
              <td class="py-1 pr-3 whitespace-nowrap">{{ fmtRu(h.date) }}</td>
              <td class="dim py-1 pr-3 whitespace-nowrap">{{ fmtKm(h.km) }}</td>
              <td class="dim py-1">{{ h.note || '' }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="mt-4 flex justify-end">
        <button
          type="button"
          class="rounded-lg border px-4 py-2 text-sm"
          style="border-color: var(--border); background: var(--bg); color: var(--text)"
          @click="emit('close')"
        >
          {{ t('dash_close_btn') }}
        </button>
      </div>
    </div>
  </div>
</template>
