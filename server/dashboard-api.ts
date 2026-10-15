import type { IncomingMessage, ServerResponse } from "node:http";
import { createLearningStore, StoreError } from "./learning-store.ts";
import { createBoardService } from "./board-service.ts";
import { connectionInfo, ensurePairCode } from "./connection.ts";
export function sendJson(res: ServerResponse, status: number, data: unknown) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
  });
  res.end(JSON.stringify(data));
}
export async function jsonBody(req: IncomingMessage) {
  if (
    req.headers.origin !== `http://${req.headers.host}` ||
    req.headers["content-type"]?.split(";")[0] !== "application/json"
  )
    throw new StoreError(403, "只允许当前页面提交 JSON。");
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buffer.length;
    if (size > 1_000_000) throw new StoreError(413, "提交内容过大。");
    chunks.push(buffer);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8")) as unknown;
  } catch {
    throw new StoreError(400, "JSON 格式错误。");
  }
}
export function createDashboardApi(root: string) {
  const learning = createLearningStore(root);
  const board = createBoardService(root);
  return async (req: IncomingMessage, res: ServerResponse) => {
    const path = (req.url ?? "").split("?")[0];
    try {
      if (req.method === "GET") {
        if (path === "/api/learning-goals") {
          sendJson(res, 200, await learning.read());
          return;
        }
        if (path === "/api/board") {
          sendJson(res, 200, await board.snapshot());
          return;
        }
        if (path === "/api/connection") {
          sendJson(res, 200, await connectionInfo(root));
          return;
        }
        if (path === "/api/pairing-code") {
          const ip = req.socket.remoteAddress ?? "";
          if (
            !["127.0.0.1", "::1", "::ffff:127.0.0.1"].includes(ip) ||
            !/^127\.0\.0\.1:\d+$/.test(req.headers.host ?? "")
          )
            throw new StoreError(403, "配对码仅能在这台电脑的本地入口查看。");
          sendJson(res, 200, { code: await ensurePairCode(root) });
          return;
        }
      }
      if (req.method === "PUT" && path === "/api/learning-goals") {
        sendJson(res, 200, await learning.save(await jsonBody(req)));
        return;
      }
      if (req.method === "PUT" && path === "/api/board-state") {
        sendJson(res, 200, await board.save(await jsonBody(req)));
        return;
      }
      if (req.method === "POST" && path === "/api/bridge") {
        await jsonBody(req);
        const result = await board.exportBridge();
        sendJson(res, 200, {
          generatedAt: result.generatedAt,
          revision: result.revision,
          path: "personal-os/exports/BOARD_CONTEXT.md",
        });
        return;
      }
      sendJson(res, 404, { error: "没有此接口。" });
    } catch (error) {
      sendJson(res, error instanceof StoreError ? error.status : 500, {
        error:
          error instanceof StoreError
            ? error.message
            : "本地服务暂时失败，原数据未作为演示状态替换。",
      });
    }
  };
}
