"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { formatSlashDate } from "@/lib/money";
import {
  closeProject,
  formatDuration,
  getProjectsServerSnapshot,
  getProjectsSnapshot,
  pauseProject,
  projectStatus,
  replaceProjects,
  sessionLabel,
  sessionMs,
  startProject,
  stopProject,
  subscribeProjects,
  updateProject,
  userSession,
  type Project,
  type WorkSession,
} from "@/lib/time-clock";

const fieldClass =
  "h-10 min-w-56 rounded-lg border border-slate-300 bg-white px-3 text-base text-slate-900 shadow-sm";
const addButton =
  "flex h-10 w-10 items-center justify-center rounded-lg bg-[#0f2c4c] text-xl leading-none text-white transition-colors hover:bg-[#1a4a73]";
const headerCell =
  "sticky top-0 z-10 whitespace-nowrap border-r border-b border-slate-200 bg-slate-50 px-4 py-2.5 font-medium last:border-r-0";
const cell = "border-r border-b border-slate-200 px-4 py-2.5 last:border-r-0";
// Colored clock controls: green start, gold pause, red stop.
const startButton =
  "flex h-8 w-8 items-center justify-center rounded-lg border border-emerald-700 bg-emerald-600 text-white transition-colors hover:bg-emerald-500 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-300";
const pauseButton =
  "flex h-8 w-8 items-center justify-center rounded-lg border border-amber-700 bg-amber-500 text-white transition-colors hover:bg-amber-400 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-300";
const stopButton =
  "flex h-8 w-8 items-center justify-center rounded-lg border border-red-700 bg-red-600 text-white transition-colors hover:bg-red-500 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-300";
const outlineButton =
  "h-10 rounded-lg border border-slate-300 bg-white px-4 text-sm font-medium text-slate-800 transition-colors hover:border-slate-400 hover:bg-slate-100";
const navyButton =
  "h-10 rounded-lg bg-[#0f2c4c] px-4 text-sm font-medium text-white transition-colors hover:bg-[#1a4a73]";
const dangerButton = "h-10 rounded-lg bg-red-600 px-4 text-sm font-medium text-white transition-colors hover:bg-red-500";

type ClockConfirm = { project: Project; action: "complete" | "cancelled" | "stop" };

// Hours is a project list. The + button creates a project. Row icons track the signed-in contractor.
export function TimeClock() {
  const projects = useSyncExternalStore(subscribeProjects, getProjectsSnapshot, getProjectsServerSnapshot);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [now, setNow] = useState(0);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [wrikeNumber, setWrikeNumber] = useState("");
  const [ihDate, setIhDate] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Project | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editWrikeNumber, setEditWrikeNumber] = useState("");
  const [editIhDate, setEditIhDate] = useState("");
  const [editError, setEditError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<ClockConfirm | null>(null);

  // Tick while work or a pause is being counted.
  const ticking = projects.some((project) =>
    project.sessions.some((session) => session.status === "running" || session.pausedSince != null),
  );

  useEffect(() => {
    if (!ticking) return;
    const tick = () => setNow(Date.now());
    const timer = window.setInterval(tick, 1000);
    const kick = window.setTimeout(tick, 0);
    return () => {
      window.clearInterval(timer);
      window.clearTimeout(kick);
    };
  }, [ticking]);

  const current = projects.filter((project) => project.close == null);
  const selected = selectedId ? projects.filter((project) => project.id === selectedId) : projects;
  const needle = query.trim().toLowerCase();
  const visible = needle
    ? selected.filter((project) => {
        const haystack = `${project.name} ${project.description} ${project.wrikeNumber}`.toLowerCase();
        return haystack.includes(needle);
      })
    : selected;

  function openCreate() {
    setName("");
    setDescription("");
    setWrikeNumber("");
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
      {
        id: crypto.randomUUID(),
        name: nextName,
        description: description.trim(),
        wrikeNumber: wrikeNumber.trim(),
        ihDate,
        close: null,
        sessions: [],
      },
    ]);
    dialogRef.current?.close();
  }

  function openEdit(project: Project) {
    setEditing(project);
    setEditName(project.name);
    setEditDescription(project.description);
    setEditWrikeNumber(project.wrikeNumber);
    setEditIhDate(project.ihDate);
    setEditError(null);
  }

  function saveEdit() {
    if (!editing) return;
    const nextName = editName.trim();
    if (!nextName) {
      setEditError("Enter a project name.");
      return;
    }
    if (!editIhDate) {
      setEditError("Choose an IH date.");
      return;
    }
    replaceProjects(
      updateProject(projects, editing.id, {
        name: nextName,
        description: editDescription.trim(),
        wrikeNumber: editWrikeNumber.trim(),
        ihDate: editIhDate,
      }),
    );
    setEditing(null);
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
    setEditing(null);
    setConfirm(null);
  }

  function stop(project: Project) {
    const at = Date.now();
    setNow(at);
    replaceProjects(stopProject(projects, project.id, at));
    setConfirm(null);
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-slate-200 px-4 py-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-end">
          <label className="flex flex-col gap-1 text-sm" htmlFor="project-search">
            <span className="font-medium text-slate-700">Search</span>
            <input
              id="project-search"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search projects"
              aria-label="Search projects"
              className={`${fieldClass} w-full sm:w-64`}
            />
          </label>
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
        </div>
        <button type="button" onClick={openCreate} aria-label="New project" className={addButton}>
          +
        </button>
      </div>

      <div className="h-[416px] overflow-auto">
        <table className="w-full min-w-[52rem] border-separate border-spacing-0 text-center text-sm">
          <thead className="text-slate-600">
            <tr>
              <th className={headerCell}>Project</th>
              <th className={headerCell}>Wrike #</th>
              <th className={headerCell}>IH Dates</th>
              <th className={headerCell}>Status</th>
              <th className={headerCell}>Time</th>
              <th className={headerCell}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-slate-500" colSpan={6}>
                  {needle ? "No projects match that search." : "No projects yet."}
                </td>
              </tr>
            ) : (
              visible.map((project) => {
                const status = projectStatus(project);
                const mine = userSession(project);
                // Time is this signed-in user's clock only. Others show up on the status hover.
                const live = mine?.status === "running";
                const mineMs = mine ? sessionMs(mine, now) : 0;
                const locked = project.close != null;
                return (
                  <tr key={project.id} className="even:bg-slate-100">
                    <td className={cell}>
                      <button
                        type="button"
                        onClick={() => openEdit(project)}
                        className="font-medium text-[#0f2c4c] underline-offset-2 hover:underline"
                      >
                        {project.name}
                      </button>
                    </td>
                    <td className={cell}>{project.wrikeNumber || "—"}</td>
                    <td className={`${cell} tabular-nums`}>{formatSlashDate(project.ihDate)}</td>
                    <td className={cell}>
                      <StatusHover status={status} sessions={project.sessions} />
                    </td>
                    <td className={cell}>
                      {/* Reserved second line keeps row height steady when a pause clock shows. */}
                      <div className="flex min-h-[2.5rem] flex-col items-center justify-center tabular-nums leading-tight">
                        <span>{formatDuration(mineMs, live)}</span>
                        <span className="mt-0.5 block h-4 text-xs font-normal text-slate-500">
                          {mine?.pausedSince != null
                            ? formatDuration(Math.max(0, now - mine.pausedSince), true)
                            : "\u00a0"}
                        </span>
                      </div>
                    </td>
                    <td className={cell}>
                      {(() => {
                        const running = mine?.status === "running";
                        const timing = running || mine?.pausedSince != null;
                        // Running shows gold pause. Paused (and idle) show green play.
                        return (
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              aria-label={
                                running
                                  ? `Pause ${project.name}`
                                  : mine?.pausedSince != null
                                    ? `Resume ${project.name}`
                                    : `Start ${project.name}`
                              }
                              disabled={locked}
                              onClick={() => track(project)}
                              className={running ? pauseButton : startButton}
                            >
                              {running ? <PauseIcon /> : <PlayIcon />}
                            </button>
                            <button
                              type="button"
                              aria-label={`Stop ${project.name}`}
                              disabled={locked || !timing}
                              onClick={() => setConfirm({ project, action: "stop" })}
                              className={stopButton}
                            >
                              <StopIcon />
                            </button>
                          </div>
                        );
                      })()}
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
            <span className="font-medium text-slate-700">Project name</span>
            <input
              id="project-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-slate-900"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm" htmlFor="project-description">
            <span className="font-medium text-slate-700">Description</span>
            <textarea
              id="project-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={3}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm" htmlFor="project-wrike">
            <span className="font-medium text-slate-700">Wrike #</span>
            <input
              id="project-wrike"
              value={wrikeNumber}
              onChange={(event) => setWrikeNumber(event.target.value)}
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

      {editing ? (
        <ProjectEditDialog
          name={editName}
          description={editDescription}
          wrikeNumber={editWrikeNumber}
          ihDate={editIhDate}
          error={editError}
          closed={editing.close != null}
          onName={setEditName}
          onDescription={setEditDescription}
          onWrikeNumber={setEditWrikeNumber}
          onIhDate={setEditIhDate}
          onClose={() => setEditing(null)}
          onSave={saveEdit}
          onComplete={() => setConfirm({ project: editing, action: "complete" })}
          onCancelProject={() => setConfirm({ project: editing, action: "cancelled" })}
        />
      ) : null}

      {confirm ? (
        <ClockConfirmDialog
          projectName={confirm.project.name}
          action={confirm.action}
          onClose={() => setConfirm(null)}
          onConfirm={() => {
            if (confirm.action === "stop") stop(confirm.project);
            else finish(confirm.project, confirm.action);
          }}
        />
      ) : null}
    </section>
  );
}

// Hover the row status to see who else is on the project and whether they are running or paused.
function StatusHover({ status, sessions }: { status: string; sessions: WorkSession[] }) {
  const [tip, setTip] = useState<{ top: number; left: number } | null>(null);
  const people = [...sessions].sort((a, b) => a.person.localeCompare(b.person));

  if (people.length === 0) return <>{status}</>;

  return (
    <span
      className="relative inline-flex cursor-default underline decoration-slate-300 decoration-dotted underline-offset-2"
      onMouseEnter={(event) => {
        const box = event.currentTarget.getBoundingClientRect();
        setTip({ top: box.bottom + 6, left: box.left + box.width / 2 });
      }}
      onMouseLeave={() => setTip(null)}
    >
      {status}
      {tip ? (
        <span
          role="tooltip"
          className="pointer-events-none fixed z-50 min-w-[10rem] -translate-x-1/2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-left text-xs font-normal text-slate-700 shadow-lg"
          style={{ top: tip.top, left: tip.left }}
        >
          <span className="mb-1 block font-medium text-slate-500">On this project</span>
          <ul className="flex flex-col gap-1">
            {people.map((session) => (
              <li key={session.person} className="flex justify-between gap-4 whitespace-nowrap">
                <span>{session.person}</span>
                <span className="text-slate-500">{sessionLabel(session)}</span>
              </li>
            ))}
          </ul>
        </span>
      ) : null}
    </span>
  );
}

function ProjectEditDialog({
  name,
  description,
  wrikeNumber,
  ihDate,
  error,
  closed,
  onName,
  onDescription,
  onWrikeNumber,
  onIhDate,
  onClose,
  onSave,
  onComplete,
  onCancelProject,
}: {
  name: string;
  description: string;
  wrikeNumber: string;
  ihDate: string;
  error: string | null;
  closed: boolean;
  onName: (value: string) => void;
  onDescription: (value: string) => void;
  onWrikeNumber: (value: string) => void;
  onIhDate: (value: string) => void;
  onClose: () => void;
  onSave: () => void;
  onComplete: () => void;
  onCancelProject: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    dialog.showModal();
    return () => dialog.close();
  }, []);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="edit-project-title"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      className="m-auto w-[min(28rem,calc(100%-2rem))] rounded-xl border border-slate-200 bg-white p-0 text-slate-900 shadow-lg backdrop:bg-slate-900/40"
    >
      <form
        className="flex flex-col gap-4 p-5"
        onSubmit={(event) => {
          event.preventDefault();
          onSave();
        }}
      >
        <div className="flex items-start justify-between gap-3">
          <h2 id="edit-project-title" className="text-lg font-semibold">
            Edit project
          </h2>
          <button type="button" onClick={onClose} aria-label="Close" className="text-xl leading-none text-slate-500">
            ×
          </button>
        </div>
        <label className="flex flex-col gap-1 text-sm" htmlFor="edit-project-name">
          <span className="font-medium text-slate-700">Project name</span>
          <input
            id="edit-project-name"
            value={name}
            onChange={(event) => onName(event.target.value)}
            className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-slate-900"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm" htmlFor="edit-project-description">
          <span className="font-medium text-slate-700">Description</span>
          <textarea
            id="edit-project-description"
            value={description}
            onChange={(event) => onDescription(event.target.value)}
            rows={3}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm" htmlFor="edit-project-wrike">
          <span className="font-medium text-slate-700">Wrike #</span>
          <input
            id="edit-project-wrike"
            value={wrikeNumber}
            onChange={(event) => onWrikeNumber(event.target.value)}
            className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-slate-900"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm" htmlFor="edit-project-ih-date">
          <span className="font-medium text-slate-700">IH date</span>
          <input
            id="edit-project-ih-date"
            type="date"
            value={ihDate}
            onChange={(event) => onIhDate(event.target.value)}
            className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-slate-900"
          />
        </label>
        {error ? <p className="text-sm text-red-700">{error}</p> : null}
        <div className="flex items-center justify-between gap-2">
          {closed ? (
            <span />
          ) : (
            <div className="flex gap-2">
              <button type="button" onClick={onComplete} className={navyButton}>
                Complete
              </button>
              <button type="button" onClick={onCancelProject} className={dangerButton}>
                Cancel
              </button>
            </div>
          )}
          <button type="submit" className={navyButton}>
            Save
          </button>
        </div>
      </form>
    </dialog>
  );
}

function ClockConfirmDialog({
  projectName,
  action,
  onClose,
  onConfirm,
}: {
  projectName: string;
  action: ClockConfirm["action"];
  onClose: () => void;
  onConfirm: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const stopping = action === "stop";
  const completing = action === "complete";

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    dialog.showModal();
    return () => dialog.close();
  }, []);

  const title = stopping
    ? "Are you sure you want to stop?"
    : completing
      ? "Complete this project?"
      : "Cancel this project?";
  const detail = stopping
    ? "The clock stops. The time already counted stays."
    : completing
      ? `${projectName} will be marked complete and the clock will stop.`
      : `${projectName} will be marked cancelled and the clock will stop.`;

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="clock-confirm-title"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      className="m-auto w-[min(28rem,calc(100%-2rem))] rounded-xl border border-slate-200 bg-white p-0 text-slate-900 shadow-lg backdrop:bg-slate-900/40"
    >
      <form
        className="flex flex-col gap-4 p-5"
        onSubmit={(event) => {
          event.preventDefault();
          onConfirm();
        }}
      >
        <div className="flex items-start justify-between gap-3">
          <h2 id="clock-confirm-title" className="text-lg font-semibold">
            {title}
          </h2>
          <button type="button" onClick={onClose} aria-label="Close" className="text-xl leading-none text-slate-500">
            ×
          </button>
        </div>
        <p className="text-sm text-slate-600">{detail}</p>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className={outlineButton}>
            {stopping ? "Keep going" : "Not yet"}
          </button>
          <button type="submit" className={completing ? navyButton : dangerButton}>
            {stopping ? "Stop" : completing ? "Complete" : "Cancel"}
          </button>
        </div>
      </form>
    </dialog>
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

function StopIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <rect x="5" y="5" width="14" height="14" rx="1.5" />
    </svg>
  );
}
