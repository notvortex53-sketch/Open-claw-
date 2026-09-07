# OpenClaw

A free, browser-based coding agent. Chat with it, it writes files, and it
actually *runs* the code it writes to check it works — all client-side, no
backend server.

## How it works

- **Brain**: [Groq](https://console.groq.com) API (free tier), using
  `llama-3.3-70b-versatile` with tool calling by default.
- **Files**: a virtual filesystem stored in IndexedDB (`src/lib/vfs.ts`) —
  persists across reloads, exportable as a `.zip`.
- **Execution**: Python runs via [Pyodide](https://pyodide.org) (WebAssembly
  Python, loaded from a CDN on first use); JavaScript runs in a sandboxed,
  scripts-only `<iframe>`. Neither touches your real machine.
- **Agent loop**: `src/lib/groq.ts` — sends the conversation + tool schemas to
  Groq, executes whatever tools the model calls (`write_file`, `read_file`,
  `run_python`, `run_js`, etc.), feeds results back, and repeats until the
  model stops calling tools.

## Run it locally (from your phone via GitHub, or any machine)

```bash
npm install
npm run dev
```

Then open the printed local URL. Paste a free Groq API key
(from console.groq.com/keys) into the sidebar — it's stored only in your
browser's `localStorage`, never sent anywhere except directly to Groq's API.

## Deploy for free

This is a static site (no server needed) — it deploys the same way as your
other projects:

1. Push this repo to GitHub.
2. Connect it on [Netlify](https://netlify.com) (or Vercel/GitHub Pages).
3. Build command: `npm run build` — Output directory: `dist`.

No environment variables needed — the API key is entered by whoever uses the
app, in their own browser.

## Extending it

- Add more tools in `src/lib/tools.ts` (schema) + `executeTool` (implementation).
- Swap models in the sidebar dropdown, or edit `MODELS` in `src/components/Sidebar.tsx`.
- The agent loop caps at 8 tool-call rounds per message (`maxIterations` in
  `src/lib/groq.ts`) to avoid runaway loops — raise it for more complex tasks.
