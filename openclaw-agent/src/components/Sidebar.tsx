import { useEffect, useState } from "react";
import * as vfs from "../lib/vfs";

interface SidebarProps {
  apiKey: string;
  onApiKeyChange: (key: string) => void;
  model: string;
  onModelChange: (model: string) => void;
  selectedPath: string | null;
  onSelectFile: (path: string) => void;
  refreshSignal: number;
}

const MODELS = [
  { id: "llama-3.3-70b-versatile", label: "Llama 3.3 70B (recommended)" },
  { id: "deepseek-r1-distill-llama-70b", label: "DeepSeek R1 Distill 70B (preview)" },
  { id: "openai/gpt-oss-120b", label: "GPT-OSS 120B" },
];

export default function Sidebar({
  apiKey,
  onApiKeyChange,
  model,
  onModelChange,
  selectedPath,
  onSelectFile,
  refreshSignal,
}: SidebarProps) {
  const [files, setFiles] = useState<string[]>([]);
  const [showKey, setShowKey] = useState(false);

  useEffect(() => {
    vfs.listFiles().then(setFiles);
  }, [refreshSignal]);

  return (
    <aside className="sidebar">
      <div className="sidebar-section">
        <label className="label" htmlFor="apikey">
          Groq API key
        </label>
        <div className="key-row">
          <input
            id="apikey"
            type={showKey ? "text" : "password"}
            value={apiKey}
            onChange={(e) => onApiKeyChange(e.target.value)}
            placeholder="gsk_..."
            autoComplete="off"
            spellCheck={false}
          />
          <button className="ghost-btn" onClick={() => setShowKey((s) => !s)} type="button">
            {showKey ? "hide" : "show"}
          </button>
        </div>
        <p className="hint">
          Stored only in this browser tab. Get a free key at{" "}
          <a href="https://console.groq.com/keys" target="_blank" rel="noreferrer">
            console.groq.com/keys
          </a>
          .
        </p>
      </div>

      <div className="sidebar-section">
        <label className="label" htmlFor="model">
          Model
        </label>
        <select id="model" value={model} onChange={(e) => onModelChange(e.target.value)}>
          {MODELS.map((m) => (
            <option key={m.id} value={m.id}>
              {m.label}
            </option>
          ))}
        </select>
      </div>

      <div className="sidebar-section files-section">
        <div className="label-row">
          <span className="label">Project files</span>
          {files.length > 0 && (
            <button
              className="ghost-btn"
              type="button"
              onClick={async () => {
                if (confirm("Clear all files?")) {
                  await vfs.clearAllFiles();
                  setFiles([]);
                }
              }}
            >
              clear
            </button>
          )}
        </div>
        <div className="file-list">
          {files.length === 0 && <p className="hint">No files yet — ask the agent to build something.</p>}
          {files.map((f) => (
            <button
              key={f}
              className={"file-item" + (f === selectedPath ? " active" : "")}
              onClick={() => onSelectFile(f)}
              type="button"
            >
              {f}
            </button>
          ))}
        </div>
      </div>
    </aside>
  );
}
