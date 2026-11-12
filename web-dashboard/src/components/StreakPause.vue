<script setup lang="ts">
import { computed, ref } from 'vue'
import { t } from '../lib/i18n'
import { todayStr } from '../lib/date'
import { notifyDataChanged } from '../lib/events'
import { activePause, addPause, endPauseToday, pauses, removePause, type PauseKind } from '../lib/pauses'

// BACKLOG 81.5: пауза серий (отпуск / больничный). Показывается в окне «Серии».
const today = todayStr()
const kind = ref<PauseKind>('vacation')
const from = ref(today)
const to = ref('')
const invalid = ref(false)

const active = computed(() => activePause(pauses.value, today))
const others = computed(() => pauses.value.map((p, i) => ({ p, i })).filter(({ p }) => p !== active.value && (p.to === null || p.to >= today)))

function changed() {
  notifyDataChanged({ source: 'pause' })
}
function onAdd() {
  invalid.value = !addPause({ from: from.value, to: to.value || null, kind: kind.value }, today)
  if (!invalid.value) {
    to.value = ''
    changed()
  }
}
function onSickNow() {
  invalid.value = !addPause({ from: today, to: null, kind: 'sick' }, today)
  if (!invalid.value) changed()
}
function onEnd() {
  endPauseToday(today)
  changed()
}
function onRemove(i: number) {
  removePause(i)
  changed()
}
</script>

<template>
  <section class="mt-4 rounded-lg border p-2.5 text-sm" style="border-color: var(--border)" data-test="pause-card">
    <h4 class="m-0 mb-1 text-sm font-semibold">{{ t('dash_pause_title') }}</h4>
    <p class="dim m-0 mb-2 text-xs">{{ t('dash_pause_hint') }}</p>

    <div v-if="active" class="mb-2 flex flex-wrap items-center gap-2" data-test="pause-active">
      <span>{{ active.to ? t('dash_pause_active_until').replace('{date}', active.to) : t('dash_pause_active_open') }}</span>
      <button type="button" class="rounded-lg border px-3 py-1" style="border-color: var(--border); background: var(--bg); color: var(--text)" data-test="pause-end" @click="onEnd">
        {{ t('dash_pause_end') }}
      </button>
    </div>

    <div v-else class="mb-2">
      <button type="button" class="rounded-lg px-3 py-1.5" style="background: var(--accent); color: var(--accent-text)" data-test="pause-sick-now" @click="onSickNow">
        {{ t('dash_pause_sick_now') }}
      </button>
      <span class="dim ml-2 text-xs">{{ t('dash_pause_sick_now_hint') }}</span>
    </div>

    <div v-if="!active" class="flex flex-wrap items-center gap-2">
      <select v-model="kind" class="modal-input" :aria-label="t('dash_pause_kind_aria')" data-test="pause-kind">
        <option value="vacation">{{ t('dash_pause_kind_vacation') }}</option>
        <option value="sick">{{ t('dash_pause_kind_sick') }}</option>
      </select>
      <input v-model="from" type="date" class="modal-input" :aria-label="t('dash_pause_from_aria')" data-test="pause-from" />
      <input v-model="to" type="date" class="modal-input" :aria-label="t('dash_pause_to_aria')" data-test="pause-to" />
      <button type="button" class="rounded-lg border px-3 py-1" style="border-color: var(--border); background: var(--bg); color: var(--text)" data-test="pause-add" @click="onAdd">
        {{ t('dash_pause_add') }}
      </button>
    </div>
    <p v-if="invalid" class="m-0 mt-1 text-xs" role="alert" style="color: #d6336c" data-test="pause-invalid">{{ t('dash_pause_invalid') }}</p>

    <div v-if="others.length" class="mt-2">
      <div class="dim mb-1 text-xs">{{ t('dash_pause_planned') }}</div>
      <ul class="m-0 list-none p-0">
        <li v-for="o in others" :key="o.i" class="flex items-center gap-2 py-0.5" data-test="pause-row">
          <span>{{ t(o.p.kind === 'sick' ? 'dash_pause_kind_sick' : 'dash_pause_kind_vacation') }}: {{ o.p.from }} — {{ o.p.to ?? '…' }}</span>
          <button type="button" class="rounded-lg border px-2 py-0.5 text-xs" style="border-color: var(--border); background: var(--bg); color: var(--text)" data-test="pause-remove" @click="onRemove(o.i)">
            {{ t('dash_pause_remove') }}
          </button>
        </li>
      </ul>
    </div>
  </section>
</template>
