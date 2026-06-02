import type { CvDocument } from "../cvStore";
import type { CambridgeThemePalette, TemplateFile } from "./types";
import {
  asRecord,
  escapeHtml,
  formatName,
  formatRange,
  getByPath,
  label,
  languageDotCount,
  nameSizeMm,
  renderEdinburghCompetenciesSection,
  renderEducation,
  renderExperience,
  renderParagraphs,
  renderSimpleList,
  resolveMargins,
  skillDotCount,
  textList,
} from "./shared";
import {
  normalizeProfileLink,
  toPublicationLinks,
} from "./profile-links";
import { toProductLines } from "./europass-v1";

export function languageLevelLabel(value: unknown, labels: Record<string, unknown>): string {
  const normalized = String(value ?? "").trim().toUpperCase();
  if (normalized === "NATIVE" || normalized === "C2") {
    return label(labels, "language_levels.native", "Native speaker");
  }
  if (normalized === "C1") {
    return label(labels, "language_levels.very_good", "Very good command");
  }
  if (normalized === "B2" || normalized === "B1") {
    return label(labels, "language_levels.working", "Working knowledge");
  }
  if (normalized === "A2" || normalized === "A1") {
    return label(labels, "language_levels.basic", "Basic understanding");
  }
  return normalized || label(labels, "language_levels.working", "Working knowledge");
}

export function skillBarPercent(index: number): number {
  if (index <= 0) return 84;
  if (index === 1) return 74;
  if (index === 2) return 64;
  if (index === 3) return 54;
  return 48;
}

export function cambridgeLanguageDotCount(value: unknown): number {
  const fiveScale = languageDotCount(value);
  const converted = Math.round((fiveScale / 5) * 4);
  return Math.max(1, Math.min(4, converted));
}


export function renderCambridge(
  cv: CvDocument,
  template: TemplateFile,
  slots: Record<string, unknown>,
  labels: Record<string, unknown>,
  theme: CambridgeThemePalette,
  moveSkillsLeft = false,
): string {
  const margins = resolveMargins(template);
  const experienceDateMode = template.date_display?.experience ?? "year";
  const educationDateMode = template.date_display?.education ?? "year";
  const presentLabel = label(labels, "common.present", "present");

  const fullName = String(
    slots["person.full_name"] ?? getByPath(cv, "person.full_name") ?? "",
  ).trim();
  const summaryText = textList(
    slots["positioning.profile_summary"] ??
      getByPath(cv, "positioning.profile_summary"),
  ).join(" ");

  const person = asRecord(getByPath(cv, "person")) ?? {};
  const residence = asRecord(getByPath(cv, "person.residence")) ?? {};
  const contact =
    asRecord(slots["contact.block"] ?? getByPath(cv, "person.contact")) ?? {};

  const personalRows = [
    {
      label: label(labels, "contact_labels.name", "Name"),
      value: String(person.full_name ?? fullName ?? "").trim(),
    },
    {
      label: label(labels, "contact_labels.address", "Address"),
      value: [residence.street, residence.city, residence.country]
        .filter(Boolean)
        .map(String)
        .join(", "),
    },
    {
      label: label(labels, "contact_labels.phone", "Phone number"),
      value: String(contact.phone_e164 ?? contact.phone_local ?? "").trim(),
    },
    {
      label: label(labels, "contact_labels.email", "Email address"),
      value: String(contact.email ?? "").trim(),
    },
    {
      label: label(labels, "contact_labels.driving_license", "Driving license"),
      value: String(contact.driving_license ?? "").trim(),
    },
    {
      label: label(labels, "contact_labels.linkedin", "LinkedIn"),
      value:
        normalizeProfileLink(contact.linkedin, "linkedin")?.display ??
        String(contact.linkedin ?? "").trim(),
    },
    {
      label: label(labels, "contact_labels.github", "GitHub"),
      value:
        normalizeProfileLink(contact.github, "github")?.display ??
        String(contact.github ?? "").trim(),
    },
  ].filter((row) => row.value.length > 0);

  const interests = textList(
    slots["optional.interests"] ?? getByPath(cv, "optional_sections.interests"),
  );
  const languages = Array.isArray(
    slots["skills.languages"] ?? getByPath(cv, "skills.languages"),
  )
    ? (slots["skills.languages"] ?? getByPath(cv, "skills.languages"))
    : [];
  const technicalSkills = textList(
    slots["skills.technical"] ?? getByPath(cv, "skills.technical"),
  );
  const experiences = Array.isArray(
    slots["experience.items"] ?? getByPath(cv, "experience"),
  )
    ? (slots["experience.items"] ?? getByPath(cv, "experience"))
    : [];
  const education = Array.isArray(
    slots["education.items"] ?? getByPath(cv, "education"),
  )
    ? (slots["education.items"] ?? getByPath(cv, "education"))
    : [];
  const referencesRaw =
    slots["references.items"] ?? getByPath(cv, "references");
  const references = Array.isArray(referencesRaw) ? referencesRaw : [];
  const optionalCourses = renderSimpleList(
    label(labels, "sections.courses", "Courses"),
    slots["optional.courses"] ??
      getByPath(cv, "optional_sections.certifications"),
  );
  const optionalProjects = renderSimpleList(
    label(labels, "sections.projects", "Projects"),
    getByPath(cv, "optional_sections.projects"),
  );
  const optionalAwards = renderSimpleList(
    label(labels, "sections.awards", "Awards"),
    getByPath(cv, "optional_sections.awards"),
  );
  const optionalVolunteering = renderSimpleList(
    label(labels, "sections.volunteering", "Volunteering"),
    getByPath(cv, "optional_sections.volunteering"),
  );
  const optionalPatents = renderSimpleList(
    label(labels, "sections.patents", "Patents"),
    getByPath(cv, "optional_sections.patents"),
  );
  const optionalPortfolio = renderSimpleList(
    label(labels, "sections.portfolio_links", "Portfolio Links"),
    getByPath(cv, "optional_sections.portfolio_links"),
  );
  const competenciesSection = renderEdinburghCompetenciesSection(labels, cv);

  const personalHtml = personalRows
    .map(
      (row) =>
        `<li><strong>${escapeHtml(row.label)}</strong><span>${escapeHtml(row.value)}</span></li>`,
    )
    .join("");
  const interestsHtml = interests.join(", ");
  const languageHtml = (languages as unknown[])
    .map((entry) => {
      const record = asRecord(entry);
      if (!record) return "";
      const score = cambridgeLanguageDotCount(record.proficiency_cefr);
      const dots = Array.from({ length: 4 })
        .map(
          (_, idx) =>
            `<span class="dot ${idx < score ? "on" : ""}"></span>`,
        )
        .join("");
      return `<li><span class="label">${escapeHtml(record.language ?? "")}</span><span class="dots">${dots}</span></li>`;
    })
    .join("");

  const workHtml = (experiences as unknown[])
    .map((entry) => {
      const record = asRecord(entry);
      if (!record) return "";
      const range = formatRange(
        record.start_date,
        record.end_date,
        record.is_current,
        experienceDateMode,
        presentLabel,
      );
      const orgLine = [
        String(record.employer ?? "").trim(),
        String(asRecord(record.location)?.city ?? "").trim(),
      ]
        .filter(Boolean)
        .join(", ");
      const bullets = textList(record.responsibilities)
        .map((item) => `<li>${escapeHtml(item)}</li>`)
        .join("");
      const summaryLine = textList(record.summary).join(" ");
      const productLines = toProductLines(record.products);
      const publicationLinks = toPublicationLinks(record.publication_links);
      const productsHtml = productLines.length
        ? `<div class="product-subsection"><p class="product-title">${escapeHtml(label(labels, "sections.worked_on_projects", "Worked on projects"))}</p><ul class="product-list">${productLines.map((line) => `<li>${escapeHtml(line)}</li>`).join("")}</ul></div>`
        : "";
      const publicationLinksHtml = publicationLinks.length
        ? `<div class="publication-links-subsection"><p class="publication-links-title">${escapeHtml(label(labels, "sections.publication_links", "Publication links"))}</p><ul class="publication-links-list">${publicationLinks.map((item) => `<li><a href="${escapeHtml(item.href)}" target="_blank" rel="noopener noreferrer">${escapeHtml(item.title)}</a></li>`).join("")}</ul></div>`
        : "";
      return `<article class="dated-entry">
        <div class="date-col">${escapeHtml(range)}</div>
        <div class="entry-body">
          <h3>${escapeHtml(record.role ?? "")}</h3>
          ${orgLine ? `<p class="meta">${escapeHtml(orgLine)}</p>` : ""}
          ${summaryLine ? `<p>${escapeHtml(summaryLine)}</p>` : ""}
          ${bullets ? `<ul>${bullets}</ul>` : ""}
          ${productsHtml}
          ${publicationLinksHtml}
        </div>
      </article>`;
    })
    .join("");

  const educationHtml = (education as unknown[])
    .map((entry) => {
      const record = asRecord(entry);
      if (!record) return "";
      const range = formatRange(
        record.start_date,
        record.end_date,
        false,
        educationDateMode,
        presentLabel,
      );
      const detail = textList(record.subjects).join(", ");
      return `<article class="dated-entry">
        <div class="date-col">${escapeHtml(range)}</div>
        <div class="entry-body">
          <h3>${escapeHtml(record.degree ?? "")}</h3>
          <p class="meta">${escapeHtml(String(record.institution ?? ""))}</p>
          ${detail ? `<p>${escapeHtml(detail)}</p>` : ""}
        </div>
      </article>`;
    })
    .join("");

  const skillsHtml = technicalSkills
    .map((entry, index) => {
      const score = skillDotCount(index);
      const dots = Array.from({ length: 5 })
        .map(
          (_, idx) =>
            `<span class="dot ${idx < score ? "on" : ""}"></span>`,
        )
        .join("");
      return `<li><span class="label">${escapeHtml(entry)}</span><span class="dots">${dots}</span></li>`;
    })
    .join("");

  const refsHtml = (references as unknown[])
    .map((entry) => {
      const record = asRecord(entry);
      if (!record) return "";
      return `<article class="reference-entry">
        ${record.organization ? `<p class="reference-orgline">${escapeHtml(String(record.organization))}</p>` : ""}
        <h3>${escapeHtml(String(record.name ?? ""))}</h3>
        ${record.role ? `<p class="reference-role">${escapeHtml(String(record.role))}</p>` : ""}
        ${record.phone ? `<p class="meta">${escapeHtml(String(record.phone))}</p>` : ""}
        ${record.email ? `<p>${escapeHtml(String(record.email))}</p>` : ""}
      </article>`;
    })
    .join("");

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    @page { size: A4; margin: ${margins.top}mm ${margins.right}mm ${margins.bottom}mm ${margins.left}mm; }
    * { box-sizing: border-box; }
    body { margin: 0; font-family: "IBM Plex Sans", Arial, sans-serif; color: ${theme.text}; font-size: 11.4px; line-height: 1.42; }
    .page { width: 100%; min-height: calc(297mm - ${margins.top + margins.bottom}mm); background: ${theme.panel}; }
    .header { background: ${theme.accent}; color: #fff; padding: 5mm 6.6mm; }
    .header h1 { margin: 0; font-size: 10.5mm; font-weight: 700; line-height: 1.05; letter-spacing: 0.02em; }
    .main { display: grid; grid-template-columns: 31% 69%; min-height: calc(297mm - ${margins.top + margins.bottom}mm - 20mm); }
    .sidebar { padding: 5.6mm 5.2mm 7mm; background: ${theme.panel}; }
    .content { padding: 5.6mm 6.2mm 7mm; background: ${theme.contentPanel}; }

    .sidebar section { margin-bottom: 5.3mm; }
    .sidebar h2,
    .content h2 {
      margin: 0 0 2.2mm;
      font-size: 5.05mm;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      font-weight: 700;
      color: ${theme.text};
      display: flex;
      align-items: center;
      gap: 2.2mm;
    }
    .content h2::after {
      content: "";
      flex: 1;
      border-top: 0.24mm solid #c8cdd3;
      margin-top: 0.3mm;
    }
    .sidebar ul { list-style: none; margin: 0; padding: 0; }
    .sidebar li { margin: 1.7mm 0; }
    .sidebar li strong { display: block; margin-bottom: 0.2mm; font-size: 3.8mm; font-weight: 700; }
    .sidebar li span { font-size: 3.65mm; color: ${theme.muted}; line-height: 1.28; }

    .interests-text { margin: 0; color: ${theme.muted}; font-size: 4mm; line-height: 1.35; }
    .rated-list li { display: flex; justify-content: space-between; align-items: center; gap: 3mm; margin: 1.6mm 0; }
    .rated-list .label { font-size: 3.9mm; font-weight: 600; }
    .dots { display: inline-flex; gap: 1.6mm; }
    .dot { width: 2.2mm; height: 2.2mm; border-radius: 999px; background: ${theme.dotOff}; display: inline-block; }
    .dot.on { background: ${theme.dotOn}; }

    .summary { margin: 0 0 3.6mm; color: #343d49; font-size: 4.15mm; line-height: 1.45; }
    .content section { margin-bottom: 5.6mm; }
    .dated-list { position: relative; padding-left: 0; }
    .dated-list::before { content: ""; position: absolute; left: -1.1mm; top: 0.6mm; bottom: 0.6mm; width: 0.22mm; background: ${theme.rail}; }
    .dated-entry {
      position: relative;
      display: grid;
      grid-template-columns: 28mm 1fr;
      column-gap: 4.3mm;
      margin-bottom: 3.3mm;
      align-items: center;
      break-inside: avoid;
      page-break-inside: avoid;
    }
    .dated-entry::before {
      content: "";
      position: absolute;
      left: -1.1mm;
      top: 50%;
      transform: translateY(-50%);
      width: 3.2mm;
      border-top: 0.22mm solid ${theme.rail};
    }
    .date-col { font-size: 3.85mm; color: #2d3845; padding-left: 3.8mm; white-space: nowrap; }
    .entry-body h3 { margin: 0; font-size: 4.9mm; line-height: 1.17; color: #242d37; }
    .entry-body .meta { margin: 0.5mm 0 0.95mm; font-style: italic; color: ${theme.muted}; font-size: 4.05mm; }
    .entry-body p { margin: 0.6mm 0 0; font-size: 3.9mm; color: ${theme.muted}; line-height: 1.38; }
    .entry-body ul { margin: 0.8mm 0 0 4.2mm; padding: 0; }
    .entry-body li { margin: 0.45mm 0; font-size: 3.86mm; line-height: 1.34; }
    .entry-body .product-subsection { margin-top: 1.1mm; }
    .entry-body .product-title { margin: 0 0 0.5mm; font-weight: 700; font-size: 3.7mm; color: #2f3745; }
    .entry-body .product-list { margin: 0; padding-left: 4.2mm; }
    .entry-body .product-list li { margin: 0.35mm 0; }
    .entry-body .publication-links-subsection { margin-top: 1.1mm; }
    .entry-body .publication-links-title { margin: 0 0 0.5mm; font-weight: 700; font-size: 3.7mm; color: #2f3745; }
    .entry-body .publication-links-list { margin: 0; padding-left: 4.2mm; }
    .entry-body .publication-links-list li { margin: 0.35mm 0; }
    .entry-body .publication-links-list a { color: ${theme.dotOn}; text-decoration: none; border-bottom: 0.2mm solid rgba(0,0,0,0.15); }
    .entry-body .publication-links-list a:hover { border-bottom-color: ${theme.dotOn}; }

    .skill-list { list-style: none; margin: 0; padding: 0; }
    .skill-list li { display: flex; justify-content: space-between; align-items: center; gap: 3.6mm; margin: 1.8mm 0; }
    .skill-list .label { font-size: 4.2mm; font-weight: 600; color: #2a3441; }
    .reference-entry {
      margin: 0.7mm 0 2.2mm;
      break-inside: avoid;
      page-break-inside: avoid;
    }
    .reference-orgline { margin: 0 0 0.4mm; font-size: 3.85mm; color: #2d3845; font-weight: 500; }
    .reference-entry h3 { margin: 0; font-size: 4.9mm; line-height: 1.17; color: #242d37; }
    .reference-role { margin: 0.45mm 0 0.25mm; font-style: italic; color: ${theme.muted}; font-size: 4.05mm; }
    .reference-entry .meta { margin: 0.35mm 0 0.15mm; font-style: italic; color: ${theme.muted}; font-size: 4.05mm; }
    .reference-entry p { margin: 0.35mm 0 0; font-size: 3.9mm; color: ${theme.muted}; line-height: 1.36; }

    .content section > ul { margin: 0.8mm 0 0 4.2mm; padding: 0; }
    .content section > ul li { margin: 0.45mm 0; font-size: 3.85mm; color: ${theme.muted}; }
    .subsection { margin-top: 1.7mm; }
    .subsection h3 { margin: 0 0 0.7mm; font-size: 4mm; font-weight: 700; text-transform: none; letter-spacing: 0; color: ${theme.text}; }
    .subsection ul { margin: 0.35mm 0 0 4.2mm; padding: 0; }
    .subsection li { margin: 0.35mm 0; font-size: 3.8mm; color: #2f3946; }
  </style>
</head>
<body>
  <div class="page">
    <header class="header"><h1>${escapeHtml(label(labels, "common.curriculum_vitae", "Curriculum Vitae"))}</h1></header>
    <div class="main">
      <aside class="sidebar">
        ${personalHtml ? `<section><h2>${escapeHtml(label(labels, "sections.personal_details", "Personal details"))}</h2><ul>${personalHtml}</ul></section>` : ""}
        ${interestsHtml ? `<section><h2>${escapeHtml(label(labels, "sections.interests", "Interests"))}</h2><p class="interests-text">${escapeHtml(interestsHtml)}</p></section>` : ""}
        ${languageHtml ? `<section><h2>${escapeHtml(label(labels, "sections.languages", "Languages"))}</h2><ul class="rated-list">${languageHtml}</ul></section>` : ""}
        ${moveSkillsLeft && skillsHtml ? `<section><h2>${escapeHtml(label(labels, "sections.skills", "Skills"))}</h2><ul class="rated-list">${skillsHtml}</ul></section>` : ""}
      </aside>
      <main class="content">
        ${summaryText ? `<section><p class="summary">${escapeHtml(summaryText)}</p></section>` : ""}
        ${workHtml ? `<section><h2>${escapeHtml(label(labels, "sections.work_experience", "Work experience"))}</h2><div class="dated-list">${workHtml}</div></section>` : ""}
        ${educationHtml ? `<section><h2>${escapeHtml(label(labels, "sections.education", "Education and Qualifications"))}</h2><div class="dated-list">${educationHtml}</div></section>` : ""}
        ${!moveSkillsLeft && skillsHtml ? `<section><h2>${escapeHtml(label(labels, "sections.skills", "Skills"))}</h2><ul class="skill-list">${skillsHtml}</ul></section>` : ""}
        ${refsHtml ? `<section><h2>${escapeHtml(label(labels, "sections.references", "References"))}</h2>${refsHtml}</section>` : ""}
        ${optionalCourses}
        ${optionalProjects}
        ${optionalAwards}
        ${optionalVolunteering}
        ${optionalPatents}
        ${optionalPortfolio}
        ${competenciesSection}
      </main>
    </div>
  </div>
</body>
</html>`;
}

