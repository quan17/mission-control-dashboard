import { networkInterfaces } from "node:os";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { randomBytes } from "node:crypto";
export const isPrivate = (ip: string) =>
  /^10\./.test(ip) ||
  /^192\.168\./.test(ip) ||
  /^172\.(1[6-9]|2\d|3[01])\./.test(ip);
export const lanAddresses = () =>
  Object.values(networkInterfaces())
    .flatMap((v) => v ?? [])
    .filter((a) => a.family === "IPv4" && !a.internal && isPrivate(a.address))
    .map((a) => a.address);
export async function ensurePairCode(root: string) {
  const directory = join(root, "personal-os/private");
  await mkdir(directory, { recursive: true });
  const file = join(directory, "lan-access.json");
  try {
    const record = JSON.parse(await readFile(file, "utf8"));
    if (typeof record.code !== "string" || record.code.length < 16)
      throw new Error("invalid pairing config");
    return record.code as string;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    const code = randomBytes(12).toString("base64url");
    try {
      await writeFile(
        file,
        JSON.stringify({ code, createdAt: new Date().toISOString() }) + "\n",
        { flag: "wx", mode: 0o600 },
      );
      return code;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "EEXIST")
        return JSON.parse(await readFile(file, "utf8")).code;
      throw error;
    }
  }
}
export async function connectionInfo(root: string) {
  const urls = lanAddresses().map((ip) => `http://${ip}:4317`);
  let ready = false;
  try {
    const response = await fetch("http://127.0.0.1:4317/health", {
      signal: AbortSignal.timeout(700),
    });
    ready = response.ok;
  } catch {}
  let firewallStatus = "unknown";
  try {
    const value = JSON.parse(
      await readFile(
        join(root, "personal-os/private/firewall-status.json"),
        "utf8",
      ),
    );
    if (["admin_required", "configured"].includes(value.status))
      firewallStatus = value.status;
  } catch {}
  return {
    urls,
    ready,
    port: 4317,
    mode: "private_lan",
    phoneVerified: false,
    firewallStatus,
  };
}
