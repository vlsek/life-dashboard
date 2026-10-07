import { ref } from 'vue'
import { sb } from './supabase'
import { fetchAllRows } from './fetchAll'
import { withWaterGoal, isWeightLike } from './waterGoal'
import { ACHIEVEMENTS, computeCounters, countMilestoneMarks, evaluate, reconcile, type AchievementState, type Counters, type Unlocked, type ValueRow } from './achievements'
import { loadUnlocked, saveUnlocked, type StorageMode } from './achievementStore'
import { grantCoinBonuses, type CoinBonus } from './coinBonuses'
import { REWARD_STATUS } from './rewards'
import { countMegaWeeks, getDayProgressSettings, type GoalLite, type PlannedItem } from './weekProgress'
import type { Metric, PointsRow } from './types'

export type AuthState =
  | { status: 'loading' }
  | { status: 'redirecting' }
  | { status: 'ready'; userId: string; userEmail: string | null }

// Тот же паттерн session/onboarded redirect, что и в остальных пилотах — портировано из requireAuth()/requireOnboarded() в config.js.
export function useAchievements() {
  const auth = ref<AuthState>({ status: 'loading' })
  const states = ref<AchievementState[]>([])
  const unlocked = ref<Unlocked>({})
  const newlyUnlocked = ref<string[]>([]) // открыто именно сейчас (для поздравляющего окна)
  const grantedCoins = ref<CoinBonus[]>([]) // бонусные монетки, выданные именно сейчас (в том числе «задним числом»)
  const counters = ref<Counters | null>(null)
  const mode = ref<StorageMode>('local')
  const error = ref<string | null>(null)
  const loading = ref(true)

  async function init() {
    const { data } = await sb.auth.getSession()
    const session = data.session
    if (!session) {
      auth.value = { status: 'redirecting' }
      window.location.href = '/login/'
      return
    }
    const userId = session.user.id
    const userEmail = session.user.email ?? null

    const { data: profile } = await sb.from('profiles').select('onboarded').eq('user_id', userId).maybeSingle()
    if (!profile?.onboarded) {
      auth.value = { status: 'redirecting' }
      window.location.href = '/onboarding/'
      return
    }

    auth.value = { status: 'ready', userId, userEmail }
    await load(userId)
  }

  // Вес пишется в body_parameter_values у параметра с иконкой/названием «вес» (как и расчёт нормы воды) — считаем его записи.
  async function countWeightEntries(userId: string): Promise<number> {
    const { data: params } = await sb.from('body_parameters').select('id, name, icon').eq('user_id', userId)
    const ids = ((params || []) as { id: string; name: string; icon: string | null }[]).filter((p) => isWeightLike(p.icon, p.name)).map((p) => p.id)
    if (!ids.length) return 0
    const { count } = await sb.from('body_parameter_values').select('id', { count: 'exact', head: true }).eq('user_id', userId).in('parameter_id', ids)
    return count ?? 0
  }

  async function load(userId: string) {
    loading.value = true
    try {
      const [metricsRes, valuesRes, goalsRes, skillsRes, booksRes, workoutsRes, challengesRes, weightCount, notesRes, allGoalsRes, wordsAddedRes, wordsLearnedRes, milestonesRes] = await Promise.all([
        sb.from('metrics').select('*').eq('user_id', userId).eq('active', true),
        // постранично: Supabase отдаёт максимум 1000 строк за запрос, иначе счётчики считались бы по обрезанной истории
        fetchAllRows<ValueRow>((from, to) => sb.from('daily_values').select('date, metric_id, value').eq('user_id', userId).order('date').order('metric_id').range(from, to)),
        sb.from('goals').select('points').eq('user_id', userId).eq('done', true),
        sb.from('skills').select('points').eq('user_id', userId).eq('mastered', true),
        sb.from('books').select('points').eq('user_id', userId).eq('status', 'done'),
        fetchAllRows<{ date: string }>((from, to) => sb.from('workout_entries').select('date').eq('user_id', userId).order('date').range(from, to)),
        sb.from('challenge_instances').select('id').eq('user_id', userId).eq('completed', true),
        countWeightEntries(userId),
        // планы дней (⭐-бонусы недели) и цели целиком (по имени понять, выполнен ли пункт-цель) — для достижения «Мега продуктивность»
        fetchAllRows<{ date: string; planned_goals: PlannedItem[] | null }>((from, to) => sb.from('daily_notes').select('date, planned_goals').eq('user_id', userId).order('date').range(from, to)),
        sb.from('goals').select('name, stages, done, current_stage').eq('user_id', userId),
        // «Языки»: считаем строки на стороне базы (head + count), без выкачивания слов. Ошибка (нет таблицы/сети) — count = null → 0.
        sb.from('vocabulary').select('id', { count: 'exact', head: true }).eq('user_id', userId),
        sb.from('vocabulary').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('learned', true),
        // «Вехи»: история отметок и признак «выполнена» (ошибка/нет таблицы — 0)
        sb.from('milestones').select('history, done').eq('user_id', userId),
      ])
      const err = metricsRes.error?.message || valuesRes.error || goalsRes.error?.message || skillsRes.error?.message || booksRes.error?.message || workoutsRes.error
      if (err) {
        error.value = err
        return
      }
      error.value = null

      const metrics = await withWaterGoal(userId, (metricsRes.data || []) as Metric[]) // вода — по эффективной норме (migrations/033)
      const c = computeCounters({
        metrics,
        values: valuesRes.rows,
        doneGoals: (goalsRes.data || []) as PointsRow[],
        masteredSkills: (skillsRes.data || []) as PointsRow[],
        doneBooks: (booksRes.data || []) as PointsRow[],
        weightEntries: weightCount,
        workoutDates: workoutsRes.rows.map((r) => r.date),
        challengesDone: (challengesRes.data || []).length, // нет таблицы челленджей/ошибка — просто 0
        wordsAdded: wordsAddedRes.count ?? 0,
        wordsLearned: wordsLearnedRes.count ?? 0,
        milestonesDone: milestonesRes.error ? 0 : countMilestoneMarks((milestonesRes.data || []) as { history?: unknown[] | null; done?: boolean | null }[]),
        // ошибка заметок/целей не ломает страницу — недель выше 100% тогда 0 (открытые достижения не пропадают)
        megaWeeks: notesRes.error || allGoalsRes.error ? 0 : countMegaWeeks({ metrics, values: valuesRes.rows, planned: notesRes.rows, goals: (allGoalsRes.data || []) as GoalLite[], settings: getDayProgressSettings(), today: new Date() }),
        today: new Date(),
      })
      counters.value = c
      const st = evaluate(c, ACHIEVEMENTS)
      states.value = st

      const loaded = await loadUnlocked(userId)
      const rec = reconcile(st, { ...loaded.stored }, new Date().toISOString())
      unlocked.value = rec.unlocked
      newlyUnlocked.value = rec.newlyUnlocked
      // дописываем новое и то, что раньше жило только на устройстве; сбой записи страницу не ломает
      mode.value = await saveUnlocked(userId, loaded.mode, { ...loaded.backfill, ...rec.added }, rec.unlocked)
      // монетки за открытые значки (ступени 1 и 2): один раз на значок, задним числом тоже; сбой выдачи страницу не ломает
      if (REWARD_STATUS.coins === 'active') grantedCoins.value = (await grantCoinBonuses(sb as unknown as Parameters<typeof grantCoinBonuses>[0], userId, Object.keys(rec.unlocked))).granted
    } catch (e) {
      error.value = (e as Error).message
    } finally {
      loading.value = false
    }
  }

  async function reload() {
    if (auth.value.status === 'ready') await load(auth.value.userId)
  }

  return { auth, states, unlocked, newlyUnlocked, grantedCoins, counters, mode, error, loading, init, reload }
}
