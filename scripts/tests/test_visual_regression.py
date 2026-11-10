"""Unit tests for the visual regression runner's command-line contract."""
import sys
import unittest
from pathlib import Path

SCRIPTS = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(SCRIPTS))
import visual_regression as vr  # noqa: E402


class ParseCsvTests(unittest.TestCase):
    def test_trims_values_and_preserves_order(self):
        self.assertEqual(vr.parse_csv(" phone, desktop ", "--viewports", vr.VIEWPORTS), ["phone", "desktop"])

    def test_rejects_empty_items(self):
        for raw in ("", "phone,", ",phone", "phone,,desktop"):
            with self.subTest(raw=raw), self.assertRaises(ValueError):
                vr.parse_csv(raw, "--viewports", vr.VIEWPORTS)

    def test_rejects_duplicates(self):
        with self.assertRaisesRegex(ValueError, "повторяющиеся"):
            vr.parse_csv("phone,phone", "--viewports", vr.VIEWPORTS)

    def test_rejects_unknown_allowed_value(self):
        with self.assertRaisesRegex(ValueError, "неизвестные"):
            vr.parse_csv("tablet", "--viewports", vr.VIEWPORTS)


class ArgumentValidationTests(unittest.TestCase):
    def test_defaults_cover_all_pages_and_expected_viewports(self):
        args, pages, viewports, themes = vr.parse_args([])
        self.assertEqual(pages, vr.PAGES)
        self.assertEqual(viewports, ["phone", "desktop"])
        self.assertEqual(themes, ["dark"])
        self.assertEqual(args.threshold, 0.005)

    def test_accepts_multiple_pages_viewports_and_themes(self):
        _, pages, viewports, themes = vr.parse_args([
            "shop", "goals", "--viewports", "phone,desktop", "--themes", "dark,light"
        ])
        self.assertEqual(pages, ["shop", "goals"])
        self.assertEqual(viewports, ["phone", "desktop"])
        self.assertEqual(themes, ["dark", "light"])

    def test_rejects_unknown_page(self):
        with self.assertRaises(SystemExit):
            vr.parse_args(["not-a-page"])

    def test_rejects_unknown_viewport(self):
        with self.assertRaises(SystemExit):
            vr.parse_args(["--viewports", "tablet"])

    def test_rejects_theme_that_could_break_init_script(self):
        with self.assertRaises(SystemExit):
            vr.parse_args(["--themes", "dark');alert(1)//"])

    def test_rejects_threshold_outside_zero_to_one(self):
        for value in ("-0.1", "1.1"):
            with self.subTest(value=value), self.assertRaises(SystemExit):
                vr.parse_args(["--threshold", value])

    def test_rejects_negative_or_non_finite_wait(self):
        for value in ("-0.1", "nan", "inf"):
            with self.subTest(value=value), self.assertRaises(SystemExit):
                vr.parse_args(["--wait", value])

    def test_rejects_non_finite_threshold(self):
        for value in ("nan", "inf"):
            with self.subTest(value=value), self.assertRaises(SystemExit):
                vr.parse_args(["--threshold", value])

    def test_rejects_inconsistent_tap_target_limits(self):
        with self.assertRaises(SystemExit):
            vr.parse_args(["--hard-target", "40", "--min-target", "32"])


if __name__ == "__main__":
    unittest.main()
