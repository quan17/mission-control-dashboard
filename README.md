# Mission Control — public demo

A local-first React and TypeScript dashboard for daily planning, learning goals, and multiple project workspaces. This public repository contains **fictional example projects**. It has no live Codex agent connection, imported conversation history, account switching, or automatic task execution.

## Run

```powershell
npm ci
npm run dev
```

Open the URL printed by Vite. `#overview` shows the example portfolio; `#today` and `#learning` let you create local plans and learning goals. The example project directories are under `examples/`. The board starts with no imported sources or candidate tasks; add manual tasks to try it.

The application stores personal plans and goals in `personal-os/`, which is excluded from Git. The local API validates writes, checks revisions, and saves atomically. Do not commit that directory or place credentials in source files. The code does not read another user's chats or projects automatically.

## Local network access

Run `npm run start:lan` to build and serve the UI on a trusted local network. The phone-access panel displays the current LAN URL and the computer's pairing code. Do not forward the port to the internet. If Windows Firewall blocks access, run `scripts/enable-lan.ps1 -LocalAddress <your-private-IPv4>` from an administrator PowerShell. Physical phone reachability depends on the local network and has not been verified for this template.

## Verify

```powershell
npm run typecheck
npm run build
npm run format:check
node --test scripts/verify-board-store.mjs
node --test scripts/verify-learning-store.mjs
```

All project cards are marked **Demo**. Running agents, quotas, native project status, and source freshness remain unknown until an adapter supplies evidence. The app never treats an example as a real approval or completed milestone.
