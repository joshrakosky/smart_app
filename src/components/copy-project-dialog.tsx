"use client";

import { useEffect, useRef, useState } from "react";
import { PROJECT_COPY_FIELDS, type Project, type ProjectCopyField } from "@/lib/time-clock";

const outlineButton =
  "h-10 rounded-lg border border-slate-300 bg-white px-4 text-sm font-medium text-slate-800 transition-colors hover:border-slate-400 hover:bg-slate-100";
const navyButton =
  "h-10 rounded-lg bg-[#0f2c4c] px-4 text-sm font-medium text-white transition-colors hover:bg-[#1a4a73]";

const DEFAULT_SELECTED: ProjectCopyField[] = [
  "name",
  "description",
  "sku",
  "customerContact",
  "priority",
  "ihDate",
  "wrikeNumber",
  "coupaNumber",
  "type",
  "brands",
  "accountUnitId",
  "billable",
  "otAvailable",
  "allottedHours",
];

// Confirm which fields should seed the new project. Hours never copy.
export function CopyProjectDialog({
  project,
  onClose,
  onConfirm,
}: {
  project: Project;
  onClose: () => void;
  onConfirm: (selected: ProjectCopyField[]) => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [selected, setSelected] = useState<Set<ProjectCopyField>>(() => new Set(DEFAULT_SELECTED));

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    dialog.showModal();
    return () => dialog.close();
  }, []);

  function toggle(id: ProjectCopyField) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="copy-project-title"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      className="m-auto max-h-[calc(100%-2rem)] w-[min(28rem,calc(100%-2rem))] overflow-y-auto rounded-xl border border-slate-200 bg-white p-0 text-slate-900 shadow-lg backdrop:bg-slate-900/40"
    >
      <form
        className="flex flex-col gap-4 p-5"
        onSubmit={(event) => {
          event.preventDefault();
          onConfirm([...selected]);
        }}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id="copy-project-title" className="text-lg font-semibold">
              Copy project
            </h2>
            <p className="text-sm text-slate-500">
              Choose what to bring into a new project from <span className="font-medium text-slate-700">{project.name}</span>.
              Hours stay on the original.
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="text-xl leading-none text-slate-500">
            ×
          </button>
        </div>
        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {PROJECT_COPY_FIELDS.map((field) => (
            <li key={field.id}>
              <label className="flex items-center gap-2 text-sm text-slate-800">
                <input
                  type="checkbox"
                  checked={selected.has(field.id)}
                  onChange={() => toggle(field.id)}
                  className="h-4 w-4 rounded border-slate-300"
                />
                {field.label}
              </label>
            </li>
          ))}
        </ul>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className={outlineButton}>
            Cancel
          </button>
          <button type="submit" disabled={selected.size === 0} className={`${navyButton} disabled:cursor-not-allowed disabled:bg-slate-300`}>
            Create copy
          </button>
        </div>
      </form>
    </dialog>
  );
}
