// Рамки-орнаменты «не кругом» (BACKLOG 44.18з, срез 1): SVG-слой ВОКРУГ аватара, выходящий за его контур (венок, лианы, вензель).
// Система координат слоя — viewBox 0..100, аватар — круг радиуса 50 в центре (50,50), поэтому слой совпадает с боксом аватара при любом
// размере, а рисунок лежит снаружи круга (радиус ≈ 50–66) и виден за счёт `overflow: visible` у <svg> (см. FrameDecor.vue).
// Обычный box-shadow рамки (frames.ts) остаётся тонким кольцом под орнаментом. Рамки без орнамента сюда не попадают и рисуются как раньше.
// КОПИЯ живёт в web-header, web-community и web-account (аватар в меню, Сообществе, Аккаунте) — менять ВМЕСТЕ, страж frameDecor.test.ts.
const f1 = (n: number): string => String(Math.round(n * 10) / 10)
const rad = (deg: number): number => (deg * Math.PI) / 180
// Точка на радиусе r под углом deg (по часовой стрелке от оси X, как в SVG).
const pt = (deg: number, r: number): [number, number] => [50 + r * Math.cos(rad(deg)), 50 + r * Math.sin(rad(deg))]
// Лист-эллипс: центр на радиусе r, длинная ось повёрнута на rot градусов.
const leaf = (deg: number, r: number, rot: number, rx: number, ry: number, fill: string): string => {
  const [x, y] = pt(deg, r)
  return `<ellipse cx="${f1(x)}" cy="${f1(y)}" rx="${rx}" ry="${ry}" fill="${fill}" transform="rotate(${f1(rot)} ${f1(x)} ${f1(y)})" />`
}

// «Лавровый венок»: две ветви листьев от низа вверх по обеим сторонам, наверху просвет, внизу золотая лента и две ягоды.
function wreath(): string {
  let g = ''
  for (const s of [-1, 1]) {
    for (let i = 0; i < 11; i++) {
      const a = 90 + s * (15 + i * 13.5) // от низа к верху по обеим сторонам
      const tangent = a + (s === 1 ? 90 : -90) // направление роста ветви — к верху
      const rx = Math.round((6.6 - 2.2 * (i / 10)) * 10) / 10
      g += leaf(a, 57, tangent + 30, rx, 2.9, i % 2 ? '#3f9b4a' : '#2f7d3a')
      g += leaf(a, 53.4, tangent - 30, rx - 0.5, 2.6, i % 2 ? '#2f7d3a' : '#4fae5a')
    }
  }
  const [bx, by] = pt(90, 55.5)
  g += `<ellipse cx="${f1(bx)}" cy="${f1(by + 3.2)}" rx="7" ry="2.6" fill="#d9ad3b" /><ellipse cx="${f1(bx)}" cy="${f1(by + 3.2)}" rx="7" ry="2.6" fill="none" stroke="#a67c14" stroke-width=".6" />`
  g += `<circle cx="${f1(bx - 5)}" cy="${f1(by - 1)}" r="2" fill="#d8434e" /><circle cx="${f1(bx + 5)}" cy="${f1(by - 1)}" r="2" fill="#d8434e" />`
  return g
}

// «Лианы»: плавный извилистый стебель по кругу, листья по обе стороны и несколько мелких цветков.
function vines(): string {
  const r = (a: number): number => 55.5 + 1.7 * Math.sin(rad(a * 9))
  let d = ''
  for (let a = 0; a <= 360; a += 2) {
    const [x, y] = pt(a, r(a))
    d += (a === 0 ? 'M' : 'L') + f1(x) + ' ' + f1(y) + ' '
  }
  let g = `<path d="${d}Z" fill="none" stroke="#3a8f4a" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />`
  for (let i = 0; i < 30; i++) {
    const a = i * 12 + 4
    const out = i % 2 === 0
    g += leaf(a, r(a) + (out ? 3.6 : -3.4), a + 90 + (out ? 42 : -42), 5.8, 2.4, out ? '#4fae5a' : '#2f7d3a')
  }
  for (let i = 0; i < 6; i++) {
    const a = i * 60 + 22
    const [x, y] = pt(a, r(a) + 5.4)
    g += `<circle cx="${f1(x)}" cy="${f1(y)}" r="2.6" fill="#ff7aa8" /><circle cx="${f1(x)}" cy="${f1(y)}" r="1" fill="#ffe27a" />`
  }
  return g
}

// «Вензель»: тонкое золотое кольцо, четыре парных завитка-«волютки» по диагоналям и четыре ромба по сторонам света.
function flourish(): string {
  let g = '<circle cx="50" cy="50" r="52" fill="none" stroke="#d9ad3b" stroke-width="1.3" />'
  // завиток лежит вдоль касательной: от стебля (0,0) расходится спираль в обе стороны (зеркально)
  const scroll = 'M0 0C0 -4 3 -7 7 -7C11 -7 12 -3 9.5 -2C7.5 -1.2 6 -3 7.6 -4.2'
  for (const a of [45, 135, 225, 315]) {
    const [x, y] = pt(a, 54)
    g += `<g transform="translate(${f1(x)} ${f1(y)}) rotate(${a + 90}) scale(1.3)" fill="none" stroke="#c4921f" stroke-width="1.35" stroke-linecap="round" stroke-linejoin="round"><path d="${scroll}" /><path d="${scroll}" transform="scale(-1 1)" /><circle cx="0" cy="3" r="1.4" fill="#d9ad3b" stroke="none" /></g>`
  }
  for (const a of [0, 90, 180, 270]) {
    const [x, y] = pt(a, 56.5)
    g += `<rect x="${f1(x - 2.6)}" y="${f1(y - 2.6)}" width="5.2" height="5.2" fill="#d9ad3b" stroke="#a67c14" stroke-width=".5" transform="rotate(45 ${f1(x)} ${f1(y)})" />`
  }
  return g
}

const BUILDERS: Record<string, () => string> = { frame_wreath: wreath, frame_vines: vines, frame_flourish: flourish }
const cache = new Map<string, string>()

// SVG-разметка орнамента для рамки (внутренность <svg viewBox="0 0 100 100">); нет орнамента или неизвестный ключ — пустая строка.
export function frameDecor(key: string | null | undefined): string {
  if (!key || !BUILDERS[key]) return ''
  let s = cache.get(key)
  if (s === undefined) {
    s = BUILDERS[key]()
    cache.set(key, s)
  }
  return s
}

export const FRAME_DECOR_KEYS: string[] = Object.keys(BUILDERS)
