// Быстрые переходы из ярлыков установленного приложения (BACKLOG 79.5): `?quick=water` открывает окно воды.
export type QuickAction = 'water'

export function readQuick(search: string): QuickAction | null {
  const v = new URLSearchParams(search).get('quick')
  return v === 'water' ? v : null
}

// Тот же адрес без параметра `quick` — чтобы после перезагрузки окно не открывалось снова
export function withoutQuick(href: string): string {
  const u = new URL(href, 'https://x.invalid')
  u.searchParams.delete('quick')
  return u.pathname + (u.search ? u.search : '') + u.hash
}
