import { ref, watch } from 'vue'
import { sb } from './supabase'
import { type CollapseStyle, parseCollapseStyle, readCachedCollapseStyle, writeCachedCollapseStyle } from './collapseStyle'

// Вид сворачивания блоков (BACKLOG 498): выбранный в «Кастомизации» вариант + «шина» для аккордеона.
// Стиль берётся из кэша localStorage сразу (первая отрисовка уже в нужном виде), потом сверяется с профилем — выбор мог быть сделан на другом устройстве.
// Одинаковая копия в web-dashboard и web-workouts (изоляция пилотов; страж collapseStyleCopies.test.ts в web-customization).
export const collapseStyle = ref<CollapseStyle>(readCachedCollapseStyle())

// Аккордеон работает внутри ГРУППЫ блоков: раскрытие блока сворачивает остальные блоки ТОЙ ЖЕ группы. Группа нужна для вложенности
// (Workouts: категория и упражнения внутри неё — раскрытие упражнения не должно сворачивать его категорию). На Дашборде группа одна.
export const ACCORDION_PAGE = 'page'

// Последний раскрытый пользователем блок. n растёт на каждое раскрытие, чтобы повторное раскрытие того же блока тоже было событием.
export const lastOpened = ref<{ group: string; key: string; n: number } | null>(null)
export function announceOpened(key: string, group: string = ACCORDION_PAGE): void {
  lastOpened.value = { group, key, n: (lastOpened.value?.n ?? 0) + 1 }
}

// Участник аккордеона (отдельный компонент): когда пользователь раскрыл ДРУГОЙ блок той же группы, а стиль — «аккордеон»,
// этот блок (если развёрнут) сворачивается. Вызывать из setup компонента (watch останавливается вместе с ним).
// Возвращает функцию «меня раскрыли» — вызвать в обработчике клика, когда блок раскрыли.
export function useAccordionMember(key: string, isCollapsed: () => boolean, collapse: () => void, group: string = ACCORDION_PAGE): () => void {
  watch(lastOpened, (ev) => {
    if (collapseStyle.value !== 'accordion' || !ev || ev.group !== group || ev.key === key || isCollapsed()) return
    collapse()
  })
  return () => announceOpened(key, group)
}

// Участник-СПИСОК: блоки не отдельные компоненты, а строки списка (категории Workouts). Колбэк получает ключ раскрытого блока и сам
// сворачивает остальные. Возвращает функцию «раскрыли блок key».
export function useAccordionGroup(group: string, collapseOthers: (openedKey: string) => void): (key: string) => void {
  watch(lastOpened, (ev) => {
    if (collapseStyle.value !== 'accordion' || !ev || ev.group !== group) return
    collapseOthers(ev.key)
  })
  return (key: string) => announceOpened(key, group)
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
