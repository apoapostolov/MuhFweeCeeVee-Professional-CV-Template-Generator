import { stringify as stringifyYaml } from "yaml";

export type EditorDraftView = "form" | "yaml";

export function editorDraftFingerprint(
  view: EditorDraftView,
  yamlDraft: string,
  formDraft: unknown,
): string {
  return view === "yaml" ? yamlDraft : stringifyYaml(formDraft ?? {});
}
