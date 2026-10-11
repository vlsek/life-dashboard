import { ref } from 'vue'
import { sb } from './supabase'
import { normalizeRows, type Measurement, type PartId } from './measurements'

// Замеры тела (57.1): загрузка, добавление (повтор в тот же день заменяет), удаление. supported=false — таблицы нет (миграция 074), блок скрыт.
export function useMeasurements() {
  const rows = ref<Measurement[]>([])
  const supported = ref(false)
  const busy = ref(false)
  const error = ref<string | null>(null)

  async function load(userId: string) {
    try {
      const { data, error: err } = await sb.from('body_measurements').select('id, date, part, value_cm').eq('user_id', userId).order('date', { ascending: true })
      if (err) {
        supported.value = false
        return
      }
      supported.value = true
      rows.value = normalizeRows(data)
    } catch {
      supported.value = false
    }
  }

  async function add(userId: string, part: PartId, date: string, valueCm: number): Promise<boolean> {
    error.value = null
    busy.value = true
    try {
      const { error: err } = await sb.from('body_measurements').upsert({ user_id: userId, part, date, value_cm: valueCm }, { onConflict: 'user_id,date,part' })
      if (err) throw new Error(err.message)
      await load(userId)
      return true
    } catch (e) {
      error.value = e instanceof Error ? e.message : String(e)
      return false
    } finally {
      busy.value = false
    }
  }

  async function remove(userId: string, id: string): Promise<boolean> {
    error.value = null
    busy.value = true
    try {
      const { error: err } = await sb.from('body_measurements').delete().eq('id', id).eq('user_id', userId)
      if (err) throw new Error(err.message)
      rows.value = rows.value.filter((r) => r.id !== id)
      return true
    } catch (e) {
      error.value = e instanceof Error ? e.message : String(e)
      return false
    } finally {
      busy.value = false
    }
  }

  return { rows, supported, busy, error, load, add, remove }
}
