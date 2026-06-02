import type { CvDocument } from "../cvStore";
import type { TemplateFile } from "./types";
import {
  asRecord,
  escapeHtml,
  formatDateValue,
  formatRange,
  getByPath,
  label,
  renderParagraphs,
  resolveMargins,
  textList,
} from "./shared";
import { toPublicationLinks } from "./profile-links";

export function renderEuropassRow(labelText: string, valueHtml: string): string {
  if (!valueHtml.trim()) return "";
  return `<div class=\"erow\"><div class=\"elabel\">${escapeHtml(labelText)}</div><div class=\"evalue\">${valueHtml}</div></div>`;
}

export function renderEuropassSimpleList(items: string[]): string {
  const rows = items
    .filter((item) => item.trim().length > 0)
    .map((item) => `<li>${escapeHtml(item)}</li>`)
    .join("");
  return rows ? `<ul>${rows}</ul>` : "";
}

export function toProductLines(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .flatMap((item) => {
      if (typeof item === "string") {
        const trimmed = item.trim();
        return trimmed ? [trimmed] : [];
      }
      const record = asRecord(item);
      if (!record) {
        return [];
      }
      const name = String(record.name ?? "").trim();
      const note = String(record.note ?? "").trim();
      if (!name) {
        return [];
      }
      return note ? [`${name} - ${note}`] : [name];
    })
    .filter((item) => item.length > 0);
}

export { normalizeProfileLink, normalizeUrl, toPublicationLinks } from "./profile-links";

export function renderEuropass(
  cv: CvDocument,
  template: TemplateFile,
  slots: Record<string, unknown>,
  labels: Record<string, unknown>,
): string {
  const margins = resolveMargins(template);
  const experienceDateMode = template.date_display?.experience ?? "exact";
  const educationDateMode = template.date_display?.education ?? "exact";
  const presentLabel = label(labels, "common.present", "present");

  const person = asRecord(getByPath(cv, "person")) ?? {};
  const contact =
    asRecord(slots["contact.block"] ?? getByPath(cv, "person.contact")) ?? {};
  const residence = asRecord(getByPath(cv, "person.residence")) ?? {};
  const fullName = String(
    slots["person.full_name"] ?? getByPath(cv, "person.full_name") ?? "",
  );
  const profileSummary = renderParagraphs(
    slots["positioning.profile_summary"] ??
      getByPath(cv, "positioning.profile_summary"),
    "single_paragraph",
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
  const languages = Array.isArray(
    slots["skills.languages"] ?? getByPath(cv, "skills.languages"),
  )
    ? (slots["skills.languages"] ?? getByPath(cv, "skills.languages"))
    : [];
  const technical = textList(
    slots["skills.technical"] ?? getByPath(cv, "skills.technical"),
  );
  const social = textList(
    slots["skills.social"] ?? getByPath(cv, "skills.social"),
  );
  const core = textList(getByPath(cv, "skills.core_strengths"));
  const otherSkills = textList(getByPath(cv, "optional_sections.other_skills"));
  const publications = textList(
    getByPath(cv, "optional_sections.publications"),
  );
  const certifications = textList(
    getByPath(cv, "optional_sections.certifications"),
  );
  const projects = textList(getByPath(cv, "optional_sections.projects"));
  const awards = textList(getByPath(cv, "optional_sections.awards"));
  const volunteering = textList(
    getByPath(cv, "optional_sections.volunteering"),
  );
  const patents = textList(getByPath(cv, "optional_sections.patents"));
  const portfolioLinks = textList(
    getByPath(cv, "optional_sections.portfolio_links"),
  );
  const interests = textList(getByPath(cv, "optional_sections.interests"));
  const references = Array.isArray(getByPath(cv, "references"))
    ? (getByPath(cv, "references") as unknown[])
    : [];
  const drivingLicense = String(contact.driving_license ?? "");
  const motherTongue = (languages as unknown[])
    .map((item) => asRecord(item))
    .find(
      (record) =>
        String(record?.proficiency_cefr ?? "").toLowerCase() === "native",
    );
  const otherLanguages = (languages as unknown[])
    .map((item) => asRecord(item))
    .filter((record) => record && record !== motherTongue);

  const contactBlock = [
    renderEuropassRow(
      label(labels, "personal.name", "Name"),
      escapeHtml(fullName),
    ),
    renderEuropassRow(
      label(labels, "personal.address", "Address"),
      escapeHtml(
        [
          residence.street,
          residence.postal_code,
          residence.city,
          residence.country,
        ]
          .filter(Boolean)
          .map((item) => String(item))
          .join(", "),
      ),
    ),
    renderEuropassRow(
      label(labels, "personal.phone", "Telephone"),
      escapeHtml(String(contact.phone_local ?? contact.phone_e164 ?? "")),
    ),
    renderEuropassRow(
      label(labels, "personal.email", "E-mail"),
      escapeHtml(String(contact.email ?? "")),
    ),
    renderEuropassRow(
      label(labels, "personal.nationality", "Nationality"),
      escapeHtml(String(person.nationality ?? "")),
    ),
    renderEuropassRow(
      label(labels, "personal.birth_date", "Date of birth"),
      escapeHtml(formatDateValue(person.birth_date, "exact")),
    ),
  ]
    .filter(Boolean)
    .join("");

  const experienceBlocks = (experiences as unknown[])
    .map((item) => {
      const record = asRecord(item);
      if (!record) return "";
      const range = formatRange(
        record.start_date,
        record.end_date,
        record.is_current,
        experienceDateMode,
        presentLabel,
      );
      const location = asRecord(record.location);
      const employerLine = [record.employer, location?.address, location?.city]
        .filter(Boolean)
        .map((part) => String(part))
        .join(", ");
      const responsibilities = renderEuropassSimpleList(
        textList(record.responsibilities),
      );
      const products = renderEuropassSimpleList(
        toProductLines(record.products),
      );
      const publicationLinks = renderEuropassSimpleList(
        toPublicationLinks(record.publication_links).map(
          (item) => `${item.title} (${item.href})`,
        ),
      );
      const tools = renderEuropassSimpleList(textList(record.tools));
      const roleBase = String(record.role ?? "").trim();
      const parallelRoleSuffix = label(
        labels,
        "experience_labels.parallel_role_suffix",
        "Parallel role",
      );
      const roleWithSuffix =
        record.parallel_role && roleBase
          ? `${roleBase} (${parallelRoleSuffix})`
          : record.parallel_role
            ? parallelRoleSuffix
            : roleBase;
      return `<div class=\"entry job-subsection\">
        ${renderEuropassRow(label(labels, "experience_labels.dates", "Dates"), escapeHtml(range))}
        ${renderEuropassRow(label(labels, "experience_labels.employer", "Employer and address"), escapeHtml(employerLine))}
        ${renderEuropassRow(label(labels, "experience_labels.industry", "Type of business"), escapeHtml(String(record.industry ?? "")))}
        ${renderEuropassRow(label(labels, "experience_labels.role", "Occupation or position held"), escapeHtml(roleWithSuffix))}
        ${renderEuropassRow(label(labels, "experience_labels.activities", "Main activities and responsibilities"), responsibilities)}
        ${renderEuropassRow(label(labels, "experience_labels.products", "Published titles / products"), products)}
        ${renderEuropassRow(label(labels, "experience_labels.publication_links", "Publication links"), publicationLinks)}
        ${renderEuropassRow(label(labels, "experience_labels.tools", "Tools"), tools)}
      </div>`;
    })
    .join("");

  const educationBlocks = (education as unknown[])
    .map((item) => {
      const record = asRecord(item);
      if (!record) return "";
      const range = formatRange(
        record.start_date,
        record.end_date,
        false,
        educationDateMode,
        presentLabel,
      );
      return `<div class=\"entry\">
        ${renderEuropassRow(label(labels, "education_labels.dates", "Dates"), escapeHtml(range))}
        ${renderEuropassRow(label(labels, "education_labels.subjects", "Main subjects"), escapeHtml(textList(record.subjects).join(", ")))}
        ${renderEuropassRow(label(labels, "education_labels.field", "Field of study"), escapeHtml(String(record.field_of_study ?? "")))}
        ${renderEuropassRow(label(labels, "education_labels.qualification", "Title of qualification awarded"), escapeHtml(String(record.degree ?? "")))}
        ${renderEuropassRow(label(labels, "education_labels.level", "Level"), escapeHtml(String(record.qualification_level ?? "")))}
        ${renderEuropassRow(label(labels, "education_labels.faculty", "Faculty"), escapeHtml(String(record.faculty ?? "")))}
        ${renderEuropassRow(label(labels, "education_labels.organization", "Name of organisation"), escapeHtml(String(record.institution ?? "")))}
        ${renderEuropassRow(label(labels, "education_labels.location", "Location"), escapeHtml([record.city, record.country].filter(Boolean).join(", ")))}
      </div>`;
    })
    .join("");

  const otherLanguageHtml = otherLanguages
    .map((item) => {
      const record = asRecord(item);
      if (!record) return "";
      return `<div class=\"lang-block\">
        <strong>${escapeHtml(String(record.language ?? ""))}</strong>
        <ul>
          <li>${escapeHtml(label(labels, "language_labels.reading", "Reading"))}: ${escapeHtml(String(record.reading ?? record.proficiency_cefr ?? ""))}</li>
          <li>${escapeHtml(label(labels, "language_labels.writing", "Writing"))}: ${escapeHtml(String(record.writing ?? record.proficiency_cefr ?? ""))}</li>
          <li>${escapeHtml(label(labels, "language_labels.speaking", "Speaking"))}: ${escapeHtml(String(record.speaking ?? record.proficiency_cefr ?? ""))}</li>
        </ul>
      </div>`;
    })
    .join("");

  const referencesHtml = references
    .map((item) => {
      const record = asRecord(item);
      if (!record) return "";
      return `<div class=\"ref-item\">
        <strong>${escapeHtml(String(record.name ?? ""))}</strong>
        <div>${escapeHtml(String(record.role ?? ""))} ${escapeHtml(String(record.organization ?? ""))}</div>
        <div>${escapeHtml(String(record.email ?? ""))}</div>
      </div>`;
    })
    .join("");

  return `<!doctype html>
<html>
<head>
  <meta charset=\"utf-8\" />
  <style>
    @page { size: A4; margin: ${margins.top}mm ${margins.right}mm ${margins.bottom}mm ${margins.left}mm; }
    * { box-sizing: border-box; }
    body { margin: 0; font-family: "Liberation Sans", "Nimbus Sans", Arial, Helvetica, sans-serif; color: #111; font-size: 11.4px; line-height: 1.35; }
    .page { width: 100%; min-height: calc(297mm - ${margins.top + margins.bottom}mm); padding: 8mm 7mm 8mm; }
    .title-wrap { margin-bottom: 8mm; width: 62mm; }
    .title { text-align: left; font-family: "Liberation Sans", "Nimbus Sans", Arial, Helvetica, sans-serif; font-weight: 700; letter-spacing: 0.02em; font-size: 13px; text-transform: uppercase; margin-bottom: 2mm; line-height: 1.2; }
    .eu-flag { width: 24mm; height: 16mm; }
    .section-title { font-family: "Liberation Sans", "Nimbus Sans", Arial, Helvetica, sans-serif; font-size: 17px; margin: 0 0 4mm; font-weight: 700; text-transform: uppercase; }
    .erow { display: grid; grid-template-columns: 26% 74%; gap: 4.2mm; margin: 0.9mm 0; break-inside: avoid; page-break-inside: avoid; }
    .elabel { text-align: right; color: #2b2b2b; font-family: "Liberation Sans", "Nimbus Sans", Arial, Helvetica, sans-serif; font-weight: 600; }
    .evalue { color: #111; font-family: "Liberation Sans Narrow", "Nimbus Sans Narrow", "Arial Narrow", "Liberation Sans", "Nimbus Sans", Arial, Helvetica, sans-serif; font-weight: 400; }
    .entry { margin-bottom: 5mm; }
    .entry.job-subsection {
      break-inside: auto;
      page-break-inside: auto;
      /* Encourage moving subsection to next page if fewer than ~4 lines fit. */
      min-height: 4.2lh;
    }
    .entry.job-subsection .erow,
    .entry.job-subsection .evalue li,
    .entry.job-subsection .evalue p {
      orphans: 4;
      widows: 4;
    }
    .block { margin-bottom: 6mm; }
    .block p { margin: 0; font-family: "Liberation Sans Narrow", "Nimbus Sans Narrow", "Arial Narrow", "Liberation Sans", "Nimbus Sans", Arial, Helvetica, sans-serif; }
    .evalue ul { margin: 0; padding-left: 12px; list-style: none; }
    .evalue li { position: relative; margin: 0.7mm 0; padding-left: 2.4px; }
    .evalue li::before {
      content: "•";
      position: absolute;
      left: -6px;
      top: 1px;
      font-weight: 600;
      line-height: 1;
    }
    .lang-block { margin-bottom: 2mm; }
    .ref-item { margin-bottom: 2mm; }
  </style>
</head>
<body>
  <div class=\"page\">
    <div class=\"title-wrap\">
      <div class=\"title\">${escapeHtml(label(labels, "sections.cv_title", "European Curriculum Vitae"))}</div>
      <svg class=\"eu-flag\" viewBox=\"0 0 60 40\" xmlns=\"http://www.w3.org/2000/svg\" aria-label=\"EU flag\" role=\"img\">
        <rect width=\"60\" height=\"40\" fill=\"#003399\" />
        <g fill=\"#FFCC00\">
          <circle cx=\"30\" cy=\"7\" r=\"1.4\"/><circle cx=\"37\" cy=\"9\" r=\"1.4\"/><circle cx=\"42\" cy=\"14\" r=\"1.4\"/>
          <circle cx=\"44\" cy=\"20\" r=\"1.4\"/><circle cx=\"42\" cy=\"26\" r=\"1.4\"/><circle cx=\"37\" cy=\"31\" r=\"1.4\"/>
          <circle cx=\"30\" cy=\"33\" r=\"1.4\"/><circle cx=\"23\" cy=\"31\" r=\"1.4\"/><circle cx=\"18\" cy=\"26\" r=\"1.4\"/>
          <circle cx=\"16\" cy=\"20\" r=\"1.4\"/><circle cx=\"18\" cy=\"14\" r=\"1.4\"/><circle cx=\"23\" cy=\"9\" r=\"1.4\"/>
        </g>
      </svg>
    </div>
    <section class=\"block\">
      <h2 class=\"section-title\">${escapeHtml(label(labels, "sections.personal_info", "Personal Information"))}</h2>
      ${contactBlock}
    </section>
    <section class=\"block\">
      <h2 class=\"section-title\">${escapeHtml(label(labels, "sections.positioning", "Positioning"))}</h2>
      ${renderEuropassRow(label(labels, "sections.headline", "Headline"), escapeHtml(String(slots["positioning.headline"] ?? getByPath(cv, "positioning.headline") ?? "")))}
      ${renderEuropassRow(label(labels, "sections.profile", "Profile"), profileSummary)}
    </section>
    <section class=\"block\">
      <h2 class=\"section-title\">${escapeHtml(label(labels, "sections.work_experience", "Work Experience"))}</h2>
      ${experienceBlocks}
    </section>
    <section class=\"block\">
      <h2 class=\"section-title\">${escapeHtml(label(labels, "sections.education", "Education"))}</h2>
      ${educationBlocks}
    </section>
    <section class=\"block\">
      <h2 class=\"section-title\">${escapeHtml(label(labels, "sections.personal_competencies", "Personal Skills and Competences"))}</h2>
      ${renderEuropassRow(label(labels, "sections.mother_tongue", "Mother tongue"), escapeHtml(String(motherTongue?.language ?? "")))}
      ${renderEuropassRow(label(labels, "sections.other_languages", "Other languages"), otherLanguageHtml)}
      ${renderEuropassRow(label(labels, "sections.social_skills", "Social Skills"), renderEuropassSimpleList(social))}
      ${renderEuropassRow(label(labels, "sections.organizational_skills", "Organizational Skills"), renderEuropassSimpleList(core))}
      ${renderEuropassRow(label(labels, "sections.technical_skills", "Technical Skills"), renderEuropassSimpleList(technical))}
      ${renderEuropassRow(label(labels, "sections.artistic_skills", "Artistic Skills"), renderEuropassSimpleList(publications))}
      ${renderEuropassRow(label(labels, "sections.other_skills", "Other Skills"), renderEuropassSimpleList(otherSkills))}
      ${renderEuropassRow(label(labels, "sections.driving_license", "Driving licence"), escapeHtml(drivingLicense))}
      ${renderEuropassRow(label(labels, "sections.references", "References"), referencesHtml)}
    </section>
    <section class=\"block\">
      <h2 class=\"section-title\">${escapeHtml(label(labels, "sections.additional_information", "Additional Information"))}</h2>
      ${renderEuropassRow(label(labels, "sections.certifications", "Certifications"), renderEuropassSimpleList(certifications))}
      ${renderEuropassRow(label(labels, "sections.projects", "Projects"), renderEuropassSimpleList(projects))}
      ${renderEuropassRow(label(labels, "sections.awards", "Awards"), renderEuropassSimpleList(awards))}
      ${renderEuropassRow(label(labels, "sections.publications", "Publications"), renderEuropassSimpleList(publications))}
      ${renderEuropassRow(label(labels, "sections.volunteering", "Volunteering"), renderEuropassSimpleList(volunteering))}
      ${renderEuropassRow(label(labels, "sections.patents", "Patents"), renderEuropassSimpleList(patents))}
      ${renderEuropassRow(label(labels, "sections.portfolio_links", "Portfolio links"), renderEuropassSimpleList(portfolioLinks))}
      ${renderEuropassRow(label(labels, "sections.interests", "Interests"), renderEuropassSimpleList(interests))}
    </section>
  </div>
</body>
</html>`;
}

