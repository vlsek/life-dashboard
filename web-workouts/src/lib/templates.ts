import type { WorkoutTemplate } from './types'

// Порт WORKOUT_TEMPLATES_RU/EN из workouts.js — общеизвестные, устоявшиеся схемы
// тренировок (не привязаны к источнику, стандартная база знаний фитнеса). Извлечены
// программно из оригинала и сверены по количеству (4 шаблона в каждом языке), чтобы
// исключить опечатки при ручном переносе полусотни строк данных.

export const WORKOUT_TEMPLATES_RU: WorkoutTemplate[] = [
  {
    id: "full_body_beginner",
    title: "Всё тело для новичков",
    goalTag: "Сила / общая форма",
    meta: "3 дня в неделю · чередуй День A и День B · начальный уровень",
    days: [
      {
        label: "День A",
        exercises: [
          { name: "Приседания со штангой", tracksWeight: true, valueLabel: "Повторения", scheme: "3×8–10" },
          { name: "Жим штанги лёжа", tracksWeight: true, valueLabel: "Повторения", scheme: "3×8–10" },
          { name: "Тяга штанги в наклоне", tracksWeight: true, valueLabel: "Повторения", scheme: "3×8–10" },
          { name: "Планка", tracksWeight: false, valueLabel: "Секунды", scheme: "3×30–45 сек" },
        ],
      },
      {
        label: "День B",
        exercises: [
          { name: "Становая тяга", tracksWeight: true, valueLabel: "Повторения", scheme: "3×6–8" },
          { name: "Жим штанги стоя", tracksWeight: true, valueLabel: "Повторения", scheme: "3×8–10" },
          { name: "Тяга верхнего блока / подтягивания", tracksWeight: true, valueLabel: "Повторения", scheme: "3×8–10" },
          { name: "Скручивания на пресс", tracksWeight: false, valueLabel: "Повторения", scheme: "3×15" },
        ],
      },
    ],
  },
  {
    id: "ppl_muscle",
    title: "Push / Pull / Legs",
    goalTag: "Набор мышечной массы",
    meta: "3–6 дней в неделю · средний уровень",
    days: [
      {
        label: "Push (грудь/плечи/трицепс)",
        exercises: [
          { name: "Жим штанги лёжа", tracksWeight: true, valueLabel: "Повторения", scheme: "4×8–12" },
          { name: "Жим гантелей на наклонной", tracksWeight: true, valueLabel: "Повторения", scheme: "3×10–12" },
          { name: "Жим штанги стоя", tracksWeight: true, valueLabel: "Повторения", scheme: "3×8–10" },
          { name: "Отжимания на брусьях", tracksWeight: false, valueLabel: "Повторения", scheme: "3× до отказа" },
          { name: "Разгибания на трицепс", tracksWeight: true, valueLabel: "Повторения", scheme: "3×12–15" },
        ],
      },
      {
        label: "Pull (спина/бицепс)",
        exercises: [
          { name: "Подтягивания", tracksWeight: false, valueLabel: "Повторения", scheme: "4× до отказа" },
          { name: "Тяга штанги в наклоне", tracksWeight: true, valueLabel: "Повторения", scheme: "4×8–10" },
          { name: "Тяга верхнего блока", tracksWeight: true, valueLabel: "Повторения", scheme: "3×10–12" },
          { name: "Сгибания на бицепс", tracksWeight: true, valueLabel: "Повторения", scheme: "3×10–12" },
          { name: "Шраги с гантелями", tracksWeight: true, valueLabel: "Повторения", scheme: "3×12–15" },
        ],
      },
      {
        label: "Legs (ноги)",
        exercises: [
          { name: "Приседания со штангой", tracksWeight: true, valueLabel: "Повторения", scheme: "4×8–10" },
          { name: "Румынская тяга", tracksWeight: true, valueLabel: "Повторения", scheme: "3×10–12" },
          { name: "Выпады с гантелями", tracksWeight: true, valueLabel: "Повторения", scheme: "3×10 на ногу" },
          { name: "Подъём на носки", tracksWeight: true, valueLabel: "Повторения", scheme: "4×15–20" },
          { name: "Пресс (скручивания)", tracksWeight: false, valueLabel: "Повторения", scheme: "3×15–20" },
        ],
      },
    ],
  },
  {
    id: "fat_loss_circuit",
    title: "Круговая для похудения",
    goalTag: "Снижение веса",
    meta: "4 дня в неделю · без инвентаря · минимальный отдых между упражнениями",
    days: [
      {
        label: "Круг (2–3 раунда)",
        exercises: [
          { name: "Берпи", tracksWeight: false, valueLabel: "Повторения", scheme: "3×10" },
          { name: "Приседания с собственным весом", tracksWeight: false, valueLabel: "Повторения", scheme: "3×15–20" },
          { name: "Отжимания", tracksWeight: false, valueLabel: "Повторения", scheme: "3× до отказа" },
          { name: "Скалолаз (mountain climbers)", tracksWeight: false, valueLabel: "Секунды", scheme: "3×30 сек" },
          { name: "Планка", tracksWeight: false, valueLabel: "Секунды", scheme: "3×30–45 сек" },
          { name: "Прыжки со скакалкой", tracksWeight: false, valueLabel: "Минуты", scheme: "10–15 мин кардио" },
        ],
      },
    ],
  },
  {
    id: "home_no_equipment",
    title: "Дома без инвентаря",
    goalTag: "Общая форма",
    meta: "2–4 дня в неделю · только вес тела",
    days: [
      {
        label: "Тренировка",
        exercises: [
          { name: "Приседания с собственным весом", tracksWeight: false, valueLabel: "Повторения", scheme: "3×15–20" },
          { name: "Отжимания", tracksWeight: false, valueLabel: "Повторения", scheme: "3× до отказа" },
          { name: "Выпады", tracksWeight: false, valueLabel: "Повторения", scheme: "3×12 на ногу" },
          { name: "Ягодичный мостик", tracksWeight: false, valueLabel: "Повторения", scheme: "3×15–20" },
          { name: "Планка", tracksWeight: false, valueLabel: "Секунды", scheme: "3×30–60 сек" },
        ],
      },
    ],
  },
]

export const WORKOUT_TEMPLATES_EN: WorkoutTemplate[] = [
  {
    id: "full_body_beginner",
    title: "Full Body for Beginners",
    goalTag: "Strength / general fitness",
    meta: "3 days a week · alternate Day A and Day B · beginner level",
    days: [
      {
        label: "Day A",
        exercises: [
          { name: "Barbell Squat", tracksWeight: true, valueLabel: "Reps", scheme: "3×8–10" },
          { name: "Barbell Bench Press", tracksWeight: true, valueLabel: "Reps", scheme: "3×8–10" },
          { name: "Bent-Over Barbell Row", tracksWeight: true, valueLabel: "Reps", scheme: "3×8–10" },
          { name: "Plank", tracksWeight: false, valueLabel: "Seconds", scheme: "3×30–45 sec" },
        ],
      },
      {
        label: "Day B",
        exercises: [
          { name: "Deadlift", tracksWeight: true, valueLabel: "Reps", scheme: "3×6–8" },
          { name: "Overhead Press", tracksWeight: true, valueLabel: "Reps", scheme: "3×8–10" },
          { name: "Lat Pulldown / Pull-ups", tracksWeight: true, valueLabel: "Reps", scheme: "3×8–10" },
          { name: "Ab Crunches", tracksWeight: false, valueLabel: "Reps", scheme: "3×15" },
        ],
      },
    ],
  },
  {
    id: "ppl_muscle",
    title: "Push / Pull / Legs",
    goalTag: "Muscle gain",
    meta: "3–6 days a week · intermediate level",
    days: [
      {
        label: "Push (chest/shoulders/triceps)",
        exercises: [
          { name: "Barbell Bench Press", tracksWeight: true, valueLabel: "Reps", scheme: "4×8–12" },
          { name: "Incline Dumbbell Press", tracksWeight: true, valueLabel: "Reps", scheme: "3×10–12" },
          { name: "Overhead Press", tracksWeight: true, valueLabel: "Reps", scheme: "3×8–10" },
          { name: "Dips", tracksWeight: false, valueLabel: "Reps", scheme: "3× to failure" },
          { name: "Triceps Extensions", tracksWeight: true, valueLabel: "Reps", scheme: "3×12–15" },
        ],
      },
      {
        label: "Pull (back/biceps)",
        exercises: [
          { name: "Pull-ups", tracksWeight: false, valueLabel: "Reps", scheme: "4× to failure" },
          { name: "Bent-Over Barbell Row", tracksWeight: true, valueLabel: "Reps", scheme: "4×8–10" },
          { name: "Lat Pulldown", tracksWeight: true, valueLabel: "Reps", scheme: "3×10–12" },
          { name: "Bicep Curls", tracksWeight: true, valueLabel: "Reps", scheme: "3×10–12" },
          { name: "Dumbbell Shrugs", tracksWeight: true, valueLabel: "Reps", scheme: "3×12–15" },
        ],
      },
      {
        label: "Legs",
        exercises: [
          { name: "Barbell Squat", tracksWeight: true, valueLabel: "Reps", scheme: "4×8–10" },
          { name: "Romanian Deadlift", tracksWeight: true, valueLabel: "Reps", scheme: "3×10–12" },
          { name: "Dumbbell Lunges", tracksWeight: true, valueLabel: "Reps", scheme: "3×10 per leg" },
          { name: "Calf Raises", tracksWeight: true, valueLabel: "Reps", scheme: "4×15–20" },
          { name: "Ab Crunches", tracksWeight: false, valueLabel: "Reps", scheme: "3×15–20" },
        ],
      },
    ],
  },
  {
    id: "fat_loss_circuit",
    title: "Fat Loss Circuit",
    goalTag: "Weight loss",
    meta: "4 days a week · no equipment · minimal rest between exercises",
    days: [
      {
        label: "Circuit (2–3 rounds)",
        exercises: [
          { name: "Burpees", tracksWeight: false, valueLabel: "Reps", scheme: "3×10" },
          { name: "Bodyweight Squats", tracksWeight: false, valueLabel: "Reps", scheme: "3×15–20" },
          { name: "Push-ups", tracksWeight: false, valueLabel: "Reps", scheme: "3× to failure" },
          { name: "Mountain Climbers", tracksWeight: false, valueLabel: "Seconds", scheme: "3×30 sec" },
          { name: "Plank", tracksWeight: false, valueLabel: "Seconds", scheme: "3×30–45 sec" },
          { name: "Jump Rope", tracksWeight: false, valueLabel: "Minutes", scheme: "10–15 min cardio" },
        ],
      },
    ],
  },
  {
    id: "home_no_equipment",
    title: "Home, No Equipment",
    goalTag: "General fitness",
    meta: "2–4 days a week · bodyweight only",
    days: [
      {
        label: "Workout",
        exercises: [
          { name: "Bodyweight Squats", tracksWeight: false, valueLabel: "Reps", scheme: "3×15–20" },
          { name: "Push-ups", tracksWeight: false, valueLabel: "Reps", scheme: "3× to failure" },
          { name: "Lunges", tracksWeight: false, valueLabel: "Reps", scheme: "3×12 per leg" },
          { name: "Glute Bridge", tracksWeight: false, valueLabel: "Reps", scheme: "3×15–20" },
          { name: "Plank", tracksWeight: false, valueLabel: "Seconds", scheme: "3×30–60 sec" },
        ],
      },
    ],
  },
]

export function workoutTemplates(lang: string): WorkoutTemplate[] {
  return lang === 'en' ? WORKOUT_TEMPLATES_EN : WORKOUT_TEMPLATES_RU
}
