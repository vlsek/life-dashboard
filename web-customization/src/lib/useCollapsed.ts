import { ref } from 'vue'

// Какие группы редкости свёрнуты на странице «Кастомизация». Хранится на устройстве (localStorage), как «любимые темы»: без сервера.
// По умолчанию всё развёрнуто (ничего не прячем без ведома человека). Идентификатор группы — `<раздел>:<редкость>`, например `themes:epic`.
export const COLLAPSED_KEY = 'cust_collapsed'

export function readCollapsed(): string[] {
  try {
    const raw = JSON.parse(localStorage.getItem(COLLAPSED_KEY) || '[]')
    return Array.isArray(raw) ? [...new Set(raw.filter((x): x is string => typeof x === 'string'))] : []
  } catch {
    return []
  }
}

export function useCollapsed() {
  const ids = ref<string[]>(readCollapsed())
  const isCollapsed = (id: string): boolean => ids.value.includes(id)
  function toggle(id: string): void {
    ids.value = isCollapsed(id) ? ids.value.filter((x) => x !== id) : [...ids.value, id]
    try {
      localStorage.setItem(COLLAPSED_KEY, JSON.stringify(ids.value))
    } catch {
      /* хранилище недоступно (приватный режим) — группа свернётся до перезагрузки */
    }
  }
  return { isCollapsed, toggle }
}
