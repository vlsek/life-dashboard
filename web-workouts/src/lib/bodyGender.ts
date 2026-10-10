import { sb } from './supabase'

// Пол из профиля (онбординг, profiles.gender: 'male' | 'female'). Нет колонки/ошибка/пусто — null (тогда мужская модель по умолчанию).
export async function fetchProfileGender(userId: string): Promise<'male' | 'female' | null> {
  try {
    const { data, error } = await sb.from('profiles').select('gender').eq('user_id', userId).maybeSingle()
    if (error) return null
    return data?.gender === 'female' ? 'female' : data?.gender === 'male' ? 'male' : null
  } catch {
    return null
  }
}
