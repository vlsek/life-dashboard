import { ref, watch } from 'vue'
import { sb } from './supabase'
import { type CollapseStyle, parseCollapseStyle, readCachedCollapseStyle, writeCachedCollapseStyle } from './collapseStyle'

// Вид сворачивания блоков (BACKLOG 498): выбранный в «Кастомизации» вариант + «шина» для аккордеона.
// Стиль берётся из кэша localStorage сразу (первая отрисовка уже в нужном виде), потом сверяется с профилем — выбор мог быть сделан на другом устройстве.
export const collapseStyle = ref<CollapseStyle>(readCachedCollapseStyle())

// Последний раскрытый пользователем блок. n растёт на каждое раскрытие, чтобы повторное раскрытие того же блока тоже было событием.
export const lastOpened = ref<{ key: string; n: number } | null>(null)
export function announceOpened(key: string): void {
  lastOpened.value = { key, n: (lastOpened.value?.n ?? 0) + 1 }
}

// Участник аккордеона: когда пользователь раскрыл ДРУГОЙ блок, а стиль — «аккордеон», этот блок (если развёрнут) сворачивается.
// Вызывать из setup компонента (watch останавливается вместе с ним). Возвращает функцию «меня раскрыли» — вызвать в обработчике клика.
export function useAccordionMember(key: string, isCollapsed: () => boolean, collapse: () => void): () => void {
  watch(lastOpened, (ev) => {
    if (collapseStyle.value !== 'accordion' || !ev || ev.key === key || isCollapsed()) return
    collapse()
  })
  return () => announceOpened(key)
}

// Выбор из профиля (profiles.customization.collapse_style, миграция 048). ОТДЕЛЬНЫМ запросом: нет колонки / сбой сети — остаётся кэш, профиль не страдает.
export async function loadCollapseStyle(userId: string): Promise<void> {
  const { data, error } = await sb.from('profiles').select('customization').eq('user_id', userId).maybeSingle()
  if (error) return
  const cz = (data as { customization?: Record<string, unknown> | null } | null)?.customization
  const style = parseCollapseStyle(cz?.collapse_style)
  collapseStyle.value = style
  writeCachedCollapseStyle(style)
}
