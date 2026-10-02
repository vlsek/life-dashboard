import { ref } from 'vue'
import { sb } from './supabase'
import { withWaterGoal } from './waterGoal'
import type { CategoryLeaderboardRow, CategoryRange, DailyValueRaw, MetricCategory, NumberMetric } from './types'

export type OwnState =
  | { status: 'idle' }
  | { status: 'unlinked'; candidates: NumberMetric[] } // своих метрик в категории нет; candidates — числовые метрики, которые можно привязать
  | { status: 'ready'; metrics: NumberMetric[]; values: DailyValueRaw[] }

// Портировано из loadCategorySelect()/loadCategoryLeaderboard()/renderCategoryChart() в
// community.js. Отдельный композабл (не useCommunity.ts): scope/friendIds приходят из
// него пропсами в CategorySection.vue, здесь — только данные раздела.
export function useCategories() {
  const categories = ref<MetricCategory[]>([])
  const rows = ref<CategoryLeaderboardRow[]>([])
  const rowsLoading = ref(false)
  const error = ref<string | null>(null)
  const own = ref<OwnState>({ status: 'idle' })
  const currentCategory = ref<MetricCategory | null>(null)

  async function loadCategories() {
    const { data } = await sb.from('metric_categories').select('*').order('label_ru')
    categories.value = (data || []) as MetricCategory[]
  }

  async function loadLeaderboard(catKey: string, range: CategoryRange) {
    rowsLoading.value = true
    const { data, error: err } = await sb.rpc('get_category_leaderboard', { cat_key: catKey, range_key: range })
    rowsLoading.value = false
    if (err) {
      error.value = err.message
      rows.value = []
      return
    }
    error.value = null
    rows.value = (data || []) as CategoryLeaderboardRow[]
  }

  async function loadOwn(userId: string, catKey: string) {
    const { data: cat } = await sb.from('metric_categories').select('*').eq('key', catKey).maybeSingle()
    if (!cat) {
      currentCategory.value = null
      own.value = { status: 'idle' }
      return
    }
    currentCategory.value = cat as MetricCategory

    const { data: mine } = await sb.from('metrics').select('*').eq('user_id', userId).eq('category_id', cat.id).eq('type', 'number')
    if (!mine || mine.length === 0) {
      const { data: allNumber } = await sb.from('metrics').select('*').eq('user_id', userId).eq('type', 'number')
      own.value = { status: 'unlinked', candidates: (allNumber || []) as NumberMetric[] }
      return
    }
    // «сумма целей» для линии цели на сравнении: у воды с пустой нормой — эффективная норма (migrations/033, 034). Только отображение; если у человека
    // несколько «вод», а в категории не главная, норма может быть подставлена ей — на баллы это не влияет (их считает сервер).
    const mineGoals = (await withWaterGoal(userId, (mine as NumberMetric[]).map((m) => ({ ...m, type: 'number' })))) as NumberMetric[]
    const ids = mine.map((m) => m.id)
    const { data: values } = await sb.from('daily_values').select('*').eq('user_id', userId).in('metric_id', ids).order('date')
    own.value = { status: 'ready', metrics: mineGoals, values: (values || []) as DailyValueRaw[] }
  }

  async function linkMetric(metricId: string, categoryId: string) {
    const { error: err } = await sb.from('metrics').update({ category_id: categoryId }).eq('id', metricId)
    if (err) throw err
  }

  function reset() {
    rows.value = []
    own.value = { status: 'idle' }
    currentCategory.value = null
    error.value = null
  }

  return { categories, rows, rowsLoading, error, own, currentCategory, loadCategories, loadLeaderboard, loadOwn, linkMetric, reset }
}
