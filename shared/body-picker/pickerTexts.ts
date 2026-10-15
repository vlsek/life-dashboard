import type { MuscleId } from './muscles'

// Готовые тексты подбора по схеме тела для пилотов, у которых нет своих строк (Дашборд). Тренировки берут тексты из своего словаря;
// паритет двух источников держит тест web-workouts/src/pickerTexts.test.ts (BACKLOG 762 срез 2, вариант Б).
export interface PickerTextLabels {
  title: string
  hint: string
  front: string
  back: string
  legendDone: string
  legendIdle: string
  untrained: string
  clear: string
  none: string
  close: string
}
export interface PickerTexts {
  labels: PickerTextLabels
  muscles: Record<MuscleId, string>
}

export const PICKER_TEXTS: Record<'ru' | 'en', PickerTexts> = {
  ru: {
    labels: {
    title: "Подбор по схеме тела",
    hint: "Зелёные — работали за последние 4 дня, серые — нет. Нажми на мышцы, которые хочешь потренировать, и выбери упражнение.",
    front: "Спереди",
    back: "Сзади",
    legendDone: "Задействована (4 дня)",
    legendIdle: "Не задействована",
    untrained: "Что я не тренировал",
    clear: "Сбросить",
    none: "Для этой мышцы пока нет типовых упражнений — впиши своё название.",
    close: "Скрыть схему",
    },
    muscles: {
    chest: "Грудь",
    shoulders: "Плечи",
    biceps: "Бицепс",
    triceps: "Трицепс",
    forearms: "Предплечья",
    abs: "Пресс",
    back: "Спина",
    lower_back: "Поясница",
    glutes: "Ягодицы",
    quads: "Квадрицепс",
    hamstrings: "Задняя поверхность бедра",
    calves: "Икры",
    },
  },
  en: {
    labels: {
    title: "Pick by body diagram",
    hint: "Green — worked in the last 4 days, grey — not yet. Tap muscles you want to train and choose an exercise.",
    front: "Front",
    back: "Back",
    legendDone: "Worked (4 days)",
    legendIdle: "Not worked",
    untrained: "What I haven't trained",
    clear: "Clear",
    none: "No typical exercises for this muscle yet — type your own name.",
    close: "Hide the diagram",
    },
    muscles: {
    chest: "Chest",
    shoulders: "Shoulders",
    biceps: "Biceps",
    triceps: "Triceps",
    forearms: "Forearms",
    abs: "Abs",
    back: "Back",
    lower_back: "Lower back",
    glutes: "Glutes",
    quads: "Quads",
    hamstrings: "Hamstrings",
    calves: "Calves",
    },
  },
}
