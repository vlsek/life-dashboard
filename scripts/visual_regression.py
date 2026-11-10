#!/usr/bin/env python3
"""BACKLOG 74.4: пакетная визуальная проверка СОБРАННЫХ папок (dashboard/, shop/, …) в настоящем Chromium — телефон и ПК, темы, без входа и сети.

«Тесты прошли» не значит «визуально проверено»: юнит-тесты не видят горизонтальную прокрутку, пустой экран после редиректа или ошибку в консоли собранного бандла.
Скрипт раздаёт корень репозитория, подставляет сессию и ответы Supabase (профиль onboarded, остальные таблицы пустые — данных нет, это проверка вёрстки и
состояния «пусто», не логики), замораживает время (2026-11-02 12:00) и часовой пояс (Europe/Vilnius), блокирует чужие домены и для каждой страницы проверяет:
  • итоговый адрес (не ушла ли на /login/ или /onboarding/ вместо своей страницы);  • ошибки страницы и console.error;  • локальные запросы с кодом ≥ 400;
  • горизонтальную прокрутку (scrollWidth > clientWidth);  • пустую страницу (в body почти нет текста);  • на телефоне — нажимаемые элементы: меньше 24 px — ошибка (WCAG 2.2 AA), меньше 32 px — замечание (стандарт проекта, аудит 60.2); учитывается зона нажатия, расширенная ::after.
Скриншоты — в --out (по умолчанию /tmp/visual/<viewport>-<тема>/<страница>.png). С --baseline DIR сравнивает с прошлым прогоном (доля изменившихся пикселей, порог --threshold). --report PATH сохраняет JSON с проверенными страницами/темами и явными отметками production/физического устройства; --mark-production-checked и --mark-real-device-checked — только ручные подтверждения, сам скрипт эти среды не проверяет.

Использование (playwright: pip install playwright --break-system-packages; Chromium: /opt/google/chrome/chrome):
    python3 scripts/visual_regression.py                          # все страницы, телефон+ПК, тёмная тема
    python3 scripts/visual_regression.py shop goals --themes dark,light,monet --viewports phone --report /tmp/visual/report.json
    python3 scripts/visual_regression.py --out /tmp/after --baseline /tmp/before     # «до/после» правки
Код выхода 1 — есть жёсткие проблемы (предупреждения про 44 px не считаются). CLI проверяет страницы, viewport, темы, порог, задержку и размеры hit area до запуска Chromium; некорректные параметры завершаются с понятной ошибкой. Отсутствующий/недоступный baseline отмечается в отчёте, а Chromium, контексты и локальный сервер закрываются через finally. Сервер живёт внутри процесса — отдельный фоновый запуск не нужен."""
import argparse
import base64
import functools
import http.server
import json
import math
import os
import sys
import threading
import time
from datetime import datetime
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parent.parent
CHROME = os.environ.get('CHROME', '/opt/google/chrome/chrome')
EXPECTED_PATH = {'history': '/calendar/'}  # «История» живёт во вкладке календаря: /history/ перенаправляет на /calendar/?view=history
PAGES = ['dashboard', 'goals', 'shop', 'calendar', 'skills', 'workouts', 'languages', 'challenges', 'milestones', 'achievements', 'community', 'customization', 'account', 'history']
VIEWPORTS = {'phone': dict(viewport={'width': 390, 'height': 844}, is_mobile=True, has_touch=True), 'desktop': dict(viewport={'width': 1280, 'height': 800})}
THEMES = {'dark', 'monet', 'light', 'pink', 'mint', 'sepia', 'solarlight', 'nord', 'mocha', 'amoled', 'contrast', 'dracula', 'gruvbox', 'tokyonight', 'forest', 'ocean', 'sunset', 'twilight', 'neon', 'lavender', 'sky', 'peach', 'graphite', 'emerald', 'moonlight', 'phosphor', 'nightfall', 'velvet', 'frost', 'alpine', 'matcha', 'cyberday', 'vintage', 'glass', 'meadow', 'autumn', 'sakura', 'snow', 'ember', 'grass', 'clinic'}
UID = '11111111-1111-1111-1111-111111111111'
PROJECT = 'haxmgtflegsfpxieaydv'


def b64(o) -> str:
    return base64.urlsafe_b64encode(json.dumps(o).encode()).decode().rstrip('=')


def make_session() -> dict:
    now = int(time.time())
    jwt = f"{b64({'alg': 'HS256', 'typ': 'JWT'})}.{b64({'sub': UID, 'role': 'authenticated', 'aud': 'authenticated', 'exp': now + 36000, 'email': 'test@example.com'})}.sig"
    user = {'id': UID, 'aud': 'authenticated', 'role': 'authenticated', 'email': 'test@example.com', 'app_metadata': {}, 'user_metadata': {}}
    return {'access_token': jwt, 'refresh_token': 'r', 'expires_in': 36000, 'expires_at': now + 36000, 'token_type': 'bearer', 'user': user}


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a):
        pass


def start_server() -> http.server.ThreadingHTTPServer:
    handler = functools.partial(QuietHandler, directory=str(ROOT))
    srv = http.server.ThreadingHTTPServer(('127.0.0.1', 0), handler)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    return srv


def supabase_response(route, session):
    req = route.request
    cors = {'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*'}
    if req.method == 'OPTIONS':
        return route.fulfill(status=204, headers=cors)
    url = req.url
    if '/auth/v1/user' in url:
        return route.fulfill(status=200, content_type='application/json', headers=cors, body=json.dumps(session['user']))
    if '/auth/v1/token' in url:
        return route.fulfill(status=200, content_type='application/json', headers=cors, body=json.dumps(session))
    single = 'vnd.pgrst.object' in (req.headers.get('accept') or '')
    profile = {'user_id': UID, 'onboarded': True, 'display_name': 'Тест', 'customization': None, 'favorite_pages': None}
    if '/rest/v1/profiles' in url:
        body = json.dumps(profile if single else [profile])
    else:
        body = '{}' if single else '[]'
    return route.fulfill(status=200, content_type='application/json', headers=cors, body=body)


CHECK_JS = """([warnMin, hardMin]) => {
  const doc = document.documentElement
  const text = (document.body.innerText || '').replace(/\\s+/g, ' ').trim()
  const label = (el) => el.tagName.toLowerCase() + (el.getAttribute('data-testid') || el.getAttribute('data-test') ? '[' + (el.getAttribute('data-testid') || el.getAttribute('data-test')) + ']' : (el.className && typeof el.className === 'string' ? '.' + el.className.split(' ')[0] : '')) + ((el.getAttribute('aria-label') || el.textContent || el.placeholder || '').trim().slice(0, 18) ? ' «' + (el.getAttribute('aria-label') || el.textContent || el.placeholder || '').trim().slice(0, 18) + '»' : '')
  const small = []
  const tiny = []
  for (const el of document.querySelectorAll('button, a[href], input:not([type=hidden]), select, textarea, [role=button]')) {
    const r = el.getBoundingClientRect()
    const cs = getComputedStyle(el)
    if (r.width === 0 || r.height === 0 || cs.visibility === 'hidden' || cs.display === 'none') continue
    if (r.right <= 0 || r.left >= window.innerWidth) continue // за экраном (закрытое боковое меню)
    if (r.width <= 2 && r.height <= 2) continue // визуально скрытое поле (sr-only)
    let w = r.width, h = r.height
    const lab = (el.type === 'checkbox' || el.type === 'radio') && el.closest('label') // нативный чекбокс/радио: нажимается вся подпись
    if (lab) { const lr = lab.getBoundingClientRect(); w = Math.max(w, lr.width); h = Math.max(h, lr.height) }
    for (const pseudo of ['::after', '::before']) { // зона нажатия, расширенная псевдоэлементом (приём аудита 60.2)
      const ps = getComputedStyle(el, pseudo)
      if (ps.content !== 'none' && ps.position === 'absolute') { w = Math.max(w, parseFloat(ps.width) || 0); h = Math.max(h, parseFloat(ps.height) || 0) }
    }
    const m = Math.min(w, h)
    if (m < hardMin) tiny.push(label(el) + ' ' + Math.round(w) + '×' + Math.round(h))
    else if (m < warnMin) small.push(label(el) + ' ' + Math.round(w) + '×' + Math.round(h))
  }
  return { overflow: doc.scrollWidth - doc.clientWidth, textLen: text.length, small: small.length, smallSample: [...new Set(small)].slice(0, 4), tiny: tiny.length, tinySample: [...new Set(tiny)].slice(0, 4) }
}"""


def diff_fraction(a: Path, b: Path) -> float | None:
    try:
        from PIL import Image, ImageChops
        ia, ib = Image.open(a).convert('RGB'), Image.open(b).convert('RGB')
        if ia.size != ib.size:
            return 1.0
        bbox_img = ImageChops.difference(ia, ib).convert('L').point(lambda v: 255 if v > 24 else 0)
        return sum(1 for v in bbox_img.getdata() if v) / (ia.size[0] * ia.size[1])
    except Exception:
        return None


def parse_csv(raw: str, label: str, allowed=None) -> list[str]:
    values = [item.strip() for item in raw.split(',')]
    if not raw.strip() or any(not item for item in values):
        raise ValueError(f"{label}: укажите непустой список через запятую")
    if len(values) != len(set(values)):
        raise ValueError(f"{label}: повторяющиеся значения")
    if allowed is not None:
        unknown = [item for item in values if item not in allowed]
        if unknown:
            raise ValueError(f"{label}: неизвестные значения: {', '.join(unknown)}")
    return values


def build_parser() -> argparse.ArgumentParser:
    ap = argparse.ArgumentParser(description=__doc__.split('\n')[0])
    ap.add_argument('pages', nargs='*', help='имена страниц (по умолчанию все)')
    ap.add_argument('--viewports', default='phone,desktop')
    ap.add_argument('--themes', default='dark')
    ap.add_argument('--out', default='/tmp/visual')
    ap.add_argument('--baseline', default=None)
    ap.add_argument('--report', default=None, help='путь для JSON-отчёта о проверенных страницах/темах и границах проверки')
    ap.add_argument('--mark-production-checked', action='store_true', help='отметить отдельную ручную проверку production (сам скрипт проверяет только локальную сборку)')
    ap.add_argument('--mark-real-device-checked', action='store_true', help='отметить отдельную ручную проверку на физическом устройстве (Chromium phone — эмуляция)')
    ap.add_argument('--threshold', type=float, default=0.005, help='доля изменившихся пикселей, выше которой страница считается изменившейся')
    ap.add_argument('--wait', type=float, default=1.5)
    ap.add_argument('--min-target', type=int, default=32, help='замечание, если зона нажатия на телефоне меньше N px (стандарт проекта — 32, аудит 60.2)')
    ap.add_argument('--hard-target', type=int, default=24, help='ошибка, если меньше N px (WCAG 2.2 AA, критерий 2.5.8)')
    return ap


def validate_output_paths(out: str | Path, baseline: str | Path | None) -> None:
    output = Path(out).expanduser().resolve()
    if baseline is None:
        return
    source = Path(baseline).expanduser().resolve()
    if output == source or output in source.parents or source in output.parents:
        raise ValueError('--out и --baseline не должны совпадать или находиться друг внутри друга')


def parse_args(argv=None):
    ap = build_parser()
    args = ap.parse_args(argv)
    try:
        pages = args.pages or PAGES
        if len(pages) != len(set(pages)):
            raise ValueError('страницы: повторяющиеся значения')
        unknown_pages = [name for name in pages if name not in PAGES]
        if unknown_pages:
            raise ValueError(f"страницы: неизвестные значения: {', '.join(unknown_pages)}")
        viewports = parse_csv(args.viewports, '--viewports', VIEWPORTS)
        themes = parse_csv(args.themes, '--themes', THEMES)
        if not math.isfinite(args.threshold) or not 0 <= args.threshold <= 1:
            raise ValueError('--threshold должен быть в диапазоне от 0 до 1')
        if not math.isfinite(args.wait) or args.wait < 0:
            raise ValueError('--wait не может быть отрицательным')
        if not (1 <= args.hard_target <= args.min_target <= 200):
            raise ValueError('ожидается 1 <= --hard-target <= --min-target <= 200')
        validate_output_paths(args.out, args.baseline)
    except ValueError as exc:
        ap.error(str(exc))
    return args, pages, viewports, themes


def count_completed_runs(rows, runner_error):
    """Count page/theme results, excluding a synthetic runner-error row."""
    return max(0, len(rows) - (1 if runner_error else 0))


def main(argv=None) -> int:
    args, pages, viewports, themes = parse_args(argv)
    session = make_session()
    srv = start_server()
    base = f'http://127.0.0.1:{srv.server_address[1]}'
    out_root = Path(args.out)
    hard, warn, changed, rows = 0, 0, 0, []
    runner_error = None
    return_code = 0
    try:
        from playwright.sync_api import sync_playwright
        with sync_playwright() as pw:
            browser = pw.chromium.launch(executable_path=CHROME, args=['--no-sandbox'])
            try:
                for vp_name in viewports:
                    for theme in themes:
                        ctx = browser.new_context(locale='ru-RU', timezone_id='Europe/Vilnius', device_scale_factor=1, service_workers='block', **VIEWPORTS[vp_name])
                        try:
                            ctx.clock.install(time=datetime(2026, 11, 2, 12, 0, 0))
                        except Exception:
                            pass
                        ctx.add_init_script(f"localStorage.setItem('sb-{PROJECT}-auth-token', {json.dumps(json.dumps(session))}); localStorage.setItem('site_lang','ru'); localStorage.setItem('lang','ru'); localStorage.setItem('site_theme','{theme}')")
                        ctx.route('**/*', lambda route: supabase_response(route, session) if urlparse(route.request.url).hostname and urlparse(route.request.url).hostname.endswith('supabase.co')
                                  else route.continue_() if urlparse(route.request.url).hostname == '127.0.0.1' else route.abort())
                        try:
                            for page_name in pages:
                                page = ctx.new_page()
                                problems, notes = [], []
                                try:
                                    page.on('pageerror', lambda e, p=problems: p.append('ошибка страницы: ' + str(e)[:120]))
                                    page.on('console', lambda m, p=problems: m.type == 'error' and 'net::ERR' not in m.text and 'Failed to load resource' not in m.text and p.append('console.error: ' + m.text[:120]))
                                    page.on('response', lambda r, p=problems: r.url.startswith(base) and r.status >= 400 and p.append(f'{r.status} {r.url[len(base):][:80]}'))
                                    try:
                                        page.goto(f'{base}/{page_name}/', wait_until='networkidle', timeout=30000)
                                    except Exception as exc:
                                        problems.append('загрузка: ' + str(exc)[:100])
                                    page.wait_for_timeout(int(args.wait * 1000))
                                    path = urlparse(page.url).path
                                    expected = EXPECTED_PATH.get(page_name, f'/{page_name}/')
                                    if not path.startswith(expected):
                                        problems.append(f'ушла на {path} вместо {expected}')
                                    try:
                                        info = page.evaluate(CHECK_JS, [args.min_target, args.hard_target])
                                    except Exception as exc:
                                        info = {'overflow': 0, 'textLen': 0, 'small': 0, 'smallSample': [], 'tiny': 0, 'tinySample': []}
                                        problems.append('проверка DOM: ' + str(exc)[:120])
                                    if info['overflow'] > 1:
                                        problems.append(f"горизонтальная прокрутка +{info['overflow']}px")
                                    if info['textLen'] < 40:
                                        problems.append(f"почти пустая страница ({info['textLen']} симв.)")
                                    if vp_name == 'phone' and info['tiny']:
                                        problems.append(f"{info['tiny']} нажимаемых элементов меньше {args.hard_target}px: {', '.join(info['tinySample'])}")
                                    if vp_name == 'phone' and info['small']:
                                        notes.append(f"{info['small']} нажимаемых элементов меньше {args.min_target}px: {', '.join(info['smallSample'])}")
                                    shot = out_root / f'{vp_name}-{theme}' / f'{page_name}.png'
                                    shot.parent.mkdir(parents=True, exist_ok=True)
                                    try:
                                        page.screenshot(path=str(shot), full_page=True)
                                    except Exception as exc:
                                        problems.append('скриншот: ' + str(exc)[:120])
                                    if args.baseline:
                                        old = Path(args.baseline) / f'{vp_name}-{theme}' / f'{page_name}.png'
                                        if not old.exists():
                                            notes.append('нет снимка baseline')
                                        else:
                                            diff = diff_fraction(old, shot) if shot.exists() else None
                                            if diff is None:
                                                notes.append('не удалось сравнить baseline (Pillow или файл снимка недоступен)')
                                            elif diff > args.threshold:
                                                changed += 1
                                                notes.append(f'изменилась на {diff:.1%} пикселей')
                                    hard += len(problems)
                                    warn += len(notes)
                                    status = 'ОШИБКА' if problems else ('замечание' if notes else 'ок')
                                    rows.append(f"{status:9} {vp_name:7} {theme:6} /{page_name}/  {'; '.join(problems + notes)}")
                                finally:
                                    page.close()
                        finally:
                            ctx.close()
                return_code = 1 if hard else 0
            finally:
                browser.close()
    except Exception as exc:
        runner_error = f'{type(exc).__name__}: {exc}'
        hard += 1
        return_code = 1
        rows.append('ОШИБКА   runner   — ' + runner_error[:240])
    finally:
        srv.shutdown()
        srv.server_close()
    completed_runs = count_completed_runs(rows, runner_error)
    summary = {'runs': completed_runs, 'hard_issues': hard, 'warnings': warn, 'changed_vs_baseline': changed if args.baseline else None, 'runner_error': runner_error}
    print('\n'.join(rows))
    print(f'\nстраниц×режимов: {completed_runs} | жёстких проблем: {hard} | замечаний: {warn}' + (f' | изменились относительно baseline: {changed}' if args.baseline else '') + f' | скриншоты: {out_root}')
    print('Границы: локальные собранные папки; production: ' + ('проверен вручную' if args.mark_production_checked else 'НЕ проверен') + '; физическое устройство: ' + ('проверено вручную' if args.mark_real_device_checked else 'НЕ проверено (phone — эмуляция)'))
    if args.report:
        report_path = Path(args.report)
        report_path.parent.mkdir(parents=True, exist_ok=True)
        report = {
            'schema_version': 1,
            'scope': 'local-built-folders',
            'browser': 'Chromium',
            'pages': pages,
            'viewports': viewports,
            'themes': themes,
            'production_checked_manually': args.mark_production_checked,
            'real_device_checked_manually': args.mark_real_device_checked,
            'baseline': str(Path(args.baseline)) if args.baseline else None,
            'screenshots': str(out_root),
            'summary': summary,
            'runner_error': runner_error,
            'results': rows,
        }
        report_path.write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
        print(f'JSON-отчёт: {report_path}')
    return return_code


if __name__ == '__main__':
    sys.exit(main())
