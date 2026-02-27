export type RenderJob = {
  cvId: string;
  templateId: string;
};

export function buildHtmlForPdf(job: RenderJob): string {
  return `<html><body><h1>Render placeholder for ${job.cvId} :: ${job.templateId}</h1></body></html>`;
}
