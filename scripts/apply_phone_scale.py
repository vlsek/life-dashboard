#!/usr/bin/env python3
"""Масштаб интерфейса на телефоне (BACKLOG 863, «с телефона всё очень крупное»).

Tailwind v4 считает шрифты, отступы, кнопки и карточки в rem, поэтому достаточно уменьшить КОРНЕВОЙ размер шрифта на узких экранах:
сожмётся всё сразу и пропорционально, без правки отдельных страниц. Брейкпоинты Tailwind (sm/md/lg) — в rem внутри media-query,
они считаются от настроек браузера, а не от html, поэтому раскладка по ширине экрана не меняется.

ЕДИНСТВЕННОЕ место, где правится степень уменьшения: PHONE_SCALE ниже (87.5% = −12.5%, 100% = как раньше), потом
`python3 scripts/apply_phone_scale.py` и пересборка всех пилотов. Блок между маркерами phone-scale:start/end вставляется в КОНЕЦ каждого
web-*/src/style.css и при повторном запуске заменяется на актуальный (идемпотентно). Страж — web-dashboard/src/phoneScaleAllPilots.test.ts.
"""
import glob, io, re

PHONE_SCALE = '87.5%'
PHONE_MAX_WIDTH = '640px'  # = sm у Tailwind; планшеты и ПК не затрагиваются

BLOCK = f"""/* phone-scale:start (генерируется scripts/apply_phone_scale.py — не править руками; BACKLOG 863) */
:root {{ --phone-scale: {PHONE_SCALE}; }}
@media (max-width: {PHONE_MAX_WIDTH}) {{
  html {{ font-size: var(--phone-scale); }}
}}
/* phone-scale:end */
"""
RE = re.compile(r'\n?/\* phone-scale:start.*?/\* phone-scale:end \*/\n?', re.S)


def main():
    n = 0
    for p in sorted(glob.glob('web-*/src/style.css')):
        t = io.open(p, encoding='utf-8').read()
        new = RE.sub('\n', t).rstrip('\n') + '\n\n' + BLOCK
        if new != t:
            io.open(p, 'w', encoding='utf-8').write(new)
            n += 1
            print('+', p)
    print('updated:', n)


if __name__ == '__main__':
    main()
