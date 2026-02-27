# TODO

## P0 - Foundation and operational readiness

- [ ] Finalize monorepo script consistency and add root bootstrap script.
- [ ] Wire Next.js API route for CV YAML CRUD (`/api/cvs`).
- [ ] Add filesystem persistence helpers for `data/cvs/*.yaml`.
- [ ] Define and validate `cv.v1` JSON schema in `packages/schemas`.
- [ ] Build first composer screen: form-first editor + live preview shell.
- [ ] Implement parser service real PDF block extraction (`/analyze-pdf`).
- [ ] Add template draft output (`layout.yaml`) from parser service.
- [ ] Implement first HTML -> PDF export flow via Playwright.
- [x] Import seed CV YAML (`cv_bg_004_alianz`) for initial integration testing.
- [x] Add baseline CV YAML and scoring documentation under `docs/cv/`.

## P1 - Product quality and governance

- [x] Add template catalog model with legal metadata (`license.yaml`).
- [x] Add mapping model (`cv.path -> template.slot`) and transform pipeline.
- [ ] Add compatibility warnings for overflow/missing required slots.
- [ ] Add integration tests for CV -> template -> export flow.
- [ ] Add systemd install/runbook and nginx enable instructions.
- [ ] Implement scoring endpoint using rubric in `packages/schemas/src/cvScoring.ts`.

## P2 - UX and scale improvements

- [ ] Add revision snapshots/history per CV.
- [ ] Add import/export UI for YAML packages.
- [ ] Add template review status workflow (`pending/approved/rejected`).
- [ ] Add visual diff tests for selected PDF golden outputs.
