export type Area = "learning" | "projects" | "career";
export type EvidenceSource = {
  id: string;
  kind: "file" | "chat";
  title: string;
  ref: string;
  observedAt: string;
  updatedAt: string;
  expectedHash?: string;
  freshness?: "snapshot" | "unchanged" | "changed" | "missing";
  limitations?: string;
};
export type BoardTask = {
  id: string;
  title: string;
  area: Area;
  workspace: string;
  description: string;
  doneWhen: string;
  sourceIds: string[];
  confidence: "confirmed_intent" | "inferred" | "source_record" | "manual";
  needsMe: boolean;
  goalId?: string;
};
export type WorkspaceEvidence = {
  id: string;
  name: string;
  kind: "app" | "project" | "career";
  summary: string;
  nextAction: string;
  boundary: string;
  sourceIds: string[];
};
export type BoardEvidence = {
  schemaVersion: 1;
  importedAt: string;
  coverage: {
    conversations: number;
    nativeFiles: number;
    limitations: string[];
  };
  sources: EvidenceSource[];
  tasks: BoardTask[];
  workspaces: WorkspaceEvidence[];
};
export type DailyPlan = {
  id: string;
  taskId: string;
  day: string;
  status: "planned" | "doing" | "done" | "deferred";
  completionNote: string;
  updatedAt: string;
};
export type BoardState = {
  schemaVersion: 1;
  revision: number;
  updatedAt: string | null;
  plans: DailyPlan[];
  customTasks: BoardTask[];
};
export type PageLink = {
  pageId: string;
  url: string;
  title: string;
  snapshotAt: string;
  boardRevision: number;
};
export type BoardPayload = {
  evidence: BoardEvidence;
  state: BoardState;
  page: PageLink | null;
  bridge: { path: string; updatedAt: string | null; warning?: string };
};
export const todayNY = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
export const areaNames: Record<Area, string> = {
  learning: "学习",
  projects: "项目 / App",
  career: "找工作",
};
export const emptyBoardState = (): BoardState => ({
  schemaVersion: 1,
  revision: 0,
  updatedAt: null,
  plans: [],
  customTasks: [],
});
