// Код вынесен в общий модуль shared/body-picker (BACKLOG 762 срез 2, вариант Б), чтобы им пользовались и Тренировки, и Дашборд.
// Здесь остаётся только baseName с языком по умолчанию из словаря Тренировок (явный экспорт перекрывает `export *`).
import { getLang } from './i18n'
import { baseName as baseNameForLang, type VariantBase } from '../../../shared/body-picker/exerciseVariants'

export * from '../../../shared/body-picker/exerciseVariants'
export function baseName(b: VariantBase, lang: 'ru' | 'en' = getLang()): string {
  return baseNameForLang(b, lang)
}
