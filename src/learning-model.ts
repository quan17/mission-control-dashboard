export const dimensions = [
  "understand",
  "explain",
  "code",
  "follow_up_depth",
] as const;
export type Dimension = (typeof dimensions)[number];
export const levels = [
  "unknown",
  "introduced",
  "developing",
  "strong",
] as const;
export type Level = (typeof levels)[number];
export const dimensionNames: Record<Dimension, string> = {
  understand: "Understand",
  explain: "Explain",
  code: "Code",
  follow_up_depth: "Follow-up depth",
};
export type Practice = {
  id: string;
  occurredAt: string;
  summary: string;
  evidence: string;
  assessments: Partial<Record<Dimension, Level>>;
  provenance: "self_reported";
};
export type LearningGoal = {
  id: string;
  title: string;
  track: string;
  outcome: string;
  nextPractice: string;
  status: "active" | "paused" | "achieved";
  createdAt: string;
  updatedAt: string;
  practices: Practice[];
};
export type LearningState = {
  schemaVersion: 1;
  revision: number;
  updatedAt: string | null;
  goals: LearningGoal[];
};
export const emptyLearningState = (): LearningState => ({
  schemaVersion: 1,
  revision: 0,
  updatedAt: null,
  goals: [],
});
export function assessmentFor(
  goal: LearningGoal,
  dimension: Dimension,
): { level: Level; at: string | null } {
  const latest = goal.practices
    .filter((p) => p.assessments[dimension] !== undefined)
    .sort((a, b) => Date.parse(b.occurredAt) - Date.parse(a.occurredAt))[0];
  return {
    level: latest?.assessments[dimension] ?? "unknown",
    at: latest?.occurredAt ?? null,
  };
}
