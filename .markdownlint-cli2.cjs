module.exports = {
  config: require("./.markdownlint.json"),
  globs: [
    "*.md",
    "docs/**/*.md",
    "skills/**/SKILL.md",
    "skills/README.md",
    "keywords/*.md",
    "deploy/**/*.md",
  ],
  ignores: [
    "node_modules/**",
    "apps/web/.next/**",
    "services/parser/.venv/**",
    "examples/**",
    "README.md",
    "CHANGELOG.md",
    "skills/prepare-user-journey/**",
    "skills/SKILL.md",
    "skills/agents/**",
    "skills/_local/**",
  ],
};