<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { t } from '../lib/i18n'
import { friendlyError } from '../lib/friendlyError'
import { addDaysIso, fmtRu, todayStr } from '../lib/date'
import { endPause, loadPauseState, maxPauseTo, pauseErrorKey, startPause, validatePause, type PauseKind, type PauseState } from '../lib/pause'

// Раздел «Пауза: отпуск / болезнь» в «Глобальных настройках» (BACKLOG 48.7). Включить можно только с сегодняшнего дня (задним числом нельзя), до 30 дней.
// После включения/выключения страница перезагружается: все разделы заново читают метрики, куда сервер записал даты паузы.
const props = defineProps<{ userId: string }>()
const emit = defineEmits<{ changed: [] }>()

const today = todayStr()
const available = ref(false)
const loaded = ref(false)
const state = ref<PauseState>(null)
const kind = ref<PauseKind>('vacation')
const to = ref(addDaysIso(today, 6)) // по умолчанию неделя
const busy = ref(false)
const error = ref<string | null>(null)
const maxTo = computed(() => maxPauseTo(today))

onMounted(async () => {
  const r = await loadPauseState(props.userId)
  available.value = r.available
  state.value = r.state
  loaded.value = true
})

const reload = () => {
  emit('changed')
  window.location.reload()
}

async function onStart() {
  const bad = validatePause(to.value, today)
  if (bad) {
    error.value = t(bad)
    return
  }
  error.value = null
  busy.value = true
  const res = await startPause(kind.value, to.value)
  busy.value = false
  if (res.ok) return reload()
  const key = pauseErrorKey(res.error)
  error.value = key ? t(key as 'hdr_pause_err_past') : friendlyError(res.error, 'save')
}

async function onEnd() {
  error.value = null
  busy.value = true
  const res = await endPause()
  busy.value = false
  if (res.ok) return reload()
  error.value = friendlyError(res.error, 'save')
}

const kindLabel = (k: PauseKind) => (k === 'illness' ? t('hdr_pause_illness') : t('hdr_pause_vacation'))
</script>

<template>
  <section v-if="loaded && available" data-test="pause-section">
    <h4 style="margin-top: 16px">{{ t('hdr_pause_title') }}</h4>
    <template v-if="state">
      <p style="margin: 0 0 8px; font-size: 13px" data-test="pause-status">
        <template v-if="state.status === 'active'">{{ t('hdr_pause_active').replace('{kind}', kindLabel(state.row.kind)).replace('{date}', fmtRu(state.row.to_date)).replace('{n}', String(state.daysLeft)) }}</template>
        <template v-else>{{ t('hdr_pause_scheduled').replace('{kind}', kindLabel(state.row.kind)).replace('{from}', fmtRu(state.row.from_date)).replace('{to}', fmtRu(state.row.to_date)) }}</template>
      </p>
      <button type="button" class="gh-btn" :disabled="busy" data-test="pause-end" @click="onEnd">{{ state.status === 'active' ? t('hdr_pause_end') : t('hdr_pause_cancel') }}</button>
    </template>
    <template v-else>
      <p class="gh-dim" style="margin: 0 0 8px; font-size: 12px">{{ t('hdr_pause_hint') }}</p>
      <div class="gh-wrap" style="margin-bottom: 8px">
        <button v-for="k in ['vacation', 'illness'] as const" :key="k" type="button" class="gh-btn" :class="{ 'gh-btn-primary': kind === k }" :aria-pressed="kind === k" :data-test="'pause-kind-' + k" @click="kind = k">{{ kindLabel(k) }}</button>
      </div>
      <label class="gh-field">
        <span class="gh-dim" style="font-size: 12px">{{ t('hdr_pause_until') }}</span>
        <input v-model="to" type="date" class="gh-input" :min="today" :max="maxTo" data-test="pause-to" />
      </label>
      <button type="button" class="gh-btn" :disabled="busy" data-test="pause-start" @click="onStart">{{ t('hdr_pause_start') }}</button>
    </template>
    <p v-if="error" style="color: #d6336c; margin: 8px 0 0" role="alert" data-test="pause-error">{{ error }}</p>
  </section>
</template>
