import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { sb } from './supabase'
import { todayStr } from './date'
import { DATA_CHANGED } from './events'
import { t } from './i18n'
import { normalizePlanned, type PlanGoal, type PlannedEntry } from './planned'
import { dueReminders, type DueReminder } from './planReminders'
import { showSystemNotification } from './browserNotify'

export const PLAN_REMINDERS_KEY = 'plan_reminders' // + ':' + дата

interface Store {
  notified: string[] // по этим ключам системное уведомление уже показано
  acked: string[] // эти закрыл крестиком в плашке
}

function readStore(date: string): Store {
  try {
    const raw = JSON.parse(localStorage.getItem(`${PLAN_REMINDERS_KEY}:${date}`) || 'null')
    if (raw && Array.isArray(raw.notified) && Array.isArray(raw.acked)) return raw
  } catch {
    /* приватный режим / битый JSON — начинаем с чистого листа */
  }
  return { notified: [], acked: [] }
}

function writeStore(date: string, s: Store) {
  try {
    localStorage.setItem(`${PLAN_REMINDERS_KEY}:${date}`, JSON.stringify(s))
  } catch {
    /* ignore */
  }
}

// Напоминания по времени пунктов сегодняшнего плана, пока Дашборд открыт. Свой лёгкий запрос
// (план на сегодня + цели), как у вечернего напоминания: чужие файлы не трогаем. Данные
// перечитываются на DATA_CHANGED (отметил пункт — плашка пропала), время проверяется раз в
// 30 секунд. Плашка показывается, пока пункт не выполнен и не закрыт; системное уведомление
// (если есть разрешение) — один раз на пункт в день, даже после перезагрузки страницы.
export function usePlanReminders() {
  const planned = ref<PlannedEntry[]>([])
  const goals = ref<PlanGoal[]>([])
  const now = ref(new Date())
  const store = ref<Store>(readStore(todayStr()))

  let userId = ''
  let day = todayStr()
  let loadToken = 0

  // Свой пункт — по done, цель — по done самой цели (многоэтапная — done только когда закрыта целиком).
  function isDone(entry: PlannedEntry): boolean {
    if (entry.type !== 'goal') return !!entry.done
    const g = goals.value.find((x) => x.name === entry.text)
    if (!g) return true // цель удалена — напоминать не о чем
    return !!g.done
  }

  const due = computed<DueReminder[]>(() => dueReminders(planned.value, now.value, day, isDone))
  const visible = computed(() => due.value.filter((d) => !store.value.acked.includes(d.key)))

  function fireNew() {
    const fresh = due.value.filter((d) => !store.value.notified.includes(d.key))
    if (fresh.length === 0) return
    for (const d of fresh) showSystemNotification(t('plan_reminder_title'), `${d.time} · ${d.text}`, d.key)
    store.value = { ...store.value, notified: [...store.value.notified, ...fresh.map((d) => d.key)] }
    writeStore(day, store.value)
  }

  async function load(uid?: string) {
    if (uid) userId = uid
    if (!userId) return
    const token = ++loadToken
    const today = todayStr()
    const [noteRes, goalsRes] = await Promise.all([
      sb.from('daily_notes').select('planned_goals').eq('user_id', userId).eq('date', today).maybeSingle(),
      sb.from('goals').select('id, name, stages, done, current_stage').eq('user_id', userId),
    ])
    if (token !== loadToken) return
    if (noteRes.error || goalsRes.error) return // вспомогательный блок: при ошибке молча ничего не показываем
    if (today !== day) {
      day = today // перевалили за полночь с открытой страницей
      store.value = readStore(day)
    }
    planned.value = normalizePlanned(noteRes.data?.planned_goals)
    goals.value = (goalsRes.data || []) as PlanGoal[]
    now.value = new Date()
    fireNew()
  }

  function onDataChanged() {
    void load()
  }

  let timer: ReturnType<typeof setInterval> | undefined
  onMounted(() => {
    window.addEventListener(DATA_CHANGED, onDataChanged)
    timer = setInterval(() => {
      now.value = new Date()
      if (todayStr() !== day) void load() // новый день — план другой
      else fireNew()
    }, 30_000)
  })
  onBeforeUnmount(() => {
    window.removeEventListener(DATA_CHANGED, onDataChanged)
    if (timer) clearInterval(timer)
  })

  function dismiss(key: string) {
    store.value = { ...store.value, acked: [...store.value.acked, key] }
    writeStore(day, store.value)
  }

  return { visible, load, dismiss }
}
