// Вкладки страницы «Кастомизация» (BACKLOG 54.7; 59.1 срез 1): раньше все разделы шли одной длинной лентой («ща ппц перегружено»),
// потом — 13+ вкладок плоским рядом («свалено в кучу»). Теперь вкладки — это ГРУППЫ ПО ЗАДАЧЕ человека (оформление, главная и прогресс, вода,
// графики, загрузка), внутри группы — прежние разделы. «Все» (последней) возвращает всю ленту. Выбор помним на устройстве.
// Новый раздел (категория каталога, секция) без записи в SECTION_GROUP попадает в группу «Прочее» — не теряется; страж-тест требует явной группы у всех категорий каталога.
export type GroupId = 'look' | 'home' | 'water' | 'charts' | 'loading' | 'other'
export const GROUP_ORDER: readonly GroupId[] = ['look', 'home', 'water', 'charts', 'loading', 'other']

export const SECTION_GROUP: Readonly<Record<string, GroupId>> = {
  themes: 'look',
  avatar_frame: 'look',
  bodymodel: 'look',
  collapse_style: 'home',
  week_gauge: 'home',
  day_gauge: 'home',
  streakflame: 'home',
  wateranim: 'water',
  water_anim: 'water',
  water_glass: 'water',
  'chart-markers': 'charts',
  splash: 'loading',
}
export const groupOfSection = (sectionId: string): GroupId => SECTION_GROUP[sectionId] ?? 'other'

// Группы, в которых сейчас есть хотя бы один раздел, в заданном порядке
export function groupsFor(sectionIds: readonly string[]): GroupId[] {
  const present = new Set(sectionIds.map(groupOfSection))
  return GROUP_ORDER.filter((g) => present.has(g))
}

// Сохранённое значение прежних версий (id раздела: 'splash', 'avatar_frame' …) переезжает в свою группу; «Все» и группы — как есть; мусор — null
export function migrateStoredTab(stored: string | null): string | null {
  if (!stored) return null
  if (stored === 'all' || (GROUP_ORDER as readonly string[]).includes(stored)) return stored
  return stored in SECTION_GROUP ? SECTION_GROUP[stored] : null
}
export const ALL_TAB = 'all'
const KEY = 'cust_tab'

export function readTab(): string | null {
  try {
    return localStorage.getItem(KEY)
  } catch {
    return null
  }
}
export function writeTab(id: string): void {
  try {
    localStorage.setItem(KEY, id)
  } catch {
    /* выбор вкладки не критичен */
  }
}

// Какая вкладка открыта: сохранённая, если такая вкладка сейчас есть (раздел мог исчезнуть из-за фильтра видимости), иначе первая.
export function resolveTab(stored: string | null, ids: readonly string[]): string {
  if (stored === ALL_TAB) return ALL_TAB
  if (stored && ids.includes(stored)) return stored
  return ids[0] ?? ALL_TAB
}

// Показывать ли раздел: открыта вкладка его группы или «Все».
export const showsSection = (tab: string, id: string): boolean => tab === ALL_TAB || tab === groupOfSection(id)
