// --- Python execution via Pyodide (WebAssembly Python, runs 100% client-side) ---

declare global {
  interface Window {
    loadPyodide?: (opts?: Record<string, unknown>) => Promise<PyodideInterface>;
  }
}

interface PyodideInterface {
  runPythonAsync: (code: string) => Promise<unknown>;
  setStdout: (opts: { batched: (s: string) => void }) => void;
  setStderr: (opts: { batched: (s: string) => void }) => void;
}

let pyodideInstance: PyodideInterface | null = null;
let pyodideLoading: Promise<PyodideInterface> | null = null;

const PYODIDE_VERSION = "0.26.2";
const PYODIDE_CDN = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`;

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) return resolve();
    const s = document.createElement("script");
    s.src = src;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(s);
  });
}

async function getPyodide(): Promise<PyodideInterface> {
  if (pyodideInstance) return pyodideInstance;
  if (pyodideLoading) return pyodideLoading;

  pyodideLoading = (async () => {
    await loadScript(`${PYODIDE_CDN}pyodide.js`);
    if (!window.loadPyodide) throw new Error("Pyodide failed to attach to window");
    const pyodide = await window.loadPyodide({ indexURL: PYODIDE_CDN });
    pyodideInstance = pyodide;
    return pyodide;
  })();

  return pyodideLoading;
}

export async function runPython(code: string): Promise<{ stdout: string; stderr: string; error: string | null }> {
  const pyodide = await getPyodide();
  let stdout = "";
  let stderr = "";
  pyodide.setStdout({ batched: (s: string) => (stdout += s + "\n") });
  pyodide.setStderr({ batched: (s: string) => (stderr += s + "\n") });

  try {
    await pyodide.runPythonAsync(code);
    return { stdout, stderr, error: null };
  } catch (e) {
    return { stdout, stderr, error: e instanceof Error ? e.message : String(e) };
  }
}

// --- JS/HTML execution via sandboxed iframe (isolated from the real app) ---

export function runJs(code: string, timeoutMs = 5000): Promise<{ logs: string[]; error: string | null }> {
  return new Promise((resolve) => {
    const iframe = document.createElement("iframe");
    // allow-scripts only — no same-origin, no top navigation, no forms.
    iframe.setAttribute("sandbox", "allow-scripts");
    iframe.style.display = "none";
    document.body.appendChild(iframe);

    const logs: string[] = [];
    let settled = false;

    const finish = (error: string | null) => {
      if (settled) return;
      settled = true;
      window.removeEventListener("message", onMessage);
      iframe.remove();
      resolve({ logs, error });
    };

    function onMessage(e: MessageEvent) {
      if (e.source !== iframe.contentWindow) return;
      const data = e.data as { type: string; payload?: unknown };
      if (data.type === "log") logs.push(String(data.payload));
      else if (data.type === "error") finish(String(data.payload));
      else if (data.type === "done") finish(null);
    }
    window.addEventListener("message", onMessage);

    const doc = `<!doctype html><html><body><script>
      const send = (type, payload) => parent.postMessage({ type, payload }, "*");
      ["log","warn","error","info"].forEach(m => {
        const orig = console[m];
        console[m] = (...args) => { send("log", args.map(String).join(" ")); orig?.(...args); };
      });
      window.onerror = (msg) => { send("error", String(msg)); };
      try {
        const result = (function() { ${code} })();
        if (result !== undefined) send("log", "=> " + String(result));
        send("done", null);
      } catch (err) {
        send("error", err && err.message ? err.message : String(err));
      }
    <\/script></body></html>`;

    iframe.srcdoc = doc;
    setTimeout(() => finish("Timed out after " + timeoutMs + "ms"), timeoutMs);
  });
}
