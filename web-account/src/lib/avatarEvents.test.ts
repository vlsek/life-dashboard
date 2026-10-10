import { describe, expect, it } from 'vitest'
import { notifyAvatarChanged, onAvatarChanged, parseAvatarDetail } from './avatarEvents'

async function readSrc(rel: string): Promise<string> {
  const fs = (await import(/* @vite-ignore */ 'node:' + 'fs')) as { readFileSync: (p: URL, enc: string) => string }
  return fs.readFileSync(new URL(rel, import.meta.url), 'utf-8')
}

// BACKLOG 44.17 + раздел 43 (9:41): аватар в левом меню меняется сразу.
describe('avatarEvents', () => {
  it('принимает https-ссылку, data-URI животного и null; мусор отбрасывает', () => {
    expect(parseAvatarDetail({ avatar_url: 'https://x/y.png' })).toEqual({ avatar_url: 'https://x/y.png' })
    expect(parseAvatarDetail({ avatar_url: 'data:image/svg+xml;charset=utf-8,%3Csvg%3E' })).not.toBeNull()
    expect(parseAvatarDetail({ avatar_url: null })).toEqual({ avatar_url: null })
    for (const bad of [null, 'x', {}, { avatar_url: 5 }, { avatar_url: '' }, { avatar_url: 'javascript:alert(1)' }, { avatar_url: 'http://x/y.png' }, { avatar_url: 'data:text/html,hi' }, { avatar_url: 'https://' + 'a'.repeat(100001) }]) {
      expect(parseAvatarDetail(bad), JSON.stringify(bad)?.slice(0, 40)).toBeNull()
    }
  })
  it('notify доходит до подписчика; после отписки — нет', () => {
    const got: (string | null)[] = []
    const off = onAvatarChanged((d) => got.push(d.avatar_url))
    notifyAvatarChanged({ avatar_url: 'https://x/a.png' })
    expect(got[0]).toBe('https://x/a.png')
    off()
    const n = got.length
    notifyAvatarChanged({ avatar_url: 'https://x/b.png' })
    expect(got).toHaveLength(n)
  })
  it('КОПИИ в web-header и web-dashboard совпадают, как и animalAvatars.ts в онбординге и на Дашборде (страж)', async () => {
    const mine = await readSrc('./avatarEvents.ts')
    expect(await readSrc('../../../web-header/src/lib/avatarEvents.ts')).toBe(mine)
    expect(await readSrc('../../../web-dashboard/src/lib/avatarEvents.ts')).toBe(mine)
    const an = await readSrc('./animalAvatars.ts')
    expect(await readSrc('../../../web-onboarding/src/lib/animalAvatars.ts')).toBe(an)
    expect(await readSrc('../../../web-dashboard/src/lib/animalAvatars.ts')).toBe(an)
  })
})
