import { beforeEach, describe, expect, it } from 'vitest'
import { SYNC_KEYS, applyPulled, planSync } from './lib/uiSettingsSync'

// BACKLOG 44.18г: ключ `icon_style` ходит между устройствами. «Контур» — значение по умолчанию: ключ не хранится (null), поэтому сценарий
// «на одном устройстве выбрали «Жирный», потом вернули «Контур»» обязан дойти и до второго (иначе там навсегда остался бы «Жирный»).
const K = ['icon_style']

describe('icon_style: синхронизация между устройствами', () => {
  beforeEach(() => localStorage.clear())

  it('ключ входит в список синхронизируемых', () => {
    expect(SYNC_KEYS as readonly string[]).toContain('icon_style')
  })
  it('новый выбор на этом устройстве уходит на сервер', () => {
    expect(planSync(K, { icon_style: 'bold' }, {}, { icon_style: null })).toMatchObject({ push: { icon_style: 'bold' }, pull: {} })
  })
  it('возврат к «Контуру» (ключ удалён локально) уходит на сервер как «нет значения», а не теряется', () => {
    const plan = planSync(K, {}, { icon_style: 'bold' }, { icon_style: 'bold' })
    expect(plan.push).toEqual({ icon_style: null })
    expect(plan.pull).toEqual({})
  })
  it('на втором устройстве «Жирный», на сервере уже «нет значения» (первое устройство вернуло «Контур») — подтягивается удаление', () => {
    const plan = planSync(K, { icon_style: 'bold' }, {}, { icon_style: 'bold' })
    expect(plan.pull).toEqual({ icon_style: null })
    expect(plan.push).toEqual({})
  })
  it('применение подтянутого значения: пишется в localStorage и просит ОДНУ перезагрузку (атрибут на <html> ставит скрипт в <head> при загрузке)', () => {
    expect(applyPulled({ icon_style: 'duotone' })).toEqual({ reload: true })
    expect(localStorage.getItem('icon_style')).toBe('duotone')
    expect(applyPulled({ icon_style: 'duotone' })).toEqual({ reload: false }) // то же значение — вхолостую не перезагружаемся
  })
  it('подтянутое удаление стирает ключ и тоже просит перезагрузку', () => {
    localStorage.setItem('icon_style', 'bold')
    expect(applyPulled({ icon_style: null })).toEqual({ reload: true })
    expect(localStorage.getItem('icon_style')).toBeNull()
  })
})
