"use client";

import { useEffect, useRef, useState } from "react";
import { applyImport, downloadImportTemplate, IMPORTS, type ImportId } from "@/lib/imports";

const navyButton =
  "h-10 rounded-lg bg-[#0f2c4c] px-4 text-sm font-medium text-white transition-colors hover:bg-[#1a4a73] disabled:cursor-not-allowed disabled:opacity-50";
const outlineButton =
  "h-10 rounded-lg border border-slate-300 bg-white px-4 text-sm font-medium text-slate-800 transition-colors hover:border-slate-400 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50";

// Opened from the hamburger menu. Template download and CSV upload for each list.
export function ImportDialog({ onClose }: { onClose: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [busy, setBusy] = useState<ImportId | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    dialog.showModal();
    return () => dialog.close();
  }, []);

  function download(id: ImportId) {
    setError(null);
    downloadImportTemplate(id);
    setNote("Template downloaded. Fill it in, then upload the CSV.");
  }

  async function upload(id: ImportId, file: File | undefined) {
    if (!file) return;
    setError(null);
    setNote(null);
    if (!file.name.toLowerCase().endsWith(".csv")) {
      setError("Upload a CSV file. Excel can open the template, then save it as CSV.");
      return;
    }
    setBusy(id);
    try {
      const text = await file.text();
      setNote(applyImport(id, text));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not read that file.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="import-title"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      className="m-auto w-[min(40rem,calc(100%-2rem))] rounded-xl border border-slate-200 bg-white p-0 text-slate-900 shadow-lg backdrop:bg-slate-900/40"
    >
      <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-5 py-4">
        <div>
          <h2 id="import-title" className="text-lg font-semibold">
            Import
          </h2>
          <p className="text-sm text-slate-500">Download a CSV template or upload one. Column lists are a first pass.</p>
        </div>
        <button type="button" onClick={onClose} aria-label="Close" className="text-xl leading-none text-slate-500">
          ×
        </button>
      </div>

      <ul className="flex flex-col gap-3 px-5 py-4">
        {IMPORTS.map((item) => (
          <ImportRow
            key={item.id}
            label={item.label}
            detail={item.detail}
            busy={busy != null}
            uploading={busy === item.id}
            onDownload={() => download(item.id)}
            onUpload={(file) => upload(item.id, file)}
          />
        ))}
      </ul>

      {error ? <p className="px-5 pb-4 text-sm text-red-700">{error}</p> : null}
      {note ? <p className="px-5 pb-4 text-sm text-slate-600">{note}</p> : null}
    </dialog>
  );
}

function ImportRow({
  label,
  detail,
  busy,
  uploading,
  onDownload,
  onUpload,
}: {
  label: string;
  detail: string;
  busy: boolean;
  uploading: boolean;
  onDownload: () => void;
  onUpload: (file: File | undefined) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <li className="flex flex-col gap-3 rounded-lg border border-slate-200 px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-sm text-slate-500">{detail}</p>
      </div>
      <div className="flex shrink-0 gap-2">
        <button type="button" className={outlineButton} disabled={busy} onClick={onDownload}>
          Template
        </button>
        <button type="button" className={navyButton} disabled={busy} onClick={() => inputRef.current?.click()}>
          {uploading ? "Uploading…" : "Upload"}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept=".csv,text/csv"
          className="sr-only"
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            onUpload(file);
          }}
        />
      </div>
    </li>
  );
}
