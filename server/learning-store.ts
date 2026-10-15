import { mkdir, readFile, rename, writeFile, rmdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { randomUUID } from "node:crypto";
import {
  dimensions,
  emptyLearningState,
  levels,
} from "../src/learning-model.ts";
import type { LearningState } from "../src/learning-model.ts";
export class StoreError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}
const object = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);
const text = (v: unknown, max: number, required = true) =>
  typeof v === "string" &&
  v.length <= max &&
  (!required || v.trim().length > 0);
const date = (v: unknown) =>
  typeof v === "string" &&
  /^\d{4}-\d{2}-\d{2}T/.test(v) &&
  Number.isFinite(Date.parse(v));
export function validateState(value: unknown): asserts value is LearningState {
  if (
    !object(value) ||
    value.schemaVersion !== 1 ||
    !Number.isSafeInteger(value.revision) ||
    Number(value.revision) < 0 ||
    !(value.updatedAt === null || date(value.updatedAt)) ||
    !Array.isArray(value.goals) ||
    value.goals.length > 100
  )
    throw new StoreError(400, "Invalid learning snapshot.");
  const ids = new Set();
  for (const goal of value.goals) {
    if (
      !object(goal) ||
      !text(goal.id, 80) ||
      ids.has(goal.id) ||
      !text(goal.title, 120) ||
      !text(goal.track, 80) ||
      !text(goal.outcome, 2000) ||
      !text(goal.nextPractice, 2000, false) ||
      !["active", "paused", "achieved"].includes(String(goal.status)) ||
      !date(goal.createdAt) ||
      !date(goal.updatedAt) ||
      !Array.isArray(goal.practices) ||
      goal.practices.length > 500
    )
      throw new StoreError(
        400,
        "Invalid goal. Provide a title, learning track and success criteria.",
      );
    ids.add(goal.id);
    const practiceIds = new Set();
    for (const p of goal.practices) {
      if (
        !object(p) ||
        !text(p.id, 80) ||
        practiceIds.has(p.id) ||
        !date(p.occurredAt) ||
        !text(p.summary, 2000) ||
        !text(p.evidence, 4000) ||
        p.provenance !== "self_reported" ||
        !object(p.assessments) ||
        Object.keys(p.assessments).some(
          (k) =>
            !dimensions.includes(k as (typeof dimensions)[number]) ||
            !levels.includes(
              (p.assessments as Record<string, unknown>)[
                k
              ] as (typeof levels)[number],
            ),
        )
      )
        throw new StoreError(
          400,
          "Invalid practice note. Include what you practiced and an evidence note.",
        );
      practiceIds.add(p.id);
    }
  }
}
export function createLearningStore(root: string) {
  const file = join(root, "personal-os", "state", "learning-goals.json");
  let tail: Promise<unknown> = Promise.resolve();
  async function read(): Promise<LearningState> {
    try {
      const raw = await readFile(file, "utf8");
      const value: unknown = JSON.parse(raw);
      validateState(value);
      return value;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT")
        return emptyLearningState();
      throw new StoreError(
        503,
        "Learning file cannot be read. It has been preserved; repair it before saving.",
      );
    }
  }
  function save(value: unknown): Promise<LearningState> {
    const operation = tail.then(async () => {
      validateState(value);
      await mkdir(dirname(file), { recursive: true });
      const lock = file + ".lock";
      try {
        await mkdir(lock);
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === "EEXIST")
          throw new StoreError(
            409,
            "Another save is in progress. Retry shortly; if the app crashed during a save, the local learning lock needs recovery.",
          );
        throw error;
      }
      try {
        const current = await read();
        if (current.revision !== value.revision)
          throw new StoreError(
            409,
            "Another tab saved changes. Reload the latest goals before saving; your draft is still shown.",
          );
        const next: LearningState = {
          schemaVersion: 1,
          revision: current.revision + 1,
          updatedAt: new Date().toISOString(),
          goals: value.goals,
        };
        await mkdir(dirname(file), { recursive: true });
        const temporary = file + "." + randomUUID() + ".tmp";
        await writeFile(temporary, JSON.stringify(next, null, 2) + "\n", {
          encoding: "utf8",
          flag: "wx",
        });
        await rename(temporary, file);
        return next;
      } finally {
        await rmdir(lock);
      }
    });
    tail = operation.catch(() => undefined);
    return operation;
  }
  return { read, save };
}
