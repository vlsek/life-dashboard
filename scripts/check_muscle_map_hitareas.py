#!/usr/bin/env python3
"""Browser preflight for the isolated A muscle-map hit-area prototype.

Run from repository root:
  python3 scripts/check_muscle_map_hitareas.py
Requires Playwright Python package and Chromium.
"""
from __future__ import annotations

import json
import os
import shutil
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

HTML = Path("docs/mockups/muscle-map-a-hitarea-candidate-v3.html")
VIEWPORTS = (360, 390, 1280)
SAMPLES = (0.02, 0.10, 0.25, 0.50, 0.75, 0.90, 0.98)


def main() -> int:
    if not HTML.is_file():
        print(f"ERROR: missing {HTML}", file=sys.stderr)
        return 2

    executable = os.environ.get("PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH")
    if not executable:
        executable = shutil.which("chromium") or shutil.which("google-chrome")
    if not executable and Path("/opt/google/chrome/chrome").is_file():
        executable = "/opt/google/chrome/chrome"

    failures: list[str] = []
    report: list[dict] = []

    with sync_playwright() as playwright:
        launch_args = {"headless": True, "args": ["--no-sandbox"]}
        if executable:
            launch_args["executable_path"] = executable
        browser = playwright.chromium.launch(**launch_args)
        for width in VIEWPORTS:
            page = browser.new_page(viewport={"width": width, "height": 1400}, device_scale_factor=1)
            console_errors: list[str] = []
            page.on("console", lambda msg: console_errors.append(msg.text) if msg.type == "error" else None)
            page.on("pageerror", lambda error: console_errors.append(str(error)))
            page.goto(HTML.resolve().as_uri(), wait_until="load")

            meta = page.evaluate("""() => ({
              overflow: document.documentElement.scrollWidth > window.innerWidth,
              hitCount: document.querySelectorAll('path.hit-area[data-hit-for]').length,
              ids: [...document.querySelectorAll('path.hit-area[data-hit-for]')].map(p => p.dataset.hitFor),
              regions: [...document.querySelectorAll('g[data-region]')].map(g => g.dataset.region)
            })""")
            if meta["overflow"]:
                failures.append(f"{width}px: horizontal document overflow")
            if meta["hitCount"] != 8 or len(set(meta["ids"])) != 8:
                failures.append(f"{width}px: expected 8 unique hit paths, got {meta['hitCount']}")
            if len(meta["regions"]) != 40 or len(set(meta["regions"])) != 40:
                failures.append(f"{width}px: expected 40 unique regions, got {len(meta['regions'])}")
            unresolved = [hit_id for hit_id in meta["ids"] if hit_id not in meta["regions"]]
            if unresolved:
                failures.append(f"{width}px: hit paths reference missing regions: {unresolved}")

            width_report = {"viewport": width, "sample_points": 0, "hit_mismatches": [],
                            "clicks": 0, "min_target_css_px": [None, None]}

            for svg_index in range(page.locator("svg").count()):
                svg = page.locator("svg").nth(svg_index)
                svg.scroll_into_view_if_needed()
                audit = page.evaluate("""({svgIndex, samples}) => {
                  const svg = document.querySelectorAll('svg')[svgIndex];
                  const ctm = svg.getScreenCTM();
                  const result = [];
                  for (const path of svg.querySelectorAll('path.hit-area[data-hit-for]')) {
                    const group = path.closest('g[data-region]');
                    const box = path.getBBox();
                    const cssWidth = box.width * Math.abs(ctm.a);
                    const cssHeight = box.height * Math.abs(ctm.d);
                    const points = [];
                    for (const fx of samples) for (const fy of samples) {
                      const p = svg.createSVGPoint();
                      p.x = box.x + box.width * fx;
                      p.y = box.y + box.height * fy;
                      const q = p.matrixTransform(ctm);
                      const target = document.elementFromPoint(q.x, q.y);
                      points.push({
                        x: fx, y: fy,
                        actual: target?.closest('g[data-region]')?.dataset.region ?? null
                      });
                    }
                    result.push({
                      expected: path.dataset.hitFor,
                      parentRegion: group?.dataset.region ?? null,
                      role: group?.getAttribute('role'),
                      tabindex: group?.getAttribute('tabindex'),
                      ariaLabel: group?.getAttribute('aria-label'),
                      pointerEvents: getComputedStyle(path).pointerEvents,
                      cssWidth, cssHeight, points
                    });
                  }
                  return result;
                }""", {"svgIndex": svg_index, "samples": list(SAMPLES)})

                for item in audit:
                    if item["expected"] != item["parentRegion"]:
                        failures.append(f"{width}px: hit path parent mismatch: {item['expected']} -> {item['parentRegion']}")
                    if item["role"] != "button" or item["tabindex"] != "0" or not item["ariaLabel"]:
                        failures.append(f"{width}px: missing keyboard/ARIA attributes on {item['expected']}")
                    if item["pointerEvents"] != "all":
                        failures.append(f"{width}px: pointer-events is not all on {item['expected']}")
                    minimum_target = 44 if width <= 480 else 24
                    if item["cssWidth"] < minimum_target or item["cssHeight"] < minimum_target:
                        failures.append(f"{width}px: target smaller than {minimum_target} CSS px: {item['expected']} "
                                        f"{item['cssWidth']:.1f}x{item['cssHeight']:.1f}")
                    old_min = width_report["min_target_css_px"]
                    width_report["min_target_css_px"] = [
                        round(min(old_min[0] or item["cssWidth"], item["cssWidth"]), 1),
                        round(min(old_min[1] or item["cssHeight"], item["cssHeight"]), 1)
                    ]
                    for point in item["points"]:
                        width_report["sample_points"] += 1
                        if point["actual"] != item["expected"]:
                            mismatch = {"expected": item["expected"], **point}
                            width_report["hit_mismatches"].append(mismatch)
                            failures.append(f"{width}px: elementFromPoint mismatch: {mismatch}")

                    # Real pointer click must bubble to the group and select the forearm group.
                    box = svg.evaluate("""(el, id) => {
                      const path = [...el.querySelectorAll('path.hit-area[data-hit-for]')]
                        .find(p => p.dataset.hitFor === id);
                      const b = path.getBBox(), m = el.getScreenCTM(), p = el.createSVGPoint();
                      p.x = b.x + b.width / 2; p.y = b.y + b.height / 2;
                      const q = p.matrixTransform(m);
                      return {x: q.x, y: q.y};
                    }""", item["expected"])
                    page.mouse.click(box["x"], box["y"])
                    selected = page.locator(f'g[data-region="{item["expected"]}"]').get_attribute("aria-pressed")
                    if selected != "true":
                        failures.append(f"{width}px: center click did not select {item['expected']}")
                    else:
                        width_report["clicks"] += 1

            # Exercise keyboard activation on a real focusable map region.
            first_group = page.locator('g[data-region="male-back-forearm-extensor-left"]')
            first_group.focus()
            page.keyboard.press("Enter")
            if first_group.get_attribute("aria-pressed") != "true":
                failures.append(f"{width}px: Enter did not select focused group")
            first_group.focus()
            page.keyboard.press("Space")
            if first_group.get_attribute("aria-pressed") != "true":
                failures.append(f"{width}px: Space did not select focused group")

            page.emulate_media(reduced_motion="reduce")
            transition = page.locator(".muscle").first.evaluate("(el) => getComputedStyle(el).transitionDuration")
            if transition not in ("0s", "0s, 0s"):
                failures.append(f"{width}px: reduced-motion transition remains {transition}")

            if console_errors:
                failures.append(f"{width}px: console errors: {console_errors}")
            width_report["console_errors"] = console_errors
            report.append(width_report)
            page.close()
        browser.close()

    print(json.dumps({"report": report, "failures": failures}, ensure_ascii=False, indent=2))
    return 1 if failures else 0


if __name__ == "__main__":
    raise SystemExit(main())
