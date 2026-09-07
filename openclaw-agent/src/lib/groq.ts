import Groq from "groq-sdk";
import { toolSchemas, executeTool } from "./tools";

export const DEFAULT_MODEL = "llama-3.3-70b-versatile";
// Swap to "deepseek-r1-distill-llama-70b" to try DeepSeek's reasoning model instead.
// It's a Groq *preview* model: strong reasoning, but can be discontinued without
// notice and sometimes wraps output in <think> tags that confuse tool-calling loops.

const SYSTEM_PROMPT = `You are OpenClaw, a free coding agent running in the browser.
You have tools to read/write/delete files in a virtual project, and to actually
run Python or JavaScript code to test what you write.

Rules:
- When asked to build something, write real files with write_file.
- After writing code, run it with run_python or run_js to check it actually works,
  and fix errors before telling the user you're done.
- Keep files organized with sensible paths (e.g. src/app.py, index.html).
- Be concise in your chat replies; let the code speak for itself.`;

export interface AgentEvent {
  type: "assistant_text" | "tool_call" | "tool_result" | "done" | "error";
  text?: string;
  toolName?: string;
  toolArgs?: Record<string, unknown>;
  toolResult?: string;
  error?: string;
}

export type ChatMessage = Groq.Chat.Completions.ChatCompletionMessageParam;

export function createClient(apiKey: string) {
  return new Groq({ apiKey, dangerouslyAllowBrowser: true });
}

/**
 * Runs the agent loop: calls the model, executes any tool calls it requests,
 * feeds results back, and repeats until the model responds with plain text
 * (or a safety cap on iterations is hit).
 */
export async function* runAgent(
  apiKey: string,
  history: ChatMessage[],
  model: string = DEFAULT_MODEL,
  maxIterations = 8
): AsyncGenerator<AgentEvent> {
  const client = createClient(apiKey);
  const messages: ChatMessage[] = [{ role: "system", content: SYSTEM_PROMPT }, ...history];

  for (let i = 0; i < maxIterations; i++) {
    let completion;
    try {
      completion = await client.chat.completions.create({
        model,
        messages,
        tools: toolSchemas as unknown as Groq.Chat.Completions.ChatCompletionTool[],
        tool_choice: "auto",
        temperature: 0.4,
      });
    } catch (e) {
      yield { type: "error", error: e instanceof Error ? e.message : String(e) };
      return;
    }

    const choice = completion.choices[0];
    const message = choice.message;
    messages.push(message);

    const toolCalls = message.tool_calls ?? [];

    if (message.content) {
      yield { type: "assistant_text", text: message.content };
    }

    if (toolCalls.length === 0) {
      yield { type: "done" };
      return;
    }

    for (const call of toolCalls) {
      let args: Record<string, unknown> = {};
      try {
        args = JSON.parse(call.function.arguments || "{}");
      } catch {
        // fall through with empty args if the model produced bad JSON
      }
      yield { type: "tool_call", toolName: call.function.name, toolArgs: args };

      const result = await executeTool(call.function.name, args);
      yield { type: "tool_result", toolName: call.function.name, toolResult: result.content };

      messages.push({
        role: "tool",
        tool_call_id: call.id,
        content: result.content,
      });
    }
  }

  yield { type: "error", error: "Hit max iterations without finishing — the task may be too complex for one pass." };
}
