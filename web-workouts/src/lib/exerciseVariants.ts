import { getLang } from './i18n'

// Типовые упражнения и их разновидности (BACKLOG 585, «Типовые упражнения: выпадающий список разновидностей»).
// Владелец: для отжиманий — алмазные, широкие, обычный хват, лучник и т. п. выбирать из списка, а не писать руками; руками — только
// если подходящей особенности нет, и если выбрана не та — менять из списка, НЕ стирая остальное написанное.
// Хранение прежнее: упражнение в БД — свободный текст, разновидность — часть названия («Отжимания алмазные», «Diamond push-ups»),
// колонок и миграций нет. Подбор типового упражнения — по ключевым словам названия (как карта мышц, lib/muscles.ts).

export interface Variant {
  ru: string
  en: string
  // английская разновидность ставится ПЕРЕД названием («Diamond push-ups»); русская всегда после («Отжимания алмазные»)
  pre?: boolean
}

export interface VariantBase {
  id: string
  // Ключевые слова — подстрока нормализованного названия (нижний регистр, «ё» → «е», без знаков препинания, название в пробелах)
  keys: string[]
  ru: string
  en: string
  variants: Variant[]
}

// ПОРЯДОК ВАЖЕН: берётся первое совпавшее, частные случаи («отжимания на брусьях») стоят раньше общих («отжимания»).
// Название сравнивается без «ё» и без учёта регистра, так что «подъёмом» и «подъемом» — одно и то же.
export const VARIANT_BASES: VariantBase[] = [
  {
    id: 'dips', keys: ['брусь', ' dips'], ru: 'Отжимания на брусьях', en: 'Dips',
    variants: [
      { ru: 'с отягощением', en: 'Weighted', pre: true },
      { ru: 'негативные', en: 'Negative', pre: true },
      { ru: 'на скамье', en: 'Bench', pre: true },
      { ru: 'узким хватом', en: 'Close-grip', pre: true },
      { ru: 'с паузой', en: 'Paused', pre: true },
    ],
  },
  {
    id: 'pushup', keys: ['отжиман', 'push-up', 'pushup', 'push up'], ru: 'Отжимания', en: 'Push-ups',
    variants: [
      { ru: 'алмазные', en: 'Diamond', pre: true },
      { ru: 'широкие', en: 'Wide', pre: true },
      { ru: 'узкие', en: 'Close-grip', pre: true },
      { ru: 'обычным хватом', en: 'Standard', pre: true },
      { ru: 'лучника', en: 'Archer', pre: true },
      { ru: 'с хлопком', en: 'Clap', pre: true },
      { ru: 'на кулаках', en: 'Fist', pre: true },
      { ru: 'с колен', en: 'Knee', pre: true },
      { ru: 'ноги на возвышении', en: 'Decline', pre: true },
      { ru: 'пайк', en: 'Pike', pre: true },
      { ru: 'на одной руке', en: 'One-arm', pre: true },
      { ru: 'с отягощением', en: 'Weighted', pre: true },
    ],
  },
  {
    id: 'pullup', keys: ['подтягиван', 'pull-up', 'pullup', 'pull up', 'chin-up', 'chin up'], ru: 'Подтягивания', en: 'Pull-ups',
    variants: [
      { ru: 'широким хватом', en: 'Wide-grip', pre: true },
      { ru: 'узким хватом', en: 'Close-grip', pre: true },
      { ru: 'обратным хватом', en: 'Underhand', pre: true },
      { ru: 'нейтральным хватом', en: 'Neutral-grip', pre: true },
      { ru: 'с отягощением', en: 'Weighted', pre: true },
      { ru: 'негативные', en: 'Negative', pre: true },
      { ru: 'австралийские', en: 'Australian', pre: true },
      { ru: 'с паузой', en: 'Paused', pre: true },
    ],
  },
  {
    id: 'squat', keys: ['присед', 'squat'], ru: 'Приседания', en: 'Squats',
    variants: [
      { ru: 'сумо', en: 'Sumo', pre: true },
      { ru: 'узкие', en: 'Narrow-stance', pre: true },
      { ru: 'широкие', en: 'Wide-stance', pre: true },
      { ru: 'с паузой', en: 'Paused', pre: true },
      { ru: 'с прыжком', en: 'Jump', pre: true },
      { ru: 'фронтальные', en: 'Front', pre: true },
      { ru: 'со штангой', en: 'Barbell', pre: true },
      { ru: 'кубковые', en: 'Goblet', pre: true },
      { ru: 'на одной ноге', en: 'Single-leg', pre: true },
    ],
  },
  {
    id: 'lunge', keys: ['выпад', 'lunge', 'болгарск', 'split squat'], ru: 'Выпады', en: 'Lunges',
    variants: [
      { ru: 'назад', en: 'Reverse', pre: true },
      { ru: 'в ходьбе', en: 'Walking', pre: true },
      { ru: 'боковые', en: 'Side', pre: true },
      { ru: 'с гантелями', en: 'Dumbbell', pre: true },
      { ru: 'со штангой', en: 'Barbell', pre: true },
      { ru: 'с прыжком', en: 'Jump', pre: true },
    ],
  },
  {
    id: 'plank', keys: ['планк', 'plank'], ru: 'Планка', en: 'Plank',
    variants: [
      { ru: 'на локтях', en: 'Forearm', pre: true },
      { ru: 'на прямых руках', en: 'High', pre: true },
      { ru: 'боковая', en: 'Side', pre: true },
      { ru: 'обратная', en: 'Reverse', pre: true },
      { ru: 'с подъёмом ноги', en: 'Leg-raise', pre: true },
      { ru: 'динамическая', en: 'Dynamic', pre: true },
    ],
  },
  {
    id: 'crunch', keys: ['скручиван', 'crunch'], ru: 'Скручивания на пресс', en: 'Crunches',
    variants: [
      { ru: 'обратные', en: 'Reverse', pre: true },
      { ru: 'косые', en: 'Oblique', pre: true },
      { ru: 'велосипед', en: 'Bicycle', pre: true },
      { ru: 'с поднятыми ногами', en: 'Leg-raised', pre: true },
      { ru: 'на наклонной скамье', en: 'Decline', pre: true },
    ],
  },
  {
    id: 'bench', keys: ['жим лежа', 'жим штанги лежа', 'bench press'], ru: 'Жим лёжа', en: 'Bench press',
    variants: [
      { ru: 'узким хватом', en: 'Close-grip', pre: true },
      { ru: 'широким хватом', en: 'Wide-grip', pre: true },
      { ru: 'на наклонной скамье', en: 'Incline', pre: true },
      { ru: 'с паузой', en: 'Paused', pre: true },
      { ru: 'гантелей', en: 'Dumbbell', pre: true },
    ],
  },
  {
    id: 'deadlift', keys: ['становая', 'deadlift', 'румынск', 'romanian'], ru: 'Становая тяга', en: 'Deadlift',
    variants: [
      { ru: 'румынская', en: 'Romanian', pre: true },
      { ru: 'сумо', en: 'Sumo', pre: true },
      { ru: 'на прямых ногах', en: 'Stiff-leg', pre: true },
      { ru: 'с гантелями', en: 'Dumbbell', pre: true },
      { ru: 'с трэп-грифом', en: 'Trap-bar', pre: true },
    ],
  },
  {
    id: 'glute_bridge', keys: ['ягодичн', 'glute bridge', 'hip thrust'], ru: 'Ягодичный мостик', en: 'Glute bridge',
    variants: [
      { ru: 'на одной ноге', en: 'Single-leg', pre: true },
      { ru: 'со штангой', en: 'Barbell', pre: true },
      { ru: 'с паузой', en: 'Paused', pre: true },
    ],
  },
  {
    id: 'biceps_curl', keys: ['на бицепс', 'biceps curl', 'bicep curl'], ru: 'Сгибания на бицепс', en: 'Biceps curl',
    variants: [
      { ru: 'с гантелями', en: 'Dumbbell', pre: true },
      { ru: 'со штангой', en: 'Barbell', pre: true },
      { ru: 'молотковые', en: 'Hammer', pre: true },
      { ru: 'концентрированные', en: 'Concentration', pre: true },
    ],
  },
]

// Название без регистра, «ё», знаков препинания и лишних пробелов, в пробелах по краям (для поиска целых слов)
function norm(s: string): string {
  return ' ' + s.toLowerCase().replace(/ё/g, 'е').replace(/[,.;:()]/g, ' ').replace(/\s+/g, ' ').trim() + ' '
}

export function baseForName(name: string): VariantBase | null {
  const n = norm(name)
  return VARIANT_BASES.find((b) => b.keys.some((k) => n.includes(k))) ?? null
}

export function variantText(v: Variant, lang: 'ru' | 'en'): string {
  return lang === 'ru' ? v.ru : v.en
}

export function baseName(b: VariantBase, lang: 'ru' | 'en' = getLang()): string {
  return lang === 'ru' ? b.ru : b.en
}

// Индекс разновидности, уже вписанной в название (русская или английская запись), или -1
export function detectVariant(name: string, base: VariantBase): number {
  const n = norm(name)
  let best = -1
  let bestLen = 0
  base.variants.forEach((v, i) => {
    for (const text of [v.ru, v.en]) {
      const key = norm(text)
      if (n.includes(key) && key.length > bestLen) {
        best = i // при совпадении нескольких («с паузой» и «паузой…») берём самую длинную запись
        bestLen = key.length
      }
    }
  })
  return best
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// Название без вписанной разновидности: остальное (в том числе то, что человек дописал сам) остаётся как есть
export function stripVariant(name: string, base: VariantBase): string {
  const i = detectVariant(name, base)
  if (i < 0) return name
  let out = name
  for (const text of [base.variants[i].ru, base.variants[i].en]) {
    out = out.replace(new RegExp('(^|[\\s,;(])' + escapeRe(text).replace(/[её]/g, '[её]') + '(?=$|[\\s,;).])', 'i'), '$1')
  }
  return out.replace(/\s+/g, ' ').replace(/\s+([,;)])/g, '$1').replace(/^[\s,;]+|[\s,;]+$/g, '')
}

const hasCyrillic = (s: string) => /[а-яё]/i.test(s)
const lowerFirst = (s: string) => (s.length > 1 && s[1] === s[1].toUpperCase() && s[1] !== s[1].toLowerCase() ? s : s.charAt(0).toLowerCase() + s.slice(1))

// Название с выбранной разновидностью (index = -1 — убрать разновидность). Язык записи — по тому, на каком языке написано название.
export function applyVariant(name: string, base: VariantBase, index: number): string {
  const stem = stripVariant(name, base)
  if (index < 0 || index >= base.variants.length || !stem) return stem
  const v = base.variants[index]
  if (hasCyrillic(stem)) return stem + ' ' + v.ru
  return v.pre ? v.en + ' ' + lowerFirst(stem) : stem + ' ' + v.en
}
