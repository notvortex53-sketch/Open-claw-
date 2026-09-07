import { useEffect, useState } from "react";
import Sidebar from "./components/Sidebar";
import Chat from "./components/Chat";
import FilePreview from "./components/FilePreview";
import { DEFAULT_MODEL } from "./lib/groq";
import "./App.css";

const STORAGE_KEY = "openclaw:apikey";
const MODEL_KEY = "openclaw:model";

export default function App() {
  const [apiKey, setApiKey] = useState(() => localStorage.getItem(STORAGE_KEY) ?? "");
  const [model, setModel] = useState(() => localStorage.getItem(MODEL_KEY) ?? DEFAULT_MODEL);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [refreshSignal, setRefreshSignal] = useState(0);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, apiKey);
  }, [apiKey]);

  useEffect(() => {
    localStorage.setItem(MODEL_KEY, model);
  }, [model]);

  return (
    <div className="app">
      <header className="topbar">
        <span className="logo">OpenClaw</span>
        <span className="tagline">free browser coding agent · Groq</span>
      </header>
      <div className="layout">
        <Sidebar
          apiKey={apiKey}
          onApiKeyChange={setApiKey}
          model={model}
          onModelChange={setModel}
          selectedPath={selectedPath}
          onSelectFile={setSelectedPath}
          refreshSignal={refreshSignal}
        />
        <Chat apiKey={apiKey} model={model} onFilesChanged={() => setRefreshSignal((n) => n + 1)} />
        <FilePreview path={selectedPath} refreshSignal={refreshSignal} />
      </div>
    </div>
  );
}
