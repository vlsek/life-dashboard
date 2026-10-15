import { describe, expect, it } from 'vitest'
import { MUSCLE_IDS } from './lib/muscles'
import { setLang } from './lib/i18n'
import { t, type DictKey } from './lib/i18n'
import { PICKER_TEXTS } from '../../shared/body-picker/pickerTexts'

// BACKLOG 762 срез 2, вариант Б: общие тексты подбора (для Дашборда) обязаны совпадать со словарём Тренировок — иначе схема тела
// в двух разделах заговорит разными словами.
const MAP: Record<string, DictKey> = {
  title: 'workouts_pick_body_title',
  hint: 'workouts_pick_body_hint',
  front: 'workouts_muscles_front',
  back: 'workouts_muscles_back',
  legendDone: 'workouts_muscles_legend_done',
  legendIdle: 'workouts_muscles_legend_idle',
  untrained: 'workouts_pick_body_untrained',
  clear: 'workouts_pick_body_clear',
  none: 'workouts_pick_body_none',
  close: 'workouts_pick_body_close',
}

describe('PICKER_TEXTS (shared/body-picker) совпадают со словарём Тренировок', () => {
  for (const lang of ['ru', 'en'] as const) {
    it(`${lang}: подписи и названия всех мышц`, () => {
      setLang(lang)
      for (const [k, key] of Object.entries(MAP)) {
        expect((PICKER_TEXTS[lang].labels as unknown as Record<string, string>)[k], `${lang}.${k}`).toBe(t(key))
      }
      for (const m of MUSCLE_IDS) {
        expect(PICKER_TEXTS[lang].muscles[m], `${lang}.${m}`).toBe(t(`workouts_muscle_${m}` as DictKey))
      }
    })
  }
})
