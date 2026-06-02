import type { CvDocument } from "../cvStore";
import { languageLevelLabel, skillBarPercent } from "./cambridge-v1";
import { toPublicationLinks } from "./profile-links";
import { toProductLines } from "./europass-v1";
import type { StanfordThemePalette, TemplateFile } from "./types";
import {
  asRecord,
  escapeHtml,
  formatName,
  formatRange,
  getByPath,
  label,
  nameSizeMm,
  renderEdinburghCompetenciesSection,
  renderEducation,
  renderExperience,
  renderParagraphs,
  renderSimpleList,
  resolveMargins,
  splitName,
  textList,
} from "./shared";
import { normalizeProfileLink } from "./profile-links";
import {
  normalizePhotoMode,
  resolvePhotoClass,
  shouldRenderPhoto,
} from "./themes";

export function renderStanford(
  cv: CvDocument,
  template: TemplateFile,
  slots: Record<string, unknown>,
  labels: Record<string, unknown>,
  theme: StanfordThemePalette,
  photoModeInput?: string,
): string {
  const margins = resolveMargins(template);
  const experienceDateMode = template.date_display?.experience ?? "year";
  const educationDateMode = template.date_display?.education ?? "year";
  const presentLabel = label(labels, "common.present", "present");
  const fullName = String(slots["person.full_name"] ?? getByPath(cv, "person.full_name") ?? "").trim();
  const titleName = formatName(fullName, "first-last");
  const summaryText = textList(slots["positioning.profile_summary"] ?? getByPath(cv, "positioning.profile_summary")).join(" ");
  const photoValue = slots["profile.photo"];
  const photoUrl = typeof photoValue === "string" ? photoValue.trim() : "";
  const photoMode = normalizePhotoMode(photoModeInput);
  const showPhoto = shouldRenderPhoto(true, photoMode);
  const photoModeClass = resolvePhotoClass(photoMode);

  const person = asRecord(getByPath(cv, "person")) ?? {};
  const residence = asRecord(getByPath(cv, "person.residence")) ?? {};
  const contact = asRecord(slots["contact.block"] ?? getByPath(cv, "person.contact")) ?? {};
  const personalRows = [
    { label: label(labels, "contact_labels.name", "Name"), value: String(person.full_name ?? fullName ?? "").trim() },
    {
      label: label(labels, "contact_labels.address", "Address"),
      value: [residence.street, residence.city, residence.country].filter(Boolean).map(String).join(", "),
    },
    { label: label(labels, "contact_labels.phone", "Phone number"), value: String(contact.phone_e164 ?? contact.phone_local ?? "").trim() },
    { label: label(labels, "contact_labels.email", "Email address"), value: String(contact.email ?? "").trim() },
    { label: label(labels, "contact_labels.driving_license", "Driving license"), value: String(contact.driving_license ?? "").trim() },
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

  const interests = textList(slots["optional.interests"] ?? getByPath(cv, "optional_sections.interests"));
  const languages = Array.isArray(slots["skills.languages"] ?? getByPath(cv, "skills.languages"))
    ? (slots["skills.languages"] ?? getByPath(cv, "skills.languages"))
    : [];
  const technicalSkills = textList(slots["skills.technical"] ?? getByPath(cv, "skills.technical"));
  const experiences = Array.isArray(slots["experience.items"] ?? getByPath(cv, "experience"))
    ? (slots["experience.items"] ?? getByPath(cv, "experience"))
    : [];
  const education = Array.isArray(slots["education.items"] ?? getByPath(cv, "education"))
    ? (slots["education.items"] ?? getByPath(cv, "education"))
    : [];
  const referencesRaw = slots["references.items"] ?? getByPath(cv, "references");
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
    .map((row) => `<li><strong>${escapeHtml(row.label)}</strong><span>${escapeHtml(row.value)}</span></li>`)
    .join("");
  const interestsHtml = interests.map((entry) => `<li>${escapeHtml(entry)}</li>`).join("");
  const languageHtml = (languages as unknown[])
    .map((entry) => {
      const record = asRecord(entry);
      if (!record) return "";
      return `<li><span class="lname">${escapeHtml(record.language ?? "")}</span><span class="llevel">${escapeHtml(languageLevelLabel(record.proficiency_cefr, labels))}</span></li>`;
    })
    .join("");

  const workHtml = (experiences as unknown[])
    .map((entry) => {
      const record = asRecord(entry);
      if (!record) return "";
      const range = formatRange(record.start_date, record.end_date, record.is_current, experienceDateMode, presentLabel);
      const orgLine = [String(record.employer ?? "").trim(), String(asRecord(record.location)?.city ?? "").trim()]
        .filter(Boolean)
        .join(", ");
      const bullets = textList(record.responsibilities).map((item) => `<li>${escapeHtml(item)}</li>`).join("");
      const body = bullets ? `<ul>${bullets}</ul>` : `<p>${escapeHtml(textList(record.summary).join(" "))}</p>`;
      const productLines = toProductLines(record.products);
      const publicationLinks = toPublicationLinks(record.publication_links);
      const productsHtml = productLines.length
        ? `<div class="product-subsection"><p class="product-title">${escapeHtml(label(labels, "sections.worked_on_projects", "Worked on projects"))}</p><ul class="product-list">${productLines.map((line) => `<li>${escapeHtml(line)}</li>`).join("")}</ul></div>`
        : "";
      const publicationLinksHtml = publicationLinks.length
        ? `<div class="publication-links-subsection"><p class="publication-links-title">${escapeHtml(label(labels, "sections.publication_links", "Publication links"))}</p><ul class="publication-links-list">${publicationLinks.map((item) => `<li><a href="${escapeHtml(item.href)}" target="_blank" rel="noopener noreferrer">${escapeHtml(item.title)}</a></li>`).join("")}</ul></div>`
        : "";
      return `<article class="entry"><div class="entry-head"><h3>${escapeHtml(record.role ?? "")}</h3>${range ? `<span class="date">${escapeHtml(range)}</span>` : ""}</div><p class="meta">${escapeHtml(orgLine)}</p>${body}${productsHtml}${publicationLinksHtml}</article>`;
    })
    .join("");

  const educationHtml = (education as unknown[])
    .map((entry) => {
      const record = asRecord(entry);
      if (!record) return "";
      const range = formatRange(record.start_date, record.end_date, false, educationDateMode, presentLabel);
      const detail = textList(record.subjects).join(", ");
      return `<article class="entry"><div class="entry-head"><h3>${escapeHtml(record.degree ?? "")}</h3>${range ? `<span class="date">${escapeHtml(range)}</span>` : ""}</div><p class="meta">${escapeHtml(String(record.institution ?? ""))}</p>${detail ? `<p>${escapeHtml(detail)}</p>` : ""}</article>`;
    })
    .join("");

  const skillsHtml = technicalSkills
    .map((entry, index) => `<div class="skill"><span class="skill-name">${escapeHtml(entry)}</span><div class="bar"><div class="fill" style="width:${skillBarPercent(index)}%"></div></div></div>`)
    .join("");

  const referenceItem = asRecord(references[0]);
  const refsHtml = referenceItem
    ? `<article class="reference"><div class="reference-head"><h3>${escapeHtml(String(referenceItem.name ?? ""))}</h3><span class="reference-org">${escapeHtml(String(referenceItem.organization ?? ""))}</span></div>${referenceItem.phone ? `<p>${escapeHtml(String(referenceItem.phone ?? ""))}</p>` : ""}${referenceItem.email ? `<p>${escapeHtml(String(referenceItem.email ?? ""))}</p>` : ""}</article>`
    : "";

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    @page { size: A4; margin: ${margins.top}mm ${margins.right}mm ${margins.bottom}mm ${margins.left}mm; }
    * { box-sizing: border-box; }
    body { margin: 0; font-family: "Lato", "Helvetica Neue", Arial, sans-serif; color: #242d37; font-size: 11.5px; line-height: 1.44; }
    .page { width: 100%; min-height: calc(297mm - ${margins.top + margins.bottom}mm); display: grid; grid-template-columns: 31.5% 68.5%; background: #f3f4f6; }
    .sidebar { background: ${theme.sidebar}; color: ${theme.sidebarText}; padding: 8.2mm 7mm; }
    .content { background: #fff; padding: 8.4mm 7.8mm 8mm; }

    .profile { text-align: left; margin-bottom: 7.2mm; min-height: 44mm; display: flex; align-items: center; justify-content: center; }
    .profile.profile-original { align-items: flex-end; }
    .avatar-wrap { width: 41mm; height: 41mm; margin: 0 auto; border-radius: 50%; overflow: hidden; border: 0.7mm solid rgba(255,255,255,0.85); box-shadow: 0 2px 10px rgba(0,0,0,0.22); }
    .avatar-wrap img { width: 100%; height: 100%; object-fit: cover; display: block; }
    .avatar-fallback { width: 100%; height: 100%; display:flex; align-items:center; justify-content:center; font-size: 13mm; color: ${theme.sidebarMuted}; background: rgba(0,0,0,0.2); }
    .avatar-wrap.photo-force-circle { border-radius: 999px; }
    .avatar-wrap.photo-force-square { border-radius: 0; }
    .avatar-wrap.photo-force-original { height: auto; border-radius: 0; }
    .avatar-wrap.photo-force-original img { width: 100%; height: auto; max-height: 41mm; object-fit: contain; }
    .avatar-wrap.photo-force-original .avatar-fallback { width: 100%; aspect-ratio: 3 / 4; height: auto; border-radius: 0; }

    .sidebar h2 { margin: 0 0 2.2mm; padding-bottom: 1.4mm; font-size: 4.05mm; font-weight: 700; text-transform: none; border-bottom: none; letter-spacing: 0; position: relative; }
    .sidebar h2::after { content: ""; display: block; width: calc(100% + 7mm); margin-top: 1.4mm; border-top: 0.25mm solid #ffffff; }
    .sidebar section { margin-bottom: 5.4mm; padding-right: 0; }
    .sidebar ul { list-style: none; margin: 0; padding: 0; }
    .sidebar li { margin: 1.5mm 0; }
    .sidebar li strong { display: block; font-size: 3.2mm; margin-bottom: 0.28mm; color: ${theme.sidebarText}; font-weight: 700; }
    .sidebar li span { color: ${theme.sidebarMuted}; font-size: 3.03mm; line-height: 1.32; }
    .languages li { display: grid; grid-template-columns: minmax(0, 1fr) auto; align-items: baseline; column-gap: 2mm; }
    .languages .lname { color: ${theme.sidebarText}; font-weight: 700; font-size: 3.22mm; }
    .languages .llevel { color: ${theme.sidebarMuted}; font-size: 3.04mm; white-space: nowrap; }

    .name { margin: 0 0 4.2mm; font-size: 8.1mm; line-height: 1.06; font-weight: 500; letter-spacing: 0.01em; color: #1f2731; }
    .name-divider { border: 0; border-top: 0.24mm solid #d7dce2; margin: 0 0 4.2mm; }
    .summary { margin: 0 0 4.1mm; color: #3c4551; line-height: 1.46; font-size: 3.56mm; }
    .intro-divider { border: none; border-top: 0.26mm solid #d5dae0; margin: 0 0 4.6mm; }
    .content section { margin-bottom: 5.1mm; }
    .content h2 { margin: 0 0 2.1mm; padding-bottom: 1.7mm; font-size: 5.1mm; line-height: 1.12; font-weight: 700; text-transform: none; letter-spacing: 0; border-bottom: 0.24mm solid #d7dce2; color: #222c38; }
    .work-section h2 { border-bottom: none; padding-bottom: 0; margin-bottom: 2.6mm; }
    .work-section { border-bottom: 0.24mm solid #d7dce2; padding-bottom: 2.4mm; margin-bottom: 4.2mm; }
    .work-section .section-divider { border-top: 0.24mm solid #d7dce2; margin: 0 0 2.8mm; }

    .entry { margin-bottom: 3.4mm; }
    .entry-head { display: grid; grid-template-columns: minmax(0, 1fr) auto; align-items: baseline; column-gap: 3mm; }
    .entry h3 { margin: 0; font-size: 4.68mm; line-height: 1.2; font-weight: 700; color: #222c38; }
    .date { font-weight: 400; color: #303a47; font-size: 3.6mm; white-space: nowrap; text-align: right; }
    .meta { margin: 0.6mm 0 0.9mm; color: #515c6a; font-style: italic; font-size: 3.72mm; }
    .entry p { margin: 0.7mm 0 0; color: #3a4452; font-size: 3.5mm; }
    .entry ul { margin: 0.6mm 0 0 4.1mm; padding: 0; }
    .entry li { margin: 0.35mm 0; font-size: 3.5mm; }
    .entry .product-subsection { margin-top: 1.1mm; }
    .entry .product-title { margin: 0 0 0.45mm; font-weight: 700; font-size: 3.45mm; color: #2f3745; }
    .entry .product-list { margin: 0; padding-left: 4.1mm; }
    .entry .product-list li { margin: 0.3mm 0; }
    .entry .publication-links-subsection { margin-top: 1.05mm; }
    .entry .publication-links-title { margin: 0 0 0.45mm; font-weight: 700; font-size: 3.45mm; color: #2f3745; }
    .entry .publication-links-list { margin: 0; padding-left: 4.1mm; }
    .entry .publication-links-list li { margin: 0.3mm 0; }
    .entry .publication-links-list a { color: #49566a; text-decoration: none; border-bottom: 0.2mm solid rgba(0,0,0,0.14); }
    .entry .publication-links-list a:hover { border-bottom-color: #49566a; }

    .skill { display: grid; grid-template-columns: minmax(0, 1fr) 37mm; align-items: center; gap: 4.6mm; margin-bottom: 3mm; }
    .skill-name { font-size: 4.02mm; font-weight: 700; color: #26303c; }
    .bar { height: 1.72mm; background: ${theme.barTrack}; border-radius: 99px; overflow: hidden; }
    .fill { height: 100%; background: ${theme.barFill}; border-radius: 99px; }

    .reference { margin-top: 0.4mm; }
    .reference-head { display: grid; grid-template-columns: minmax(0, 1fr) auto; align-items: baseline; column-gap: 2.4mm; margin-bottom: 0.8mm; }
    .reference h3 { margin: 0; font-size: 4.5mm; color: #222c38; }
    .reference-org { color: #444f5e; font-size: 3.9mm; }
    .reference p { margin: 0.35mm 0; font-style: italic; color: #3b4552; }
    .content section > ul { margin: 0.8mm 0 0 4.1mm; padding: 0; }
    .content section > ul li { margin: 0.35mm 0; font-size: 3.5mm; color: #3a4452; }
    .subsection { margin-top: 1.6mm; }
    .subsection h3 { margin: 0 0 0.7mm; font-size: 4.05mm; font-weight: 700; color: #222c38; text-transform: none; letter-spacing: 0; }
    .subsection ul { margin: 0.35mm 0 0 4.1mm; padding: 0; }
    .subsection li { margin: 0.3mm 0; font-size: 3.48mm; color: #3a4452; }
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
              : `<div class="avatar-fallback">👤</div>`
          }
        </div>
      </div>`
          : ""
      }
      ${personalHtml ? `<section><h2>${escapeHtml(label(labels, "sections.personal_details", "Personal details"))}</h2><ul>${personalHtml}</ul></section>` : ""}
      ${interestsHtml ? `<section><h2>${escapeHtml(label(labels, "sections.interests", "Interests"))}</h2><ul>${interestsHtml}</ul></section>` : ""}
      ${languageHtml ? `<section><h2>${escapeHtml(label(labels, "sections.languages", "Languages"))}</h2><ul class="languages">${languageHtml}</ul></section>` : ""}
    </aside>
    <main class="content">
      ${titleName ? `<h1 class="name">${escapeHtml(titleName)}</h1>` : ""}
      ${titleName ? `<hr class="name-divider" />` : ""}
      ${summaryText ? `<section class="summary"><p>${escapeHtml(summaryText)}</p></section>` : ""}
      ${workHtml ? `<section class="work-section"><h2>${escapeHtml(label(labels, "sections.work_experience", "Work experience"))}</h2><div class="section-divider"></div>${workHtml}</section>` : ""}
      ${educationHtml ? `<section><h2>${escapeHtml(label(labels, "sections.education", "Education and Qualifications"))}</h2>${educationHtml}</section>` : ""}
      ${skillsHtml ? `<section><h2>${escapeHtml(label(labels, "sections.skills", "Skills"))}</h2>${skillsHtml}</section>` : ""}
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
</body>
</html>`;
}

