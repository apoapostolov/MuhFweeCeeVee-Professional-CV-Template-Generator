import type { CvDocument } from "../cvStore";
import type { EdinburghThemePalette, TemplateFile } from "./types";
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
  renderReferences,
  renderSimpleList,
  resolveMargins,
  skillDotCount,
  splitName,
  textList,
} from "./shared";
import { normalizeProfileLink } from "./profile-links";
import {
  normalizePhotoMode,
  resolvePhotoClass,
  shouldRenderPhoto,
} from "./themes";

export function renderEdinburghContact(
  value: unknown,
  residence: string,
  fullName: string,
  accent: string,
  labels: Record<string, unknown>,
): string {
  const record = asRecord(value);
  if (!record) return "";

  const rowsData: Array<{ label: string; icon: string; value: string }> = [
    {
      label: label(labels, "contact_labels.name", "Name"),
      icon: "fa-user",
      value: fullName,
    },
    {
      label: label(labels, "contact_labels.address", "Address"),
      icon: "fa-house",
      value: residence,
    },
    {
      label: label(labels, "contact_labels.phone", "Phone"),
      icon: "fa-phone",
      value: String(record.phone_e164 ?? record.phone_local ?? ""),
    },
    {
      label: label(labels, "contact_labels.email", "Email"),
      icon: "fa-envelope",
      value: String(record.email ?? ""),
    },
    {
      label: label(labels, "contact_labels.linkedin", "LinkedIn"),
      icon: "fa-link",
      value:
        normalizeProfileLink(record.linkedin, "linkedin")?.display ??
        String(record.linkedin ?? ""),
    },
    {
      label: label(labels, "contact_labels.github", "GitHub"),
      icon: "fa-link",
      value:
        normalizeProfileLink(record.github, "github")?.display ??
        String(record.github ?? ""),
    },
  ].filter((item) => item.value.trim().length > 0);

  if (!rowsData.length) return "";

  const rows = rowsData
    .map(
      (item) => `<li>
        <span class=\"icon\" style=\"color:${accent}\"><i class=\"fa-solid ${item.icon}\"></i></span>
        <span class=\"kv\"><strong>${escapeHtml(item.label)}</strong><span>${escapeHtml(item.value)}</span></span>
      </li>`,
    )
    .join("");

  return `<section><h3>${escapeHtml(label(labels, "sections.personal_details", "Personal details"))}</h3><ul class=\"contact-list\">${rows}</ul></section>`;
}

export function renderEdinburghInterests(
  value: unknown,
  accent: string,
  labels: Record<string, unknown>,
): string {
  const rows = textList(value)
    .map(
      (item) =>
        `<li><span class=\"sq\" style=\"background:${accent}\"></span><span>${escapeHtml(item)}</span></li>`,
    )
    .join("");
  if (!rows) return "";
  return `<section><h3>${escapeHtml(label(labels, "sections.interests", "Interests"))}</h3><ul class=\"square-bullets\">${rows}</ul></section>`;
}

export function renderEdinburghLanguages(
  value: unknown,
  accent: string,
  labels: Record<string, unknown>,
): string {
  const list = Array.isArray(value) ? value : [];
  const rows = list
    .map((entry) => {
      const record = asRecord(entry);
      if (!record) return "";
      const language = escapeHtml(record.language ?? "");
      const score = languageDotCount(record.proficiency_cefr);
      const dots = Array.from({ length: 5 })
        .map(
          (_, index) =>
            `<span class=\"dot ${index < score ? "on" : ""}\" style=\"${index < score ? `background:${accent};` : ""}\"></span>`,
        )
        .join("");
      return `<li><span class=\"label\">${language}</span><span class=\"dots\">${dots}</span></li>`;
    })
    .join("");
  if (!rows) return "";
  return `<section><h3>${escapeHtml(label(labels, "sections.languages", "Languages"))}</h3><ul class=\"edinburgh-languages\">${rows}</ul></section>`;
}

export function renderEdinburghSkills(
  value: unknown,
  accent: string,
  labels: Record<string, unknown>,
): string {
  const list = textList(value);
  if (!list.length) return "";
  const rows = list
    .map((item, index) => {
      const score = skillDotCount(index);
      const dots = Array.from({ length: 5 })
        .map(
          (_, dotIndex) =>
            `<span class=\"dot ${dotIndex < score ? "on" : ""}\" style=\"${dotIndex < score ? `background:${accent};` : ""}\"></span>`,
        )
        .join("");
      return `<li><span class=\"label\">${escapeHtml(item)}</span><span class=\"dots\">${dots}</span></li>`;
    })
    .join("");
  return `<section><h3>${escapeHtml(label(labels, "sections.skills", "Skills"))}</h3><ul class=\"edinburgh-skills\">${rows}</ul></section>`;
}


export function renderEdinburgh(
  cv: CvDocument,
  template: TemplateFile,
  slots: Record<string, unknown>,
  labels: Record<string, unknown>,
  theme: EdinburghThemePalette,
  photoModeInput?: string,
  _moveSkillsLeft = false,
): string {
  const accent = theme.accent;
  const sidebar = theme.sidebarBackground;
  const margins = resolveMargins(template);
  const experienceDateMode = template.date_display?.experience ?? "exact";
  const educationDateMode = template.date_display?.education ?? "exact";
  const profileSummaryMode =
    template.text_layout?.profile_summary ?? "multi_paragraph";

  const fullName = String(
    slots["person.full_name"] ?? getByPath(cv, "person.full_name") ?? "",
  );
  const parts = splitName(fullName);
  const topNameSize = nameSizeMm(parts.top, 4.4, 2.95);
  const bottomNameSize = nameSizeMm(parts.bottom || parts.top, 4.75, 3.3);
  const residenceRaw = getByPath(cv, "person.residence");
  const residenceRecord = asRecord(residenceRaw);
  const residence = [residenceRecord?.city, residenceRecord?.country]
    .filter(Boolean)
    .map((value) => String(value))
    .join(", ");
  const summary = renderParagraphs(
    slots["positioning.profile_summary"] ??
      getByPath(cv, "positioning.profile_summary"),
    profileSummaryMode,
    "summary-line",
  );
  const competenciesSection = renderEdinburghCompetenciesSection(labels, cv);
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
  const optionalPublications = "";
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
  const presentLabel = label(labels, "common.present", "present");

  const photoValue = slots["profile.photo"];
  const photoUrl = typeof photoValue === "string" ? photoValue.trim() : "";
  const photoMode = normalizePhotoMode(photoModeInput);
  const showPhoto = shouldRenderPhoto(true, photoMode);
  const photoModeClass = resolvePhotoClass(photoMode);

  return `<!doctype html>
<html>
<head>
  <meta charset=\"utf-8\" />
  <link rel=\"stylesheet\" href=\"https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.7.2/css/all.min.css\" />
  <style>
    @page { size: A4; margin: ${margins.top}mm ${margins.right}mm ${margins.bottom}mm ${margins.left}mm; }
    * { box-sizing: border-box; }
    body { margin: 0; font-family: \"IBM Plex Sans\", Arial, sans-serif; color: #202124; font-size: 11.4px; line-height: 1.35; }
    .page { width: 100%; display: grid; grid-template-columns: 34% 66%; min-height: calc(297mm - ${margins.top + margins.bottom}mm); }
    .left { background: ${sidebar}; position: relative; }
    .left-header {
      position: relative;
      background: ${accent};
      color: #fff;
      padding: 12mm 7mm 19mm;
      min-height: 58mm;
      text-align: center;
      overflow: visible;
      z-index: 2;
    }
    .left-header::before {
      content: none;
    }
    .left-header::after {
      content: \"\";
      position: absolute;
      left: 0;
      right: 0;
      bottom: -0.1mm;
      height: 24mm;
      background-image: url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1000 240' preserveAspectRatio='none'%3E%3Cpath d='M0 54 Q500 174 1000 54 L1000 240 L0 240 Z' fill='${encodeURIComponent(sidebar)}'/%3E%3Cpath d='M0 54 Q500 174 1000 54' fill='none' stroke='${encodeURIComponent(theme.arcStroke)}' stroke-width='14' stroke-linecap='round'/%3E%3C/svg%3E\");
      background-size: 100% 100%;
      background-repeat: no-repeat;
      z-index: 3;
    }
    .name-main {
      margin: 0;
      text-transform: uppercase;
      letter-spacing: 0.11em;
      font-size: ${topNameSize}mm;
      font-weight: 600;
      line-height: 1.1;
      max-width: 90%;
      margin-left: auto;
      margin-right: auto;
      white-space: nowrap;
    }
    .name-last {
      margin: 1.2mm 0 0;
      text-transform: uppercase;
      letter-spacing: 0.12em;
      font-size: ${bottomNameSize}mm;
      font-weight: 700;
      line-height: 1.05;
      max-width: 90%;
      margin-left: auto;
      margin-right: auto;
      white-space: nowrap;
    }
    .photo-wrap {
      position: absolute;
      left: 50%;
      bottom: -4.2mm;
      transform: translateX(-50%);
      width: 33mm;
      height: 33mm;
      overflow: visible;
      z-index: 7;
    }
    .photo-wrap::before {
      content: none;
    }
    .photo-frame {
      position: relative;
      z-index: 3;
      width: 100%;
      height: 100%;
      border-radius: 999px;
      border: 0.95mm solid #fff;
      background: #d1d5db;
      overflow: hidden;
      box-shadow: 0 2px 10px rgba(0,0,0,0.2);
    }
    .photo-frame img { width: 100%; height: 100%; object-fit: cover; display: block; }
    .photo-fallback { width: 100%; height: 100%; display:flex; align-items:center; justify-content:center; color:#4b5563; font-size:10mm; }
    .photo-frame.photo-force-circle { border-radius: 999px; }
    .photo-frame.photo-force-square { border-radius: 0; }
    .photo-wrap.photo-force-original { height: auto; bottom: -8mm; }
    .photo-frame.photo-force-original { height: auto; border-radius: 0; overflow: visible; background: transparent; }
    .photo-frame.photo-force-original img { width: 100%; height: auto; max-height: 33mm; object-fit: contain; }
    .photo-frame.photo-force-original .photo-fallback { width: 100%; aspect-ratio: 3 / 4; height: auto; border-radius: 0; }

    .left-body { padding: 10mm 7mm 6mm; font-size: 11.2px; position: relative; z-index: 1; }
    .left-body section { border-top: 1px solid #d7d9dd; padding-top: 11px; margin-bottom: 14px; }
    .left-body section:first-child { border-top: 0; padding-top: 0; }

    h3 { font-size: 13.2px; letter-spacing: 0.12em; text-transform: uppercase; margin: 0 0 8px; font-weight: 700; }
    h2 { font-size: 24px; margin: 0 0 9px; letter-spacing: 0.02em; font-weight: 700; }

    .contact-list { list-style: none; margin: 0; padding: 0; }
    .contact-list li { display: grid; grid-template-columns: 14px 1fr; gap: 7px; margin: 6px 0; }
    .contact-list .icon { font-size: 10px; padding-top: 2px; }
    .contact-list .kv { display: flex; flex-direction: column; gap: 1px; }
    .contact-list .kv strong { font-size: 10.8px; line-height: 1.1; }
    .contact-list .kv span { font-size: 10.8px; color: #3f4349; line-height: 1.2; }

    .square-bullets { list-style: none; margin: 0; padding: 0; }
    .square-bullets li { display: flex; align-items: center; gap: 8px; margin: 5px 0; }
    .square-bullets .sq { width: 6px; height: 6px; display: inline-block; }

    .edinburgh-languages,
    .edinburgh-skills { list-style: none; margin: 0; padding: 0; }
    .edinburgh-languages li,
    .edinburgh-skills li { display: flex; justify-content: space-between; gap: 8px; margin: 7px 0; align-items: center; }
    .edinburgh-languages .label,
    .edinburgh-skills .label { font-weight: 600; font-size: 11.4px; }
    .edinburgh-languages .dots,
    .edinburgh-skills .dots { display: inline-flex; gap: 4px; }
    .edinburgh-languages .dot,
    .edinburgh-skills .dot { width: 8px; height: 8px; border-radius: 999px; background: ${theme.dotOff}; display: inline-block; }

    .right { padding: 6mm 7mm 10mm; background: #fff; }
    .headline { margin: 0 0 8px; font-size: 15px; font-weight: 700; color: #202124; }
    .summary p { margin: 0 0 8px; line-height: 1.48; color: #3f4349; }
    .right > section { margin-bottom: 14px; padding-bottom: 2px; }
    .entry { border-top: 1px solid #ddd; padding-top: 10px; margin-top: 10px; }
    .entry-head { display: flex; justify-content: space-between; gap: 10px; }
    .entry-head h4 { margin: 0; font-size: 14.5px; font-weight: 700; text-transform: none; }
    .entry-head span { font-size: 11.6px; color: #40464f; white-space: nowrap; }
    .org { margin: 3px 0 7px; color: #5f6368; font-weight: 500; }
    .entry ul { margin: 5px 0 0 16px; padding: 0; }
    .entry li { margin: 2px 0; line-height: 1.33; }
    .entry a { color: ${theme.link}; text-decoration: none; border-bottom: 1px solid ${theme.linkBorder}; }
    .entry a:hover { border-bottom-color: ${theme.link}; }
    .product-subsection { margin-top: 6px; }
    .product-title { margin: 0 0 3px; font-weight: 700; font-size: 11.4px; color: #2f3640; }
    .product-list { list-style: none; margin: 0; padding: 0; }
    .product-list li { position: relative; padding-left: 14px; margin: 2px 0; }
    .product-list li::before { content: \"\"; position: absolute; left: 0; top: 6px; width: 6px; height: 6px; background: ${accent}; }
    .product-list .product-name { display: block; font-weight: 600; }
    .product-list .product-note-line { display: flex; align-items: flex-start; gap: 6px; margin-top: 1px; }
    .product-list .product-note-tab { color: #666; font-family: \"JetBrains Mono\", monospace; }
    .product-list .product-note-text { display: block; color: #555; font-size: 10.8px; line-height: 1.35; }
    .publication-links-subsection { margin-top: 7px; }
    .publication-links-title { margin: 0 0 3px; font-weight: 700; font-size: 11.4px; color: #2f3640; }
    .publication-links-list { margin: 0; padding-left: 16px; }
    .publication-links-list li { margin: 2px 0; line-height: 1.32; }
    .edu-details { margin-top: 6px; }
    .edu-detail { margin: 2px 0; color: #3f4349; font-size: 11.2px; line-height: 1.33; }
    .edu-detail strong { color: #262b31; font-weight: 700; }
    .ref { margin-top: 8px; line-height: 1.35; }
    .right .entry,
    .right .ref,
    .right .subsection {
      break-inside: avoid;
      page-break-inside: avoid;
    }
  </style>
</head>
<body>
  <div class=\"page\">
    <aside class=\"left\">
      <div class=\"left-header\">
        <p class=\"name-main\">${escapeHtml(parts.top)}</p>
        ${parts.bottom ? `<p class=\"name-last\">${escapeHtml(parts.bottom)}</p>` : ""}
        ${
          showPhoto
            ? `<div class=\"photo-wrap ${photoModeClass}\">
          <div class=\"photo-frame ${photoModeClass}\">
            ${
              photoUrl
                ? `<img src=\"${escapeHtml(photoUrl)}\" alt=\"Profile photo\" />`
                : `<div class=\"photo-fallback\"><i class=\"fa-solid fa-user\"></i></div>`
            }
          </div>
        </div>`
            : ""
        }
      </div>
      <div class=\"left-body\">
        ${renderEdinburghContact(slots["contact.block"] ?? getByPath(cv, "person.contact"), residence, fullName, accent, labels)}
        ${renderEdinburghLanguages(slots["skills.languages"] ?? getByPath(cv, "skills.languages"), accent, labels)}
        ${renderEdinburghSkills(slots["skills.technical"] ?? getByPath(cv, "skills.technical"), accent, labels)}
        ${renderEdinburghInterests(slots["optional.interests"] ?? getByPath(cv, "optional_sections.interests"), accent, labels)}
      </div>
    </aside>
    <main class=\"right\">
      <section class=\"summary\">${summary}</section>
      ${renderExperience(
        label(labels, "sections.work_experience", "Work experience"),
        slots["experience.items"] ?? getByPath(cv, "experience"),
        experienceDateMode,
        presentLabel,
        labels,
        { includeProducts: true, includePublicationLinks: true },
      )}
      ${renderEducation(
        label(labels, "sections.education", "Education and Qualifications"),
        slots["education.items"] ?? getByPath(cv, "education"),
        educationDateMode,
        presentLabel,
        labels,
        {
          includeDetails: true,
          includeLocation: false,
          includeCompleted: false,
        },
      )}
      ${optionalCourses}
      ${optionalProjects}
      ${optionalAwards}
      ${optionalPublications}
      ${optionalVolunteering}
      ${optionalPatents}
      ${optionalPortfolio}
      ${renderReferences(label(labels, "sections.references", "References"), slots["references.items"] ?? getByPath(cv, "references"))}
      ${competenciesSection}
    </main>
  </div>
</body>
</html>`;
}

