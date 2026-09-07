import * as vfs from "./vfs";
import { runPython, runJs } from "./sandbox";

// Groq's API uses the OpenAI-style tool schema.
export const toolSchemas = [
  {
    type: "function",
    function: {
      name: "write_file",
      description: "Create a new file or overwrite an existing file with the given content.",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string", description: "File path, e.g. 'src/main.py' or 'index.html'" },
          content: { type: "string", description: "Full file content to write" },
        },
        required: ["path", "content"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "read_file",
      description: "Read the full content of an existing file.",
      parameters: {
        type: "object",
        properties: { path: { type: "string" } },
        required: ["path"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_files",
      description: "List all file paths currently in the project.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "delete_file",
      description: "Delete a file from the project.",
      parameters: {
        type: "object",
        properties: { path: { type: "string" } },
        required: ["path"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "run_python",
      description:
        "Execute Python code in a sandboxed interpreter and return stdout/stderr. Use this to test logic, run scripts, or verify code you just wrote actually works.",
      parameters: {
        type: "object",
        properties: { code: { type: "string", description: "Python source to execute" } },
        required: ["code"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "run_js",
      description:
        "Execute JavaScript code in an isolated sandbox and return console output. Use this to test logic or verify code you just wrote actually works.",
      parameters: {
        type: "object",
        properties: { code: { type: "string", description: "JavaScript source to execute" } },
        required: ["code"],
      },
    },
  },
] as const;

export type ToolName = (typeof toolSchemas)[number]["function"]["name"];

export interface ToolCallResult {
  name: string;
  content: string;
}

export async function executeTool(name: string, args: Record<string, unknown>): Promise<ToolCallResult> {
  try {
    switch (name as ToolName) {
      case "write_file": {
        const path = String(args.path);
        const content = String(args.content ?? "");
        await vfs.writeFile(path, content);
        return { name, content: `Wrote ${content.length} chars to ${path}` };
      }
      case "read_file": {
        const path = String(args.path);
        const file = await vfs.readFile(path);
        return { name, content: file ? file.content : `Error: ${path} does not exist` };
      }
      case "list_files": {
        const files = await vfs.listFiles();
        return { name, content: files.length ? files.join("\n") : "(no files yet)" };
      }
      case "delete_file": {
        const path = String(args.path);
        await vfs.deleteFile(path);
        return { name, content: `Deleted ${path}` };
      }
      case "run_python": {
        const code = String(args.code ?? "");
        const result = await runPython(code);
        const parts = [];
        if (result.stdout) parts.push(`stdout:\n${result.stdout}`);
        if (result.stderr) parts.push(`stderr:\n${result.stderr}`);
        if (result.error) parts.push(`error:\n${result.error}`);
        return { name, content: parts.join("\n\n") || "(no output)" };
      }
      case "run_js": {
        const code = String(args.code ?? "");
        const result = await runJs(code);
        const parts = [];
        if (result.logs.length) parts.push(result.logs.join("\n"));
        if (result.error) parts.push(`error:\n${result.error}`);
        return { name, content: parts.join("\n\n") || "(no output)" };
      }
      default:
        return { name, content: `Error: unknown tool ${name}` };
    }
  } catch (e) {
    return { name, content: `Error: ${e instanceof Error ? e.message : String(e)}` };
  }
}
