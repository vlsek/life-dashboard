import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { sb } from './supabase'
import { todayStr } from './date'
import { DATA_CHANGED } from './events'
import {
  DEADLINE_REMINDER_DISMISS_KEY,
  DEADLINE_REMINDER_OFF_KEY,
  dueTodayGoals,
  shouldShowDeadlineReminder,
  type DeadlineGoal,
} from './goalDeadlineReminder'

// Плашка «скоро просрочка цели» (BACKLOG 47.2). Свой маленький запрос (цели со сроком сегодня), по принципу остальных напоминаний
// (useEveningReminder): перечитывает на DATA_CHANGED (цель выполнили — плашка исчезает), «наступило 19:00» ловит таймером раз в минуту.
// Сбой запроса — молча без плашки: напоминание вспомогательное.
export function useDeadlineReminder() {
  const goals = ref<DeadlineGoal[]>([])
  const now = ref(new Date())
  const dismissedOn = ref<string | null>(read(DEADLINE_REMINDER_DISMISS_KEY))
  const enabled = ref(read(DEADLINE_REMINDER_OFF_KEY) !== '1')

  const visible = computed(() => shouldShowDeadlineReminder(now.value, goals.value.length, dismissedOn.value, todayStr(), enabled.value))

  let userId = ''
  let loadToken = 0
  async function load(uid?: string) {
    if (uid) userId = uid
    if (!userId) return
    const token = ++loadToken
    const today = todayStr()
    const { data, error } = await sb.from('goals').select('id, name, done, deadline').eq('user_id', userId).eq('deadline', today).eq('done', false)
    if (token !== loadToken || error) return
    goals.value = dueTodayGoals((data || []) as DeadlineGoal[], today)
  }

  function onDataChanged() {
    void load()
  }

  let timer: ReturnType<typeof setInterval> | undefined
  onMounted(() => {
    window.addEventListener(DATA_CHANGED, onDataChanged)
    timer = setInterval(() => {
      now.value = new Date()
    }, 60_000)
  })
  onBeforeUnmount(() => {
    window.removeEventListener(DATA_CHANGED, onDataChanged)
    if (timer) clearInterval(timer)
  })

  function dismiss() {
    const today = todayStr()
    dismissedOn.value = today
    write(DEADLINE_REMINDER_DISMISS_KEY, today)
  }

  // «Не напоминать» прямо из плашки; включить обратно можно на странице «Цели».
  function disable() {
    enabled.value = false
    write(DEADLINE_REMINDER_OFF_KEY, '1')
  }

  return { goals, visible, load, dismiss, disable }
}

function read(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}
function write(key: string, value: string) {
  try {
    localStorage.setItem(key, value)
  } catch {
    /* приватный режим — просто не запоминаем между перезагрузками */
  }
}
