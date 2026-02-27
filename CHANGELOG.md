# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Initial monorepo bootstrap with Next.js web app and FastAPI parser scaffold.
- Initial deployment scaffolding for `systemd` and `nginx`.
- Initial project governance docs: `AGENTS.md`, `TODO.md`, and `DEVELOPMENT_LOG.md`.
- Imported baseline CV YAML standard and scoring documentation under `docs/cv/`.
- Added seed CV data file: `data/cvs/cv_bg_004_alianz.yaml`.
- Added initial template catalog and bootstrap template assets under `templates/`.
- Added initial CV-to-template mapping in `data/template_mappings/`.
- Added shared scoring weight constants in `packages/schemas/src/cvScoring.ts`.
