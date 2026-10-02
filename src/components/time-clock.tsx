"use client";

import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { formatSlashDate } from "@/lib/money";
import {
  closeProject,
  formatDuration,
  getProjectsServerSnapshot,
  getProjectsSnapshot,
  pauseProject,
  projectStatus,
  projectTotalMs,
  replaceProjects,
  startProject,
  subscribeProjects,
  userSession,
  type Project,
} from "@/lib/time-clock";

const fieldClass =
  "h-10 min-w-56 rounded-lg border border-slate-300 bg-white px-3 text-base text-slate-900 shadow-sm";
const addButton =
  "flex h-10 w-10 items-center justify-center rounded-lg bg-[#0f2c4c] text-xl leading-none text-white transition-colors hover:bg-[#1a4a73]";
const headerCell =
  "sticky top-0 z-10 whitespace-nowrap border-r border-b border-slate-200 bg-slate-50 px-4 py-2.5 font-medium last:border-r-0";
const cell = "border-r border-b border-slate-200 px-4 py-2.5 last:border-r-0";

// Hours is a project list. The + button creates a project. Row icons track the signed-in contractor.
export function TimeClock() {
  const projects = useSyncExternalStore(subscribeProjects, getProjectsSnapshot, getProjectsServerSnapshot);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [now, setNow] = useState(0);
  const [selectedId, setSelectedId] = useState("");
  const [name, setName] = useState("");
  const [ihDate, setIhDate] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const running = projects.some((project) => project.sessions.some((session) => session.status === "running"));

  useEffect(() => {
    if (!running) return;
    const tick = () => setNow(Date.now());
    const timer = window.setInterval(tick, 1000);
    const kick = window.setTimeout(tick, 0);
    return () => {
      window.clearInterval(timer);
      window.clearTimeout(kick);
    };
  }, [running]);

  const current = projects.filter((project) => project.close == null);
  const visible = selectedId ? projects.filter((project) => project.id === selectedId) : projects;

  function openCreate() {
    setName("");
    setIhDate("");
    setFormError(null);
    dialogRef.current?.showModal();
  }

  function createProject() {
    const nextName = name.trim();
    if (!nextName) {
      setFormError("Enter a project name.");
      return;
    }
    if (!ihDate) {
      setFormError("Choose an IH date.");
      return;
    }
    replaceProjects([
      ...projects,
      { id: crypto.randomUUID(), name: nextName, ihDate, close: null, sessions: [] },
    ]);
    dialogRef.current?.close();
  }

  function track(project: Project) {
    const at = Date.now();
    setNow(at);
    const mine = userSession(project);
    const next =
      mine?.status === "running"
        ? pauseProject(projects, project.id, at)
        : startProject(projects, project.id, at);
    replaceProjects(next);
  }

  function finish(project: Project, close: "complete" | "cancelled") {
    const at = Date.now();
    setNow(at);
    replaceProjects(closeProject(projects, project.id, close, at));
    if (selectedId === project.id) setSelectedId("");
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-slate-200 px-4 py-3 sm:flex-row sm:items-end sm:justify-between">
        <label className="flex flex-col gap-1 text-sm" htmlFor="current-projects">
          <span className="font-medium text-slate-700">Current Projects</span>
          <select
            id="current-projects"
            value={selectedId}
            onChange={(event) => setSelectedId(event.target.value)}
            className={fieldClass}
          >
            <option value="">All</option>
            {current.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        </label>
        <button type="button" onClick={openCreate} aria-label="New project" className={addButton}>
          +
        </button>
      </div>

      <div className="h-[416px] overflow-auto">
        <table className="w-full min-w-[48rem] border-separate border-spacing-0 text-center text-sm">
          <thead className="text-slate-600">
            <tr>
              <th className={headerCell}>Project</th>
              <th className={headerCell}>IH Dates</th>
              <th className={headerCell}>Status</th>
              <th className={headerCell}>Time</th>
              <th className={headerCell}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-slate-500" colSpan={5}>
                  No projects yet.
                </td>
              </tr>
            ) : (
              visible.map((project) => {
                const status = projectStatus(project);
                const live = status === "In Progress";
                const mine = userSession(project);
                const locked = project.close != null;
                return (
                  <tr key={project.id} className="even:bg-slate-100">
                    <td className={cell}>{project.name}</td>
                    <td className={`${cell} tabular-nums`}>{formatSlashDate(project.ihDate)}</td>
                    <td className={cell}>{status}</td>
                    <td className={`${cell} tabular-nums`}>
                      {formatDuration(projectTotalMs(project, now), live)}
                    </td>
                    <td className={cell}>
                      <div className="flex items-center justify-center gap-1">
                        <TextAction label="Complete" disabled={locked} onClick={() => finish(project, "complete")} />
                        <TextAction label="Cancel" disabled={locked} onClick={() => finish(project, "cancelled")} />
                        <IconAction
                          label={mine?.status === "running" ? "Pause" : "Start"}
                          disabled={locked}
                          onClick={() => track(project)}
                        >
                          {mine?.status === "running" ? <PauseIcon /> : <PlayIcon />}
                        </IconAction>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <dialog
        ref={dialogRef}
        className="m-auto h-fit w-[min(28rem,calc(100%-2rem))] rounded-xl border border-slate-200 bg-white p-0 text-slate-900 shadow-lg backdrop:bg-slate-900/40"
        aria-labelledby="new-project-title"
      >
        <form
          className="flex flex-col gap-4 p-5"
          onSubmit={(event) => {
            event.preventDefault();
            createProject();
          }}
        >
          <div className="flex items-start justify-between gap-3">
            <h2 id="new-project-title" className="text-lg font-semibold">
              Create a New Project
            </h2>
            <button
              type="button"
              aria-label="Close"
              onClick={() => dialogRef.current?.close()}
              className="text-xl leading-none text-slate-500"
            >
              ×
            </button>
          </div>
          <label className="flex flex-col gap-1 text-sm" htmlFor="project-name">
            <span className="font-medium text-slate-700">Name</span>
            <input
              id="project-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-slate-900"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm" htmlFor="project-ih-date">
            <span className="font-medium text-slate-700">IH Dates</span>
            <input
              id="project-ih-date"
              type="date"
              value={ihDate}
              onChange={(event) => setIhDate(event.target.value)}
              className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-slate-900"
            />
          </label>
          {formError ? <p className="text-sm text-red-700">{formError}</p> : null}
          <button
            type="submit"
            className="h-10 w-fit rounded-lg bg-[#0f2c4c] px-4 text-sm font-medium text-white transition-colors hover:bg-[#1a4a73]"
          >
            Create
          </button>
        </form>
      </dialog>
    </section>
  );
}

function TextAction({
  label,
  disabled,
  onClick,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="h-8 rounded-lg border border-slate-300 bg-white px-2.5 text-sm font-medium text-slate-700 transition-colors hover:border-slate-400 hover:bg-slate-100 hover:text-[#0f2c4c] disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-300"
    >
      {label}
    </button>
  );
}

function IconAction({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-700 transition-colors hover:border-slate-400 hover:bg-slate-100 hover:text-[#0f2c4c] disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-300"
    >
      {children}
    </button>
  );
}

function PlayIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M8 5v14l11-7L8 5Z" />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M6 5h4v14H6V5Zm8 0h4v14h-4V5Z" />
    </svg>
  );
}
