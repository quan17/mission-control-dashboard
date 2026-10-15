import type { BoardEvidence } from "../src/board-model.ts";
const object = (v: unknown): v is Record<string, unknown> =>
  v !== null && typeof v === "object" && !Array.isArray(v);
const text = (v: unknown, max = 2000) =>
  typeof v === "string" && v.trim().length > 0 && v.length <= max;
const date = (v: unknown) =>
  typeof v === "string" && Number.isFinite(Date.parse(v));
const stringList = (v: unknown, max = 100) =>
  Array.isArray(v) && v.length <= max && v.every((x) => text(x));
export function validateEvidence(
  value: unknown,
  allowedFiles: Set<string>,
): asserts value is BoardEvidence {
  const fail = () => {
    throw new Error("Malformed evidence snapshot");
  };
  if (
    !object(value) ||
    value.schemaVersion !== 1 ||
    !date(value.importedAt) ||
    !object(value.coverage) ||
    !Array.isArray(value.sources) ||
    value.sources.length > 200 ||
    !Array.isArray(value.tasks) ||
    value.tasks.length > 300 ||
    !Array.isArray(value.workspaces) ||
    value.workspaces.length > 100
  )
    fail();
  const data = value as Record<string, unknown>;
  const sources = data.sources as Record<string, unknown>[];
  const tasks = data.tasks as Record<string, unknown>[];
  const workspaces = data.workspaces as Record<string, unknown>[];
  const coverage = data.coverage as Record<string, unknown>;
  if (
    !Number.isInteger(coverage.conversations) ||
    !Number.isInteger(coverage.nativeFiles) ||
    !stringList(coverage.limitations, 30)
  )
    fail();
  const sourceIds = new Set();
  for (const s of sources) {
    if (
      !object(s) ||
      !text(s.id, 100) ||
      sourceIds.has(s.id) ||
      !text(s.title, 200) ||
      !text(s.ref, 1000) ||
      !date(s.observedAt) ||
      !date(s.updatedAt) ||
      !["file", "chat"].includes(String(s.kind))
    )
      fail();
    if (
      s.kind === "file" &&
      (!allowedFiles.has(String(s.ref).replaceAll("\\", "/").toLowerCase()) ||
        !text(s.expectedHash, 64) ||
        !/^[a-f0-9]{64}$/.test(String(s.expectedHash)))
    )
      fail();
    if (
      s.kind === "chat" &&
      !/^(https:\/\/chatgpt\.com\/c\/[a-zA-Z0-9-]+|codex:[a-zA-Z0-9-]+)$/.test(
        String(s.ref),
      )
    )
      fail();
    if (s.limitations !== undefined && !text(s.limitations)) fail();
    sourceIds.add(s.id);
  }
  if (
    coverage.conversations !==
      sources.filter((s) => s.kind === "chat").length ||
    coverage.nativeFiles !== sources.filter((s) => s.kind === "file").length
  )
    fail();
  const ids = new Set();
  for (const t of tasks) {
    if (
      !object(t) ||
      !text(t.id, 100) ||
      ids.has(t.id) ||
      !text(t.title, 160) ||
      !text(t.workspace, 120) ||
      !text(t.description) ||
      !text(t.doneWhen) ||
      !["learning", "projects", "career"].includes(String(t.area)) ||
      !["confirmed_intent", "inferred", "source_record"].includes(
        String(t.confidence),
      ) ||
      typeof t.needsMe !== "boolean" ||
      !stringList(t.sourceIds, 10) ||
      (t.sourceIds as unknown[]).some((id) => !sourceIds.has(id))
    )
      fail();
    ids.add(t.id);
  }
  const workIds = new Set();
  for (const w of workspaces) {
    if (
      !object(w) ||
      !text(w.id, 100) ||
      workIds.has(w.id) ||
      !text(w.name, 160) ||
      !["app", "project", "career"].includes(String(w.kind)) ||
      !text(w.summary) ||
      !text(w.nextAction) ||
      !text(w.boundary) ||
      !stringList(w.sourceIds, 10) ||
      (w.sourceIds as unknown[]).some((id) => !sourceIds.has(id))
    )
      fail();
    workIds.add(w.id);
  }
}
