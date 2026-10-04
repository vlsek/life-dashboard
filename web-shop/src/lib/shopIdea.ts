// Описание идеи магазина (BACKLOG раздел 26, пожелание владельца 2026-10-03): при ПЕРВОМ заходе — плашка с полным текстом
// («Магазин заслуженного»: баллы — это сделанное, а не деньги), потом — короткая строка со значком ⓘ, открывающим тот же текст.
// Флаг «плашку уже видели» живёт на устройстве, без миграции; недоступный localStorage — плашка показывается каждый раз
// (лучше повторить, чем человек так и не поймёт идею).
export const SHOP_IDEA_SEEN_KEY = 'shop_idea_seen'

export function loadIdeaSeen(): boolean {
  try {
    return localStorage.getItem(SHOP_IDEA_SEEN_KEY) === '1'
  } catch {
    return false
  }
}

export function saveIdeaSeen(): void {
  try {
    localStorage.setItem(SHOP_IDEA_SEEN_KEY, '1')
  } catch {
    /* приватный режим / переполненное хранилище — плашка просто покажется снова */
  }
}
