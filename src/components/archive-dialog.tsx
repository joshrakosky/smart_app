"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { formatSlashDate } from "@/lib/money";
import {
  getProjectsServerSnapshot,
  getProjectsSnapshot,
  projectStatus,
  replaceProjects,
  reviveProject,
  subscribeProjects,
  type Project,
} from "@/lib/time-clock";

const outlineButton =
  "h-9 rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-800 transition-colors hover:border-slate-400 hover:bg-slate-100";
const navyButton =
  "h-9 rounded-lg bg-[#0f2c4c] px-3 text-sm font-medium text-white transition-colors hover:bg-[#1a4a73]";

// Completed and cancelled projects land here. Revive puts them back in the Hours queue.
export function ArchiveDialog({ onClose }: { onClose: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const projects = useSyncExternalStore(subscribeProjects, getProjectsSnapshot, getProjectsServerSnapshot);
  const archived = projects
    .filter((project) => project.close != null)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    dialog.showModal();
    return () => dialog.close();
  }, []);

  function revive(project: Project) {
    replaceProjects(reviveProject(projects, project.id));
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="archive-title"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      className="m-auto max-h-[calc(100%-2rem)] w-[min(40rem,calc(100%-2rem))] overflow-y-auto rounded-xl border border-slate-200 bg-white p-0 text-slate-900 shadow-lg backdrop:bg-slate-900/40"
    >
      <div className="flex flex-col gap-4 p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id="archive-title" className="text-lg font-semibold">
              Archive
            </h2>
            <p className="text-sm text-slate-500">Completed and cancelled projects. Revive to pull one back into the queue.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="text-xl leading-none text-slate-500">
            ×
          </button>
        </div>
        {archived.length === 0 ? (
          <p className="text-sm text-slate-500">Nothing archived yet.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {archived.map((project) => (
              <li
                key={project.id}
                className="flex flex-col gap-2 rounded-lg border border-slate-200 px-3 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium text-slate-900">{project.name}</p>
                  <p className="text-xs text-slate-500">
                    {projectStatus(project)} · IH {formatSlashDate(project.ihDate)}
                    {project.wrikeNumber ? ` · Wrike ${project.wrikeNumber}` : ""}
                  </p>
                </div>
                <button type="button" onClick={() => revive(project)} className={navyButton}>
                  Revive
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className="flex justify-end">
          <button type="button" onClick={onClose} className={outlineButton}>
            Close
          </button>
        </div>
      </div>
    </dialog>
  );
}
