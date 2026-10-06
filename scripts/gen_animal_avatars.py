#!/usr/bin/env python3
"""Генератор 20 аватарок-животных (BACKLOG раздел 29, агент 2): единый стиль, два цвета — тёмные «чернила» и пастельный фон, плюс белые блики.

Запуск:  python3 scripts/gen_animal_avatars.py   → пишет web-onboarding/src/lib/animalAvatars.ts и копию web-dashboard/src/lib/animalAvatars.ts.
Чтобы поправить рисунок — менять фигуры здесь и перегенерировать (руками .ts не править). Порядок и ключи животных — часть данных
(`profiles.avatar_url` хранит готовый data-URI, поэтому смена рисунка у уже выбравших не меняется; новый ключ добавлять в КОНЕЦ).
"""
# Генератор 20 аватарок-животных: единый стиль, 2 цвета (тёмные «чернила» + пастельный фон), белые блики.
INK='#2f3047'
W='#ffffff'
BG=['#ffd6a5','#fdffb6','#caffbf','#9bf6ff','#a0c4ff','#bdb2ff','#ffc6ff','#ffadad']
def c(cx,cy,r,f=INK): return f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="{f}"/>'
def e(cx,cy,rx,ry,f=INK,rot=0):
    t=f' transform="rotate({rot} {cx} {cy})"' if rot else ''
    return f'<ellipse cx="{cx}" cy="{cy}" rx="{rx}" ry="{ry}" fill="{f}"{t}/>'
def p(pts,f=INK): return f'<polygon points="{pts}" fill="{f}"/>'
def l(x1,y1,x2,y2,col=W,w=1.6): return f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="{col}" stroke-width="{w}" stroke-linecap="round"/>'
def eyes(y=35,dx=7.5,r=2.4,col=W): return c(32-dx,y,r,col)+c(32+dx,y,r,col)
A={}
A['cat']=p('14,26 15,7 29,19')+p('50,26 49,7 35,19')+c(32,37,18)+eyes(36)+p('29,42 35,42 32,45.5',W)+l(20,43,10,41)+l(20,46,10,47)+l(44,43,54,41)+l(44,46,54,47)
A['dog']=e(14,34,6.5,13,INK,12)+e(50,34,6.5,13,INK,-12)+c(32,36,17)+e(32,44,10,7.5,W)+eyes(33,7,2.4,W)+e(32,41,4,3,INK)+l(32,44,32,48,INK,1.4)
A['fox']=p('32,56 8,33 14,8 28,22 36,22 50,8 56,33')+p('32,56 18,42 46,42',W)+p('8,33 20,38 14,45',W)+p('56,33 44,38 50,45',W)+eyes(32,8.5,2.2,W)+c(32,50,2.6,INK)
A['bear']=c(15,20,7)+c(49,20,7)+c(15,20,3.6,W)+c(49,20,3.6,W)+c(32,37,19)+e(32,44,8.5,6.5,W)+eyes(32,8,2.3,W)+e(32,42,3.6,2.6,INK)
A['panda']=c(15,19,7)+c(49,19,7)+c(32,37,19,W)+e(23,34,5.2,6.4,INK,-25)+e(41,34,5.2,6.4,INK,25)+c(23.5,34,1.8,W)+c(40.5,34,1.8,W)+e(32,44,3.6,2.6,INK)+l(32,46.5,32,49,INK,1.4)
A['rabbit']=e(23,17,4.6,13,INK,-6)+e(41,17,4.6,13,INK,6)+e(23,17,2,9,W,-6)+e(41,17,2,9,W,6)+c(32,42,16)+eyes(40,6.5,2.3,W)+p('30,46 34,46 32,48.5',W)
A['mouse']=c(16,24,10)+c(48,24,10)+c(16,24,5.5,W)+c(48,24,5.5,W)+e(32,40,15,17)+eyes(37,6.5,2.2,W)+c(32,45,2.6,W)+l(24,47,13,46)+l(40,47,51,46)
A['lion']=c(32,34,26)+c(32,36,14,W)+c(13,18,5)+c(51,18,5)+eyes(33,6,2.2,INK)+p('29,40 35,40 32,44',INK)+l(32,44,32,47,INK,1.4)
A['tiger']=c(15,19,6.5)+c(49,19,6.5)+c(32,37,19)+l(32,20,32,27)+l(26,21,27,27)+l(38,21,37,27)+l(15,36,21,37)+l(15,42,21,41)+l(49,36,43,37)+l(49,42,43,41)+e(32,45,8,6,W)+eyes(34,7.5,2.3,W)+e(32,42,3.4,2.4,INK)
A['frog']=e(32,42,23,15)+c(21,26,8)+c(43,26,8)+c(21,26,5,W)+c(43,26,5,W)+c(21,26,2.4,INK)+c(43,26,2.4,INK)+'<path d="M17 45 Q32 56 47 45" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round"/>'
A['pig']=p('13,25 15,10 28,18')+p('51,25 49,10 36,18')+c(32,37,19)+eyes(33,8,2.3,W)+e(32,44,9,6.5,W)+c(29,44,1.6,INK)+c(35,44,1.6,INK)
A['cow']=e(11,30,8,5,INK,-20)+e(53,30,8,5,INK,20)+p('21,22 18,10 25,18')+p('43,22 46,10 39,18')+e(32,36,17,19)+e(32,46,11,8,W)+c(28,46,1.8,INK)+c(36,46,1.8,INK)+eyes(31,8,2.4,W)+e(22,25,3.5,3,W)
A['monkey']=c(11,34,7)+c(53,34,7)+c(11,34,3.6,W)+c(53,34,3.6,W)+c(32,34,19)+e(26,38,8,8,W)+e(38,38,8,8,W)+e(32,44,8.5,7,W)+eyes(34,5.5,2,INK)+c(30,45,1.2,INK)+c(34,45,1.2,INK)
A['koala']=c(13,25,10)+c(51,25,10)+c(13,25,5.5,W)+c(51,25,5.5,W)+c(32,37,18)+eyes(33,8.5,2.2,W)+e(32,41,5,7,W)
A['owl']=p('14,24 12,8 26,17')+p('50,24 52,8 38,17')+e(32,38,19,20)+c(23,33,8.5,W)+c(41,33,8.5,W)+c(23,33,3.6,INK)+c(41,33,3.6,INK)+p('29,39 35,39 32,46',W)
A['penguin']=e(32,36,19,21)+e(32,42,12,15,W)+c(25,27,3,W)+c(39,27,3,W)+c(25,27,1.2,INK)+c(39,27,1.2,INK)+p('28,32 36,32 32,38',W)+e(10,40,4,10,INK,18)+e(54,40,4,10,INK,-18)
A['elephant']=e(11,32,10,14)+e(53,32,10,14)+e(11,32,5.5,9,W)+e(53,32,5.5,9,W)+c(32,32,16)+eyes(28,7,2.2,W)+'<path d="M28 36 L28 52 Q28 57 33 57 Q38 57 38 52" fill="none" stroke="#2f3047" stroke-width="7" stroke-linecap="round"/>'+l(30,43,30,50,W,1.2)
A['deer']=l(22,22,16,8,INK,2.6)+l(19,16,12,15,INK,2.2)+l(42,22,48,8,INK,2.6)+l(45,16,52,15,INK,2.2)+e(15,29,6,3.6,INK,-25)+e(49,29,6,3.6,INK,25)+e(32,38,14,18)+e(32,48,7,5.5,W)+eyes(33,6.5,2.2,W)+c(32,46,2.4,INK)
A['wolf']=p('32,57 17,38 14,6 27,21 37,21 50,6 47,38')+p('18,21 17,12 24,19',W)+p('46,21 47,12 40,19',W)+p('32,57 25,43 39,43',W)+eyes(32,7,2,W)+p('29,48 35,48 32,52',INK)
A['hedgehog']=p('8,36 12,24 17,27 20,14 26,22 32,10 38,22 44,14 47,27 52,24 56,36 32,50')+e(32,42,17,14,W)+eyes(40,7,2.2,INK)+c(32,47,3,INK)+c(14,38,0)
names=list(A.keys())
def svg(i,k):
    bg=BG[i%len(BG)]
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" fill="{bg}"/>{A[k]}</svg>'

NAMES_RU = {'cat': 'Кот', 'dog': 'Пёс', 'fox': 'Лиса', 'bear': 'Медведь', 'panda': 'Панда', 'rabbit': 'Кролик', 'mouse': 'Мышка', 'lion': 'Лев', 'tiger': 'Тигр', 'frog': 'Лягушка', 'pig': 'Поросёнок', 'cow': 'Корова', 'monkey': 'Обезьянка', 'koala': 'Коала', 'owl': 'Сова', 'penguin': 'Пингвин', 'elephant': 'Слон', 'deer': 'Олень', 'wolf': 'Волк', 'hedgehog': 'Ёжик'}
NAMES_EN = {'cat': 'Cat', 'dog': 'Dog', 'fox': 'Fox', 'bear': 'Bear', 'panda': 'Panda', 'rabbit': 'Rabbit', 'mouse': 'Mouse', 'lion': 'Lion', 'tiger': 'Tiger', 'frog': 'Frog', 'pig': 'Piglet', 'cow': 'Cow', 'monkey': 'Monkey', 'koala': 'Koala', 'owl': 'Owl', 'penguin': 'Penguin', 'elephant': 'Elephant', 'deer': 'Deer', 'wolf': 'Wolf', 'hedgehog': 'Hedgehog'}

TS_HEAD = """// СГЕНЕРИРОВАНО scripts/gen_animal_avatars.py — руками не править (BACKLOG раздел 29, агент 2).
// 20 аватарок-животных в одном стиле: тёмные чернила + пастельный фон + белые блики. Выбор хранится в profiles.avatar_url как готовый data-URI
// (без Storage и без SQL), поэтому любое место, которое рисует <img :src="avatar_url">, показывает его без изменений.
// КОПИЯ лежит в web-dashboard/src/lib/animalAvatars.ts (окно выбора аватарки); страж — web-onboarding/src/animalAvatars.test.ts.
export interface AnimalAvatar {
  key: string
  ru: string
  en: string
  svg: string
}

export const ANIMALS: readonly AnimalAvatar[] = [
"""
TS_TAIL = """]

// Готовый data-URI для <img src>: SVG без внешних ресурсов, кодируется целиком (в нём нет скриптов и ссылок).
export function animalAvatarUrl(key: string): string | null {
  const a = ANIMALS.find((x) => x.key === key)
  return a ? 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(a.svg) : null
}

// Если avatar_url — одна из наших аватарок, вернёт её ключ (чтобы подсветить выбранную в окне), иначе null (своё фото, ссылка Google, пусто).
export function animalKeyOfUrl(url: string | null | undefined): string | null {
  if (!url || !url.startsWith('data:image/svg+xml')) return null
  return ANIMALS.find((a) => animalAvatarUrl(a.key) === url)?.key ?? null
}

// Подпись для скринридера и title на выбранном языке.
export function animalLabel(a: AnimalAvatar, lang: string): string {
  return lang === 'en' ? a.en : a.ru
}
"""

def ts():
    out=[TS_HEAD]
    for i,k in enumerate(names):
        out.append("  { key: %r, ru: %r, en: %r, svg: %r },\n" % (k, NAMES_RU[k], NAMES_EN[k], svg(i,k)))
    out.append(TS_TAIL)
    return ''.join(out)

if __name__ == '__main__':
    import os
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    text = ts().replace('"', '"')
    for rel in ('web-onboarding/src/lib/animalAvatars.ts', 'web-dashboard/src/lib/animalAvatars.ts'):
        with open(os.path.join(root, rel), 'w', encoding='utf-8') as f:
            f.write(text)
        print('wrote', rel)
