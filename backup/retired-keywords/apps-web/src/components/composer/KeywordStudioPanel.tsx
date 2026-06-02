"use client";

import type { JSX } from "react";

import type { KeywordMatcher } from "./buildKeywordMatcher";
import { asRecord, prettyKey } from "./form-path-utils";
import type {
  KeywordManageStatsResponse,
  KeywordBand,
  KeywordSource,
  KeywordStudioResponse,
  KeywordTagMetric,
  PathSegment,
} from "./types";

export type KeywordStudioPanelProps = {
  resolvedTheme: "light" | "dark";
  keywordStudioLoading: boolean;
  keywordStudioError: string;
  keywordStudioData: KeywordStudioResponse | null;
  keywordMatcher: KeywordMatcher;
  keywordDatasets: Array<{ id: string; label: string; itemCount: number }> | null | undefined;
  keywordDatasetLoading: boolean;
  selectedKeywordDataset: string;
  onSelectKeywordDataset: (id: string) => void;
  selectedKeywordRole: string;
  onSelectKeywordRole: (role: string) => void;
  keywordRunStatus: KeywordManageStatsResponse["run"] | null;
  keywordManageStats: KeywordManageStatsResponse["stats"] | null;
  keywordManageBusy: boolean;
  keywordManageNotice: string;
  onRunKeywordManageAction: () => void;
  showSeniorityPriorityTags: boolean;
  onToggleSeniorityPriorityTags: () => void;
  showHardPriorityTags: boolean;
  onToggleHardPriorityTags: () => void;
  showSoftPriorityTags: boolean;
  onToggleSoftPriorityTags: () => void;
  onKeywordHover: (hover: {
    label: string;
    metric: KeywordTagMetric;
    left: number;
    top: number;
  } | null) => void;
};

export function KeywordStudioPanel(props: KeywordStudioPanelProps): JSX.Element {
  const {
    resolvedTheme,
    keywordStudioLoading,
    keywordStudioError,
    keywordStudioData,
    keywordMatcher,
    keywordDatasets,
    keywordDatasetLoading,
    selectedKeywordDataset,
    onSelectKeywordDataset,
    selectedKeywordRole,
    onSelectKeywordRole,
    keywordRunStatus,
    keywordManageStats,
    keywordManageBusy,
    keywordManageNotice,
    onRunKeywordManageAction,
    showSeniorityPriorityTags,
    onToggleSeniorityPriorityTags,
    showHardPriorityTags,
    onToggleHardPriorityTags,
    showSoftPriorityTags,
    onToggleSoftPriorityTags,
    onKeywordHover,
  } = props;

  function keywordBandClass(
    band: KeywordBand,
    source?: "jd" | "senior_leadership" | "game_generic" | "combined",
    category?: string,
  ): string {
    const seniorityCategories = new Set([
      "leadership_management",
      "achievement_growth",
      "innovation",
      "optimization",
      "analysis",
      "collaboration",
    ]);
    const gameGenericCategories = new Set([
      "design_specializations",
      "engines_scripting",
      "design_frameworks",
      "prototyping_documentation",
      "data_design",
      "kpis",
      "live_ops",
      "soft_skills",
    ]);
    if (source === "senior_leadership" || (source === "combined" && seniorityCategories.has(String(category ?? "")))) {
      return "border-indigo-300 bg-indigo-50 text-indigo-900";
    }
    if (source === "game_generic" || (source === "combined" && gameGenericCategories.has(String(category ?? "")))) {
      return "border-cyan-300 bg-cyan-50 text-cyan-900";
    }
    if (band === "red") return "border-red-300 bg-red-50 text-red-900";
    if (band === "orange") return "border-orange-300 bg-orange-50 text-orange-900";
    if (band === "yellow") return "border-yellow-300 bg-yellow-50 text-yellow-900";
    if (band === "green") return "border-emerald-300 bg-emerald-50 text-emerald-900";
    return "border-slate-300 bg-slate-100 text-slate-700";
  }

  function keywordSourceLabel(source?: "jd" | "senior_leadership" | "game_generic" | "combined"): string {
    if (source === "senior_leadership") return "Seniority";
    if (source === "game_generic") return "Game Generic";
    if (source === "combined") return "Combined";
    return "JD";
  }

  function keywordSourceBadgeClass(
    source: KeywordSource | undefined,
    theme: "light" | "dark",
  ): string {
    if (theme === "dark") {
      if (source === "senior_leadership") return "border-indigo-500 bg-indigo-900/55 text-indigo-100";
      if (source === "game_generic") return "border-cyan-500 bg-cyan-900/55 text-cyan-100";
      if (source === "combined") return "border-violet-500 bg-violet-900/55 text-violet-100";
      return "border-slate-600 bg-slate-800 text-slate-200";
    }
    if (source === "senior_leadership") return "border-indigo-300 bg-indigo-100 text-indigo-900";
    if (source === "game_generic") return "border-cyan-300 bg-cyan-100 text-cyan-900";
    if (source === "combined") return "border-violet-300 bg-violet-100 text-violet-900";
    return "border-slate-300 bg-slate-100 text-slate-700";
  }

  function keywordStatusBadgeClass(
    status: "missing" | "underused" | "used" | undefined,
    theme: "light" | "dark",
  ): string {
    if (theme === "dark") {
      if (status === "missing") return "border-rose-500 bg-rose-900/55 text-rose-100";
      if (status === "underused") return "border-amber-500 bg-amber-900/50 text-amber-100";
      if (status === "used") return "border-emerald-500 bg-emerald-900/55 text-emerald-100";
      return "border-slate-600 bg-slate-800 text-slate-200";
    }
    if (status === "missing") return "border-red-300 bg-red-100 text-red-900";
    if (status === "underused") return "border-amber-300 bg-amber-100 text-amber-900";
    if (status === "used") return "border-emerald-300 bg-emerald-100 text-emerald-900";
    return "border-slate-300 bg-slate-100 text-slate-700";
  }

  function renderKeywordTagChip(
    key: string,
    label: string,
    metric: KeywordTagMetric,
  ): JSX.Element {
    const handleMouseEnter = (event: React.MouseEvent<HTMLSpanElement>) => {
      const rect = event.currentTarget.getBoundingClientRect();
      const tooltipWidth = 320;
      const tooltipHeight = 210;
      const margin = 10;
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      let left = rect.left + (rect.width / 2) - (tooltipWidth / 2);
      left = Math.max(margin, Math.min(left, viewportWidth - tooltipWidth - margin));
      let top = rect.bottom + 10;
      if (top + tooltipHeight > viewportHeight - margin) {
        top = rect.top - tooltipHeight - 10;
      }
      top = Math.max(margin, top);
      onKeywordHover({ label, metric, left, top });
    };

    const handleMouseLeave = () => {
      onKeywordHover(null);
    };

    return (
      <span key={key} className="inline-flex">
        <span
          className={`inline-flex rounded-md border px-1.5 py-[1px] ${keywordBandClass(metric.band, metric.source, metric.category)}`}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          {label}
        </span>
      </span>
    );
  }

  function isSeniorityMetricSource(
    source?: "jd" | "senior_leadership" | "game_generic" | "combined",
    category?: string,
  ): boolean {
    if (source === "senior_leadership") return true;
    if (source !== "combined") return false;
    return new Set([
      "leadership_management",
      "achievement_growth",
      "innovation",
      "optimization",
      "analysis",
      "collaboration",
    ]).has(String(category ?? ""));
  }

  function isSoftMetricSource(
    source?: KeywordSource,
    category?: string,
  ): boolean {
    return category === "soft_skills" || category === "soft_skill";
  }

  function isHardMetricSource(
    source?: KeywordSource,
    category?: string,
  ): boolean {
    const hardCategories = new Set([
      "hard_skill",
      "design_specializations",
      "engines_scripting",
      "design_frameworks",
      "prototyping_documentation",
      "data_design",
      "kpis",
      "live_ops",
    ]);
    if (hardCategories.has(String(category ?? ""))) {
      return true;
    }
    return source === "game_generic" && !isSoftMetricSource(source, category) && !isSeniorityMetricSource(source, category);
  }

  function normalizeToken(token: string): string {
    return token.toLowerCase().replace(/^[^a-z0-9]+|[^a-z0-9]+$/g, "");
  }

  function diceSimilarity(a: string, b: string): number {
    if (a === b) return 1;
    if (a.length < 2 || b.length < 2) return 0;
    const gramsA = new Map<string, number>();
    for (let i = 0; i < a.length - 1; i += 1) {
      const gram = a.slice(i, i + 2);
      gramsA.set(gram, (gramsA.get(gram) ?? 0) + 1);
    }
    let overlap = 0;
    for (let i = 0; i < b.length - 1; i += 1) {
      const gram = b.slice(i, i + 2);
      const count = gramsA.get(gram) ?? 0;
      if (count > 0) {
        overlap += 1;
        gramsA.set(gram, count - 1);
      }
    }
    return (2 * overlap) / (a.length - 1 + (b.length - 1));
  }

  function fuzzyKeywordForToken(token: string): {
    keyword: string;
    normalized: number;
    band: KeywordBand;
    weight: number;
    status: "missing" | "underused" | "used";
    cvHits: number;
    targetHits: number;
    recommendation: string;
    usageRatio: number;
    source?: "jd" | "senior_leadership" | "game_generic" | "combined";
    category?: string;
  } | null {
    const normalized = normalizeToken(token);
    if (normalized.length < 3) return null;

    const exact = keywordMatcher.tokenIndex.get(normalized);
    if (exact) {
      return exact;
    }

    let best: {
      keyword: string;
      normalized: number;
      band: KeywordBand;
      weight: number;
      status: "missing" | "underused" | "used";
      cvHits: number;
      targetHits: number;
      recommendation: string;
      usageRatio: number;
      source?: "jd" | "senior_leadership" | "game_generic" | "combined";
      category?: string;
      score: number;
    } | null = null;
    for (const [candidate, metric] of keywordMatcher.tokenIndex.entries()) {
      if (Math.abs(candidate.length - normalized.length) > 2) continue;
      const similarity = diceSimilarity(normalized, candidate);
      if (similarity < 0.86) continue;
      if (!best || similarity > best.score) {
        best = { ...metric, score: similarity };
      }
    }
    if (!best) return null;
    return {
      keyword: best.keyword,
      normalized: best.normalized,
      band: best.band,
      weight: best.weight,
      status: best.status,
      cvHits: best.cvHits,
      targetHits: best.targetHits,
      recommendation: best.recommendation,
      usageRatio: best.usageRatio,
      source: best.source,
      category: best.category,
    };
  }

  function keywordForPhrase(tokens: string[]): {
    keyword: string;
    normalized: number;
    band: KeywordBand;
    weight: number;
    status: "missing" | "underused" | "used";
    cvHits: number;
    targetHits: number;
    recommendation: string;
    usageRatio: number;
    source?: "jd" | "senior_leadership" | "game_generic" | "combined";
    category?: string;
  } | null {
    const phrase = tokens.map((item) => normalizeToken(item)).filter(Boolean).join(" ");
    if (!phrase) return null;
    const exact = keywordMatcher.phraseIndex.get(phrase);
    if (exact) {
      return exact;
    }
    return null;
  }

  function renderKeywordAwareText(text: string): JSX.Element {
    const tokens = text.split(/(\s+)/);
    const nodes: JSX.Element[] = [];
    let i = 0;

    while (i < tokens.length) {
      const raw = tokens[i];
      if (raw.trim().length === 0) {
        nodes.push(<span key={`ws-${i}`}>{raw}</span>);
        i += 1;
        continue;
      }

      let matched:
        | {
            endIndex: number;
            rawText: string;
            metric: {
              keyword: string;
              normalized: number;
              band: KeywordBand;
              weight: number;
              status: "missing" | "underused" | "used";
              cvHits: number;
              targetHits: number;
              recommendation: string;
              usageRatio: number;
              source?: "jd" | "senior_leadership" | "game_generic" | "combined";
              category?: string;
            };
          }
        | null = null;

      for (let phraseLen = keywordMatcher.maxPhraseWords; phraseLen >= 2; phraseLen -= 1) {
        let wordCount = 0;
        let cursor = i;
        const parts: string[] = [];
        const phraseWordTokens: string[] = [];

        while (cursor < tokens.length && wordCount < phraseLen) {
          const part = tokens[cursor];
          parts.push(part);
          if (part.trim().length > 0) {
            phraseWordTokens.push(part);
            wordCount += 1;
          }
          cursor += 1;
        }

        if (wordCount !== phraseLen) {
          continue;
        }

        const metric = keywordForPhrase(phraseWordTokens);
        if (!metric) {
          continue;
        }

        matched = {
          endIndex: cursor - 1,
          rawText: parts.join(""),
          metric,
        };
        break;
      }

      if (matched) {
        if (isSeniorityMetricSource(matched.metric.source, matched.metric.category) && !showSeniorityPriorityTags) {
          nodes.push(<span key={`phrase-plain-${i}-${matched.endIndex}`}>{matched.rawText}</span>);
          i = matched.endIndex + 1;
          continue;
        }
        if (isHardMetricSource(matched.metric.source, matched.metric.category) && !showHardPriorityTags) {
          nodes.push(<span key={`phrase-plain-${i}-${matched.endIndex}`}>{matched.rawText}</span>);
          i = matched.endIndex + 1;
          continue;
        }
        if (isSoftMetricSource(matched.metric.source, matched.metric.category) && !showSoftPriorityTags) {
          nodes.push(<span key={`phrase-plain-${i}-${matched.endIndex}`}>{matched.rawText}</span>);
          i = matched.endIndex + 1;
          continue;
        }
        nodes.push(renderKeywordTagChip(`phrase-${i}-${matched.endIndex}`, matched.rawText, matched.metric));
        i = matched.endIndex + 1;
        continue;
      }

      const hit = fuzzyKeywordForToken(raw);
      if (!hit) {
        nodes.push(<span key={`txt-${i}`}>{raw}</span>);
        i += 1;
        continue;
      }

      if (isSeniorityMetricSource(hit.source, hit.category) && !showSeniorityPriorityTags) {
        nodes.push(<span key={`plain-${i}`}>{raw}</span>);
        i += 1;
        continue;
      }
      if (isHardMetricSource(hit.source, hit.category) && !showHardPriorityTags) {
        nodes.push(<span key={`plain-${i}`}>{raw}</span>);
        i += 1;
        continue;
      }
      if (isSoftMetricSource(hit.source, hit.category) && !showSoftPriorityTags) {
        nodes.push(<span key={`plain-${i}`}>{raw}</span>);
        i += 1;
        continue;
      }

      nodes.push(renderKeywordTagChip(`tag-${i}`, raw, hit));
      i += 1;
    }

    return (
      <>{nodes}</>
    );
  }

  type KeywordFieldRow = { label: string; value: string };

  function formatKeywordPathLabel(path: PathSegment[]): string {
    const labels: string[] = [];
    for (const segment of path) {
      if (typeof segment === "number") {
        if (labels.length > 0) {
          labels[labels.length - 1] = `${labels[labels.length - 1]} ${segment + 1}`;
        } else {
          labels.push(`Entry ${segment + 1}`);
        }
        continue;
      }
      labels.push(prettyKey(segment));
    }
    if (labels.length === 0) return "Field";
    if (labels.length === 1) return labels[0];
    return `${labels[labels.length - 2]} - ${labels[labels.length - 1]}`;
  }

  function collectKeywordRows(value: unknown, path: PathSegment[] = [], rows: KeywordFieldRow[] = []): KeywordFieldRow[] {
    if (value === null || value === undefined) {
      return rows;
    }

    if (typeof value === "string") {
      const trimmed = value.trim();
      if (trimmed.length > 0) {
        rows.push({ label: formatKeywordPathLabel(path), value: trimmed });
      }
      return rows;
    }

    if (typeof value === "number" || typeof value === "boolean") {
      rows.push({ label: formatKeywordPathLabel(path), value: String(value) });
      return rows;
    }

    if (Array.isArray(value)) {
      value.forEach((entry, index) => {
        collectKeywordRows(entry, [...path, index], rows);
      });
      return rows;
    }

    if (typeof value === "object") {
      Object.entries(value as Record<string, unknown>).forEach(([key, entry]) => {
        collectKeywordRows(entry, [...path, key], rows);
      });
    }

    return rows;
  }
  function renderKeywordFieldRow(label: string, value: unknown, key: string): JSX.Element | null {
    const lines = collectKeywordRows(value, [label.toLowerCase().replace(/[^a-z0-9]+/g, "_")]);
    if (lines.length === 0) {
      return null;
    }
    return (
      <div key={key} className="grid gap-1 py-1.5 md:grid-cols-[170px_1fr] md:gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-500">{label}</p>
        <div className="space-y-1 text-sm leading-6 text-slate-800">
          {lines.map((line, index) => (
            <p key={`${key}-line-${index}`}>{renderKeywordAwareText(line.value)}</p>
          ))}
        </div>
      </div>
    );
  }

  function renderKeywordStringList(items: unknown, keyPrefix: string): JSX.Element | null {
    const list = Array.isArray(items)
      ? items.map((item) => String(item ?? "").trim()).filter((item) => item.length > 0)
      : [];
    if (list.length === 0) {
      return null;
    }
    return (
      <ul className="space-y-1 text-sm leading-6 text-slate-800">
        {list.map((item, index) => (
          <li key={`${keyPrefix}-${index}`} className="grid grid-cols-[10px_1fr] gap-2">
            <span className="mt-[9px] h-1.5 w-1.5 rounded-full bg-slate-400" />
            <span>{renderKeywordAwareText(item)}</span>
          </li>
        ))}
      </ul>
    );
  }

  function renderKeywordPositioning(positioning: unknown): JSX.Element | null {
    const rows = collectKeywordRows(positioning, ["positioning"]);
    if (rows.length === 0) {
      return null;
    }
    return (
      <section className="rounded-md border border-[var(--line)] bg-white p-4 shadow-[0_1px_0_rgba(15,23,42,0.04)]">
        <h4 className="border-b border-slate-200 pb-2 text-sm font-bold uppercase tracking-[0.08em] text-slate-800">
          Positioning
        </h4>
        <article className="mt-3 rounded-md border border-slate-200 bg-slate-50 p-3">
          <div className="divide-y divide-slate-200">
            {rows.map((row, index) => (
              <div key={`positioning-${index}`} className="grid gap-1 py-1.5 md:grid-cols-[180px_1fr] md:gap-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-500">{row.label}</p>
                <p className="text-sm leading-6 text-slate-800">{renderKeywordAwareText(row.value)}</p>
              </div>
            ))}
          </div>
        </article>
      </section>
    );
  }

  function renderKeywordExperience(experience: unknown): JSX.Element | null {
    const items = Array.isArray(experience) ? experience : [];
    if (items.length === 0) {
      return null;
    }

    return (
      <section className="rounded-md border border-[var(--line)] bg-white p-4 shadow-[0_1px_0_rgba(15,23,42,0.04)]">
        <h4 className="border-b border-slate-200 pb-2 text-sm font-bold uppercase tracking-[0.08em] text-slate-800">
          Professional Experience
        </h4>
        <div className="mt-3 space-y-3">
          {items.map((item, index) => {
            const role = asRecord(item);
            if (!role) return null;
            const start = String(role.start_date ?? "").trim();
            const end = String(role.end_date ?? "").trim();
            const range = [start, end].filter(Boolean).join(" - ") || "Date not specified";
            const roleTitle = String(
              role.role ?? role.occupation ?? role.title ?? role.job_title ?? role.position ?? "Role",
            ).trim();
            const employerName = String(role.employer ?? role.company ?? role.organization ?? "Employer").trim();
            const durationText = String(role.duration_text ?? "").trim();
            const isCurrent = role.is_current === true;
            const parallelRole = role.parallel_role === true;
            const tools = Array.isArray(role.tools) ? role.tools : [];
            const quantifiedResults = Array.isArray(role.quantified_results) ? role.quantified_results : [];
            const publicationLinks = Array.isArray(role.publication_links) ? role.publication_links : [];

            return (
              <article key={`exp-${index}`} className="rounded-md border border-slate-200 bg-slate-50 p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-base font-semibold text-slate-900">{renderKeywordAwareText(roleTitle)}</p>
                    <p className="text-sm text-slate-700">{renderKeywordAwareText(employerName)}</p>
                  </div>
                  <span className="rounded-full border border-slate-300 bg-white px-2 py-0.5 text-xs font-semibold text-slate-600">{range}</span>
                </div>

                <div className="mt-2 divide-y divide-slate-200">
                  {renderKeywordFieldRow("Duration", durationText, `exp-${index}-duration`)}
                  {renderKeywordFieldRow("Current", isCurrent ? "Yes" : "No", `exp-${index}-current`)}
                  {renderKeywordFieldRow("Parallel Role", parallelRole ? "Yes" : "No", `exp-${index}-parallel`)}
                  {renderKeywordFieldRow("Location", role.location, `exp-${index}-location`)}
                  {renderKeywordFieldRow("Industry", role.industry, `exp-${index}-industry`)}
                  {renderKeywordFieldRow("Employment Type", role.employment_type, `exp-${index}-employment-type`)}
                </div>

                {Array.isArray(role.responsibilities) && role.responsibilities.length > 0 ? (
                  <div className="mt-3">
                    <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-500">Responsibilities</p>
                    {renderKeywordStringList(role.responsibilities, `exp-${index}-resp`)}
                  </div>
                ) : null}

                {Array.isArray(role.products) && role.products.length > 0 ? (
                  <div className="mt-3">
                    <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-500">Products / Scope</p>
                    <ul className="space-y-1 text-sm leading-6 text-slate-800">
                      {role.products.map((product, pIndex) => {
                        if (typeof product === "string") {
                          return (
                            <li key={`exp-${index}-product-${pIndex}`} className="grid grid-cols-[10px_1fr] gap-2">
                              <span className="mt-[9px] h-1.5 w-1.5 rounded-full bg-slate-400" />
                              <span>{renderKeywordAwareText(product)}</span>
                            </li>
                          );
                        }
                        const record = asRecord(product);
                        if (!record) return null;
                        return (
                          <li key={`exp-${index}-product-${pIndex}`} className="grid grid-cols-[10px_1fr] gap-2">
                            <span className="mt-[9px] h-1.5 w-1.5 rounded-full bg-slate-400" />
                            <div>
                              <p>{renderKeywordAwareText(String(record.name ?? ""))}</p>
                              {record.note ? <p className="pl-4 text-xs text-slate-600">{renderKeywordAwareText(String(record.note))}</p> : null}
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ) : null}

                {quantifiedResults.length > 0 ? (
                  <div className="mt-3">
                    <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-500">Quantified Results</p>
                    <ul className="space-y-1 text-sm leading-6 text-slate-800">
                      {quantifiedResults.map((result, rIndex) => {
                        const record = asRecord(result);
                        if (!record) return null;
                        const metric = String(record.metric ?? "").trim();
                        const value = String(record.value ?? "").trim();
                        const note = String(record.note ?? "").trim();
                        const line = [metric, value].filter(Boolean).join(": ");
                        if (!line && !note) return null;
                        return (
                          <li key={`exp-${index}-result-${rIndex}`} className="grid grid-cols-[10px_1fr] gap-2">
                            <span className="mt-[9px] h-1.5 w-1.5 rounded-full bg-slate-400" />
                            <div>
                              {line ? <p>{renderKeywordAwareText(line)}</p> : null}
                              {note ? <p className="pl-4 text-xs text-slate-600">{renderKeywordAwareText(note)}</p> : null}
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ) : null}

                {tools.length > 0 ? (
                  <div className="mt-3">
                    <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-500">Tools</p>
                    <div className="flex flex-wrap gap-2">
                      {tools.map((entry, tIndex) => (
                        <span key={`exp-${index}-tool-${tIndex}`} className="rounded-full border border-slate-300 bg-white px-2 py-1 text-xs text-slate-800">
                          {renderKeywordAwareText(String(entry))}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : null}

                {publicationLinks.length > 0 ? (
                  <div className="mt-3">
                    <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-500">Publication Links</p>
                    <ul className="space-y-1 text-sm leading-6 text-slate-800">
                      {publicationLinks.map((link, lIndex) => {
                        if (typeof link === "string") {
                          return (
                            <li key={`exp-${index}-pub-${lIndex}`} className="grid grid-cols-[10px_1fr] gap-2">
                              <span className="mt-[9px] h-1.5 w-1.5 rounded-full bg-slate-400" />
                              <span>{renderKeywordAwareText(link)}</span>
                            </li>
                          );
                        }
                        const record = asRecord(link);
                        if (!record) return null;
                        const label = String(record.title ?? record.url ?? "").trim();
                        const url = String(record.url ?? "").trim();
                        if (!label && !url) return null;
                        return (
                          <li key={`exp-${index}-pub-${lIndex}`} className="grid grid-cols-[10px_1fr] gap-2">
                            <span className="mt-[9px] h-1.5 w-1.5 rounded-full bg-slate-400" />
                            <div>
                              {label ? <p>{renderKeywordAwareText(label)}</p> : null}
                              {url && url !== label ? <p className="pl-4 text-xs text-slate-600">{renderKeywordAwareText(url)}</p> : null}
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      </section>
    );
  }

  function renderKeywordEducation(education: unknown): JSX.Element | null {
    const items = Array.isArray(education) ? education : [];
    if (items.length === 0) {
      return null;
    }
    return (
      <section className="rounded-md border border-[var(--line)] bg-white p-4 shadow-[0_1px_0_rgba(15,23,42,0.04)]">
        <h4 className="border-b border-slate-200 pb-2 text-sm font-bold uppercase tracking-[0.08em] text-slate-800">
          Education and Training
        </h4>
        <div className="mt-3 space-y-3">
          {items.map((item, index) => {
            const row = asRecord(item);
            if (!row) return null;
            const start = String(row.start_date ?? "").trim();
            const end = String(row.end_date ?? "").trim();
            const range = [start, end].filter(Boolean).join(" - ") || "Date not specified";
            return (
              <article key={`edu-${index}`} className="rounded-md border border-slate-200 bg-slate-50 p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-base font-semibold text-slate-900">{renderKeywordAwareText(String(row.qualification ?? "Qualification"))}</p>
                    <p className="text-sm text-slate-700">{renderKeywordAwareText(String(row.institution ?? "Institution"))}</p>
                  </div>
                  <span className="rounded-full border border-slate-300 bg-white px-2 py-0.5 text-xs font-semibold text-slate-600">{range}</span>
                </div>
                <div className="mt-2 divide-y divide-slate-200">
                  {renderKeywordFieldRow("Field", row.field_of_study, `edu-${index}-field`)}
                  {renderKeywordFieldRow("Level", row.level_eqf_or_nqf, `edu-${index}-level`)}
                  {renderKeywordFieldRow("Location", row.location, `edu-${index}-location`)}
                  {renderKeywordFieldRow("Completed", row.completed, `edu-${index}-completed`)}
                </div>
                {Array.isArray(row.subjects) && row.subjects.length > 0 ? (
                  <div className="mt-3">
                    <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-500">Subjects</p>
                    {renderKeywordStringList(row.subjects, `edu-${index}-subjects`)}
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      </section>
    );
  }

  function renderKeywordSkills(skills: unknown): JSX.Element | null {
    const row = asRecord(skills);
    if (!row) return null;
    const languageSkills = Array.isArray(row.languages) ? row.languages : [];
    const technicalSkills = Array.isArray(row.technical) ? row.technical : [];
    const socialSkills = Array.isArray(row.social) ? row.social : [];
    const coreStrengths = Array.isArray(row.core_strengths) ? row.core_strengths : [];

    return (
      <section className="rounded-md border border-[var(--line)] bg-white p-4 shadow-[0_1px_0_rgba(15,23,42,0.04)]">
        <h4 className="border-b border-slate-200 pb-2 text-sm font-bold uppercase tracking-[0.08em] text-slate-800">Skills</h4>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-500">Languages</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {languageSkills.length > 0
                ? languageSkills.map((entry, index) => {
                    if (typeof entry === "string") {
                      return (
                        <span key={`lang-${index}`} className="rounded-full border border-slate-300 bg-white px-2 py-1 text-xs text-slate-800">
                          {renderKeywordAwareText(entry)}
                        </span>
                      );
                    }
                    const record = asRecord(entry);
                    const label = [String(record?.language ?? ""), String(record?.level ?? "")].filter(Boolean).join(" - ");
                    return (
                      <span key={`lang-${index}`} className="rounded-full border border-slate-300 bg-white px-2 py-1 text-xs text-slate-800">
                        {renderKeywordAwareText(label || "Language")}
                      </span>
                    );
                  })
                : <p className="text-xs text-slate-500">No language entries.</p>}
            </div>
          </div>

          <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-500">Technical</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {technicalSkills.length > 0
                ? technicalSkills.map((entry, index) => (
                    <span key={`tech-${index}`} className="rounded-full border border-slate-300 bg-white px-2 py-1 text-xs text-slate-800">
                      {renderKeywordAwareText(String(entry))}
                    </span>
                  ))
                : <p className="text-xs text-slate-500">No technical entries.</p>}
            </div>
          </div>

          <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-500">Core Strengths</p>
            <div className="mt-2">{renderKeywordStringList(coreStrengths, "skills-core") ?? <p className="text-xs text-slate-500">No core strengths.</p>}</div>
          </div>

          <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-500">Social Skills</p>
            <div className="mt-2">{renderKeywordStringList(socialSkills, "skills-social") ?? <p className="text-xs text-slate-500">No social skills.</p>}</div>
          </div>
        </div>
      </section>
    );
  }

  function renderKeywordOptional(optional: unknown): JSX.Element | null {
    const record = asRecord(optional);
    if (!record) return null;
    const entries = Object.entries(record).filter(([, value]) => collectKeywordRows(value).length > 0);
    if (entries.length === 0) return null;

    return (
      <section className="rounded-md border border-[var(--line)] bg-white p-4 shadow-[0_1px_0_rgba(15,23,42,0.04)]">
        <h4 className="border-b border-slate-200 pb-2 text-sm font-bold uppercase tracking-[0.08em] text-slate-800">Additional Information</h4>
        <div className="mt-3 space-y-3">
          {entries.map(([sectionKey, sectionValue]) => (
            <article key={`optional-${sectionKey}`} className="rounded-md border border-slate-200 bg-slate-50 p-3">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-500">{prettyKey(sectionKey)}</p>
              <div className="divide-y divide-slate-200">
                {collectKeywordRows(sectionValue, [sectionKey]).map((row, index) => (
                  <div key={`optional-${sectionKey}-${index}`} className="grid gap-1 py-1.5 md:grid-cols-[180px_1fr] md:gap-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-500">{row.label}</p>
                    <p className="text-sm leading-6 text-slate-800">{renderKeywordAwareText(row.value)}</p>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>
    );
  }

  if (keywordStudioLoading) {
  return <p className="text-sm text-[var(--ink-muted)]">Loading keyword analysis and CV render...</p>;
  }
  if (keywordStudioError) {
      return <p className="text-sm text-rose-700">{keywordStudioError}</p>;
  }

  const cvRoot = asRecord(keywordStudioData?.cv);
  if (!cvRoot) {
      return <p className="text-sm text-[var(--ink-muted)]">Keyword Studio requires an English CV variant.</p>;
  }

  const positioning = asRecord(cvRoot.positioning);
  const clusters = keywordStudioData?.clusters ?? [];
  const keywordSummary = keywordStudioData?.keywordSummary;
  const missingKeywords = keywordStudioData?.missingKeywords ?? [];
  const underusedKeywords = keywordStudioData?.underusedKeywords ?? [];
  const usedKeywords = keywordStudioData?.usedKeywords ?? [];
  const seniorityKeywords = keywordStudioData?.seniorityKeywords ?? [];
  const fallbackSeniorityKeywords = (keywordStudioData?.keywords ?? [])
      .filter((item) => isSeniorityMetricSource(item.source, item.category))
      .sort((a, b) => b.weight - a.weight || a.keyword.localeCompare(b.keyword));
  const seniorityPriorityKeywords = seniorityKeywords.length > 0 ? seniorityKeywords : fallbackSeniorityKeywords;
  const hardSkillCategories = new Set([
      "design_specializations",
      "engines_scripting",
      "design_frameworks",
      "prototyping_documentation",
      "data_design",
      "kpis",
      "live_ops",
    ]);
  const hardSkillRegex = /\b(sql|python|c\+\+|c#|unity|unreal|blueprints|lua|looker|snowflake|bigquery|a\/b testing|retention|arpu|arppu|ltv|monetization|live ops|systems design|economy balancing)\b/i;
  const softSkillRegex = /\b(communication|collaboration|stakeholder|mentored|facilitated|liaised|partnered|feedback|listening|adaptability|problem solving|critical thinking|cross-functional|team)\b/i;
  const allSkillCandidates = keywordStudioData?.keywords ?? [];
  const softPriorityKeywords = allSkillCandidates
      .filter((item) => item.category === "soft_skills" || softSkillRegex.test(item.keyword))
      .sort((a, b) => b.weight - a.weight || a.keyword.localeCompare(b.keyword));
  const hardPriorityKeywords = allSkillCandidates
      .filter((item) =>
        !softPriorityKeywords.some((soft) => soft.keyword === item.keyword) &&
        (hardSkillCategories.has(String(item.category ?? "")) || hardSkillRegex.test(item.keyword))
      )
      .sort((a, b) => b.weight - a.weight || a.keyword.localeCompare(b.keyword));
  const isDark = resolvedTheme === "dark";
  const roles = keywordStudioData?.roles ?? [];
  const keywordRunActive =
      keywordRunStatus?.state === "queued" ||
      keywordRunStatus?.state === "scraping" ||
      keywordRunStatus?.state === "merging";

  const experiences = Array.isArray(cvRoot.experience) ? cvRoot.experience : [];
  const education = Array.isArray(cvRoot.education) ? cvRoot.education : [];
  const optional = asRecord(cvRoot.optional_sections);
  const skills = asRecord(cvRoot.skills);

  return (
      <div className="grid min-h-0 flex-1 gap-4 md:grid-cols-[340px_1fr]">
        <article className="min-h-0 overflow-auto rounded-xl border border-[var(--line)] bg-white p-4">
          <h2 className="text-xl font-bold text-slate-900">Keyword Studio</h2>
          <p className="mt-2 text-sm text-[var(--ink-muted)]">
            English Europass-like analysis view with fuzzy keyword tagging and weighted relevance heat.
          </p>

          <div className="mt-3 rounded-md border border-[var(--line)] bg-[var(--surface-1)] p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--ink-muted)]">Dataset</p>
            <label className="mt-2 block text-xs font-medium text-slate-700">
              Snapshot
              <select
                className="mt-1 w-full rounded-md border border-[var(--line)] bg-white px-2 py-1.5 text-xs"
                disabled={keywordDatasetLoading || (keywordDatasets?.length ?? 0) === 0}
                onChange={(event) => onSelectKeywordDataset(event.target.value)}
                value={selectedKeywordDataset}
              >
                {(keywordDatasets ?? []).map((dataset) => (
                  <option key={dataset.id} value={dataset.id}>
                    {dataset.label} ({dataset.itemCount})
                  </option>
                ))}
              </select>
            </label>
            <p className="mt-1 text-[11px] text-slate-600">
              Core database is the single live dataset refreshed from every run.
            </p>
            {keywordStudioData?.keywordDatabases?.active?.length ? (
              <p className="mt-1 text-[11px] text-slate-600">
                Active keyword DBs: {keywordStudioData.keywordDatabases.active.join(" • ")}
              </p>
            ) : null}
            <label className="mt-2 block text-xs font-medium text-slate-700">
              Profession Focus
              <select
                className="mt-1 w-full rounded-md border border-[var(--line)] bg-white px-2 py-1.5 text-xs"
                onChange={(event) => onSelectKeywordRole(event.target.value)}
                value={selectedKeywordRole}
              >
                {roles.map((item) => (
                  <option key={item.role} value={item.role}>
                    {item.label} ({item.docCount})
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="mt-3 rounded-md border border-[var(--line)] bg-[var(--surface-1)] p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--ink-muted)]">Role Clusters</p>
            <div className="mt-2 space-y-2">
              {clusters.map((cluster) => (
                <div key={cluster.cluster} className="rounded-md border border-[var(--line)] bg-white p-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold text-slate-900">{cluster.cluster}</p>
                    <p className="text-xs font-bold text-slate-700">{(cluster.normalized * 100).toFixed(0)}%</p>
                  </div>
                  <p className="mt-1 text-[11px] text-slate-600">
                    Weight {cluster.totalWeight.toFixed(1)} • CV coverage {(cluster.cvCoverage * 100).toFixed(0)}%
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-3 rounded-md border border-[var(--line)] bg-[var(--surface-1)] p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--ink-muted)]">Keyword Status</p>
            <p className="mt-1 text-[11px] text-slate-600">
              Missing {keywordSummary?.missing ?? 0} • Underused {keywordSummary?.underused ?? 0} • Used {keywordSummary?.used ?? 0}
            </p>
            <p className="mt-1 text-[11px] text-slate-600">
              Usage score {(keywordStudioData?.analysisStats?.weightedUsageScore ?? 0).toFixed(1)}% • Missing weight {(keywordStudioData?.analysisStats?.missingWeightShare ?? 0).toFixed(1)}%
            </p>
            <div className="mt-2 space-y-2">
              {(missingKeywords.slice(0, 8)).map((item) => (
                <div key={`missing-${item.keyword}`} className="rounded-md border border-red-200 bg-red-50 p-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex rounded-md border border-red-300 bg-white px-2 py-0.5 text-xs font-semibold text-red-900">
                      {item.keyword}
                    </span>
                    <span className="text-xs font-bold text-red-900">Missing</span>
                  </div>
                  <p className="mt-1 text-[11px] text-red-800">
                    Hits {item.cvHits}/{item.targetHits} • Weight {item.weight.toFixed(1)}
                  </p>
                  <p className="mt-1 text-[11px] text-red-700">{item.recommendation}</p>
                </div>
              ))}
              {(underusedKeywords.slice(0, 8)).map((item) => (
                <div key={`underused-${item.keyword}`} className="rounded-md border border-amber-200 bg-amber-50 p-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex rounded-md border border-amber-300 bg-white px-2 py-0.5 text-xs font-semibold text-amber-900">
                      {item.keyword}
                    </span>
                    <span className="text-xs font-bold text-amber-900">Underused</span>
                  </div>
                  <p className="mt-1 text-[11px] text-amber-800">
                    Hits {item.cvHits}/{item.targetHits} • Weight {item.weight.toFixed(1)}
                  </p>
                  <p className="mt-1 text-[11px] text-amber-700">{item.recommendation}</p>
                </div>
              ))}
              {(usedKeywords.slice(0, 6)).map((item) => (
                <div key={`used-${item.keyword}`} className="rounded-md border border-emerald-200 bg-emerald-50 p-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex rounded-md border border-emerald-300 bg-white px-2 py-0.5 text-xs font-semibold text-emerald-900">
                      {item.keyword}
                    </span>
                    <span className="text-xs font-bold text-emerald-900">Used</span>
                  </div>
                  <p className="mt-1 text-[11px] text-emerald-800">
                    Hits {item.cvHits}/{item.targetHits} • Weight {item.weight.toFixed(1)}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className={`mt-3 rounded-md border p-3 ${isDark ? "border-indigo-700 bg-indigo-950/35" : "border-indigo-200 bg-indigo-50/50"}`}>
            <div className="flex items-center justify-between gap-2">
              <p className={`text-xs font-semibold uppercase tracking-[0.08em] ${isDark ? "text-indigo-200" : "text-indigo-900"}`}>Seniority Priority Keywords</p>
              <button
                className={`rounded-md border px-2 py-1 text-[11px] font-semibold ${
                  showSeniorityPriorityTags
                    ? (isDark ? "border-indigo-500 bg-indigo-900/70 text-indigo-100" : "border-indigo-300 bg-indigo-100 text-indigo-900")
                    : (isDark ? "border-slate-600 bg-slate-900 text-slate-200" : "border-slate-300 bg-white text-slate-700")
                }`}
                onClick={() => onToggleSeniorityPriorityTags()}
                type="button"
              >
                {showSeniorityPriorityTags ? "Hide" : "Show"}
              </button>
            </div>
            <p className={`mt-1 text-[11px] ${isDark ? "text-indigo-200/90" : "text-indigo-800"}`}>
              Always shown to enforce senior-impact language in CV content. Seniority tags are currently {showSeniorityPriorityTags ? "visible" : "hidden"} in the right panel.
            </p>
            <div className="mt-2 space-y-2">
              {seniorityPriorityKeywords.map((item) => (
                <div key={`seniority-${item.keyword}`} className={`rounded-md border p-2 ${isDark ? "border-indigo-700 bg-slate-900/65" : "border-indigo-200 bg-white"}`}>
                  <div className="flex items-center justify-between gap-2">
                    <span className={`inline-flex rounded-md border px-2 py-0.5 text-xs font-semibold ${isDark ? "border-indigo-500 bg-indigo-900/50 text-indigo-100" : "border-indigo-300 bg-indigo-50 text-indigo-900"}`}>
                      {item.keyword}
                    </span>
                    <span className={`text-xs font-bold ${isDark ? "text-indigo-100" : "text-indigo-900"}`}>{item.status === "used" ? "Used" : item.status === "underused" ? "Underused" : "Missing"}</span>
                  </div>
                  <p className={`mt-1 text-[11px] ${isDark ? "text-indigo-200/90" : "text-indigo-800"}`}>
                    Hits {item.cvHits}/{item.targetHits} • Weight {item.weight.toFixed(1)}
                  </p>
                  <p className={`mt-1 text-[11px] ${isDark ? "text-indigo-200/85" : "text-indigo-700"}`}>{item.recommendation}</p>
                </div>
              ))}
              {seniorityPriorityKeywords.length === 0 ? (
                <p className={`text-xs ${isDark ? "text-indigo-200/85" : "text-indigo-700"}`}>No seniority keywords available in current analysis response.</p>
              ) : null}
            </div>
          </div>

          <div className={`mt-3 rounded-md border p-3 ${isDark ? "border-cyan-700 bg-cyan-950/30" : "border-cyan-200 bg-cyan-50/50"}`}>
            <div className="flex items-center justify-between gap-2">
              <p className={`text-xs font-semibold uppercase tracking-[0.08em] ${isDark ? "text-cyan-200" : "text-cyan-900"}`}>Hard Skills Priority</p>
              <button
                className={`rounded-md border px-2 py-1 text-[11px] font-semibold ${
                  showHardPriorityTags
                    ? (isDark ? "border-cyan-500 bg-cyan-900/60 text-cyan-100" : "border-cyan-300 bg-cyan-100 text-cyan-900")
                    : (isDark ? "border-slate-600 bg-slate-900 text-slate-200" : "border-slate-300 bg-white text-slate-700")
                }`}
                onClick={() => onToggleHardPriorityTags()}
                type="button"
              >
                {showHardPriorityTags ? "Hide" : "Show"}
              </button>
            </div>
            <p className={`mt-1 text-[11px] ${isDark ? "text-cyan-200/90" : "text-cyan-800"}`}>
              Hard-skill tags are currently {showHardPriorityTags ? "visible" : "hidden"} in the right panel.
            </p>
            <div className="mt-2 space-y-2">
              {hardPriorityKeywords.map((item) => (
                <div key={`hard-${item.keyword}`} className={`rounded-md border p-2 ${isDark ? "border-cyan-700 bg-slate-900/65" : "border-cyan-200 bg-white"}`}>
                  <div className="flex items-center justify-between gap-2">
                    <span className={`inline-flex rounded-md border px-2 py-0.5 text-xs font-semibold ${isDark ? "border-cyan-500 bg-cyan-900/45 text-cyan-100" : "border-cyan-300 bg-cyan-50 text-cyan-900"}`}>
                      {item.keyword}
                    </span>
                    <span className={`text-xs font-bold ${isDark ? "text-cyan-100" : "text-cyan-900"}`}>{item.status === "used" ? "Used" : item.status === "underused" ? "Underused" : "Missing"}</span>
                  </div>
                  <p className={`mt-1 text-[11px] ${isDark ? "text-cyan-200/90" : "text-cyan-800"}`}>
                    Hits {item.cvHits}/{item.targetHits} • Weight {item.weight.toFixed(1)}
                  </p>
                  <p className={`mt-1 text-[11px] ${isDark ? "text-cyan-200/85" : "text-cyan-700"}`}>{item.recommendation}</p>
                </div>
              ))}
              {hardPriorityKeywords.length === 0 ? <p className={`text-xs ${isDark ? "text-cyan-200/85" : "text-cyan-700"}`}>No hard-skill keywords available in current analysis response.</p> : null}
            </div>
          </div>

          <div className={`mt-3 rounded-md border p-3 ${isDark ? "border-emerald-700 bg-emerald-950/30" : "border-emerald-200 bg-emerald-50/50"}`}>
            <div className="flex items-center justify-between gap-2">
              <p className={`text-xs font-semibold uppercase tracking-[0.08em] ${isDark ? "text-emerald-200" : "text-emerald-900"}`}>Soft Skills Priority</p>
              <button
                className={`rounded-md border px-2 py-1 text-[11px] font-semibold ${
                  showSoftPriorityTags
                    ? (isDark ? "border-emerald-500 bg-emerald-900/60 text-emerald-100" : "border-emerald-300 bg-emerald-100 text-emerald-900")
                    : (isDark ? "border-slate-600 bg-slate-900 text-slate-200" : "border-slate-300 bg-white text-slate-700")
                }`}
                onClick={() => onToggleSoftPriorityTags()}
                type="button"
              >
                {showSoftPriorityTags ? "Hide" : "Show"}
              </button>
            </div>
            <p className={`mt-1 text-[11px] ${isDark ? "text-emerald-200/90" : "text-emerald-800"}`}>
              Soft-skill tags are currently {showSoftPriorityTags ? "visible" : "hidden"} in the right panel.
            </p>
            <div className="mt-2 space-y-2">
              {softPriorityKeywords.map((item) => (
                <div key={`soft-${item.keyword}`} className={`rounded-md border p-2 ${isDark ? "border-emerald-700 bg-slate-900/65" : "border-emerald-200 bg-white"}`}>
                  <div className="flex items-center justify-between gap-2">
                    <span className={`inline-flex rounded-md border px-2 py-0.5 text-xs font-semibold ${isDark ? "border-emerald-500 bg-emerald-900/45 text-emerald-100" : "border-emerald-300 bg-emerald-50 text-emerald-900"}`}>
                      {item.keyword}
                    </span>
                    <span className={`text-xs font-bold ${isDark ? "text-emerald-100" : "text-emerald-900"}`}>{item.status === "used" ? "Used" : item.status === "underused" ? "Underused" : "Missing"}</span>
                  </div>
                  <p className={`mt-1 text-[11px] ${isDark ? "text-emerald-200/90" : "text-emerald-800"}`}>
                    Hits {item.cvHits}/{item.targetHits} • Weight {item.weight.toFixed(1)}
                  </p>
                  <p className={`mt-1 text-[11px] ${isDark ? "text-emerald-200/85" : "text-emerald-700"}`}>{item.recommendation}</p>
                </div>
              ))}
              {softPriorityKeywords.length === 0 ? <p className={`text-xs ${isDark ? "text-emerald-200/85" : "text-emerald-700"}`}>No soft-skill keywords available in current analysis response.</p> : null}
            </div>
          </div>

          <div className="mt-3 rounded-md border border-[var(--line)] bg-[var(--surface-1)] p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--ink-muted)]">Data Ops</p>
            <p className="mt-1 text-[11px] text-slate-600">
              Core DB profiles: today {keywordManageStats?.profilesScanned.today ?? 0} • total {keywordManageStats?.profilesScanned.total ?? 0}
            </p>
            <p className="mt-1 text-[11px] text-slate-600">
              Core dataset size {keywordManageStats?.coreDatasetProfiles ?? 0} • keywords identified {keywordManageStats?.keywordsIdentified ?? 0}
            </p>
            <div className="mt-2 grid grid-cols-1 gap-1.5">
              <button
                className="rounded-md border border-[var(--line)] bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                disabled={keywordManageBusy || keywordRunActive}
                onClick={() => onRunKeywordManageAction()}
                title="Run new JD collection and auto-merge into core database"
                type="button"
              >
                Run
              </button>
            </div>
            {keywordManageNotice ? <p className="mt-2 text-[11px] text-slate-700">{keywordManageNotice}</p> : null}
          </div>
        </article>

        <article className="min-h-0 overflow-auto rounded-xl border border-[var(--line)] bg-[#fcfcfd] p-5">
          <div className="mx-auto w-full max-w-[920px] rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="space-y-3 p-4">
              {renderKeywordPositioning(positioning)}
              {renderKeywordExperience(experiences)}
              {renderKeywordEducation(education)}
              {renderKeywordSkills(skills)}
              {renderKeywordOptional(optional)}
            </div>
          </div>
        </article>
      </div>
    );
}
