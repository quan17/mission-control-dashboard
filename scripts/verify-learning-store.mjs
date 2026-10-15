import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { createLearningStore, StoreError } from "../server/learning-store.ts";
import { emptyLearningState, assessmentFor } from "../src/learning-model.ts";
const root = await mkdtemp(resolve(".work-learning-test-"));
const goal = {
  id: "test-goal",
  title: "TEST ONLY: closures",
  track: "React / JavaScript",
  outcome: "Independently explain stale closures.",
  nextPractice: "Predict output.",
  status: "active",
  createdAt: "2026-10-14T21:00:00.000Z",
  updatedAt: "2026-10-14T21:00:00.000Z",
  practices: [],
};
const initial = () => ({
  ...emptyLearningState(),
  goals: [structuredClone(goal)],
});
test("missing snapshot is empty and saves survive a new store instance", async () => {
  const store = createLearningStore(root);
  assert.deepEqual(await store.read(), emptyLearningState());
  const saved = await store.save(initial());
  assert.equal(saved.revision, 1);
  assert.equal(
    (await createLearningStore(root).read()).goals[0].title,
    goal.title,
  );
});
test("stale tabs cannot overwrite saved data", async () => {
  const store = createLearningStore(root);
  await assert.rejects(
    store.save(initial()),
    (error) => error instanceof StoreError && error.status === 409,
  );
  assert.equal((await store.read()).revision, 1);
});
test("concurrent independent store instances have at most one accepted save", async () => {
  const state = await createLearningStore(root).read();
  const result = await Promise.allSettled([
    createLearningStore(root).save({
      ...state,
      goals: [{ ...state.goals[0], title: "TEST writer A" }],
    }),
    createLearningStore(root).save({
      ...state,
      goals: [{ ...state.goals[0], title: "TEST writer B" }],
    }),
  ]);
  assert.equal(result.filter((r) => r.status === "fulfilled").length, 1);
  assert.equal(result.filter((r) => r.status === "rejected").length, 1);
  assert.equal((await createLearningStore(root).read()).revision, 2);
});
test("only assessed dimensions advance and source collection proves no mastery", () => {
  const sample = {
    ...goal,
    practices: [
      {
        id: "test-practice",
        occurredAt: "2026-10-14T21:01:00.000Z",
        summary: "Practiced one explanation",
        evidence: "Needed one prompt.",
        assessments: { explain: "developing" },
        provenance: "self_reported",
      },
    ],
  };
  assert.deepEqual(assessmentFor(sample, "understand"), {
    level: "unknown",
    at: null,
  });
  assert.deepEqual(assessmentFor(sample, "code"), {
    level: "unknown",
    at: null,
  });
  assert.equal(assessmentFor(sample, "explain").level, "developing");
});
test("bad assessments and missing practice evidence are rejected without write", async () => {
  const store = createLearningStore(root);
  const state = await store.read();
  for (const bad of [
    { assessments: { mastery: "strong" }, evidence: "a note" },
    { assessments: { code: "strong" }, evidence: "" },
  ]) {
    await assert.rejects(
      store.save({
        ...state,
        goals: [
          {
            ...state.goals[0],
            practices: [
              {
                id: "bad",
                occurredAt: goal.createdAt,
                summary: "test",
                provenance: "self_reported",
                ...bad,
              },
            ],
          },
        ],
      }),
      (error) => error instanceof StoreError && error.status === 400,
    );
  }
  assert.equal((await store.read()).revision, 2);
});
test("corrupted source is not silently replaced with an empty snapshot", async () => {
  const file = join(root, "personal-os", "state", "learning-goals.json");
  await writeFile(file, "{ malformed");
  await assert.rejects(
    createLearningStore(root).read(),
    (error) => error instanceof StoreError && error.status === 503,
  );
  await assert.rejects(
    createLearningStore(root).save(initial()),
    (error) => error instanceof StoreError && error.status === 503,
  );
  assert.equal(await readFile(file, "utf8"), "{ malformed");
});
