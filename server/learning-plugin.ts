import { fileURLToPath } from "node:url";
import type { Plugin, ViteDevServer, PreviewServer } from "vite";
import { createDashboardApi, sendJson } from "./dashboard-api.ts";
export function learningPlugin(): Plugin {
  const api = createDashboardApi(fileURLToPath(new URL("..", import.meta.url)));
  const attach = (server: ViteDevServer | PreviewServer) => {
    server.middlewares.use((req, res, next) => {
      if (!(req.url ?? "").startsWith("/api/")) {
        next();
        return;
      }
      const host = req.headers.host ?? "";
      if (
        !/^127\.0\.0\.1:\d+$/.test(host) ||
        req.headers["sec-fetch-site"] === "cross-site" ||
        (req.headers.origin && req.headers.origin !== `http://${host}`)
      ) {
        sendJson(res, 403, { error: "仅允许本地工作区访问。" });
        return;
      }
      void api(req, res);
    });
  };
  return {
    name: "local-dashboard",
    configureServer: attach,
    configurePreviewServer: attach,
  };
}
