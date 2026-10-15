import { createServer } from "node:http";
import { readFile, realpath } from "node:fs/promises";
import { join, resolve, sep, extname } from "node:path";
import { fileURLToPath } from "node:url";
import { randomBytes, timingSafeEqual } from "node:crypto";
import { createDashboardApi, jsonBody, sendJson } from "./dashboard-api.ts";
import { ensurePairCode, isPrivate, lanAddresses } from "./connection.ts";
const root = fileURLToPath(new URL("..", import.meta.url));
const dist = join(root, "dist");
const port = 4317;
const code = await ensurePairCode(root);
const api = createDashboardApi(root);
const sessions = new Map<string, number>();
const failures = new Map<string, { count: number; until: number }>();
const hosts = new Set(["127.0.0.1", ...lanAddresses()]);
const isLoopback = (ip: string) =>
  ["127.0.0.1", "::1", "::ffff:127.0.0.1"].includes(ip);
const login = `<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Mission Control 内网配对</title><style>body{margin:0;background:#f4f6f0;font:16px system-ui;color:#243b2a;display:grid;place-items:center;min-height:100dvh}main{margin:24px;padding:32px;background:white;border:1px solid #dce5d5;border-radius:16px;max-width:400px}small{color:#77896c;letter-spacing:2px}h1{font-size:27px;line-height:1.4}p{font-size:13px;line-height:1.8;color:#74816d}label{display:block;font-size:13px;margin:20px 0 8px}input{box-sizing:border-box;width:100%;border:1px solid #bbcbb0;border-radius:6px;padding:13px;font:inherit}button{width:100%;margin-top:16px;border:0;border-radius:6px;padding:13px;background:#d5e9bc;font:inherit;color:#294329}#error{color:#a45d3b}</style><main><small>MISSION CONTROL · PRIVATE LAN</small><h1>把你的工作区<br>带到手机上。</h1><p>在电脑看板的「手机内网访问」中查看配对码。只有完成配对才能读取任务。</p><form id="pair"><label for="code">访问码</label><input id="code" name="code" autocomplete="off" required minlength="16" maxlength="64"><button>连接我的看板</button><p id="error" role="alert"></p></form></main><script>document.getElementById('pair').addEventListener('submit',async e=>{e.preventDefault();try{const response=await fetch('/api/pair',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({code:document.getElementById('code').value.trim()})});if(response.ok)location.reload();else document.getElementById('error').textContent=(await response.json()).error;}catch{document.getElementById('error').textContent='连接失败，请检查电脑和 Wi-Fi。';}});</script></html>`;
const safeHeaders = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "no-referrer",
  "Cache-Control": "no-store",
  "Content-Security-Policy":
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'",
};
const server = createServer(async (req, res) => {
  for (const [key, value] of Object.entries(safeHeaders))
    res.setHeader(key, value);
  const ip = req.socket.remoteAddress ?? "";
  const cleanIP = ip.replace(/^::ffff:/, "");
  const host = req.headers.host ?? "";
  const hostname = host.split(":")[0];
  const path = (req.url ?? "/").split("?")[0];
  if (
    !hosts.has(hostname) ||
    host !== `${hostname}:${port}` ||
    (!isLoopback(ip) && !isPrivate(cleanIP)) ||
    req.headers["sec-fetch-site"] === "cross-site" ||
    (req.headers.origin && req.headers.origin !== `http://${host}`)
  ) {
    sendJson(res, 403, { error: "仅允许此内网工作区访问。" });
    return;
  }
  if (path === "/health" && req.method === "GET") {
    sendJson(res, 200, { ready: true });
    return;
  }
  try {
    if (path === "/api/pair" && req.method === "POST") {
      const now = Date.now();
      for (const [key, value] of failures)
        if (value.until < now) failures.delete(key);
      if (failures.size > 2000) {
        sendJson(res, 429, { error: "请求过多，请稍后再试。" });
        return;
      }
      const prior = failures.get(ip);
      if (prior && prior.count >= 8) {
        sendJson(res, 429, { error: "尝试次数过多，请 15 分钟后重试。" });
        return;
      }
      const body = await jsonBody(req);
      const supplied =
        typeof (body as { code?: unknown })?.code === "string"
          ? String((body as { code: string }).code)
          : "";
      const actual = Buffer.from(code);
      const attempt = Buffer.from(supplied);
      if (
        attempt.length !== actual.length ||
        !timingSafeEqual(attempt, actual)
      ) {
        failures.set(ip, {
          count: (prior?.count ?? 0) + 1,
          until: now + 15 * 60_000,
        });
        sendJson(res, 401, { error: "访问码不正确。请在电脑上查看。" });
        return;
      }
      for (const [key, until] of sessions)
        if (until < now) sessions.delete(key);
      if (sessions.size >= 100) throw new Error("session limit");
      const token = randomBytes(32).toString("base64url");
      sessions.set(token, now + 12 * 60 * 60_000);
      failures.delete(ip);
      res.setHeader(
        "Set-Cookie",
        `mc_lan=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=43200`,
      );
      sendJson(res, 200, { paired: true });
      return;
    }
    const local = isLoopback(ip) && hostname === "127.0.0.1";
    const cookie = req.headers.cookie
      ?.split(";")
      .map((s) => s.trim())
      .find((s) => s.startsWith("mc_lan="))
      ?.slice(7);
    const allowed =
      local || Boolean(cookie && (sessions.get(cookie) ?? 0) > Date.now());
    if (!allowed) {
      if (path.startsWith("/api/"))
        sendJson(res, 401, { error: "请先输入电脑上的配对码。" });
      else {
        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        res.end(login);
      }
      return;
    }
    if (path.startsWith("/api/")) {
      await api(req, res);
      return;
    }
    if (req.method !== "GET" && req.method !== "HEAD") {
      sendJson(res, 405, { error: "Method not supported" });
      return;
    }
    const decoded = decodeURIComponent(path);
    if (decoded.includes("\\") || decoded.includes("\0")) {
      sendJson(res, 404, { error: "Not found" });
      return;
    }
    const relative = decoded === "/" ? "index.html" : decoded.slice(1);
    const file = resolve(dist, relative);
    if (
      !file.startsWith(resolve(dist) + sep) ||
      !/^(index\.html|assets\/[A-Za-z0-9_.-]+)$/.test(relative)
    ) {
      sendJson(res, 404, { error: "Not found" });
      return;
    }
    const real = await realpath(file);
    if (!real.startsWith(resolve(dist) + sep)) {
      sendJson(res, 404, { error: "Not found" });
      return;
    }
    const bytes = await readFile(real);
    const mime: Record<string, string> = {
      ".html": "text/html; charset=utf-8",
      ".js": "text/javascript; charset=utf-8",
      ".css": "text/css; charset=utf-8",
      ".svg": "image/svg+xml",
    };
    res.writeHead(200, {
      "Content-Type": mime[extname(real)] ?? "application/octet-stream",
    });
    res.end(req.method === "HEAD" ? undefined : bytes);
  } catch {
    if (!res.headersSent)
      sendJson(res, 500, { error: "本地请求失败；原文件保持。" });
    else res.end();
  }
});
server.requestTimeout = 15_000;
server.headersTimeout = 10_000;
server.on("error", (error) => {
  console.error(
    "LAN server failed:",
    (error as NodeJS.ErrnoException).code ?? "unknown",
  );
  process.exitCode = 1;
});
server.listen(port, "0.0.0.0", () => {
  console.log("Mission Control local: http://127.0.0.1:4317");
  for (const address of lanAddresses())
    console.log("LAN entry: http://" + address + ":4317 (pairing required)");
});
