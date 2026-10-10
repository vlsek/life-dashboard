#!/usr/bin/env python3
"""Срез 1 BACKLOG 706 («SVG-иконки как из 2000-х»): перерисовывает 19 самых слабых иконок набора ICON_PATHS.

Новые тела взяты из Tabler Icons (MIT, tabler.io) и Lucide (ISC, lucide.dev) — тот же штриховой стиль 24×24 со скруглёнными концами,
что у остального набора. Имена иконок НЕ меняются, поэтому метрики/цели/пикер продолжают работать как раньше. Отжимания, подтягивания и
приседания сознательно оставлены прежними: готовые аналоги получились хуже. Правит ТОЛЬКО указанные ключи внутри блока `ICON_PATHS`
в `config.js` и во всех `web-*/src/lib/icons.ts` (ICON_KEYWORDS, категории и прочее не трогает). Идемпотентно: повторный запуск ничего не меняет.
Страж — web-dashboard/src/iconRefreshAllCopies.test.ts (проверяет, что тела во всех копиях совпадают с этим списком).
Лицензии: Tabler Icons — MIT, © Paweł Kuna; Lucide — ISC, © Lucide Contributors."""
import glob, io, re

NEW = {
    'run': '<path d="M11.007 5a2 2 0 1 0 4 0a2 2 0 1 0 -4 0" /><path d="M4 17l5 1l.75 -1.5" /><path d="M15 21v-4l-4 -3l1 -6" /><path d="M7 12v-3l5 -1l3 3l3 1" />',  # Tabler run
    'walk': '<path d="M12 4a1 1 0 1 0 2 0a1 1 0 1 0 -2 0" /><path d="M7 21l3 -4" /><path d="M16 21l-2 -4l-3 -3l1 -6" /><path d="M6 12l2 -3l4 -1l3 3l3 1" />',  # Tabler walk
    'yoga': '<path d="M4 20h4l1.5 -3" /><path d="M17 20l-1 -5h-5l1 -7" /><path d="M4 10l4 -1l4 -1l4 1.5l4 1.5" /><path d="M10.007 5a2 2 0 1 0 4 0a2 2 0 1 0 -4 0" />',  # Tabler yoga
    'swim': '<path d="M15 9a1 1 0 1 0 2 0a1 1 0 1 0 -2 0" /><path d="M6 11l4 -2l3.5 3l-1.5 2" /><path d="M3 16.75a2.4 2.4 0 0 0 1 .25a2.4 2.4 0 0 0 2 -1a2.4 2.4 0 0 1 2 -1a2.4 2.4 0 0 1 2 1a2.4 2.4 0 0 0 2 1a2.4 2.4 0 0 0 2 -1a2.4 2.4 0 0 1 2 -1a2.4 2.4 0 0 1 2 1a2.4 2.4 0 0 0 2 1a2.4 2.4 0 0 0 1 -.25" />',  # Tabler swimming
    'stretch': '<path d="M15 5a1 1 0 1 0 2 0a1 1 0 1 0 -2 0" /><path d="M5 20l5 -.5l1 -2" /><path d="M18 20v-5h-5.5l2.5 -6.5l-5.5 1l1.5 2" />',  # Tabler stretching
    'boxing': '<path d="M3 9l4.5 1l3 2.5" /><path d="M13 21v-8l3 -5.5" /><path d="M8 4.5l4 2l4 1l4 3.5l-2 3.5" /><path d="M15.007 5a2 2 0 1 0 4 0a2 2 0 1 0 -4 0" />',  # Tabler karate
    'jumprope': '<path d="M6 14v-6a3 3 0 1 1 6 0v8a3 3 0 0 0 6 0v-6" /><path d="M16 5a2 2 0 0 1 2 -2a2 2 0 0 1 2 2v3a2 2 0 0 1 -2 2a2 2 0 0 1 -2 -2l0 -3" /><path d="M4 16a2 2 0 0 1 2 -2a2 2 0 0 1 2 2v3a2 2 0 0 1 -2 2a2 2 0 0 1 -2 -2l0 -3" />',  # Tabler jump-rope
    'treadmill': '<path d="M10 3a1 1 0 1 0 2 0a1 1 0 0 0 -2 0" /><path d="M3 14l4 1l.5 -.5" /><path d="M12 18v-3l-3 -2.923l.75 -5.077" /><path d="M6 10v-2l4 -1l2.5 2.5l2.5 .5" /><path d="M21 22a1 1 0 0 0 -1 -1h-16a1 1 0 0 0 -1 1" /><path d="M18 21l1 -11l2 -1" />',  # Tabler treadmill
    'ski': '<path d="M17 17.5l-5 -4.5v-6l5 4" /><path d="M7 17.5l5 -4.5" /><path d="M15.103 21.58l6.762 -14.502a2 2 0 0 0 -.968 -2.657" /><path d="M8.897 21.58l-6.762 -14.503a2 2 0 0 1 .968 -2.657" /><path d="M7 11l5 -4" /><path d="M10.007 4a2 2 0 1 0 4 0a2 2 0 1 0 -4 0" />',  # Tabler ski-jumping
    'bandage': '<path d="M10 10.01h.01" /><path d="M10 14.01h.01" /><path d="M14 10.01h.01" /><path d="M14 14.01h.01" /><path d="M18 6v12" /><path d="M6 6v12" /><rect x="2" y="6" width="20" height="12" rx="2" />',  # Lucide bandage
    'broom': '<path d="m16 22-1-4" /><path d="M19 14a1 1 0 0 0 1-1v-1a2 2 0 0 0-2-2h-3a1 1 0 0 1-1-1V4a2 2 0 0 0-4 0v5a1 1 0 0 1-1 1H6a2 2 0 0 0-2 2v1a1 1 0 0 0 1 1" /><path d="M19 14H5l-1.973 6.767A1 1 0 0 0 4 22h16a1 1 0 0 0 .973-1.233z" /><path d="m8 22 1-4" />',  # Lucide brush-cleaning
    'party': '<path d="M5.8 11.3 2 22l10.7-3.79" /><path d="M4 3h.01" /><path d="M22 8h.01" /><path d="M15 2h.01" /><path d="M22 20h.01" /><path d="m22 2-2.24.75a2.9 2.9 0 0 0-1.96 3.12c.1.86-.57 1.63-1.45 1.63h-.38c-.86 0-1.6.6-1.76 1.44L14 10" /><path d="m22 13-.82-.33c-.86-.34-1.82.2-1.98 1.11c-.11.7-.72 1.22-1.43 1.22H17" /><path d="m11 2 .33.82c.34.86-.2 1.82-1.11 1.98C9.52 4.9 9 5.52 9 6.23V7" /><path d="M11 13c1.93 1.93 2.83 4.17 2 5-.83.83-3.07-.07-5-2-1.93-1.93-2.83-4.17-2-5 .83-.83 3.07.07 5 2Z" />',  # Lucide party-popper
    'tree': '<path d="m17 14 3 3.3a1 1 0 0 1-.7 1.7H4.7a1 1 0 0 1-.7-1.7L7 14h-.3a1 1 0 0 1-.7-1.7L9 9h-.2A1 1 0 0 1 8 7.3L12 3l4 4.3a1 1 0 0 1-.8 1.7H15l3 3.3a1 1 0 0 1-.7 1.7H17Z" /><path d="M12 22v-3" />',  # Lucide tree-pine
    'snow': '<path d="m10 20-1.25-2.5L6 18" /><path d="M10 4 8.75 6.5 6 6" /><path d="m14 20 1.25-2.5L18 18" /><path d="m14 4 1.25 2.5L18 6" /><path d="m17 21-3-6h-4" /><path d="m17 3-3 6 1.5 3" /><path d="M2 12h6.5L10 9" /><path d="m20 10-1.5 2 1.5 2" /><path d="M22 12h-6.5L14 15" /><path d="m4 10 1.5 2L4 14" /><path d="m7 21 3-6-1.5-3" /><path d="m7 3 3 6h4" />',  # Lucide snowflake
    'bird': '<path d="M16 7h.01" /><path d="M3.4 18H12a8 8 0 0 0 8-8V7a4 4 0 0 0-7.28-2.3L2 20" /><path d="m20 7 2 .5-2 .5" /><path d="M10 18v3" /><path d="M14 17.75V21" /><path d="M7 18a6 6 0 0 0 3.84-10.61" />',  # Lucide bird
    'fish': '<path d="M6.5 12c.94-3.46 4.94-6 8.5-6 3.56 0 6.06 2.54 7 6-.94 3.47-3.44 6-7 6s-7.56-2.53-8.5-6Z" /><path d="M18 12v.5" /><path d="M16 17.93a9.77 9.77 0 0 1 0-11.86" /><path d="M7 10.67C7 8 5.58 5.97 2.73 5.5c-1 1.5-1 5 .23 6.5-1.24 1.5-1.24 5-.23 6.5C5.58 18.03 7 16 7 13.33" /><path d="M10.46 7.26C10.2 5.88 9.17 4.24 8 3h5.8a2 2 0 0 1 1.98 1.67l.23 1.4" /><path d="m16.01 17.93-.23 1.4A2 2 0 0 1 13.8 21H9.5a5.96 5.96 0 0 0 1.49-3.98" />',  # Lucide fish
    'guitar': '<path d="m11.9 12.1 4.514-4.514" /><path d="M20.1 2.3a1 1 0 0 0-1.4 0l-1.114 1.114A2 2 0 0 0 17 4.828v1.344a2 2 0 0 1-.586 1.414A2 2 0 0 1 17.828 7h1.344a2 2 0 0 0 1.414-.586L21.7 5.3a1 1 0 0 0 0-1.4z" /><path d="m6 16 2 2" /><path d="M8.23 9.85A3 3 0 0 1 11 8a5 5 0 0 1 5 5 3 3 0 0 1-1.85 2.77l-.92.38A2 2 0 0 0 12 18a4 4 0 0 1-4 4 6 6 0 0 1-6-6 4 4 0 0 1 4-4 2 2 0 0 0 1.85-1.23z" />',  # Lucide guitar
    'cake': '<path d="M20 21v-8a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8" /><path d="M4 16s.5-1 2-1 2.5 2 4 2 2.5-2 4-2 2.5 2 4 2 2-1 2-1" /><path d="M2 21h20" /><path d="M7 8v3" /><path d="M12 8v3" /><path d="M17 8v3" /><path d="M7 4h.01" /><path d="M12 4h.01" /><path d="M17 4h.01" />',  # Lucide cake
    'lungs': '<path d="M6.081 20c1.612 0 2.919 -1.335 2.919 -2.98v-9.763c0 -.694 -.552 -1.257 -1.232 -1.257c-.205 0 -.405 .052 -.584 .15l-.13 .083c-1.46 1.059 -2.432 2.647 -3.404 5.824c-.42 1.37 -.636 2.962 -.648 4.775c-.012 1.675 1.261 3.054 2.877 3.161l.203 .007" /><path d="M17.92 20c-1.613 0 -2.92 -1.335 -2.92 -2.98v-9.763c0 -.694 .552 -1.257 1.233 -1.257c.204 0 .405 .052 .584 .15l.13 .083c1.46 1.059 2.432 2.647 3.405 5.824c.42 1.37 .636 2.962 .648 4.775c.012 1.675 -1.261 3.054 -2.878 3.161l-.202 .007" /><path d="M9 12a3 3 0 0 0 3 -3a3 3 0 0 0 3 3" /><path d="M12 4v5" />',  # Tabler lungs
}


def esc(body):
    return body.replace('"', '\\"')


def patch(path):
    t = io.open(path, encoding='utf-8').read()
    a = t.find('ICON_PATHS = {')
    if a < 0:
        return 0
    b = t.find('\n}', a)
    blk = t[a:b]
    n = 0
    for key, body in NEW.items():
        pat = re.compile(r"^(\s*{}:\s*)'.*'(,?)\s*$".format(re.escape(key)), re.M)
        m = pat.search(blk)
        if not m:
            raise SystemExit('нет ключа %s в %s' % (key, path))
        new_line = m.group(1) + "'" + esc(body) + "'" + m.group(2)
        if m.group(0) != new_line:
            blk = blk[:m.start()] + new_line + blk[m.end():]
            n += 1
    if n:
        io.open(path, 'w', encoding='utf-8').write(t[:a] + blk + t[b:])
    return n


def main():
    total = 0
    for p in ['config.js'] + sorted(glob.glob('web-*/src/lib/icons.ts')):
        n = patch(p)
        if n:
            print('+', p, n)
        total += n
    print('replaced:', total)


if __name__ == '__main__':
    main()
