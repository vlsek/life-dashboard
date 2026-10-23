// Рамки-орнаменты «не кругом» (BACKLOG 44.18з, срезы 1–3): SVG-слой ВОКРУГ аватара, выходящий за его контур (венок, лианы, вензель, шина, штурвал, колесо обозрения, барокко).
// Система координат слоя — viewBox 0..100, аватар — круг радиуса 50 в центре (50,50), поэтому слой совпадает с боксом аватара при любом
// размере, а рисунок лежит снаружи круга (радиус ≈ 50–66) и виден за счёт `overflow: visible` у <svg> (см. FrameDecor.vue).
// Обычный box-shadow рамки (frames.ts) остаётся тонким кольцом под орнаментом. Рамки без орнамента сюда не попадают и рисуются как раньше.
// КОПИЯ живёт в web-header, web-community, web-account и web-dashboard (аватар в меню, Сообществе, Аккаунте, на Дашборде) — менять ВМЕСТЕ, страж frameDecor.test.ts.
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

// «Шина»: тёмное покрышечное кольцо с протектором (24 радиальных блока) и светлой боковиной; тонкий светлый контур, чтобы читалась и на тёмном фоне.
function tyre(): string {
  let g = '<circle cx="50" cy="50" r="56.5" fill="none" stroke="#2c2d33" stroke-width="8.5" />'
  for (let i = 0; i < 24; i++) g += `<rect x="48.3" y="${f1(50 - 60.7)}" width="3.4" height="7" rx="0.8" fill="${i % 2 ? '#6b6e7b' : '#5a5d69'}" transform="rotate(${i * 15} 50 50)" />`
  g += '<circle cx="50" cy="50" r="52.2" fill="none" stroke="#a9adb7" stroke-width=".9" /><circle cx="50" cy="50" r="60.9" fill="none" stroke="#8a8f9a" stroke-width=".7" stroke-opacity=".7" />'
  const [vx, vy] = pt(-90, 56.5)
  g += `<circle cx="${f1(vx)}" cy="${f1(vy)}" r="1.5" fill="#d9ad3b" />`
  return g
}

// «Штурвал»: деревянный обод с латунными заклёпками и восемь рукоятей с набалдашниками, торчащие наружу.
function helm(): string {
  let g = '<circle cx="50" cy="50" r="54" fill="none" stroke="#7a4b21" stroke-width="3.6" /><circle cx="50" cy="50" r="52.7" fill="none" stroke="#b7843f" stroke-width=".8" />'
  for (let k = 0; k < 8; k++) {
    const a = k * 45
    const [x1, y1] = pt(a, 55.5)
    const [x2, y2] = pt(a, 63)
    const [x3, y3] = pt(a, 65)
    g += `<line x1="${f1(x1)}" y1="${f1(y1)}" x2="${f1(x2)}" y2="${f1(y2)}" stroke="#7a4b21" stroke-width="3.2" stroke-linecap="round" /><circle cx="${f1(x3)}" cy="${f1(y3)}" r="2.7" fill="#b7843f" stroke="#7a4b21" stroke-width=".7" />`
    const [sx, sy] = pt(a + 22.5, 54)
    g += `<circle cx="${f1(sx)}" cy="${f1(sy)}" r="1" fill="#e3c06a" />`
  }
  return g
}

// «Колесо обозрения»: тонкий стальной обод и двенадцать цветных кабинок на коротких стойках, вынесенных наружу.
function ferris(): string {
  const colors = ['#ff6b6b', '#ffa94d', '#ffd43b', '#8ce99a', '#38d9a9', '#4dabf7', '#748ffc', '#da77f2', '#f783ac', '#ff8787', '#ffc078', '#69db7c']
  let g = '<circle cx="50" cy="50" r="55" fill="none" stroke="#8a93a6" stroke-width="1.5" /><circle cx="50" cy="50" r="52.6" fill="none" stroke="#b5bccb" stroke-width=".7" />'
  for (let k = 0; k < 12; k++) {
    const a = k * 30 - 90
    const [x1, y1] = pt(a, 55)
    const [x2, y2] = pt(a, 58.3)
    const [cx, cy] = pt(a, 61.6)
    g += `<line x1="${f1(x1)}" y1="${f1(y1)}" x2="${f1(x2)}" y2="${f1(y2)}" stroke="#8a93a6" stroke-width="1.1" /><circle cx="${f1(cx)}" cy="${f1(cy)}" r="3.5" fill="${colors[k]}" stroke="#ffffff" stroke-width=".8" />`
  }
  return g
}

// «Барокко»: двойной золотой обод, жемчужины по кругу и четыре лилии по сторонам света.
function baroque(): string {
  let g = '<circle cx="50" cy="50" r="52.4" fill="none" stroke="#d9ad3b" stroke-width="1.7" /><circle cx="50" cy="50" r="55" fill="none" stroke="#c4921f" stroke-width=".7" />'
  for (let i = 0; i < 24; i++) {
    if (i % 6 === 0) continue // на сторонах света стоят лилии
    const [x, y] = pt(i * 15, 53.7)
    g += `<circle cx="${f1(x)}" cy="${f1(y)}" r="1.15" fill="#f1e2b0" stroke="#c4921f" stroke-width=".4" />`
  }
  const lily = 'M0 0C-3 -4 -3 -9 0 -14C3 -9 3 -4 0 0ZM-1 -1C-6 -1 -9 -6 -6.5 -10C-5.5 -6.5 -3.5 -4.5 -1 -3ZM1 -1C6 -1 9 -6 6.5 -10C5.5 -6.5 3.5 -4.5 1 -3Z'
  for (const a of [0, 90, 180, 270]) {
    const [x, y] = pt(a - 90, 55)
    g += `<g transform="translate(${f1(x)} ${f1(y)}) rotate(${a})"><path d="${lily}" fill="#d9ad3b" stroke="#a67c14" stroke-width=".6" stroke-linejoin="round" /><rect x="-3.2" y="0" width="6.4" height="1.6" rx=".6" fill="#c4921f" /></g>`
  }
  return g
}

const BUILDERS: Record<string, () => string> = { frame_wreath: wreath, frame_vines: vines, frame_flourish: flourish, frame_tyre: tyre, frame_helm: helm, frame_ferris: ferris, frame_baroque: baroque }
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
