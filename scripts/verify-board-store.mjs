import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, readFile } from "node:fs/promises";
import { resolve, join } from "node:path";
import { createBoardService, validateBoard } from "../server/board-service.ts";
import { createJsonStore } from "../server/json-store.ts";
import { emptyBoardState } from "../src/board-model.ts";
const root = await mkdtemp(resolve(".work-learning-test-board-"));
const evidence = {
  schemaVersion: 1,
  importedAt: "2026-10-15T00:00:00Z",
  coverage: { conversations: 1, nativeFiles: 0, limitations: ["TEST ONLY"] },
  sources: [
    {
      id: "source-test",
      kind: "chat",
      title: "TEST ONLY",
      ref: "https://chatgpt.com/c/test-thread",
      updatedAt: "2026-10-15T00:00:00Z",
      observedAt: "2026-10-15T00:00:00Z",
    },
  ],
  tasks: [
    {
      id: "test-task",
      title: "TEST ONLY",
      area: "learning",
      workspace: "TEST ONLY",
      description: "TEST ONLY",
      doneWhen: "TEST ONLY: record result",
      sourceIds: ["source-test"],
      confidence: "inferred",
      needsMe: false,
    },
  ],
  workspaces: [],
};
await mkdir(join(root, "personal-os/sources"), { recursive: true });
await writeFile(
  join(root, "personal-os/sources/board-evidence.json"),
  JSON.stringify(evidence),
);
const plan = {
  id: "test-task:2026-10-14",
  taskId: "test-task",
  day: "2026-10-14",
  status: "planned",
  completionNote: "",
  updatedAt: "2026-10-15T00:00:00Z",
};
test("date plans persist independently and bridge includes no raw conversations", async () => {
  const service = createBoardService(root);
  const empty = await service.snapshot();
  assert.equal(empty.state.plans.length, 0);
  const saved = await service.save({ ...empty.state, plans: [plan] });
  assert.equal(saved.revision, 1);
  const read = await createBoardService(root).snapshot();
  assert.equal(read.state.plans[0].day, "2026-10-14");
  const text = await readFile(
    join(root, "personal-os/exports/BOARD_CONTEXT.md"),
    "utf8",
  );
  assert(text.includes("test-task") || text.includes("TEST ONLY"));
  assert(!text.includes("lan-access.json"));
});
test("two writers cannot overwrite the same revision", async () => {
  const file = join(root, "personal-os/state/race.json");
  const store = () => createJsonStore(file, emptyBoardState, validateBoard);
  const results = await Promise.allSettled([
    store().save(emptyBoardState()),
    store().save(emptyBoardState()),
  ]);
  assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
  assert.equal((await store().read()).revision, 1);
});
test("invalid date, missing completion evidence, and unknown task are rejected", async () => {
  const service = createBoardService(root);
  const state = (await service.snapshot()).state;
  await assert.rejects(
    service.save({
      ...state,
      plans: [{ ...plan, day: "2026-02-30", id: "test-task:2026-02-30" }],
    }),
  );
  await assert.rejects(
    service.save({
      ...state,
      plans: [{ ...plan, status: "done", completionNote: "" }],
    }),
  );
  await assert.rejects(
    service.save({
      ...state,
      plans: [{ ...plan, id: "missing:2026-10-14", taskId: "missing" }],
    }),
  );
  assert.equal((await service.snapshot()).state.revision, state.revision);
});
test("nested evidence corruption fails closed rather than crashing the UI", async () => {
  const file = join(root, "personal-os/sources/board-evidence.json");
  await writeFile(file, JSON.stringify({ ...evidence, coverage: {} }));
  await assert.rejects(
    createBoardService(root).snapshot(),
    (e) => e.status === 503,
  );
  await writeFile(file, JSON.stringify(evidence));
});
test("invalid Page timestamp is not served to the browser", async () => {
  const file = join(root, "personal-os/page-link.json");
  await writeFile(
    file,
    JSON.stringify({
      pageId: "page_abcd",
      title: "TEST",
      url: "https://chatgpt.com/space/page_abcd",
      snapshotAt: "bad",
      boardRevision: 0,
    }),
  );
  await assert.rejects(
    createBoardService(root).snapshot(),
    (e) => e.status === 503,
  );
});
test("corrupt board state cannot be silently reset by a save", async () => {
  const file = join(root, "personal-os/state/board.json");
  await writeFile(file, "{ broken");
  await assert.rejects(
    createBoardService(root).save({ ...emptyBoardState(), plans: [plan] }),
    (e) => e.status === 503,
  );
  assert.equal(await readFile(file, "utf8"), "{ broken");
});
