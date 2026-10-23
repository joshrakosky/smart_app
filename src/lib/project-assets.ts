// Project files stay in this browser until storage exists.
// They are kept apart from the project list so a clock tick does not rewrite the file data.

export type ProjectAsset = {
  id: string;
  name: string;
  contentType: string;
  sizeBytes: number;
  // Data URL so Download can hand the file back from this browser.
  dataUrl: string;
};

// localStorage is small. One file over this is refused instead of failing the whole save.
export const MAX_PROJECT_ASSET_BYTES = Math.floor(1.5 * 1024 * 1024);

const STORAGE_KEY = "smart-project-assets";

export function loadProjectAssets(projectId: string): ProjectAsset[] {
  const store = readStore();
  const rows = store[projectId];
  if (!Array.isArray(rows)) return [];
  return rows.map(normalizeAsset).filter((asset): asset is ProjectAsset => asset != null);
}

// Returns an error message when the browser cannot keep the files. Null means they were saved.
export function saveProjectAssets(projectId: string, assets: ProjectAsset[]): string | null {
  const store = readStore();
  if (assets.length === 0) delete store[projectId];
  else store[projectId] = assets;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
    return null;
  } catch {
    return "Those files are too large to keep in this browser. Remove one and try again.";
  }
}

export function readProjectAsset(file: File): Promise<ProjectAsset> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve({
        id: crypto.randomUUID(),
        name: file.name,
        contentType: file.type || "application/octet-stream",
        sizeBytes: file.size,
        dataUrl: typeof reader.result === "string" ? reader.result : "",
      });
    };
    reader.onerror = () => reject(reader.error ?? new Error("Could not read that file."));
    reader.readAsDataURL(file);
  });
}

export function downloadProjectAsset(asset: ProjectAsset) {
  const link = document.createElement("a");
  link.href = asset.dataUrl;
  link.download = asset.name;
  link.click();
}

export function formatAssetSize(size: number): string {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${Math.round(size / 102.4) / 10} KB`;
  return `${Math.round(size / (1024 * 102.4)) / 10} MB`;
}

function readStore(): Record<string, unknown> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    return parsed as Record<string, unknown>;
  } catch {
    return {};
  }
}

function normalizeAsset(value: unknown): ProjectAsset | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Partial<ProjectAsset>;
  if (typeof row.id !== "string" || typeof row.name !== "string" || typeof row.dataUrl !== "string") return null;
  if (!row.dataUrl.startsWith("data:")) return null;
  return {
    id: row.id,
    name: row.name,
    contentType: typeof row.contentType === "string" ? row.contentType : "application/octet-stream",
    sizeBytes: typeof row.sizeBytes === "number" && row.sizeBytes >= 0 ? row.sizeBytes : 0,
    dataUrl: row.dataUrl,
  };
}
