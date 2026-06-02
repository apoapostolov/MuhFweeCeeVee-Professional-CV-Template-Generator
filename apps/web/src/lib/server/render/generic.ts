import type { CvDocument } from "../cvStore";
import type { TemplateFile } from "./types";
import {
  escapeHtml,
  formatName,
  getByPath,
  label,
  renderContact,
  renderEducation,
  renderExperience,
  renderLanguages,
  renderParagraphs,
  renderReferences,
  renderSimpleList,
  resolveMargins,
  textList,
} from "./shared";

export function renderGeneric(
  cv: CvDocument,
  template: TemplateFile,
  slots: Record<string, unknown>,
  labels: Record<string, unknown>,
): string {
  const margins = resolveMargins(template);
  const experienceDateMode = template.date_display?.experience ?? "exact";
  const educationDateMode = template.date_display?.education ?? "exact";
  const name =
    slots["person.full_name"] ?? getByPath(cv, "person.full_name") ?? "";
  const headline =
    slots["positioning.headline"] ??
    getByPath(cv, "positioning.headline") ??
    "";
  const pageLabel = label(labels, "common.page", "Page");
  const presentLabel = label(labels, "common.present", "present");

  return `<!doctype html>
<html>
<head>
  <meta charset=\"utf-8\" />
  <style>
    @page { size: A4; margin: ${margins.top}mm ${margins.right}mm ${margins.bottom}mm ${margins.left}mm; }
    * { box-sizing: border-box; }
    body { margin: 0; font-family: \"IBM Plex Sans\", Arial, sans-serif; color: #202124; font-size: 12px; line-height: 1.35; }
    .page { width: 100%; min-height: calc(297mm - ${margins.top + margins.bottom}mm); display: grid; grid-template-columns: 250px 1fr; }
    .left { background: #f3f4f6; padding: 22px 18px; border-right: 1px solid #d1d5db; }
    .right { padding: 26px 30px; }
    h1 { margin: 0; font-size: 25px; }
    h2 { font-size: 21px; margin: 0 0 10px; }
    h3 { font-size: 14px; text-transform: uppercase; letter-spacing: 0.08em; margin: 0 0 8px; }
    h4 { margin: 0; font-size: 15px; }
    section { margin-bottom: 18px; }
    ul { margin: 8px 0 0 18px; padding: 0; }
    .entry { border-top: 1px solid #ddd; padding-top: 10px; margin-top: 10px; }
    .entry-head { display: flex; justify-content: space-between; gap: 10px; }
    .org { margin: 4px 0 8px; color: #5f6368; }
    .page-footer {
      position: fixed;
      right: 0;
      bottom: 0;
      left: 0;
      text-align: right;
      font-size: 10px;
      color: #5f6368;
      padding: 0 1mm 0 0;
    }
    .page-footer::after { content: \"${escapeHtml(pageLabel)} \" counter(page); }
  </style>
</head>
<body>
  <div class=\"page\">
    <aside class=\"left\">
      ${renderContact(label(labels, "sections.contact", "Contact"), slots["contact.block"] ?? getByPath(cv, "person.contact"))}
      ${renderLanguages(label(labels, "sections.languages", "Languages"), slots["skills.languages"] ?? getByPath(cv, "skills.languages"))}
      ${renderSimpleList(label(labels, "sections.technical_skills", "Technical Skills"), slots["skills.technical"] ?? getByPath(cv, "skills.technical"))}
      ${renderSimpleList(label(labels, "sections.social_skills", "Social Skills"), slots["skills.social"] ?? getByPath(cv, "skills.social"))}
    </aside>
    <main class=\"right\">
      <h1>${escapeHtml(name)}</h1>
      <p>${escapeHtml(headline)}</p>
      ${renderSimpleList(label(labels, "sections.profile", "Profile"), slots["positioning.profile_summary"] ?? getByPath(cv, "positioning.profile_summary"))}
      ${renderExperience(
        label(labels, "sections.work_experience", "Work Experience"),
        slots["experience.items"] ?? getByPath(cv, "experience"),
        experienceDateMode,
        presentLabel,
        labels,
      )}
      ${renderEducation(
        label(labels, "sections.education", "Education"),
        slots["education.items"] ?? getByPath(cv, "education"),
        educationDateMode,
        presentLabel,
      )}
      ${renderReferences(label(labels, "sections.references", "References"), slots["references.items"] ?? getByPath(cv, "references"))}
    </main>
  </div>
  <footer class=\"page-footer\"></footer>
</body>
</html>`;
}
