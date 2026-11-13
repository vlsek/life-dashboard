<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
import { t } from '../lib/i18n'
import { defaultAudio, playRestBeep } from '../lib/restSound'
import {
  CLOCK_ZERO, ROUNDS_MAX, REST_MAX_SEC, WORK_MAX, addLap, buildPhases, clockElapsed, clockPause, clockStart, fmtClock, fmtStopwatch,
  normalizeInterval, phaseAt, readInterval, totalSeconds, writeInterval, type Clock, type IntervalConfig, type Lap,
} from '../lib/intervalTimer'

// Интервальный таймер «работа/отдых × N» и секундомер (BACKLOG 69.16, срез 1). Время идёт по часам,
// поэтому свёрнутая вкладка не сбивает отсчёт; на смене фазы — сигнал и вибрация.
const emit = defineEmits<{ close: [] }>()
type Mode = 'interval' | 'stopwatch'
const mode = ref<Mode>('interval')
const store = (() => { try { return localStorage } catch { return null } })()
const cfg = ref<IntervalConfig>(store ? readInterval(store) : normalizeInterval(null))
const phases = computed(() => buildPhases(cfg.value))
const total = computed(() => totalSeconds(phases.value))

const clock = ref<Clock>(CLOCK_ZERO)
const now = ref(Date.now())
const lastIndex = ref(0)
const running = computed(() => clock.value.startedAt != null)
const elapsed = computed(() => clockElapsed(clock.value, now.value))
const cur = computed(() => phaseAt(phases.value, elapsed.value))
const started = computed(() => elapsed.value > 0 || running.value)
let timer: ReturnType<typeof setInterval> | null = null

function vibrate(p: number | number[]) { try { navigator.vibrate?.(p) } catch { /* вибро — по возможности */ } }
function tick() {
  now.value = Date.now()
  if (mode.value !== 'interval') return
  const c = cur.value
  if (c.index !== lastIndex.value) { // сменилась фаза или всё закончилось
    lastIndex.value = c.index
    playRestBeep(defaultAudio())
    vibrate(c.done ? [300, 120, 300, 120, 300] : 200)
    if (c.done) stopTicking(true)
  }
}
function startTicking() { if (!timer) timer = setInterval(tick, 200) }
function stopTicking(freeze = false) {
  if (timer) { clearInterval(timer); timer = null }
  if (freeze) clock.value = clockPause(clock.value, Date.now())
}
function start() {
  now.value = Date.now()
  if (mode.value === 'interval' && cur.value.done) reset()
  clock.value = clockStart(clock.value, now.value)
  if (mode.value === 'interval') playRestBeep(defaultAudio()) // «разбудить» звук по жесту пользователя
  startTicking()
}
function pause() { stopTicking(true); now.value = Date.now() }
function reset() { stopTicking(); clock.value = CLOCK_ZERO; lastIndex.value = 0; laps.value = []; now.value = Date.now() }
function setMode(m: Mode) { if (m !== mode.value) { reset(); mode.value = m } }
onBeforeUnmount(() => stopTicking())

function step(key: keyof IntervalConfig, delta: number) {
  if (started.value) return // во время тренировки настройки не трогаем
  const big = key === 'rounds' ? 1 : 5
  cfg.value = normalizeInterval({ ...cfg.value, [key]: cfg.value[key] + delta * big })
  if (store) writeInterval(cfg.value, store)
}
const FIELDS = [
  { key: 'work' as const, label: 'timer_work' as const, max: WORK_MAX, min: 1 },
  { key: 'rest' as const, label: 'timer_rest' as const, max: REST_MAX_SEC, min: 0 },
  { key: 'rounds' as const, label: 'timer_rounds' as const, max: ROUNDS_MAX, min: 1 },
]

const laps = ref<Lap[]>([])
const lap = () => { laps.value = addLap(laps.value, elapsed.value) }

const phaseKind = computed(() => (cur.value.done ? 'done' : cur.value.phase?.kind ?? 'work'))
const phaseColor = computed(() => ({ warmup: 'var(--text-dim)', work: 'var(--accent)', rest: 'var(--success, #3fa66b)', done: 'var(--success, #3fa66b)' })[phaseKind.value])
const phaseLabel = computed(() => t(('timer_phase_' + phaseKind.value) as 'timer_phase_work'))
const roundText = computed(() => {
  const r = cur.value.phase?.round ?? 0
  return r > 0 ? t('timer_round_of').replace('{n}', String(r)).replace('{m}', String(cfg.value.rounds)) : ''
})
const progress = computed(() => {
  const p = cur.value.phase
  if (!p) return 1
  return 1 - cur.value.left / p.seconds
})
</script>

<template>
  <div class="fixed inset-0 z-[70] flex items-end justify-center sm:items-center" style="background: rgba(0, 0, 0, 0.6)" data-testid="timer-modal" @click.self="emit('close')">
    <div class="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-t-2xl border p-5 sm:rounded-2xl" style="background: var(--bg-card); border-color: var(--border); color: var(--text)" role="dialog" aria-modal="true" :aria-label="t('timer_title')">
      <h2 class="mb-3 text-lg font-bold">{{ t('timer_title') }}</h2>
      <div class="mb-4 flex gap-2" role="tablist">
        <button
          v-for="m in (['interval', 'stopwatch'] as const)"
          :key="m"
          type="button"
          role="tab"
          :aria-selected="mode === m"
          class="flex-1 rounded-lg border px-3 py-2 text-sm"
          :style="{ borderColor: mode === m ? 'var(--accent)' : 'var(--border)', color: mode === m ? 'var(--accent)' : 'var(--text)', background: 'var(--bg)', minHeight: '44px' }"
          :data-testid="'timer-tab-' + m"
          @click="setMode(m)"
        >{{ t(m === 'interval' ? 'timer_tab_interval' : 'timer_tab_stopwatch') }}</button>
      </div>

      <template v-if="mode === 'interval'">
        <div v-if="!started" class="mb-3" data-testid="timer-setup">
          <div v-for="f in FIELDS" :key="f.key" class="mb-2 flex items-center justify-between gap-3">
            <span class="text-sm" style="color: var(--text-dim)">{{ t(f.label) }}</span>
            <span class="flex items-center gap-2">
              <button type="button" class="rounded-lg border text-lg" style="border-color: var(--border); background: var(--bg); color: var(--text); width: 44px; height: 44px" :aria-label="t('timer_dec')" :disabled="cfg[f.key] <= f.min" :data-testid="'timer-dec-' + f.key" @click="step(f.key, -1)">−</button>
              <b class="w-10 text-center text-lg" :data-testid="'timer-val-' + f.key">{{ cfg[f.key] }}</b>
              <button type="button" class="rounded-lg border text-lg" style="border-color: var(--border); background: var(--bg); color: var(--text); width: 44px; height: 44px" :aria-label="t('timer_inc')" :disabled="cfg[f.key] >= f.max" :data-testid="'timer-inc-' + f.key" @click="step(f.key, 1)">+</button>
            </span>
          </div>
          <p class="m-0 mt-2 text-sm" style="color: var(--text-dim)" data-testid="timer-total">{{ t('timer_total').replace('{n}', fmtClock(total)) }}</p>
        </div>
        <div v-else class="mb-4 text-center" data-testid="timer-run" :data-phase="phaseKind">
          <p class="m-0 text-sm font-semibold uppercase tracking-wide" :style="{ color: phaseColor }" data-testid="timer-phase">{{ phaseLabel }}</p>
          <p class="m-0 text-6xl font-bold tabular-nums" :style="{ color: phaseColor }" data-testid="timer-left">{{ fmtClock(cur.left) }}</p>
          <p class="m-0 mb-2 text-sm" style="color: var(--text-dim)" data-testid="timer-round">{{ roundText }}</p>
          <div class="h-2 w-full overflow-hidden rounded-full" style="background: var(--bg)"><div class="h-full rounded-full" :style="{ width: Math.round(progress * 100) + '%', background: phaseColor, transition: 'width 0.2s linear' }" /></div>
        </div>
      </template>

      <div v-else class="mb-4 text-center" data-testid="timer-stopwatch">
        <p class="m-0 text-6xl font-bold tabular-nums" data-testid="timer-sw-value">{{ fmtStopwatch(elapsed) }}</p>
        <ul v-if="laps.length" class="m-0 mt-3 list-none p-0 text-sm" style="max-height: 160px; overflow-y: auto">
          <li v-for="l in laps" :key="l.n" class="flex justify-between border-b py-1" style="border-color: var(--border)" data-testid="timer-lap">
            <span style="color: var(--text-dim)">{{ t('timer_lap') }} {{ l.n }}</span><b class="tabular-nums">{{ fmtStopwatch(l.split) }}</b><span class="tabular-nums" style="color: var(--text-dim)">{{ fmtStopwatch(l.total) }}</span>
          </li>
        </ul>
      </div>

      <div class="flex flex-wrap items-center gap-2">
        <button v-if="!running" type="button" class="flex-1 rounded-lg border px-4 py-2 font-semibold" style="border-color: var(--accent); background: var(--accent); color: #fff; min-height: 48px" data-testid="timer-start" @click="start">{{ started && !cur.done ? t('timer_resume') : t('timer_start') }}</button>
        <button v-else type="button" class="flex-1 rounded-lg border px-4 py-2 font-semibold" style="border-color: var(--border); background: var(--bg); color: var(--text); min-height: 48px" data-testid="timer-pause" @click="pause">{{ t('timer_pause') }}</button>
        <button v-if="mode === 'stopwatch' && running" type="button" class="rounded-lg border px-4 py-2" style="border-color: var(--border); background: var(--bg); color: var(--text); min-height: 48px" data-testid="timer-lap-btn" @click="lap">{{ t('timer_lap') }}</button>
        <button v-if="started" type="button" class="rounded-lg border px-4 py-2" style="border-color: var(--border); background: var(--bg); color: var(--text); min-height: 48px" data-testid="timer-reset" @click="reset">{{ t('timer_reset') }}</button>
      </div>
      <div class="mt-3 text-right">
        <button type="button" class="rounded-lg border px-4 py-2 text-sm" style="border-color: var(--border); background: var(--bg-card); color: var(--text); min-height: 44px" data-testid="timer-close" @click="emit('close')">{{ t('timer_close') }}</button>
      </div>
    </div>
  </div>
</template>
