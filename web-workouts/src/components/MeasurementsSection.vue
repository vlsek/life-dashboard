<script setup lang="ts">
import { computed, ref } from 'vue'
import { t, type DictKey } from '../lib/i18n'
import { todayStr } from '../lib/date'
import { PARTS, formatDelta, parseCm, seriesFor, sparkPoints, summarize, type Measurement, type PartId } from '../lib/measurements'

// Замеры тела (BACKLOG 57.1, срез 1): по желанию, свёрнуто по умолчанию (не навязываем новичку). Только отображение и ввод — данные и сеть у родителя.
const props = defineProps<{ rows: Measurement[]; busy: boolean; error: string | null }>()
const emit = defineEmits<{ add: [part: PartId, date: string, valueCm: number, done: (ok: boolean) => void]; remove: [id: string] }>()

const OPEN_KEY = 'workouts_measurements_open'
function readOpen(): boolean {
  try {
    return localStorage.getItem(OPEN_KEY) === '1'
  } catch {
    return false
  }
}
const open = ref(readOpen())
function toggle() {
  open.value = !open.value
  try {
    localStorage.setItem(OPEN_KEY, open.value ? '1' : '0')
  } catch {
    /* ignore */
  }
}

const part = ref<PartId>('waist')
const value = ref('')
const date = ref(todayStr())
const bad = ref(false)
const focus = ref<PartId | null>(null)

const summary = computed(() => summarize(props.rows))
const history = computed(() => (focus.value ? seriesFor(props.rows, focus.value).slice().reverse() : []))
const spark = computed(() => (focus.value ? sparkPoints(seriesFor(props.rows, focus.value)) : []))
const partName = (p: PartId) => t(`meas_part_${p}` as DictKey)
const ruDate = (d: string) => d.split('-').reverse().join('.')

function save() {
  const n = parseCm(value.value)
  bad.value = n === null
  if (n === null) return
  emit('add', part.value, date.value || todayStr(), n, (ok) => {
    if (ok) {
      value.value = ''
      focus.value = part.value
    }
  })
}
</script>

<template>
  <section class="mt-4 rounded-xl border p-3.5 text-sm" style="border-color: var(--border); background: var(--bg-card)" data-testid="measurements">
    <button type="button" class="flex w-full items-center justify-between gap-2 border-0 bg-transparent p-0 text-left font-bold" style="color: var(--text)" :aria-expanded="open" data-testid="measurements-toggle" @click="toggle">
      <span>{{ t('meas_title') }}</span>
      <span class="text-xs font-normal" style="color: var(--text-dim)">{{ open ? t('meas_close') : t('meas_open') }} <span aria-hidden="true">{{ open ? '▴' : '▾' }}</span></span>
    </button>

    <div v-if="open" class="mt-2" data-testid="measurements-body">
      <p class="m-0 mb-2 text-xs" style="color: var(--text-dim)">{{ t('meas_hint') }}</p>

      <form class="mb-3 flex flex-wrap items-end gap-2" data-testid="measurements-form" @submit.prevent="save">
        <label class="flex flex-col gap-0.5 text-xs" style="color: var(--text-dim)">{{ t('meas_part') }}
          <select v-model="part" class="rounded-lg border px-2 py-1.5 text-sm" data-testid="meas-part">
            <option v-for="p in PARTS" :key="p" :value="p">{{ partName(p) }}</option>
          </select>
        </label>
        <label class="flex flex-col gap-0.5 text-xs" style="color: var(--text-dim)">{{ t('meas_value') }}
          <input v-model="value" type="text" inputmode="decimal" class="w-24 rounded-lg border px-2 py-1.5 text-sm" data-testid="meas-value" />
        </label>
        <label class="flex flex-col gap-0.5 text-xs" style="color: var(--text-dim)">{{ t('meas_date') }}
          <input v-model="date" type="date" :max="todayStr()" class="rounded-lg border px-2 py-1.5 text-sm" data-testid="meas-date" />
        </label>
        <button type="submit" class="rounded-lg px-3 py-1.5 text-sm" :disabled="busy" data-testid="meas-save">{{ t('meas_save') }}</button>
      </form>
      <p v-if="bad" class="m-0 mb-2 text-xs" style="color: var(--danger, #e5484d)" role="alert" data-testid="meas-bad">{{ t('meas_bad_value') }}</p>
      <p v-if="error" class="m-0 mb-2 text-xs" style="color: var(--danger, #e5484d)" role="alert" data-testid="meas-error">{{ t('meas_saved_err') }}</p>

      <p v-if="!summary.length" class="m-0 text-xs" style="color: var(--text-dim)" data-testid="meas-empty">{{ t('meas_empty') }}</p>
      <ul v-else class="m-0 list-none p-0" data-testid="meas-list">
        <li v-for="s in summary" :key="s.part" class="border-t py-1" style="border-color: var(--border)">
          <button type="button" class="flex w-full items-center gap-2 border-0 bg-transparent p-0 text-left text-sm" style="color: var(--text)" :aria-pressed="focus === s.part" :data-part="s.part" data-testid="meas-row" @click="focus = focus === s.part ? null : s.part">
            <span class="min-w-0 flex-1 truncate">{{ partName(s.part) }}</span>
            <span class="font-semibold">{{ String(s.last.value_cm).replace('.', ',') }} {{ t('meas_cm') }}</span>
            <span v-if="s.delta !== null" class="w-12 text-right text-xs" style="color: var(--text-dim)" data-testid="meas-delta">{{ formatDelta(s.delta) }}</span>
            <span class="text-xs" style="color: var(--text-dim)">{{ ruDate(s.last.date) }}</span>
          </button>
          <div v-if="focus === s.part" class="mt-1 pb-1" data-testid="meas-history">
            <svg v-if="spark.length > 1" viewBox="0 0 120 32" width="120" height="32" fill="none" aria-hidden="true" data-testid="meas-spark">
              <polyline :points="spark.map((p) => p.x.toFixed(1) + ',' + p.y.toFixed(1)).join(' ')" stroke="var(--accent)" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round" />
              <circle v-for="(p, i) in spark" :key="i" :cx="p.x" :cy="p.y" r="1.8" fill="var(--accent)" />
            </svg>
            <div class="mt-1 text-xs font-semibold" style="color: var(--text-dim)">{{ t('meas_history') }}</div>
            <div v-for="h in history" :key="h.id" class="flex items-center gap-2 py-0.5 text-xs" data-testid="meas-history-row">
              <span style="color: var(--text-dim)">{{ ruDate(h.date) }}</span>
              <span class="flex-1">{{ String(h.value_cm).replace('.', ',') }} {{ t('meas_cm') }}</span>
              <button type="button" class="rounded-lg border px-2 py-0.5 text-xs" style="border-color: var(--border); background: transparent; color: var(--text-dim)" :disabled="busy" data-testid="meas-delete" @click="emit('remove', h.id)">{{ t('meas_delete') }}</button>
            </div>
          </div>
        </li>
      </ul>
    </div>
  </section>
</template>
