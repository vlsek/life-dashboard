// Подсказки по полу в «Что можно делать» (BACKLOG 58.10, владелец 11.10 16:49: «шраги женщинам, например, делать не стоит»).
// Только МЯГКАЯ пометка «обычно не нужно» и сдвиг в конец списка рекомендаций; никаких запретов и медицинских утверждений,
// а своё упражнение человек ведёт любое. Список короткий и расширяется по согласованию с владельцем: id упражнения из muscles.ts → кому оно обычно НЕ нужно.
export type TipGender = 'male' | 'female'

export const USUALLY_SKIPPED: Readonly<Record<string, TipGender>> = {
  shrug: 'female', // шраги — трапеции, которые женщинам обычно не нужны
}

// true — для этого пола упражнение в списке рекомендаций помечаем «обычно не нужно». Пол неизвестен — не помечаем ничего.
export function usuallySkipped(ruleId: string, gender: TipGender | null | undefined): boolean {
  return !!gender && USUALLY_SKIPPED[ruleId] === gender
}
