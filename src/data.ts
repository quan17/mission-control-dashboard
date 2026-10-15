export type Project = {
  id: string;
  name: string;
  short: string;
  category: string;
  path: string;
  source: string;
  goal: string;
  team: string;
  guardrail: string;
  color: string;
};

// Public demo catalog. These are fictional workspaces, not an observed inventory.
export const projects: Project[] = [
  {
    id: "mission-control",
    name: "Mission Control",
    short: "MC",
    category: "Portfolio operations",
    path: "examples/mission-control",
    source: "README.md",
    goal: "Keep project work, learning, and decisions in one clear view.",
    team: "Coordinator · Observer · Reviewer",
    guardrail: "Demo only. No automatic dispatch or cross-project writes.",
    color: "mint",
  },
  {
    id: "sample-editor",
    name: "Sample Editor",
    short: "SE",
    category: "Product prototype",
    path: "examples/sample-editor",
    source: "README.md",
    goal: "Explore a small editor with clear review checkpoints.",
    team: "Product lead · Frontend contributor",
    guardrail: "Illustrative project. No live workers or source adapter.",
    color: "blue",
  },
  {
    id: "sample-learning",
    name: "Learning Lab",
    short: "LL",
    category: "Learning",
    path: "examples/sample-learning",
    source: "README.md",
    goal: "Turn a study topic into a practice task and evidence-backed reflection.",
    team: "Learner · Reviewer",
    guardrail: "Suggested exercises are not proof of mastery.",
    color: "purple",
  },
  {
    id: "sample-portfolio",
    name: "Portfolio Site",
    short: "PS",
    category: "Website",
    path: "examples/sample-portfolio",
    source: "README.md",
    goal: "Prepare a small, reviewable website release.",
    team: "Builder · Reviewer",
    guardrail: "Publishing is a separate owner decision.",
    color: "amber",
  },
];
