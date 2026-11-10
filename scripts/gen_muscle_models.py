#!/usr/bin/env python3
"""Генератор данных карты мышц из макета docs/mockups/muscle-map-concepts-v3.html (BACKLOG 70.1/70.4).

Читает три SVG-модели (anatomy / atlas / machine), разбирает их как XML и пишет TypeScript-данные
web-workouts/src/lib/muscleModels.generated.ts: для каждого направления и проекции — группы с общими атрибутами и элементы.
Геометрию вручную не переписываем: макет — единственный источник, файл генерируется заново командой `python3 scripts/gen_muscle_models.py`.
"""
import json, re, sys
import xml.etree.ElementTree as ET
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / 'docs/mockups/muscle-map-concepts-v3.html'
OUT = ROOT / 'web-workouts/src/lib/muscleModels.generated.ts'
STYLES = {'anatomy-model': 'anatomy', 'atlas-model': 'atlas', 'machine-model': 'tech'}


def parse_model(svg: str):
    root = ET.fromstring(svg)
    out = {}
    defs = []
    for ch in root:
        if ch.tag == 'defs':
            defs = [node(e) for e in ch]
    for g in root:
        cls = g.get('class') or ''
        if g.tag == 'g' and cls in ('front-model', 'back-model'):
            out['front' if cls == 'front-model' else 'back'] = [node(e) for e in g]
    return {'defs': defs, **out}


def node(e):
    d = {'tag': e.tag}
    attrs = dict(e.attrib)
    if attrs:
        d['attrs'] = attrs
    if e.tag == 'g':
        d['children'] = [node(c) for c in e]
    text = (e.text or '').strip()
    if text:
        d['text'] = text
    if e.tag in ('linearGradient', 'radialGradient'):
        d['children'] = [node(c) for c in e]
    return d


def build():
    html = SRC.read_text(encoding='utf-8')
    models = re.findall(r'<svg class="model ([a-z-]+)"[^>]*>.*?</svg>', html, re.S)
    blocks = re.findall(r'<svg class="model [^"]*"[^>]*>.*?</svg>', html, re.S)
    data = {}
    for cls, blk in zip(models, blocks):
        if cls not in STYLES:
            raise SystemExit('неизвестная модель: ' + cls)
        data[STYLES[cls]] = parse_model(blk)
    missing = set(STYLES.values()) - set(data)
    if missing:
        raise SystemExit('в макете нет моделей: ' + ', '.join(sorted(missing)))
    return data


def render(data) -> str:
    body = json.dumps(data, ensure_ascii=False, separators=(',', ':'))
    return (
        '// АВТОГЕНЕРАЦИЯ: python3 scripts/gen_muscle_models.py (источник — docs/mockups/muscle-map-concepts-v3.html). Не править вручную.\n'
        "export interface ModelNode { tag: string; attrs?: Record<string, string>; children?: ModelNode[]; text?: string }\n"
        'export interface ModelView { defs: ModelNode[]; front: ModelNode[]; back: ModelNode[] }\n'
        "export type ModelStyle = 'anatomy' | 'atlas' | 'tech'\n"
        'export const MUSCLE_MODELS: Record<ModelStyle, ModelView> = ' + body + '\n'
    )


if __name__ == '__main__':
    out = render(build())
    if '--check' in sys.argv:
        if not OUT.exists() or OUT.read_text(encoding='utf-8') != out:
            print('muscleModels.generated.ts устарел: запустите python3 scripts/gen_muscle_models.py')
            sys.exit(1)
        print('muscleModels.generated.ts актуален')
    else:
        OUT.write_text(out, encoding='utf-8')
        print('записано', OUT.relative_to(ROOT), len(out), 'байт')
