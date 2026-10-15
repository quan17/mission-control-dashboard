import { mkdir, readFile, rename, writeFile, rmdir } from "node:fs/promises";
import { dirname } from "node:path";
import { randomUUID } from "node:crypto";
import { StoreError } from "./learning-store.ts";
export function createJsonStore<
  T extends { revision: number; updatedAt: string | null },
>(file: string, initial: () => T, validate: (v: unknown) => asserts v is T) {
  async function read(): Promise<T> {
    try {
      const value: unknown = JSON.parse(await readFile(file, "utf8"));
      validate(value);
      return value;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return initial();
      throw new StoreError(
        503,
        "本地文件不可读，已保留原文件。请修复后再保存。",
      );
    }
  }
  async function save(value: unknown): Promise<T> {
    validate(value);
    await mkdir(dirname(file), { recursive: true });
    const lock = file + ".lock";
    try {
      await mkdir(lock);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "EEXIST")
        throw new StoreError(
          409,
          "有另一个保存正在进行，请稍后重试。异常退出留下的锁需在停止所有服务后恢复。",
        );
      throw error;
    }
    try {
      const current = await read();
      if (current.revision !== value.revision)
        throw new StoreError(
          409,
          "另一个页面已保存更新。请刷新最新数据后重试，你的输入仍保留。",
        );
      const next = {
        ...value,
        revision: current.revision + 1,
        updatedAt: new Date().toISOString(),
      };
      const temp = file + "." + randomUUID() + ".tmp";
      await writeFile(temp, JSON.stringify(next, null, 2) + "\n", {
        flag: "wx",
      });
      await rename(temp, file);
      return next;
    } finally {
      await rmdir(lock);
    }
  }
  return { read, save };
}
