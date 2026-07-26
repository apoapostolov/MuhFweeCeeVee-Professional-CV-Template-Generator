/**
 * Seed lexicon for local JD keyword extraction (WS5).
 * Expand over time; multi-word phrases first when matching.
 */

/** Multi-word phrases (matched case-insensitively). */
export const SKILL_PHRASES: string[] = [
  "machine learning",
  "deep learning",
  "data science",
  "data engineering",
  "data analytics",
  "business intelligence",
  "product management",
  "product discovery",
  "user research",
  "software engineer",
  "software engineering",
  "site reliability",
  "system design",
  "distributed systems",
  "microservices",
  "rest api",
  "graphql",
  "unit testing",
  "integration testing",
  "continuous integration",
  "continuous delivery",
  "ci/cd",
  "infrastructure as code",
  "cloud native",
  "object oriented",
  "test driven",
  "domain driven",
  "event driven",
  "natural language",
  "computer vision",
  "large language models",
  "generative ai",
  "project management",
  "stakeholder management",
  "people management",
  "technical leadership",
  "cross functional",
  "agile scrum",
  "kanban",
  "okrs",
  "a/b testing",
  "go to market",
  "customer success",
  "supply chain",
  "risk management",
  "information security",
  "cyber security",
  "zero trust",
  "single sign-on",
  "open source",
  "full stack",
  "front end",
  "back end",
  "real time",
  "high availability",
  "load balancing",
  "message queue",
  "time series",
  "feature flags",
  "code review",
  "pair programming",
  "design systems",
  "design patterns",
  "performance tuning",
  "capacity planning",
  "incident response",
  "on call",
  "sla",
  "slo",
];

/** Single tokens / tools / skills (matched as whole words). */
export const SKILL_TERMS: string[] = [
  // languages
  "typescript",
  "javascript",
  "python",
  "java",
  "kotlin",
  "scala",
  "go",
  "golang",
  "rust",
  "c++",
  "csharp",
  "c#",
  "ruby",
  "php",
  "swift",
  "sql",
  "nosql",
  "r",
  "matlab",
  // frameworks / libs
  "react",
  "nextjs",
  "next.js",
  "vue",
  "angular",
  "node",
  "nodejs",
  "express",
  "django",
  "flask",
  "fastapi",
  "spring",
  "rails",
  "dotnet",
  ".net",
  "pytorch",
  "tensorflow",
  "keras",
  "scikit",
  "pandas",
  "numpy",
  "spark",
  "hadoop",
  "kafka",
  "redis",
  "rabbitmq",
  "graphql",
  "grpc",
  "webpack",
  "vite",
  // cloud / infra
  "aws",
  "azure",
  "gcp",
  "kubernetes",
  "k8s",
  "docker",
  "terraform",
  "ansible",
  "helm",
  "prometheus",
  "grafana",
  "elasticsearch",
  "mongodb",
  "postgresql",
  "postgres",
  "mysql",
  "dynamodb",
  "s3",
  "lambda",
  "ec2",
  "ecs",
  "eks",
  "cloudformation",
  "pulumi",
  "nginx",
  "linux",
  "bash",
  "git",
  "github",
  "gitlab",
  "jenkins",
  "circleci",
  "github actions",
  // product / process
  "scrum",
  "agile",
  "kanban",
  "jira",
  "confluence",
  "figma",
  "analytics",
  "seo",
  "sem",
  "crm",
  "saas",
  "b2b",
  "b2c",
  "fintech",
  "healthcare",
  "devops",
  "sre",
  "mlops",
  "llm",
  "nlp",
  "etl",
  "elt",
  "api",
  "apis",
  "rest",
  "http",
  "oauth",
  "oidc",
  "saml",
  "jwt",
  "tdd",
  "bdd",
  "ci",
  "cd",
  "iac",
  "observability",
  "monitoring",
  "logging",
  "tracing",
  "security",
  "compliance",
  "gdpr",
  "hipaa",
  "soc2",
  "pci",
  // soft / leadership signals (kept lower weight later)
  "mentoring",
  "leadership",
  "ownership",
  "collaboration",
  "communication",
  "stakeholder",
  "roadmap",
  "strategy",
  "architecture",
  "scalability",
  "reliability",
  "performance",
  "optimization",
  "automation",
  "documentation",
  "hiring",
  "budget",
  "p&l",
];

export type LexiconCategory =
  | "skill"
  | "tool"
  | "domain"
  | "soft"
  | "methodology"
  | "certification"
  | "position"
  | "seniority";

const TOOL_HINT =
  /^(aws|azure|gcp|docker|kubernetes|k8s|react|vue|angular|postgres|mysql|redis|kafka|terraform|jenkins|git|github|gitlab|jira|figma|mongodb|elasticsearch|nginx|spark|pytorch|tensorflow|node|nodejs|django|flask|fastapi|spring|rails|dotnet)$/i;

const SOFT_HINT =
  /^(mentoring|leadership|ownership|collaboration|communication|stakeholder|hiring)$/i;

const METHOD_HINT = /^(scrum|agile|kanban|tdd|bdd|devops|sre|mlops|ci|cd|iac)$/i;

const SENIORITY_HINT =
  /^(leadership|ownership|mentoring|architecture|strategy|roadmap|stakeholder)$/i;

export function categorizeLexiconTerm(term: string): LexiconCategory {
  const t = term.toLowerCase();
  if (SOFT_HINT.test(t)) return "soft";
  if (METHOD_HINT.test(t)) return "methodology";
  if (SENIORITY_HINT.test(t) && t.includes("architect")) return "seniority";
  if (TOOL_HINT.test(t) || t.includes(".") || t.includes("#") || t.includes("+")) return "tool";
  if (
    t.includes("management") ||
    t.includes("engineering") ||
    t.includes("science") ||
    t.includes("stack")
  ) {
    return "position";
  }
  return "skill";
}
