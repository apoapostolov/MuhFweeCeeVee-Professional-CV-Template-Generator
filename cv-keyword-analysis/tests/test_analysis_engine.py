from __future__ import annotations

import json
import unittest
from pathlib import Path

from analysis_engine import analyze, normalize_phrase, validate_input_payload


class AnalysisEngineTests(unittest.TestCase):
  def setUp(self) -> None:
    fixture_path = Path(__file__).resolve().parent / "fixtures" / "analysis_input.json"
    self.payload = json.loads(fixture_path.read_text(encoding="utf-8"))

  def test_validate_input_payload_accepts_fixture(self) -> None:
    validate_input_payload(self.payload)

  def test_normalization_applies_lower_lemma_and_dedupe_ready(self) -> None:
    normalized = normalize_phrase("Producers running ANALYTICS pipelines")
    self.assertEqual(normalized, "producer run analytic pipeline")

  def test_analysis_generates_stable_core_fields(self) -> None:
    report = analyze(self.payload)

    self.assertIn("scores", report)
    self.assertIn("weighted_keywords", report)
    self.assertIn("actions", report)
    self.assertIn("integration_hooks", report)

    coverage = report["scores"]["coverage_score"]
    confidence = report["scores"]["confidence"]
    self.assertGreaterEqual(coverage, 0.0)
    self.assertLessEqual(coverage, 100.0)
    self.assertGreater(confidence, 0.0)
    self.assertLessEqual(confidence, 1.0)

    keywords = report["weighted_keywords"]
    self.assertGreaterEqual(len(keywords), 10)
    first = keywords[0]
    self.assertIn("keyword", first)
    self.assertIn("final_weight", first)
    self.assertIn("gap_severity", first)

  def test_evidence_multiplier_boosts_quantified_terms(self) -> None:
    report = analyze(self.payload)
    items = {item["keyword"]: item for item in report["weighted_keywords"]}

    self.assertIn("monetization", items)
    self.assertIn("sql", items)
    self.assertGreaterEqual(items["sql"]["evidence_multiplier"], 1.0)
    self.assertGreaterEqual(items["monetization"]["coverage"], 0.0)

  def test_editor_hook_shape(self) -> None:
    report = analyze(self.payload)
    hook = report["integration_hooks"]["editor_panel"]
    self.assertEqual(hook["version"], "editor-panel.v1")
    self.assertIn("top_keywords", hook)
    self.assertIn("gaps", hook)
    self.assertGreater(len(hook["top_keywords"]), 0)


if __name__ == "__main__":
  unittest.main()
