import { t } from './i18n'

// «Что считаем?» у упражнения (BACKLOG 18): выпадающий список готовых вариантов вместо ручного ввода.
// value_label по-прежнему хранится как готовый локализованный текст («Повторения», «Секунды», «Км»): он же попадает в подпись
// темпа («5,2 Км/ч») и в подсказку поля ввода. Поэтому модель данных не меняется, а старые произвольные значения остаются как есть.
export const VALUE_LABEL_PRESET_KEYS = [
  'workouts_value_preset_reps',
  'workouts_value_preset_seconds',
  'workouts_value_preset_minutes',
  'workouts_value_preset_km',
  'workouts_value_preset_meters',
  'workouts_value_preset_rounds',
] as const

export function valueLabelPresets(): string[] {
  return VALUE_LABEL_PRESET_KEYS.map((k) => t(k))
}

// Варианты в списке: пресеты + текущее значение упражнения, если его в пресетах нет (прежнее своё слово не теряется
// и не превращается молча в другое, а язык интерфейса его не переводит).
export function valueLabelOptions(current: string | null | undefined): string[] {
  const c = current?.trim()
  const presets = valueLabelPresets()
  return c && !presets.includes(c) ? [...presets, c] : presets
}
