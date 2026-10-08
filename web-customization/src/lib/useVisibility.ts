import { computed, ref } from 'vue'
import type { CustomItem, ItemStatus } from './customization'

// Переключатель видимости на странице «Кастомизация» (BACKLOG 47.1, владелец 2026-10-07): «получено / за достижения / за монеты».
// Каждый предмет и каждая тема попадает РОВНО в одну группу:
//   owned       — уже у человека: куплено, выдано за достижение, выбрано сейчас; открытая тема;
//   achievement — ещё не получено, выдаётся за достижение; закрытая тема;
//   coins       — ещё не куплено, продаётся за монеты (в том числе «не хватает монет»).
// Хранится на устройстве (localStorage), как свёрнутые группы редкости. По умолчанию видно всё — ничего не прячем без ведома человека.
export type VisGroup = 'owned' | 'achievement' | 'coins'
export const VIS_GROUPS: readonly VisGroup[] = ['owned', 'achievement', 'coins']
export const VISIBILITY_KEY = 'cust_visibility'

export type Visibility = Record<VisGroup, boolean>
export const allVisible = (): Visibility => ({ owned: true, achievement: true, coins: true })

export function groupOfItem(item: Pick<CustomItem, 'source'>, status: ItemStatus): VisGroup {
  if (status === 'owned' || status === 'selected') return 'owned'
  return item.source === 'achievement' ? 'achievement' : 'coins'
}
export const groupOfTheme = (locked: boolean): VisGroup => (locked ? 'achievement' : 'owned')

// Чтение: мусор/чужие ключи игнорируем; не булево значение считаем «видно» (безопаснее показать лишнее, чем спрятать).
export function readVisibility(): Visibility {
  const out = allVisible()
  try {
    const raw = JSON.parse(localStorage.getItem(VISIBILITY_KEY) || '{}')
    if (raw && typeof raw === 'object') for (const g of VIS_GROUPS) if ((raw as Record<string, unknown>)[g] === false) out[g] = false
  } catch {
    /* повреждённое значение — показываем всё */
  }
  return out
}

export function useVisibility() {
  const state = ref<Visibility>(readVisibility())
  const isVisible = (g: VisGroup): boolean => state.value[g]
  function toggle(g: VisGroup): void {
    state.value = { ...state.value, [g]: !state.value[g] }
    try {
      localStorage.setItem(VISIBILITY_KEY, JSON.stringify(state.value))
    } catch {
      /* хранилище недоступно (приватный режим) — выбор действует до перезагрузки */
    }
  }
  const noneVisible = computed(() => VIS_GROUPS.every((g) => !state.value[g]))
  return { state, isVisible, toggle, noneVisible }
}
