#!/usr/bin/env python3
"""Regenerate /version.json (repo root) from config.js: single source of truth for
SITE_VERSION + CHANGELOG_EN/CHANGELOG_RU, used by all Vue pilots' sidebar version button
+ changelog modal (they fetch('/version.json') at runtime rather than duplicating the data).

Run this any time SITE_VERSION or CHANGELOG_EN/CHANGELOG_RU change in config.js:
    python3 scripts/gen_version_json.py
"""
import json
import re
import pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
config = (ROOT / "config.js").read_text(encoding="utf-8")


def js_str(raw: str) -> str:
    if raw[0] == raw[-1] == "'":
        return raw[1:-1].replace("\\'", "'").replace('\\\\', '\\')
    return json.loads(raw)


STR = r'(?:"(?:[^"\\]|\\.)*"|\'(?:[^\'\\]|\\.)*\')'


def parse_changelog(array_name: str):
    m = re.search(re.escape(array_name) + r'\s*=\s*\[(.*?)\n\]', config, re.S)
    if not m:
        raise SystemExit(f"{array_name} not found in config.js")
    body = m.group(1)
    entries = []
    for em in re.finditer(
        r'\{\s*version:\s*(' + STR + r'),\s*date:\s*(' + STR + r'),\s*changes:\s*\[(.*?)\]\s*\},?',
        body, re.S,
    ):
        version = js_str(em.group(1))
        date = js_str(em.group(2))
        changes = [js_str(c.group(0)) for c in re.finditer(STR, em.group(3))]
        entries.append({"version": version, "date": date, "changes": changes})
    return entries


def parse_site_version():
    m = re.search(r'const SITE_VERSION\s*=\s*(' + STR + r')', config)
    if not m:
        raise SystemExit("SITE_VERSION not found in config.js")
    return js_str(m.group(1))


data = {
    "version": parse_site_version(),
    "en": parse_changelog("CHANGELOG_EN"),
    "ru": parse_changelog("CHANGELOG_RU"),
}
assert data["en"] and data["ru"], "parsed changelog is empty — regex likely out of sync with config.js format"
assert data["en"][0]["version"] == data["version"], "topmost CHANGELOG_EN entry doesn't match SITE_VERSION"

out = ROOT / "version.json"
out.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(f"wrote {out} — version {data['version']}, {len(data['en'])} EN / {len(data['ru'])} RU entries")
