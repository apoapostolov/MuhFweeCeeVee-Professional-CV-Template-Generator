#!/usr/bin/env python3
"""JD scraper for relevant role discovery.

Crawls seed URLs, extracts candidate job-description pages, scores them against
role/keyword config, and exports relevant results.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
import time
from collections import deque
from dataclasses import asdict, dataclass
from datetime import datetime, timezone
from html.parser import HTMLParser
from pathlib import Path
from typing import Iterable
from urllib.parse import urljoin, urlparse
from urllib.request import Request, urlopen

USER_AGENT = "MyFreeCeeVee-JD-Scraper/0.1 (+local-dev)"


@dataclass
class CrawlNode:
  url: str
  depth: int


@dataclass
class RelevantJD:
  url: str
  title: str
  score: float
  matched_keywords: list[str]
  role_hits: list[str]
  domain: str
  snippet: str


class LinkParser(HTMLParser):
  def __init__(self) -> None:
    super().__init__()
    self.links: list[str] = []

  def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
    if tag.lower() != "a":
      return
    for key, value in attrs:
      if key.lower() == "href" and value:
        self.links.append(value.strip())


def load_seed_urls(path: Path) -> list[str]:
  if not path.exists():
    return []
  urls: list[str] = []
  for line in path.read_text(encoding="utf-8").splitlines():
    stripped = line.strip()
    if not stripped or stripped.startswith("#"):
      continue
    urls.append(stripped)
  return urls


def load_keyword_config(path: Path) -> dict:
  data = json.loads(path.read_text(encoding="utf-8"))
  data.setdefault("target_roles", [])
  data.setdefault("weighted_keywords", {})
  data.setdefault("job_signals", [])
  return data


def fetch_html(url: str, timeout: int) -> str:
  request = Request(url, headers={"User-Agent": USER_AGENT})
  with urlopen(request, timeout=timeout) as response:  # noqa: S310
    content_type = (response.headers.get("Content-Type") or "").lower()
    if "text/html" not in content_type and "application/xhtml+xml" not in content_type:
      return ""
    raw = response.read()
  return raw.decode("utf-8", errors="ignore")


def extract_title(html: str) -> str:
  match = re.search(r"<title[^>]*>(.*?)</title>", html, flags=re.IGNORECASE | re.DOTALL)
  if not match:
    return ""
  return re.sub(r"\s+", " ", match.group(1)).strip()


def strip_html_to_text(html: str) -> str:
  without_script = re.sub(
    r"<script[\\s\\S]*?</script>|<style[\\s\\S]*?</style>",
    " ",
    html,
    flags=re.IGNORECASE,
  )
  text = re.sub(r"<[^>]+>", " ", without_script)
  return re.sub(r"\s+", " ", text).strip()


def extract_links(base_url: str, html: str) -> list[str]:
  parser = LinkParser()
  parser.feed(html)
  links: list[str] = []
  for href in parser.links:
    absolute = urljoin(base_url, href)
    parsed = urlparse(absolute)
    if parsed.scheme not in ("http", "https"):
      continue
    clean = absolute.split("#", 1)[0]
    links.append(clean)
  return links


def is_likely_job_page(url: str, text: str, signals: Iterable[str]) -> bool:
  lowered = text.lower()
  parsed = urlparse(url)
  url_hint = any(token in parsed.path.lower() for token in ("job", "jobs", "career", "position", "vacancy"))
  signal_hint = any(signal.lower() in lowered for signal in signals)
  return url_hint or signal_hint


def score_relevance(title: str, text: str, config: dict) -> tuple[float, list[str], list[str]]:
  lowered_title = title.lower()
  lowered_text = text.lower()
  weighted_keywords = config.get("weighted_keywords", {})
  target_roles = [str(role).lower() for role in config.get("target_roles", [])]

  matched_keywords: list[str] = []
  score = 0.0

  for keyword, weight in weighted_keywords.items():
    key = str(keyword).lower().strip()
    if not key:
      continue
    in_title = key in lowered_title
    in_text = key in lowered_text
    if in_title or in_text:
      matched_keywords.append(keyword)
      if in_title:
        score += float(weight) * 1.6
      if in_text:
        score += float(weight)

  role_hits = [role for role in target_roles if role in lowered_title or role in lowered_text]
  score += len(role_hits) * 3.0

  return score, matched_keywords, role_hits


def run_scrape(
  seed_urls: list[str],
  config: dict,
  max_pages: int,
  max_depth: int,
  min_score: float,
  max_results: int,
  timeout: int,
  sleep_ms: int,
) -> list[RelevantJD]:
  queue: deque[CrawlNode] = deque(CrawlNode(url=url, depth=0) for url in seed_urls)
  visited: set[str] = set()
  relevant: list[RelevantJD] = []

  while queue and len(visited) < max_pages and len(relevant) < max_results:
    node = queue.popleft()
    if node.url in visited:
      continue
    visited.add(node.url)

    try:
      html = fetch_html(node.url, timeout=timeout)
    except Exception:
      continue
    if not html:
      continue

    title = extract_title(html)
    text = strip_html_to_text(html)
    score, matched_keywords, role_hits = score_relevance(title, text, config)

    if is_likely_job_page(node.url, text, config.get("job_signals", [])) and score >= min_score:
      relevant.append(
        RelevantJD(
          url=node.url,
          title=title,
          score=round(score, 2),
          matched_keywords=sorted(set(matched_keywords)),
          role_hits=sorted(set(role_hits)),
          domain=urlparse(node.url).netloc,
          snippet=text[:300],
        )
      )

    if node.depth < max_depth:
      for link in extract_links(node.url, html):
        if link not in visited:
          queue.append(CrawlNode(url=link, depth=node.depth + 1))

    if sleep_ms > 0:
      time.sleep(sleep_ms / 1000)

  relevant.sort(key=lambda item: item.score, reverse=True)
  return relevant


def parse_args() -> argparse.Namespace:
  parser = argparse.ArgumentParser(description="Scrape and rank relevant job descriptions.")
  parser.add_argument("--seed-file", default="sources/seed_urls.txt")
  parser.add_argument("--keyword-file", default="config/relevance_keywords.json")
  parser.add_argument("--output", default="")
  parser.add_argument("--max-pages", type=int, default=250)
  parser.add_argument("--max-depth", type=int, default=2)
  parser.add_argument("--min-score", type=float, default=10.0)
  parser.add_argument("--max-results", type=int, default=200)
  parser.add_argument("--timeout", type=int, default=15)
  parser.add_argument("--sleep-ms", type=int, default=120)
  return parser.parse_args()


def main() -> int:
  args = parse_args()
  root = Path(__file__).resolve().parent
  seed_file = (root / args.seed_file).resolve()
  keyword_file = (root / args.keyword_file).resolve()

  if not keyword_file.exists():
    print(f"Keyword config missing: {keyword_file}", file=sys.stderr)
    return 2

  seed_urls = load_seed_urls(seed_file)
  if not seed_urls:
    print(f"No seed URLs found in {seed_file}", file=sys.stderr)
    return 2

  config = load_keyword_config(keyword_file)
  relevant = run_scrape(
    seed_urls=seed_urls,
    config=config,
    max_pages=args.max_pages,
    max_depth=args.max_depth,
    min_score=args.min_score,
    max_results=args.max_results,
    timeout=args.timeout,
    sleep_ms=args.sleep_ms,
  )

  now = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
  output_path = (
    Path(args.output).resolve()
    if args.output
    else (root / "outputs" / f"jd_relevant_{now}.json").resolve()
  )
  output_path.parent.mkdir(parents=True, exist_ok=True)

  payload = {
    "generated_at": datetime.now(timezone.utc).isoformat(),
    "seed_urls": seed_urls,
    "target_roles": config.get("target_roles", []),
    "count": len(relevant),
    "items": [asdict(item) for item in relevant],
  }
  output_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")

  print(f"Saved {len(relevant)} relevant JD pages to {output_path}")
  if relevant:
    top = relevant[0]
    print(f"Top match: {top.title or '(no title)'} | score={top.score} | {top.url}")
  return 0


if __name__ == "__main__":
  raise SystemExit(main())
