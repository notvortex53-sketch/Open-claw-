import { useEffect, useRef, useState } from "react";
import { runAgent, type ChatMessage } from "../lib/groq";

interface TranscriptItem {
  id: string;
  kind: "user" | "assistant" | "tool" | "error";
  text: string;
  toolName?: string;
}

interface ChatProps {
  apiKey: string;
  model: string;
  onFilesChanged: () => void;
}

let idCounter = 0;
const nextId = () => String(idCounter++);

export default function Chat({ apiKey, model, onFilesChanged }: ChatProps) {
  const [transcript, setTranscript] = useState<TranscriptItem[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const historyRef = useRef<ChatMessage[]>([]);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [transcript]);

  async function send() {
    const text = input.trim();
    if (!text || busy) return;
    if (!apiKey) {
      setTranscript((t) => [...t, { id: nextId(), kind: "error", text: "Add your Groq API key in the sidebar first." }]);
      return;
    }

    setInput("");
    setTranscript((t) => [...t, { id: nextId(), kind: "user", text }]);
    historyRef.current.push({ role: "user", content: text });
    setBusy(true);

    let touchedFiles = false;

    try {
      for await (const event of runAgent(apiKey, historyRef.current, model)) {
        if (event.type === "assistant_text" && event.text) {
          setTranscript((t) => [...t, { id: nextId(), kind: "assistant", text: event.text! }]);
        } else if (event.type === "tool_call") {
          const argStr = JSON.stringify(event.toolArgs, null, 0);
          setTranscript((t) => [
            ...t,
            { id: nextId(), kind: "tool", toolName: event.toolName, text: `→ ${event.toolName}(${truncate(argStr, 160)})` },
          ]);
          if (event.toolName && ["write_file", "delete_file"].includes(event.toolName)) touchedFiles = true;
        } else if (event.type === "tool_result") {
          setTranscript((t) => [
            ...t,
            { id: nextId(), kind: "tool", toolName: event.toolName, text: truncate(event.toolResult ?? "", 400) },
          ]);
        } else if (event.type === "error" && event.error) {
          setTranscript((t) => [...t, { id: nextId(), kind: "error", text: event.error! }]);
        }
      }
    } catch (e) {
      setTranscript((t) => [...t, { id: nextId(), kind: "error", text: e instanceof Error ? e.message : String(e) }]);
    }

    setBusy(false);
    if (touchedFiles) onFilesChanged();
  }

  return (
    <section className="chat">
      <div className="transcript">
        {transcript.length === 0 && (
          <div className="empty-state">
            <p>Ask OpenClaw to build something. It can write files, then run the code to check it works.</p>
            <p className="hint">e.g. "Write a Python function that checks if a number is prime, then test it on 17 and 18."</p>
          </div>
        )}
        {transcript.map((item) => (
          <div key={item.id} className={`msg msg-${item.kind}`}>
            {item.kind === "tool" && <span className="tool-tag">{item.toolName}</span>}
            <pre className="msg-text">{item.text}</pre>
          </div>
        ))}
        {busy && <div className="msg msg-tool typing">working…</div>}
        <div ref={endRef} />
      </div>
      <div className="composer">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          placeholder="Describe what to build…"
          rows={2}
          disabled={busy}
        />
        <button onClick={send} disabled={busy || !input.trim()} className="send-btn" type="button">
          {busy ? "…" : "Send"}
        </button>
      </div>
    </section>
  );
}

function truncate(s: string, n: number) {
  return s.length > n ? s.slice(0, n) + "…" : s;
}
