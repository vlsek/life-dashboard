// Реактивная обвязка таймера отдыха (BACKLOG 69.5): одно состояние на вкладку; по окончании — вибрация и уведомление в приложении, плашка гаснет сама.
import { computed, ref } from 'vue'
import { adjustRest, isRestDone, nextPreset, readRestSeconds, restLeft, restProgress, startRest, writeRestSeconds, type RestState } from './restTimer'
import { haptic } from './nativeFeedback'
import { showToast } from './toast'
import { t } from './i18n'

const store = (): Storage | null => { try { return localStorage } catch { return null } }
const state = ref<RestState | null>(null)
const nowMs = ref(Date.now())
const seconds = ref(store() ? readRestSeconds(store()!) : 90)
let timer: ReturnType<typeof setInterval> | null = null

function stop() { if (timer) { clearInterval(timer); timer = null } }
function tick() {
  nowMs.value = Date.now()
  if (state.value && isRestDone(state.value, nowMs.value)) {
    state.value = null; stop()
    try { navigator.vibrate?.([200, 100, 200]) } catch { /* вибро — по возможности */ }
    haptic('success')
    showToast(t('aw_rest_done'))
  }
}
function ensureTimer() { if (!timer) timer = setInterval(tick, 250) }

export function useRestTimer() {
  return {
    state,
    seconds,
    left: computed(() => (state.value ? restLeft(state.value, nowMs.value) : 0)),
    progress: computed(() => (state.value ? restProgress(state.value, nowMs.value) : 0)),
    start() { nowMs.value = Date.now(); state.value = startRest(nowMs.value, seconds.value); if (state.value) ensureTimer() },
    adjust(delta: number) { if (state.value) { nowMs.value = Date.now(); state.value = adjustRest(state.value, nowMs.value, delta) } },
    skip() { state.value = null; stop() },
    cycleSetting() { seconds.value = nextPreset(seconds.value); if (store()) writeRestSeconds(seconds.value, store()!); if (!seconds.value) { state.value = null; stop() } },
  }
}
