<script setup lang="ts">
import { ref } from 'vue'
import { t } from '../lib/i18n'
import type { SeriesPoint } from '../lib/chartSeries'

// Раскрывающийся список точек графика с правкой значения на месте — портировано из
// renderEditableSeriesValues() в dashboard.js. Родитель сохраняет и возвращает текст ошибки.
const props = defineProps<{ points: SeriesPoint[]; unit: string; save: (date: string, raw: string) => Promise<string | null> }>()

const open = ref(false)
const error = ref<string | null>(null)

function fmtRu(iso: string): string {
  const [y, m, d] = iso.split('-')
  return `${d}.${m}.${y}`
}

async function onChange(p: SeriesPoint, e: Event) {
  error.value = await props.save(p.date, (e.target as HTMLInputElement).value)
}
</script>

<template>
  <div>
    <button type="button" class="secondary mt-1 px-2.5 py-0.5 text-sm" data-test="toggle" @click="open = !open">{{ t('dash_chart_edit_values_btn') }}</button>
    <div v-if="open" class="mt-2 max-h-56 overflow-y-auto">
      <table>
        <tbody>
          <!-- сначала недавние даты -->
          <tr v-for="p in [...points].reverse()" :key="p.date">
            <td class="pr-3">{{ fmtRu(p.date) }}</td>
            <td>
              <input type="number" step="any" placeholder="0" class="w-24" :value="p.y ?? ''" data-test="value-input" @change="onChange(p, $event)" />
              <span v-if="unit" class="dim ml-1">{{ unit.trim() }}</span>
            </td>
          </tr>
        </tbody>
      </table>
      <p v-if="error" class="mt-1 text-sm" style="color: var(--danger)">{{ error }}</p>
    </div>
  </div>
</template>
