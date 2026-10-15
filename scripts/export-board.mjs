import { createBoardService } from "../server/board-service.ts";
const result = await createBoardService(process.cwd()).exportBridge();
console.log(
  JSON.stringify({
    path: "personal-os/exports/BOARD_CONTEXT.md",
    revision: result.revision,
    generatedAt: result.generatedAt,
  }),
);
