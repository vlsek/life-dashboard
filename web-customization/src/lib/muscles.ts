// Справочник «упражнение → группы мышц» для карты мышц (BACKLOG 3.2, первый срез).
// Упражнения в БД — свободный текст (название задаёт пользователь), поэтому привязка идёт по
// ключевым словам названия на русском и английском; колонки в БД под это нет. Кастомная
// привязка пользователя (свои упражнения → свои мышцы) потребует колонку/миграцию — не в этом срезе.

export type MuscleId =
  | 'chest'
  | 'shoulders'
  | 'biceps'
  | 'triceps'
  | 'forearms'
  | 'abs'
  | 'back'
  | 'lower_back'
  | 'glutes'
  | 'quads'
  | 'hamstrings'
  | 'calves'

export const MUSCLE_IDS: MuscleId[] = [
  'chest',
  'shoulders',
  'biceps',
  'triceps',
  'forearms',
  'abs',
  'back',
  'lower_back',
  'glutes',
  'quads',
  'hamstrings',
  'calves',
]

export interface ExerciseRule {
  id: string
  // Ключевые слова — подстрока нормализованного названия (нижний регистр, «ё» → «е»,
  // название обёрнуто пробелами: ключ с пробелом в начале ловит только целое слово, напр. ' row').
  keys: string[]
  muscles: MuscleId[]
  ru: string
  en: string
}

// ПОРЯДОК ВАЖЕН: берётся первое совпавшее правило, поэтому частные случаи («сгибания ног»,
// «жим ногами», «отжимания на брусьях») стоят раньше общих («сгибания», «жим», «отжимания»).
export const EXERCISE_REFERENCE: ExerciseRule[] = [
  { id: 'leg_curl', keys: ['сгибания ног', 'сгибание ног', 'leg curl', 'hamstring curl'], muscles: ['hamstrings'], ru: 'Сгибания ног в тренажёре', en: 'Leg curl' },
  { id: 'leg_extension', keys: ['разгибания ног', 'разгибание ног', 'leg extension'], muscles: ['quads'], ru: 'Разгибания ног в тренажёре', en: 'Leg extension' },
  { id: 'leg_press', keys: ['жим ног', 'жим платформы', 'leg press'], muscles: ['quads', 'glutes'], ru: 'Жим ногами', en: 'Leg press' },
  { id: 'calf_raise', keys: ['икр', 'calf', 'calves', 'на носки'], muscles: ['calves'], ru: 'Подъёмы на носки', en: 'Calf raise' },
  { id: 'lunge', keys: ['выпад', 'lunge', 'болгарск', 'split squat'], muscles: ['quads', 'glutes'], ru: 'Выпады', en: 'Lunges' },
  { id: 'squat', keys: ['присед', 'squat', 'пистолет', 'pistol'], muscles: ['quads', 'glutes'], ru: 'Приседания', en: 'Squats' },
  { id: 'deadlift', keys: ['румынск', 'romanian', 'становая', 'deadlift'], muscles: ['hamstrings', 'glutes', 'lower_back'], ru: 'Становая тяга', en: 'Deadlift' },
  { id: 'glute_bridge', keys: ['ягодичн', 'glute', 'hip thrust'], muscles: ['glutes'], ru: 'Ягодичный мостик', en: 'Glute bridge' },
  { id: 'back_extension', keys: ['гиперэкстенз', 'hyperext', 'back extension', 'разгибания спины'], muscles: ['lower_back'], ru: 'Гиперэкстензия', en: 'Back extension' },
  { id: 'dips', keys: ['брусь', ' dips'], muscles: ['chest', 'triceps'], ru: 'Отжимания на брусьях', en: 'Dips' },
  { id: 'pushup', keys: ['отжиман', 'push-up', 'pushup', 'push up'], muscles: ['chest', 'triceps', 'shoulders'], ru: 'Отжимания', en: 'Push-ups' },
  { id: 'overhead_press', keys: ['жим штанги стоя', 'жим стоя', 'жим гантелей сидя', 'над головой', 'арнольд', 'overhead press', 'shoulder press', 'military'], muscles: ['shoulders', 'triceps'], ru: 'Жим стоя', en: 'Overhead press' },
  { id: 'bench_press', keys: ['жим лежа', 'жим штанги лежа', 'жим гантелей', 'наклонн', 'incline', 'dumbbell press', 'bench press', 'chest press'], muscles: ['chest', 'triceps', 'shoulders'], ru: 'Жим лёжа', en: 'Bench press' },
  { id: 'fly', keys: ['разводк', 'сведени', ' fly', ' flye', 'кроссовер', 'crossover'], muscles: ['chest'], ru: 'Разводка гантелей', en: 'Dumbbell fly' },
  { id: 'lateral_raise', keys: ['в стороны', 'махи', 'lateral raise', 'front raise', 'face pull', 'тяга к лицу'], muscles: ['shoulders'], ru: 'Махи гантелями в стороны', en: 'Lateral raise' },
  { id: 'shrug', keys: ['шраг', 'shrug'], muscles: ['back'], ru: 'Шраги', en: 'Shrugs' },
  { id: 'pullup', keys: ['подтягива', 'pull-up', 'pullup', 'pull up', 'chin-up', 'chinup'], muscles: ['back', 'biceps'], ru: 'Подтягивания', en: 'Pull-ups' },
  { id: 'row', keys: ['тяга', ' row', 'pulldown', 'lat pull'], muscles: ['back', 'biceps'], ru: 'Тяга штанги в наклоне', en: 'Barbell row' },
  { id: 'triceps_ext', keys: ['трицепс', 'tricep', 'французск', 'french press', 'skull'], muscles: ['triceps'], ru: 'Разгибания на трицепс', en: 'Triceps extension' },
  { id: 'wrist_curl', keys: ['предплеч', 'запяст', 'wrist', 'farmer', 'фермер'], muscles: ['forearms'], ru: 'Сгибания запястий', en: 'Wrist curl' },
  { id: 'biceps_curl', keys: ['бицепс', 'bicep', 'curl', 'сгибания рук', 'молот', 'hammer'], muscles: ['biceps', 'forearms'], ru: 'Сгибания на бицепс', en: 'Biceps curl' },
  { id: 'abs', keys: ['пресс', 'скручиван', 'планк', 'crunch', 'plank', 'sit-up', 'situp', 'подъем ног', 'подъемы ног', 'подъем колен', 'подъемы колен', 'knee raise', 'hanging', 'leg raise', ' abs', 'ролик'], muscles: ['abs'], ru: 'Скручивания на пресс', en: 'Crunches' },
  { id: 'burpee', keys: ['берпи', 'burpee'], muscles: ['chest', 'triceps', 'quads', 'abs'], ru: 'Берпи', en: 'Burpees' },
  { id: 'mountain_climber', keys: ['скалолаз', 'mountain climb'], muscles: ['abs', 'shoulders', 'quads'], ru: 'Скалолаз', en: 'Mountain climbers' },
  { id: 'jump_rope', keys: ['скакалк', 'jump rope'], muscles: ['calves', 'quads'], ru: 'Прыжки со скакалкой', en: 'Jump rope' },
  { id: 'running', keys: ['бег', 'running', 'jog', 'пробеж', 'спринт', 'sprint'], muscles: ['quads', 'hamstrings', 'calves'], ru: 'Бег', en: 'Running' },
  { id: 'cycling', keys: ['велосипед', 'велотрен', 'cycling', ' bike'], muscles: ['quads', 'calves', 'glutes'], ru: 'Велотренажёр', en: 'Cycling' },
]

export function normalizeName(name: string): string {
  return ' ' + name.toLowerCase().replace(/ё/g, 'е').replace(/\s+/g, ' ').trim() + ' '
}

export function ruleForExercise(name: string): ExerciseRule | null {
  const n = normalizeName(name)
  return EXERCISE_REFERENCE.find((r) => r.keys.some((k) => n.includes(k))) ?? null
}

export function musclesForExercise(name: string): MuscleId[] {
  return ruleForExercise(name)?.muscles ?? []
}

export function referenceFor(muscle: MuscleId): ExerciseRule[] {
  return EXERCISE_REFERENCE.filter((r) => r.muscles.includes(muscle))
}
