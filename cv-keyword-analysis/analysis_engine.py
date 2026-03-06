#!/usr/bin/env python3
"""Deterministic CV keyword analysis engine for JD corpora."""

from __future__ import annotations

import argparse
import json
import math
import re
import sys
from collections import Counter
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

DEFAULT_SECTION_WEIGHTS: dict[str, float] = {
  "experience": 2.4,
  "skills": 1.7,
  "summary": 1.5,
  "projects": 1.3,
  "education": 1.1,
  "certifications": 1.0,
  "other": 1.0,
}

STOPWORDS = {
  "a",
  "an",
  "and",
  "as",
  "at",
  "be",
  "by",
  "for",
  "from",
  "in",
  "is",
  "it",
  "of",
  "on",
  "or",
  "that",
  "the",
  "to",
  "with",
}

NUMBER_HINT_RE = re.compile(r"(\d+[%kmbx]?|\$[\d,.]+|percent|increase|reduction|improved|grew|growth)", re.IGNORECASE)
TOKEN_RE = re.compile(r"[a-z0-9][a-z0-9+#\-]*")
SPACE_RE = re.compile(r"\s+")
NON_ALNUM_SPACE_RE = re.compile(r"[^a-z0-9+\-.\s]")


@dataclass(frozen=True)
class KeywordScore:
  keyword: str
  normalized_keyword: str
  jd_doc_freq: int
  jd_term_freq: int
  tfidf_weight: float
  role_prior: float
  final_weight: float
  cv_hits_total: int
  cv_section_hits: dict[str, int]
  cv_weighted_hits: float
  evidence_hits: int
  evidence_multiplier: float
  coverage: float
  confidence: float
  gap_severity: str


def utc_now_iso() -> str:
  return datetime.now(timezone.utc).isoformat()


def normalize_space(value: str) -> str:
  return SPACE_RE.sub(" ", value).strip()


def normalize_text(value: str) -> str:
  lowered = value.lower()
  cleaned = NON_ALNUM_SPACE_RE.sub(" ", lowered)
  return normalize_space(cleaned)


def lemmatize_word(token: str) -> str:
  if len(token) <= 3:
    return token
  if token.endswith("ies") and len(token) > 4:
    return token[:-3] + "y"
  if token.endswith("ing") and len(token) > 5:
    stem = token[:-3]
    if len(stem) >= 3 and stem[-1] == stem[-2]:
      stem = stem[:-1]
    return stem
  if token.endswith("ed") and len(token) > 4:
    stem = token[:-2]
    if len(stem) >= 3 and stem[-1] == stem[-2]:
      stem = stem[:-1]
    return stem
  if token.endswith("es") and len(token) > 4:
    if token.endswith(("ses", "xes", "zes", "ches", "shes")):
      return token[:-2]
    return token[:-1]
  if token.endswith("s") and len(token) > 4:
    return token[:-1]
  return token


def normalize_phrase(value: str) -> str:
  tokens = [lemmatize_word(match.group(0)) for match in TOKEN_RE.finditer(normalize_text(value))]
  return " ".join(tokens)


def dedupe_preserve_order(values: list[str]) -> list[str]:
  seen: set[str] = set()
  out: list[str] = []
  for value in values:
    if value in seen:
      continue
    seen.add(value)
    out.append(value)
  return out


def tokenize(text: str) -> list[str]:
  tokens = [lemmatize_word(match.group(0)) for match in TOKEN_RE.finditer(normalize_text(text))]
  return [token for token in tokens if token and token not in STOPWORDS]


def extract_terms(text: str, max_ngram: int = 3) -> list[str]:
  tokens = tokenize(text)
  terms: list[str] = []
  terms.extend(tokens)
  for n in range(2, max_ngram + 1):
    if len(tokens) < n:
      continue
    for idx in range(0, len(tokens) - n + 1):
      gram_tokens = tokens[idx : idx + n]
      if any(token in STOPWORDS for token in gram_tokens):
        continue
      terms.append(" ".join(gram_tokens))
  return terms


def parse_input(path: Path) -> dict[str, Any]:
  data = json.loads(path.read_text(encoding="utf-8"))
  if not isinstance(data, dict):
    raise ValueError("Input payload must be a JSON object.")
  return data


def validate_input_payload(payload: dict[str, Any]) -> None:
  if "cv" not in payload or "jd_corpus" not in payload:
    raise ValueError("Input schema requires `cv` and `jd_corpus`.")
  cv = payload.get("cv")
  if not isinstance(cv, dict):
    raise ValueError("`cv` must be an object.")
  sections = cv.get("sections")
  if not isinstance(sections, dict) or not sections:
    raise ValueError("`cv.sections` must be a non-empty object.")
  for key, value in sections.items():
    if not isinstance(key, str) or not key.strip():
      raise ValueError("`cv.sections` keys must be non-empty strings.")
    if not isinstance(value, str):
      raise ValueError("`cv.sections` values must be strings.")
  corpus = payload.get("jd_corpus")
  if not isinstance(corpus, list) or not corpus:
    raise ValueError("`jd_corpus` must be a non-empty array.")
  for item in corpus:
    if not isinstance(item, dict):
      raise ValueError("Each `jd_corpus` item must be an object.")
    text = item.get("text")
    if not isinstance(text, str) or not text.strip():
      raise ValueError("Each `jd_corpus` item must include non-empty `text`.")
    if "score" in item and not isinstance(item.get("score"), (int, float)):
      raise ValueError("`jd_corpus[].score` must be numeric when provided.")


def phrase_hits(text: str, phrase: str) -> int:
  if not phrase:
    return 0
  pattern = re.compile(rf"\b{re.escape(phrase)}\b", re.IGNORECASE)
  return len(pattern.findall(text))


def infer_section_weight(section_name: str, custom_weights: dict[str, float]) -> float:
  lowered = section_name.lower()
  if lowered in custom_weights:
    return max(0.1, float(custom_weights[lowered]))
  for key, weight in custom_weights.items():
    if key in lowered:
      return max(0.1, float(weight))
  return max(0.1, float(custom_weights.get("other", DEFAULT_SECTION_WEIGHTS["other"])))


def split_sentences(text: str) -> list[str]:
  return [part.strip() for part in re.split(r"[.!?\n]+", text) if part.strip()]


def evidence_hits_for_phrase(section_text: str, phrase: str) -> int:
  if not section_text or not phrase:
    return 0
  total = 0
  for sentence in split_sentences(section_text):
    if phrase not in normalize_phrase(sentence):
      continue
    if NUMBER_HINT_RE.search(sentence):
      total += 1
  return total


def calc_gap_severity(coverage: float, normalized_weight: float) -> str:
  if coverage < 0.05 and normalized_weight >= 0.7:
    return "critical"
  if coverage < 0.25:
    return "high"
  if coverage < 0.55:
    return "medium"
  if coverage < 0.8:
    return "low"
  return "none"


def calc_confidence(
  doc_count: int,
  keyword_count: int,
  avg_doc_length: float,
) -> float:
  corpus_score = min(1.0, doc_count / 25.0)
  diversity_score = min(1.0, keyword_count / 120.0)
  length_score = min(1.0, avg_doc_length / 700.0)
  return round((corpus_score * 0.45) + (diversity_score * 0.35) + (length_score * 0.20), 4)


def build_action(keyword: KeywordScore) -> str:
  if keyword.gap_severity == "critical":
    return (
      f"Add `{keyword.keyword}` in an experience bullet with a quantified outcome "
      "to close a high-impact gap."
    )
  if keyword.gap_severity == "high":
    return (
      f"Introduce `{keyword.keyword}` in summary and one experience bullet. "
      "Reference concrete scope, ownership, or outcome."
    )
  if keyword.gap_severity == "medium":
    return f"Strengthen `{keyword.keyword}` usage in skills or projects with role-relevant phrasing."
  return f"Maintain `{keyword.keyword}` coverage and keep evidence statements specific."


def analyze(payload: dict[str, Any]) -> dict[str, Any]:
  validate_input_payload(payload)

  config = payload.get("config", {}) if isinstance(payload.get("config"), dict) else {}
  section_weights = {**DEFAULT_SECTION_WEIGHTS}
  for key, value in (config.get("section_weights", {}) or {}).items():
    if isinstance(key, str) and isinstance(value, (int, float)):
      section_weights[key.lower()] = float(value)

  weighted_keywords_raw = config.get("weighted_keywords", {})
  weighted_keywords: dict[str, float] = {}
  if isinstance(weighted_keywords_raw, dict):
    for key, value in weighted_keywords_raw.items():
      if not isinstance(key, str) or not key.strip():
        continue
      if not isinstance(value, (int, float)):
        continue
      normalized = normalize_phrase(key)
      if not normalized:
        continue
      weighted_keywords[normalized] = max(0.0, float(value))

  jd_corpus = payload["jd_corpus"]
  cv_sections: dict[str, str] = payload["cv"]["sections"]

  doc_terms: list[Counter[str]] = []
  doc_unique_terms: list[set[str]] = []
  all_terms_counter: Counter[str] = Counter()
  all_doc_lengths: list[int] = []
  signal_boost: dict[str, float] = {}

  for item in jd_corpus:
    text = str(item.get("text") or "")
    terms = extract_terms(text, max_ngram=3)
    if not terms:
      continue
    term_counts = Counter(terms)
    doc_terms.append(term_counts)
    doc_unique_terms.append(set(term_counts.keys()))
    all_terms_counter.update(term_counts)
    all_doc_lengths.append(len(terms))

    score = float(item.get("score") or 0.0)
    if score > 0:
      bump = min(0.65, score / 100.0)
      for term in term_counts.keys():
        signal_boost[term] = max(signal_boost.get(term, 0.0), bump)

  if not doc_terms:
    raise ValueError("No analyzable JD text terms were extracted from input corpus.")

  doc_count = len(doc_terms)
  avg_doc_len = sum(all_doc_lengths) / max(1, len(all_doc_lengths))
  doc_freq: Counter[str] = Counter()
  for unique in doc_unique_terms:
    doc_freq.update(unique)

  candidate_terms = set()
  for term, freq in all_terms_counter.items():
    if len(term) < 3:
      continue
    ngram_words = term.count(" ") + 1
    if ngram_words == 1 and freq >= 1:
      candidate_terms.add(term)
      continue
    if ngram_words >= 2 and freq >= 2:
      candidate_terms.add(term)
  candidate_terms.update(weighted_keywords.keys())

  keyword_scores: list[KeywordScore] = []
  for term in sorted(candidate_terms):
    df = int(doc_freq.get(term, 0))
    if df <= 0:
      continue
    idf = math.log((1 + doc_count) / (1 + df)) + 1.0

    tfidf_sum = 0.0
    tf_sum = 0
    for term_counts in doc_terms:
      total_terms = sum(term_counts.values())
      if total_terms <= 0:
        continue
      count = term_counts.get(term, 0)
      tf_sum += count
      if count > 0:
        tfidf_sum += (count / total_terms) * idf

    mean_tfidf = tfidf_sum / doc_count
    role_prior = weighted_keywords.get(term, 0.0)
    score_boost = signal_boost.get(term, 0.0)
    final_weight = mean_tfidf * (1.0 + (role_prior / 10.0) + score_boost)

    section_hits: dict[str, int] = {}
    weighted_hits = 0.0
    raw_hits_total = 0
    evidence_hits = 0
    for section_name, section_text in cv_sections.items():
      normalized_section = normalize_phrase(section_text)
      hits = phrase_hits(normalized_section, term)
      section_hits[section_name] = hits
      raw_hits_total += hits
      section_weight = infer_section_weight(section_name, section_weights)
      weighted_hits += hits * section_weight
      if hits > 0:
        evidence_hits += evidence_hits_for_phrase(section_text, term)

    evidence_multiplier = 1.0 + min(0.45, evidence_hits * 0.08)
    weighted_hits *= evidence_multiplier

    coverage = min(1.0, weighted_hits / max(1.0, float(df) * 2.0))
    keyword_scores.append(
      KeywordScore(
        keyword=term,
        normalized_keyword=term,
        jd_doc_freq=df,
        jd_term_freq=tf_sum,
        tfidf_weight=round(mean_tfidf, 6),
        role_prior=round(role_prior, 6),
        final_weight=round(final_weight, 6),
        cv_hits_total=raw_hits_total,
        cv_section_hits=section_hits,
        cv_weighted_hits=round(weighted_hits, 6),
        evidence_hits=evidence_hits,
        evidence_multiplier=round(evidence_multiplier, 6),
        coverage=round(coverage, 6),
        confidence=0.0,
        gap_severity="none",
      )
    )

  if not keyword_scores:
    raise ValueError("No keyword candidates could be scored from the JD corpus.")

  keyword_scores.sort(key=lambda item: item.final_weight, reverse=True)
  max_weight = max(item.final_weight for item in keyword_scores) or 1.0
  confidence = calc_confidence(doc_count, len(keyword_scores), avg_doc_len)

  scored_keywords: list[KeywordScore] = []
  for keyword in keyword_scores:
    normalized_weight = keyword.final_weight / max_weight if max_weight > 0 else 0.0
    severity = calc_gap_severity(keyword.coverage, normalized_weight)
    scored_keywords.append(
      KeywordScore(
        keyword=keyword.keyword,
        normalized_keyword=keyword.normalized_keyword,
        jd_doc_freq=keyword.jd_doc_freq,
        jd_term_freq=keyword.jd_term_freq,
        tfidf_weight=keyword.tfidf_weight,
        role_prior=keyword.role_prior,
        final_weight=keyword.final_weight,
        cv_hits_total=keyword.cv_hits_total,
        cv_section_hits=keyword.cv_section_hits,
        cv_weighted_hits=keyword.cv_weighted_hits,
        evidence_hits=keyword.evidence_hits,
        evidence_multiplier=keyword.evidence_multiplier,
        coverage=keyword.coverage,
        confidence=confidence,
        gap_severity=severity,
      )
    )

  weighted_den = sum(item.final_weight for item in scored_keywords) or 1.0
  weighted_num = sum(item.final_weight * item.coverage for item in scored_keywords)
  coverage_score = round((weighted_num / weighted_den) * 100.0, 2)

  scored_keywords.sort(key=lambda item: item.final_weight, reverse=True)
  top_n = int(config.get("top_n_keywords", 60) or 60)
  top_keywords = scored_keywords[: max(1, top_n)]

  critical_gaps = [item for item in top_keywords if item.gap_severity in {"critical", "high"} and item.cv_hits_total == 0]
  medium_gaps = [item for item in top_keywords if item.gap_severity == "medium" and item.cv_hits_total == 0]
  gap_pool = critical_gaps + medium_gaps
  actions = [build_action(item) for item in gap_pool[:12]]

  editor_hook = {
    "version": "editor-panel.v1",
    "coverage_score": coverage_score,
    "confidence": confidence,
    "top_keywords": [
      {
        "keyword": item.keyword,
        "weight": round(item.final_weight, 6),
        "coverage": item.coverage,
        "gap_severity": item.gap_severity,
      }
      for item in top_keywords[:25]
    ],
    "gaps": [
      {
        "keyword": item.keyword,
        "severity": item.gap_severity,
        "suggested_action": build_action(item),
      }
      for item in gap_pool[:15]
    ],
  }

  return {
    "generated_at": utc_now_iso(),
    "input_summary": {
      "jd_documents": doc_count,
      "avg_jd_term_count": round(avg_doc_len, 2),
      "cv_sections": list(cv_sections.keys()),
      "config_weighted_keywords": len(weighted_keywords),
    },
    "scores": {
      "coverage_score": coverage_score,
      "confidence": confidence,
    },
    "weighted_keywords": [
      {
        "keyword": item.keyword,
        "normalized_keyword": item.normalized_keyword,
        "jd_doc_freq": item.jd_doc_freq,
        "jd_term_freq": item.jd_term_freq,
        "tfidf_weight": item.tfidf_weight,
        "role_prior": item.role_prior,
        "final_weight": item.final_weight,
        "cv_hits_total": item.cv_hits_total,
        "cv_section_hits": item.cv_section_hits,
        "cv_weighted_hits": item.cv_weighted_hits,
        "evidence_hits": item.evidence_hits,
        "evidence_multiplier": item.evidence_multiplier,
        "coverage": item.coverage,
        "confidence": item.confidence,
        "gap_severity": item.gap_severity,
      }
      for item in top_keywords
    ],
    "actions": actions,
    "integration_hooks": {
      "editor_panel": editor_hook,
    },
    "schemas": {
      "input": "schemas/analysis_input.schema.json",
      "output": "schemas/analysis_output.schema.json",
    },
  }


def to_markdown(report: dict[str, Any]) -> str:
  scores = report.get("scores", {})
  coverage = scores.get("coverage_score", 0)
  confidence = scores.get("confidence", 0)
  weighted_keywords = report.get("weighted_keywords", [])
  actions = report.get("actions", [])

  lines = [
    "# CV Keyword Analysis Summary",
    "",
    f"- Coverage score: **{coverage}%**",
    f"- Confidence: **{round(float(confidence) * 100, 1)}%**",
    f"- Ranked keywords: **{len(weighted_keywords)}**",
    "",
    "## Top Weighted Keywords",
    "",
    "| Keyword | Weight | Coverage | Severity |",
    "|---|---:|---:|---|",
  ]
  for item in weighted_keywords[:20]:
    lines.append(
      f"| {item['keyword']} | {item['final_weight']:.4f} | {item['coverage']:.2f} | {item['gap_severity']} |"
    )

  lines.extend(["", "## Recommended Actions", ""])
  if actions:
    for action in actions:
      lines.append(f"- {action}")
  else:
    lines.append("- No high-severity keyword gaps detected.")
  return "\n".join(lines) + "\n"


def parse_args() -> argparse.Namespace:
  parser = argparse.ArgumentParser(description="Run CV keyword analysis against JD corpus.")
  parser.add_argument("--input", required=True, help="Path to analysis input JSON payload.")
  parser.add_argument("--output", default="", help="Path for JSON analysis output.")
  parser.add_argument("--markdown-output", default="", help="Optional markdown report path.")
  parser.add_argument("--editor-hook-output", default="", help="Optional editor hook JSON path.")
  return parser.parse_args()


def main() -> int:
  args = parse_args()
  root = Path(__file__).resolve().parent
  input_path = Path(args.input).resolve()
  if not input_path.exists():
    print(f"Input file missing: {input_path}", file=sys.stderr)
    return 2

  payload = parse_input(input_path)
  report = analyze(payload)

  now = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
  output_path = (
    Path(args.output).resolve()
    if args.output
    else (root / "outputs" / f"analysis_report_{now}.json").resolve()
  )
  output_path.parent.mkdir(parents=True, exist_ok=True)
  output_path.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")

  if args.markdown_output:
    markdown_path = Path(args.markdown_output).resolve()
    markdown_path.parent.mkdir(parents=True, exist_ok=True)
    markdown_path.write_text(to_markdown(report), encoding="utf-8")

  if args.editor_hook_output:
    hook_path = Path(args.editor_hook_output).resolve()
    hook_path.parent.mkdir(parents=True, exist_ok=True)
    hook_payload = report.get("integration_hooks", {}).get("editor_panel", {})
    hook_path.write_text(json.dumps(hook_payload, ensure_ascii=False, indent=2), encoding="utf-8")

  print(f"Saved analysis report to {output_path}")
  print(
    "Analysis summary: "
    f"coverage={report['scores']['coverage_score']} "
    f"confidence={report['scores']['confidence']} "
    f"keywords={len(report['weighted_keywords'])}"
  )
  return 0


if __name__ == "__main__":
  raise SystemExit(main())
