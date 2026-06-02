import type { CvDocument } from "../cvStore";
import type { HarvardThemePalette, TemplateFile } from "./types";
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
  splitName,
  textList,
} from "./shared";
import {
  normalizeProfileLink,
  toPublicationLinks,
} from "./profile-links";
import { toProductLines } from "./europass-v1";
import {
  normalizePhotoMode,
  resolvePhotoClass,
  shouldRenderPhoto,
} from "./themes";

export function renderHarvard(
  cv: CvDocument,
  template: TemplateFile,
  slots: Record<string, unknown>,
  labels: Record<string, unknown>,
  theme: HarvardThemePalette,
  photoModeInput?: string,
  moveSkillsLeft = false,
): string {
  const margins = resolveMargins(template);
  const experienceDateMode = template.date_display?.experience ?? "year";
  const educationDateMode = template.date_display?.education ?? "year";
  const presentLabel = label(labels, "common.present", "present");

  const fullName = String(
    slots["person.full_name"] ?? getByPath(cv, "person.full_name") ?? "",
  ).trim();
  const titleName = formatName(
    fullName,
    template.name_display?.title ?? "first-last",
  );
  const summaryText = textList(
    slots["positioning.profile_summary"] ??
      getByPath(cv, "positioning.profile_summary"),
  ).join(" ");
  const photoValue = slots["profile.photo"];
  const photoUrl = typeof photoValue === "string" ? photoValue.trim() : "";
  const photoMode = normalizePhotoMode(photoModeInput);
  const showPhoto = shouldRenderPhoto(true, photoMode);
  const photoModeClass = resolvePhotoClass(photoMode);

  const person = asRecord(getByPath(cv, "person")) ?? {};
  const residence = asRecord(getByPath(cv, "person.residence")) ?? {};
  const contact =
    asRecord(slots["contact.block"] ?? getByPath(cv, "person.contact")) ?? {};

  const personalRows = [
    {
      icon: "fa-user",
      label: label(labels, "contact_labels.name", "Name"),
      value: String(person.full_name ?? fullName ?? "").trim(),
    },
    {
      icon: "fa-house",
      label: label(labels, "contact_labels.address", "Address"),
      value: [residence.street, residence.city, residence.country]
        .filter(Boolean)
        .map(String)
        .join(", "),
    },
    {
      icon: "fa-phone",
      label: label(labels, "contact_labels.phone", "Phone"),
      value: String(contact.phone_e164 ?? contact.phone_local ?? "").trim(),
    },
    {
      icon: "fa-envelope",
      label: label(labels, "contact_labels.email", "Email address"),
      value: String(contact.email ?? "").trim(),
    },
    {
      icon: "fa-link",
      label: label(labels, "contact_labels.linkedin", "LinkedIn"),
      value:
        normalizeProfileLink(contact.linkedin, "linkedin")?.display ??
        String(contact.linkedin ?? "").trim(),
    },
    {
      icon: "fa-link",
      label: label(labels, "contact_labels.github", "GitHub"),
      value:
        normalizeProfileLink(contact.github, "github")?.display ??
        String(contact.github ?? "").trim(),
    },
  ].filter((item) => item.value.length > 0);

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

  const personalDetailsHtml = personalRows
    .map(
      (item) => `<li>
      <span class="icon"><i class="fa-solid ${item.icon}"></i></span>
      <span class="kv"><strong>${escapeHtml(item.label)}</strong><span>${escapeHtml(item.value)}</span></span>
    </li>`,
    )
    .join("");

  const interestsHtml = interests
    .map(
      (item) =>
        `<li><span class="sq"></span><span>${escapeHtml(item)}</span></li>`,
    )
    .join("");

  const languageRows = (languages as unknown[])
    .map((entry) => {
      const record = asRecord(entry);
      if (!record) return "";
      const score = languageDotCount(record.proficiency_cefr);
      const stars = Array.from({ length: 5 })
        .map(
          (_, index) =>
            `<span class="star ${index < score ? "on" : ""}">★</span>`,
        )
        .join("");
      return `<li><span class="label">${escapeHtml(record.language ?? "")}</span><span class="stars">${stars}</span></li>`;
    })
    .join("");

  function timelineSectionHtml(
    titleText: string,
    iconClass: string,
    items: string[],
    extraClass = "",
  ): string {
    if (!items.length) return "";
    return `<section class="${extraClass}">
      <h2><span class="section-icon"><i class="fa-solid ${iconClass}"></i></span>${escapeHtml(titleText)}</h2>
      <div class="timeline">${items.join("")}</div>
    </section>`;
  }

  const experienceItems = (experiences as unknown[])
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
      const productLines = toProductLines(record.products);
      const publicationLinks = toPublicationLinks(record.publication_links);
      const productsHtml = productLines.length
        ? `<div class="product-subsection"><p class="product-title">${escapeHtml(label(labels, "sections.worked_on_projects", "Worked on projects"))}</p><ul class="product-list">${productLines.map((line) => `<li>${escapeHtml(line)}</li>`).join("")}</ul></div>`
        : "";
      const publicationLinksHtml = publicationLinks.length
        ? `<div class="publication-links-subsection"><p class="publication-links-title">${escapeHtml(label(labels, "sections.publication_links", "Publication links"))}</p><ul class="publication-links-list">${publicationLinks.map((item) => `<li><a href="${escapeHtml(item.href)}" target="_blank" rel="noopener noreferrer">${escapeHtml(item.title)}</a></li>`).join("")}</ul></div>`
        : "";
      return `<article class="timeline-item">
        <span class="timeline-dot"></span>
        <div class="timeline-date">${escapeHtml(range)}</div>
        <div class="timeline-body">
          <h3>${escapeHtml(record.role ?? "")}</h3>
          ${orgLine ? `<p class="meta">${escapeHtml(orgLine)}</p>` : ""}
          ${bullets ? `<ul>${bullets}</ul>` : ""}
          ${productsHtml}
          ${publicationLinksHtml}
        </div>
      </article>`;
    })
    .filter(Boolean);

  const educationItems = (education as unknown[])
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
      const orgLine = String(record.institution ?? "").trim();
      const detail = textList(record.subjects).join(", ");
      return `<article class="timeline-item">
        <span class="timeline-dot"></span>
        <div class="timeline-date">${escapeHtml(range)}</div>
        <div class="timeline-body">
          <h3>${escapeHtml(record.degree ?? "")}</h3>
          ${orgLine ? `<p class="meta">${escapeHtml(orgLine)}</p>` : ""}
          ${detail ? `<p>${escapeHtml(detail)}</p>` : ""}
        </div>
      </article>`;
    })
    .filter(Boolean);

  const skillRows = technicalSkills
    .map((item, index) => {
      const score = skillDotCount(index);
      const stars = Array.from({ length: 5 })
        .map(
          (_, starIndex) =>
            `<span class="star ${starIndex < score ? "on" : ""}">★</span>`,
        )
        .join("");
      return `<li><span class="label">${escapeHtml(item)}</span><span class="stars">${stars}</span></li>`;
    })
    .join("");

  const referenceItem = asRecord(references[0]);
  const referencesItems = referenceItem
    ? [
        `<article class="timeline-item">
          <span class="timeline-dot"></span>
          <div class="timeline-date">${escapeHtml(String(referenceItem.organization ?? ""))}</div>
          <div class="timeline-body">
            <h3>${escapeHtml(String(referenceItem.name ?? ""))}</h3>
            ${referenceItem.phone ? `<p class="meta">${escapeHtml(String(referenceItem.phone))}</p>` : ""}
            ${referenceItem.email ? `<p>${escapeHtml(String(referenceItem.email))}</p>` : ""}
          </div>
        </article>`,
      ]
    : [];

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.7.2/css/all.min.css" />
  <style>
    @page { size: A4; margin: ${margins.top}mm ${margins.right}mm ${margins.bottom}mm ${margins.left}mm; }
    * { box-sizing: border-box; }
    body { margin: 0; font-family: "IBM Plex Sans", Arial, sans-serif; color: #1f2937; font-size: 11.2px; line-height: 1.42; }
    .page { width: 100%; min-height: calc(297mm - ${margins.top + margins.bottom}mm); display: grid; grid-template-columns: 31% 69%; }
    .sidebar { background: ${theme.sidebar}; color: ${theme.sidebarText}; padding: 11mm 5.5mm 9mm; }
    .content { background: #fff; padding: 7mm 6.5mm 9mm; }

    .profile {
      text-align: center;
      margin: 0 0 8mm;
      min-height: 44mm;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .profile.profile-original { align-items: flex-end; }
    .avatar-wrap { width: 40mm; height: 40mm; border-radius: 50%; overflow: hidden; border: 0.9mm solid rgba(255,255,255,0.9); box-shadow: 0 2px 10px rgba(0,0,0,0.25); margin: 0 auto; }
    .avatar-wrap img { width: 100%; height: 100%; object-fit: cover; display: block; }
    .avatar-fallback { width: 100%; height: 100%; display:flex; align-items:center; justify-content:center; font-size: 14mm; color: ${theme.sidebarMuted}; background: rgba(0,0,0,0.12); }
    .avatar-wrap.photo-force-circle { border-radius: 999px; }
    .avatar-wrap.photo-force-square { border-radius: 0; }
    .avatar-wrap.photo-force-original { height: auto; border-radius: 0; }
    .avatar-wrap.photo-force-original img { width: 100%; height: auto; max-height: 40mm; object-fit: contain; }
    .avatar-wrap.photo-force-original .avatar-fallback { width: 100%; aspect-ratio: 3 / 4; height: auto; border-radius: 0; }

    .sidebar h3 {
      margin: 0 0 4.5mm;
      font-size: 6.1mm;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      font-weight: 700;
    }
    .sidebar section { margin-bottom: 7.5mm; }
    .sidebar ul { list-style: none; margin: 0; padding: 0; }
    .personal-list li { display: grid; grid-template-columns: 5mm 1fr; gap: 2.3mm; margin: 1.9mm 0; align-items: start; }
    .personal-list .icon { padding-top: 0.4mm; color: ${theme.sidebarText}; font-size: 3.6mm; }
    .personal-list .kv { display: flex; flex-direction: column; gap: 0.4mm; }
    .personal-list .kv strong { font-size: 3.5mm; line-height: 1.1; font-weight: 700; }
    .personal-list .kv span { font-size: 3.35mm; line-height: 1.2; color: ${theme.sidebarMuted}; }

    .sq-list li { display: flex; align-items: center; gap: 2.4mm; margin: 1.6mm 0; }
    .sq-list .sq { width: 2.1mm; height: 2.1mm; background: ${theme.sidebarText}; }

    .star-list li { display: flex; justify-content: space-between; gap: 3mm; margin: 1.8mm 0; align-items: center; }
    .star-list .label { font-size: 3.5mm; font-weight: 600; }
    .star-list .stars { letter-spacing: 0.7mm; white-space: nowrap; }
    .star { color: ${theme.starOff}; font-size: 3.8mm; }
    .star.on { color: ${theme.starOn}; }

    .name { margin: 0; font-size: 8.4mm; letter-spacing: 0.08em; text-transform: uppercase; line-height: 1.08; font-weight: 600; color: #1f2937; }
    .summary { margin-top: 3.4mm; margin-bottom: 4.2mm; color: #394150; font-size: 4.05mm; line-height: 1.45; }
    .intro-divider { border: 0; border-top: 0.35mm solid #d7dde6; margin: 0 0 4.5mm; }

    .content section { margin-bottom: 6.4mm; }
    .content h2 {
      margin: 0 0 2.8mm;
      font-size: 5.8mm;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      font-weight: 700;
      display: flex;
      align-items: center;
      gap: 2.6mm;
      color: #1f2937;
    }
    .section-icon {
      width: 8.2mm;
      height: 8.2mm;
      border-radius: 50%;
      border: 0.35mm solid #1f2937;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: 3.5mm;
      flex: 0 0 auto;
    }
    .timeline { position: relative; padding-left: 11mm; }
    .timeline::before { content: ""; position: absolute; left: 4.1mm; top: 0; bottom: 0; width: 0.35mm; background: ${theme.timeline}; }
    .timeline-item {
      position: relative;
      display: grid;
      grid-template-columns: 28mm 1fr;
      gap: 5mm;
      margin-bottom: 4.2mm;
      break-inside: avoid;
      page-break-inside: avoid;
    }
    .timeline-dot {
      position: absolute;
      left: -8.25mm;
      top: 1.25mm;
      width: 3.1mm;
      height: 3.1mm;
      border-radius: 50%;
      background: #fff;
      border: 0.35mm solid ${theme.timeline};
    }
    .timeline-date { font-size: 3.55mm; color: #374151; padding-top: 0.2mm; }
    .timeline-body h3 { margin: 0; font-size: 4.35mm; line-height: 1.2; font-weight: 700; text-transform: none; letter-spacing: 0; color: #1f2937; }
    .timeline-body .meta { margin: 0.8mm 0 1.1mm; color: ${theme.meta}; font-size: 3.8mm; }
    .timeline-body p { margin: 0 0 1.1mm; color: #3b4452; font-size: 3.7mm; }
    .timeline-body ul { margin: 0.8mm 0 0 4.2mm; padding: 0; }
    .timeline-body li { margin: 0.5mm 0; line-height: 1.34; color: #2f3745; font-size: 3.7mm; }
    .timeline-body .product-subsection { margin-top: 1.2mm; }
    .timeline-body .product-title { margin: 0 0 0.5mm; font-weight: 700; font-size: 3.6mm; color: #2f3745; }
    .timeline-body .product-list { margin: 0; padding-left: 4.2mm; }
    .timeline-body .product-list li { margin: 0.35mm 0; }
    .timeline-body .publication-links-subsection { margin-top: 1.1mm; }
    .timeline-body .publication-links-title { margin: 0 0 0.5mm; font-weight: 700; font-size: 3.6mm; color: #2f3745; }
    .timeline-body .publication-links-list { margin: 0; padding-left: 4.2mm; }
    .timeline-body .publication-links-list li { margin: 0.35mm 0; }
    .timeline-body .publication-links-list a { color: ${theme.meta}; text-decoration: none; border-bottom: 0.2mm solid rgba(0,0,0,0.14); }
    .timeline-body .publication-links-list a:hover { border-bottom-color: ${theme.meta}; }
    .content section > ul { margin: 0.9mm 0 0 4.2mm; padding: 0; }
    .content section > ul li { margin: 0.5mm 0; line-height: 1.34; color: #2f3745; font-size: 3.7mm; }
    .subsection { margin-top: 1.7mm; }
    .subsection h3 { margin: 0 0 0.8mm; font-size: 4.1mm; letter-spacing: 0; text-transform: none; }
    .subsection ul { margin: 0.4mm 0 0 4.2mm; padding: 0; }
    .subsection li { margin: 0.4mm 0; color: #2f3745; font-size: 3.65mm; }
  </style>
</head>
<body>
  <div class="page">
    <aside class="sidebar">
      ${
        showPhoto
          ? `<div class="profile ${photoMode === "on-original" ? "profile-original" : ""}">
        <div class="avatar-wrap ${photoModeClass}">
          ${
            photoUrl
              ? `<img src="${escapeHtml(photoUrl)}" alt="Profile photo" />`
              : `<div class="avatar-fallback"><i class="fa-solid fa-user"></i></div>`
          }
        </div>
      </div>`
          : ""
      }
      ${
        personalDetailsHtml
          ? `<section><h3>${escapeHtml(label(labels, "sections.personal_details", "Personal details"))}</h3><ul class="personal-list">${personalDetailsHtml}</ul></section>`
          : ""
      }
      ${
        interestsHtml
          ? `<section><h3>${escapeHtml(label(labels, "sections.interests", "Interests"))}</h3><ul class="sq-list">${interestsHtml}</ul></section>`
          : ""
      }
      ${
        languageRows
          ? `<section><h3>${escapeHtml(label(labels, "sections.languages", "Languages"))}</h3><ul class="star-list">${languageRows}</ul></section>`
          : ""
      }
      ${
        moveSkillsLeft && skillRows
          ? `<section><h3>${escapeHtml(label(labels, "sections.skills", "Skills"))}</h3><ul class="star-list">${skillRows}</ul></section>`
          : ""
      }
    </aside>
    <main class="content">
      ${titleName ? `<h1 class="name">${escapeHtml(titleName)}</h1>` : ""}
      ${summaryText ? `<p class="summary">${escapeHtml(summaryText)}</p>` : ""}
      <hr class="intro-divider" />
      ${timelineSectionHtml(label(labels, "sections.work_experience", "Work experience"), "fa-briefcase", experienceItems)}
      ${timelineSectionHtml(label(labels, "sections.education", "Education and Qualifications"), "fa-graduation-cap", educationItems)}
      ${
        !moveSkillsLeft && skillRows
          ? `<section><h2><span class="section-icon"><i class="fa-solid fa-screwdriver-wrench"></i></span>${escapeHtml(label(labels, "sections.skills", "Skills"))}</h2><ul class="star-list">${skillRows}</ul></section>`
          : ""
      }
      ${timelineSectionHtml(label(labels, "sections.references", "References"), "fa-id-badge", referencesItems)}
      ${optionalCourses}
      ${optionalProjects}
      ${optionalAwards}
      ${optionalVolunteering}
      ${optionalPatents}
      ${optionalPortfolio}
      ${competenciesSection}
    </main>
  </div>
</body>
</html>`;
}

