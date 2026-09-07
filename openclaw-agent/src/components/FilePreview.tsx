import { useEffect, useState } from "react";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import * as vfs from "../lib/vfs";

interface FilePreviewProps {
  path: string | null;
  refreshSignal: number;
}

export default function FilePreview({ path, refreshSignal }: FilePreviewProps) {
  const [content, setContent] = useState<string>("");

  useEffect(() => {
    if (!path) {
      setContent("");
      return;
    }
    vfs.readFile(path).then((f) => setContent(f?.content ?? ""));
  }, [path, refreshSignal]);

  async function exportZip() {
    const files = await vfs.readAllFiles();
    if (files.length === 0) return;
    const zip = new JSZip();
    for (const f of files) zip.file(f.path, f.content);
    const blob = await zip.generateAsync({ type: "blob" });
    saveAs(blob, "openclaw-project.zip");
  }

  return (
    <section className="preview">
      <div className="preview-header">
        <span className="preview-path">{path ?? "No file selected"}</span>
        <button className="ghost-btn" type="button" onClick={exportZip}>
          Export project (.zip)
        </button>
      </div>
      <pre className="preview-body">{path ? content : "Select a file from the sidebar to view it."}</pre>
    </section>
  );
}
