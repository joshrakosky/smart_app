"use client";

import { useEffect, useRef, useState, useSyncExternalStore, type RefObject } from "react";
import { formatSlashDate } from "@/lib/money";
import {
  downloadProjectAsset,
  formatAssetSize,
  loadProjectAssets,
  MAX_PROJECT_ASSET_BYTES,
  readProjectAsset,
  saveProjectAssets,
  type ProjectAsset,
} from "@/lib/project-assets";
import {
  closeProject,
  CURRENT_USER,
  eachDate,
  formatDuration,
  getProjectsServerSnapshot,
  hoursSpanRange,
  type HoursSpan,
  getProjectsSnapshot,
  pauseProject,
  projectStatus,
  replaceProjects,
  sessionLabel,
  sessionMs,
  startProject,
  stopProject,
  subscribeProjects,
  timeLines,
  updateProject,
  userSession,
  weeklyRemainingMs,
  PROJECT_ACCOUNT_UNITS,
  PROJECT_BRANDS,
  PROJECT_TYPES,
  type Project,
  type ProjectAccountUnit,
  type ProjectBrand,
  type ProjectPriority,
  type ProjectType,
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

// Hours is a project list. My hours is this person's time. The + button creates a project.
export function TimeClock() {
  const projects = useSyncExternalStore(subscribeProjects, getProjectsSnapshot, getProjectsServerSnapshot);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const hoursRef = useRef<HTMLDialogElement>(null);
  const [now, setNow] = useState(0);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [notes, setNotes] = useState("");
  const [assets, setAssets] = useState<ProjectAsset[]>([]);
  const [wrikeNumber, setWrikeNumber] = useState("");
  const [sku, setSku] = useState("");
  const [coupaNumber, setCoupaNumber] = useState("");
  const [customerContact, setCustomerContact] = useState("");
  const [priority, setPriority] = useState<ProjectPriority>("standard");
  const [projectType, setProjectType] = useState<ProjectType>("");
  const [brand, setBrand] = useState<ProjectBrand>("");
  const [accountUnitId, setAccountUnitId] = useState<ProjectAccountUnit>("");
  const [billable, setBillable] = useState(false);
  const [allottedHours, setAllottedHours] = useState("");
  const [ihDate, setIhDate] = useState("");
  const [createTab, setCreateTab] = useState<ProjectFormTab>("details");
  const [formError, setFormError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Project | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editAssets, setEditAssets] = useState<ProjectAsset[]>([]);
  const [editWrikeNumber, setEditWrikeNumber] = useState("");
  const [editSku, setEditSku] = useState("");
  const [editCoupaNumber, setEditCoupaNumber] = useState("");
  const [editCustomerContact, setEditCustomerContact] = useState("");
  const [editPriority, setEditPriority] = useState<ProjectPriority>("standard");
  const [editType, setEditType] = useState<ProjectType>("");
  const [editBrand, setEditBrand] = useState<ProjectBrand>("");
  const [editAccountUnitId, setEditAccountUnitId] = useState<ProjectAccountUnit>("");
  const [editBillable, setEditBillable] = useState(false);
  const [editAllottedHours, setEditAllottedHours] = useState("");
  const [editIhDate, setEditIhDate] = useState("");
  const [editError, setEditError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<ClockConfirm | null>(null);
  // Idle weeks still need a timestamp. `now` stays 0 until a clock is moving.
  const [mountedAt, setMountedAt] = useState(0);

  useEffect(() => {
    setMountedAt(Date.now());
  }, []);

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

  const clockAt = now > 0 ? now : mountedAt;
  const weekLeft = weeklyRemainingMs(projects, clockAt);
  const mineRunning = projects.some((project) => userSession(project)?.status === "running");

  // The 40-hour week is a hard stop. Pause the running project once nothing is left.
  useEffect(() => {
    if (weekLeft > 0 || !mineRunning) return;
    const running = projects.find((project) => userSession(project)?.status === "running");
    if (!running) return;
    const stamp = Date.now();
    setNow(stamp);
    replaceProjects(pauseProject(projects, running.id, stamp));
  }, [weekLeft, mineRunning, projects]);

  const current = projects.filter((project) => project.close == null);
  const selected = selectedId ? projects.filter((project) => project.id === selectedId) : projects;
  const needle = query.trim().toLowerCase();
  const visible = needle
    ? selected.filter((project) => {
        const haystack = `${project.name} ${project.description} ${project.notes} ${project.wrikeNumber} ${project.sku} ${project.coupaNumber} ${project.customerContact} ${priorityLabel(project.priority)}`.toLowerCase();
        return haystack.includes(needle);
      })
    : selected;

  function openCreate() {
    setName("");
    setDescription("");
    setNotes("");
    setAssets([]);
    setWrikeNumber("");
    setSku("");
    setCoupaNumber("");
    setCustomerContact("");
    setPriority("standard");
    setProjectType("");
    setBrand("");
    setAccountUnitId("");
    setBillable(false);
    setAllottedHours("");
    setIhDate("");
    setCreateTab("details");
    setFormError(null);
    dialogRef.current?.showModal();
  }

  function createProject() {
    const nextName = name.trim();
    if (!nextName) {
      setCreateTab("details");
      setFormError("Enter a project name.");
      return;
    }
    if (!ihDate) {
      setCreateTab("details");
      setFormError("Choose an IH date.");
      return;
    }
    const allotted = parseAllottedHours(allottedHours);
    if (allotted === "invalid") {
      setCreateTab("billing");
      setFormError("Allotted hours needs to be zero or greater, or left blank.");
      return;
    }
    const id = crypto.randomUUID();
    const assetError = saveProjectAssets(id, assets);
    if (assetError) {
      setCreateTab("assets");
      setFormError(assetError);
      return;
    }
    replaceProjects([
      ...projects,
      {
        id,
        name: nextName,
        description: description.trim(),
        notes: notes.trim(),
        wrikeNumber: wrikeNumber.trim(),
        sku: sku.trim(),
        coupaNumber: coupaNumber.trim(),
        customerContact: customerContact.trim(),
        priority,
        type: projectType,
        brand,
        accountUnitId,
        billable,
        allottedHours: allotted,
        ihDate,
        createdAt: new Date().toISOString(),
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
    setEditNotes(project.notes);
    setEditAssets(loadProjectAssets(project.id));
    setEditWrikeNumber(project.wrikeNumber);
    setEditSku(project.sku);
    setEditCoupaNumber(project.coupaNumber);
    setEditCustomerContact(project.customerContact);
    setEditPriority(project.priority);
    setEditType(project.type);
    setEditBrand(project.brand);
    setEditAccountUnitId(project.accountUnitId);
    setEditBillable(project.billable);
    setEditAllottedHours(project.allottedHours == null ? "" : String(project.allottedHours));
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
    const allotted = parseAllottedHours(editAllottedHours);
    if (allotted === "invalid") {
      setEditError("Allotted hours needs to be zero or greater, or left blank.");
      return;
    }
    const assetError = saveProjectAssets(editing.id, editAssets);
    if (assetError) {
      setEditError(assetError);
      return;
    }
    replaceProjects(
      updateProject(projects, editing.id, {
        name: nextName,
        description: editDescription.trim(),
        notes: editNotes.trim(),
        wrikeNumber: editWrikeNumber.trim(),
        sku: editSku.trim(),
        coupaNumber: editCoupaNumber.trim(),
        customerContact: editCustomerContact.trim(),
        priority: editPriority,
        type: editType,
        brand: editBrand,
        accountUnitId: editAccountUnitId,
        billable: editBillable,
        allottedHours: allotted,
        ihDate: editIhDate,
      }),
    );
    setEditing(null);
  }

  function track(project: Project) {
    const at = Date.now();
    setNow(at);
    const mine = userSession(project);
    // Play is refused once this week's 40 hours are gone. Pause still works.
    if (mine?.status !== "running" && weeklyRemainingMs(projects, at) <= 0) return;
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
          <WeekClock remaining={weekLeft} running={mineRunning} />
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button type="button" onClick={() => hoursRef.current?.showModal()} aria-label="My hours" className={addButton}>
            <HoursIcon />
          </button>
          <button type="button" onClick={openCreate} aria-label="New project" className={addButton}>
            +
          </button>
        </div>
      </div>

      <div className="h-[416px] overflow-auto">
        <table className="w-full min-w-[64rem] border-separate border-spacing-0 text-center text-sm">
          <thead className="text-slate-600">
            <tr>
              <th className={headerCell}>Project</th>
              <th className={headerCell}>Wrike #</th>
              <th className={headerCell}>Customer Contact</th>
              <th className={headerCell}>Priority</th>
              <th className={headerCell}>IH Dates</th>
              <th className={headerCell}>Status</th>
              <th className={headerCell}>Time</th>
              <th className={headerCell}>Allotted</th>
              <th className={headerCell}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-slate-500" colSpan={9}>
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
                    <td className={cell}>{project.customerContact || "—"}</td>
                    <td className={cell}>{priorityLabel(project.priority)}</td>
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
                    <td className={`${cell} tabular-nums`}>{formatAllotted(project.allottedHours)}</td>
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
                                !running && weekLeft <= 0
                                  ? "Weekly 40 hours used"
                                  : running
                                    ? `Pause ${project.name}`
                                    : mine?.pausedSince != null
                                      ? `Resume ${project.name}`
                                      : `Start ${project.name}`
                              }
                              disabled={locked || (!running && weekLeft <= 0)}
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

      <MyHoursDialog dialogRef={hoursRef} projects={projects} now={now} />

      <dialog
        ref={dialogRef}
        className="m-auto max-h-[calc(100%-2rem)] w-[min(28rem,calc(100%-2rem))] overflow-y-auto rounded-xl border border-slate-200 bg-white p-0 text-slate-900 shadow-lg backdrop:bg-slate-900/40"
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
          <ProjectFormFields
            idPrefix="project"
            tab={createTab}
            onTab={setCreateTab}
            name={name}
            description={description}
            notes={notes}
            wrikeNumber={wrikeNumber}
            sku={sku}
            coupaNumber={coupaNumber}
            customerContact={customerContact}
            priority={priority}
            projectType={projectType}
            brand={brand}
            accountUnitId={accountUnitId}
            billable={billable}
            allottedHours={allottedHours}
            ihDate={ihDate}
            ihDateLabel="IH Dates"
            createdAt=""
            assets={assets}
            onAssets={setAssets}
            onName={setName}
            onDescription={setDescription}
            onNotes={setNotes}
            onWrikeNumber={setWrikeNumber}
            onSku={setSku}
            onCoupaNumber={setCoupaNumber}
            onCustomerContact={setCustomerContact}
            onPriority={setPriority}
            onType={setProjectType}
            onBrand={setBrand}
            onAccountUnitId={setAccountUnitId}
            onBillable={setBillable}
            onAllottedHours={setAllottedHours}
            onIhDate={setIhDate}
          />
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
          notes={editNotes}
          wrikeNumber={editWrikeNumber}
          sku={editSku}
          coupaNumber={editCoupaNumber}
          customerContact={editCustomerContact}
          priority={editPriority}
          projectType={editType}
          brand={editBrand}
          accountUnitId={editAccountUnitId}
          billable={editBillable}
          allottedHours={editAllottedHours}
          ihDate={editIhDate}
          createdAt={editing.createdAt}
          assets={editAssets}
          onAssets={setEditAssets}
          error={editError}
          closed={editing.close != null}
          onName={setEditName}
          onDescription={setEditDescription}
          onNotes={setEditNotes}
          onWrikeNumber={setEditWrikeNumber}
          onSku={setEditSku}
          onCoupaNumber={setEditCoupaNumber}
          onCustomerContact={setEditCustomerContact}
          onPriority={setEditPriority}
          onType={setEditType}
          onBrand={setEditBrand}
          onAccountUnitId={setEditAccountUnitId}
          onBillable={setEditBillable}
          onAllottedHours={setEditAllottedHours}
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

// This person's worked time for today, this week, or this month. Other people stay off this list.
function MyHoursDialog({
  dialogRef,
  projects,
  now,
}: {
  dialogRef: RefObject<HTMLDialogElement | null>;
  projects: Project[];
  now: number;
}) {
  const [span, setSpan] = useState<HoursSpan>("week");
  // now stays 0 until a clock is ticking, so the range uses the open time instead.
  const [mountedAt, setMountedAt] = useState(0);

  useEffect(() => {
    setMountedAt(Date.now());
  }, []);

  const at = now > 0 ? now : mountedAt;
  const range = at > 0 ? hoursSpanRange(span, at) : { from: "", to: "" };
  const lines =
    at > 0
      ? timeLines(projects, at).filter(
          (line) => line.person === CURRENT_USER && line.date >= range.from && line.date <= range.to,
        )
      : [];
  const total = lines.reduce((sum, line) => sum + line.ms, 0);
  // A week shows every weekday. A day or month shows only days that have time.
  const dates =
    span === "week" && range.from ? eachDate(range.from, range.to) : [...new Set(lines.map((line) => line.date))];
  const rangeLabel = !range.from
    ? "—"
    : range.from === range.to
      ? formatSlashDate(range.from)
      : `${formatSlashDate(range.from)} – ${formatSlashDate(range.to)}`;

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="my-hours-title"
      className="m-auto max-h-[calc(100%-2rem)] w-[min(24rem,calc(100%-2rem))] overflow-y-auto rounded-xl border border-slate-200 bg-white p-0 text-slate-900 shadow-lg backdrop:bg-slate-900/40"
    >
      <div className="flex flex-col gap-4 p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id="my-hours-title" className="text-lg font-semibold">
              My hours
            </h2>
            <p className="text-sm text-slate-500">{CURRENT_USER}</p>
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={() => dialogRef.current?.close()}
            className="text-xl leading-none text-slate-500"
          >
            ×
          </button>
        </div>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <label className="flex flex-col gap-1 text-sm" htmlFor="my-hours-span">
            <span className="font-medium text-slate-700">Show</span>
            <select
              id="my-hours-span"
              value={span}
              onChange={(event) => setSpan(event.target.value as HoursSpan)}
              className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-slate-900"
            >
              <option value="day">Day</option>
              <option value="week">Week</option>
              <option value="month">Month</option>
            </select>
          </label>
          <p className="pb-2 text-sm tabular-nums text-slate-600">{rangeLabel}</p>
        </div>
        <p className="flex items-baseline justify-between border-b border-slate-200 pb-3 text-sm">
          <span className="font-medium text-slate-700">Total</span>
          <span className="text-lg font-semibold tabular-nums text-[#0f2c4c]">{formatSpent(total)}</span>
        </p>
        {dates.length === 0 ? (
          <p className="text-sm text-slate-500">No time in this range.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {dates.map((date) => {
              const dayLines = lines.filter((line) => line.date === date);
              const dayMs = dayLines.reduce((sum, line) => sum + line.ms, 0);
              return (
                <li key={date}>
                  <div className="flex items-baseline justify-between gap-3 text-sm">
                    <span className="font-medium text-slate-800">
                      {weekdayLabel(date)} {formatSlashDate(date)}
                    </span>
                    <span className="tabular-nums text-slate-700">{formatSpent(dayMs)}</span>
                  </div>
                  {dayLines.length > 0 ? (
                    <ul className="mt-1 flex flex-col gap-1">
                      {dayLines.map((line) => (
                        <li
                          key={`${line.date}-${line.project}`}
                          className="flex items-baseline justify-between gap-3 pl-3 text-sm text-slate-600"
                        >
                          <span className="min-w-0 truncate">{line.project}</span>
                          <span className="shrink-0 tabular-nums">{formatSpent(line.ms)}</span>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </dialog>
  );
}

function weekdayLabel(date: string): string {
  return new Date(`${date}T12:00:00`).toLocaleDateString("en-US", { weekday: "short" });
}

// A few seconds still counts. The clock label would otherwise round that down to 0m.
function formatSpent(ms: number): string {
  if (ms > 0 && ms < 60_000) return "< 1m";
  return formatDuration(ms);
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
  notes,
  wrikeNumber,
  sku,
  coupaNumber,
  customerContact,
  priority,
  projectType,
  brand,
  accountUnitId,
  billable,
  allottedHours,
  ihDate,
  createdAt,
  assets,
  onAssets,
  error,
  closed,
  onName,
  onDescription,
  onNotes,
  onWrikeNumber,
  onSku,
  onCoupaNumber,
  onCustomerContact,
  onPriority,
  onType,
  onBrand,
  onAccountUnitId,
  onBillable,
  onAllottedHours,
  onIhDate,
  onClose,
  onSave,
  onComplete,
  onCancelProject,
}: {
  name: string;
  description: string;
  notes: string;
  wrikeNumber: string;
  sku: string;
  coupaNumber: string;
  customerContact: string;
  priority: ProjectPriority;
  projectType: ProjectType;
  brand: ProjectBrand;
  accountUnitId: ProjectAccountUnit;
  billable: boolean;
  allottedHours: string;
  ihDate: string;
  createdAt: string;
  assets: ProjectAsset[];
  onAssets: (assets: ProjectAsset[]) => void;
  error: string | null;
  closed: boolean;
  onName: (value: string) => void;
  onDescription: (value: string) => void;
  onNotes: (value: string) => void;
  onWrikeNumber: (value: string) => void;
  onSku: (value: string) => void;
  onCoupaNumber: (value: string) => void;
  onCustomerContact: (value: string) => void;
  onPriority: (value: ProjectPriority) => void;
  onType: (value: ProjectType) => void;
  onBrand: (value: ProjectBrand) => void;
  onAccountUnitId: (value: ProjectAccountUnit) => void;
  onBillable: (value: boolean) => void;
  onAllottedHours: (value: string) => void;
  onIhDate: (value: string) => void;
  onClose: () => void;
  onSave: () => void;
  onComplete: () => void;
  onCancelProject: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [tab, setTab] = useState<ProjectFormTab>("details");

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    dialog.showModal();
    return () => dialog.close();
  }, []);

  // Name and IH date are on Details. Allotted hours is on Billing. File size errors are on Assets.
  useEffect(() => {
    if (!error) return;
    if (error.startsWith("Allotted")) setTab("billing");
    else if (error.startsWith("Those files")) setTab("assets");
    else setTab("details");
  }, [error]);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="edit-project-title"
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
        <ProjectFormFields
          idPrefix="edit-project"
          tab={tab}
          onTab={setTab}
          name={name}
          description={description}
          notes={notes}
          wrikeNumber={wrikeNumber}
          sku={sku}
          coupaNumber={coupaNumber}
          customerContact={customerContact}
          priority={priority}
          projectType={projectType}
          brand={brand}
          accountUnitId={accountUnitId}
          billable={billable}
          allottedHours={allottedHours}
          ihDate={ihDate}
          ihDateLabel="IH date"
          createdAt={createdAt}
          assets={assets}
          onAssets={onAssets}
          onName={onName}
          onDescription={onDescription}
          onNotes={onNotes}
          onWrikeNumber={onWrikeNumber}
          onSku={onSku}
          onCoupaNumber={onCoupaNumber}
          onCustomerContact={onCustomerContact}
          onPriority={onPriority}
          onType={onType}
          onBrand={onBrand}
          onAccountUnitId={onAccountUnitId}
          onBillable={onBillable}
          onAllottedHours={onAllottedHours}
          onIhDate={onIhDate}
        />
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

type ProjectFormTab = "details" | "billing" | "notes" | "assets";

const inputClass = "h-10 rounded-lg border border-slate-300 bg-white px-3 text-slate-900";

// Details holds the job. Billing holds how it gets paid. Both dialogs share this so the tabs stay in step.
function ProjectFormFields({
  idPrefix,
  tab,
  onTab,
  name,
  description,
  notes,
  wrikeNumber,
  sku,
  coupaNumber,
  customerContact,
  priority,
  projectType,
  brand,
  accountUnitId,
  billable,
  allottedHours,
  ihDate,
  ihDateLabel,
  createdAt,
  assets,
  onAssets,
  onName,
  onDescription,
  onNotes,
  onWrikeNumber,
  onSku,
  onCoupaNumber,
  onCustomerContact,
  onPriority,
  onType,
  onBrand,
  onAccountUnitId,
  onBillable,
  onAllottedHours,
  onIhDate,
}: {
  idPrefix: string;
  tab: ProjectFormTab;
  onTab: (tab: ProjectFormTab) => void;
  name: string;
  description: string;
  notes: string;
  wrikeNumber: string;
  sku: string;
  coupaNumber: string;
  customerContact: string;
  priority: ProjectPriority;
  projectType: ProjectType;
  brand: ProjectBrand;
  accountUnitId: ProjectAccountUnit;
  billable: boolean;
  allottedHours: string;
  ihDate: string;
  ihDateLabel: string;
  createdAt: string;
  assets: ProjectAsset[];
  onAssets: (assets: ProjectAsset[]) => void;
  onName: (value: string) => void;
  onDescription: (value: string) => void;
  onNotes: (value: string) => void;
  onWrikeNumber: (value: string) => void;
  onSku: (value: string) => void;
  onCoupaNumber: (value: string) => void;
  onCustomerContact: (value: string) => void;
  onPriority: (value: ProjectPriority) => void;
  onType: (value: ProjectType) => void;
  onBrand: (value: ProjectBrand) => void;
  onAccountUnitId: (value: ProjectAccountUnit) => void;
  onBillable: (value: boolean) => void;
  onAllottedHours: (value: string) => void;
  onIhDate: (value: string) => void;
}) {
  const panelClass = "col-start-1 row-start-1 flex flex-col gap-4";

  return (
    <>
      <div role="tablist" aria-label="Project sections" className="flex gap-1 rounded-lg bg-slate-100 p-1">
        {(
          [
            ["details", "Details"],
            ["billing", "Billing"],
            ["notes", "Notes"],
            ["assets", "Assets"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            onClick={() => onTab(id)}
            className={
              tab === id
                ? "h-9 flex-1 rounded-md bg-white text-sm font-medium text-[#0f2c4c] shadow-sm"
                : "h-9 flex-1 rounded-md text-sm font-medium text-slate-600 hover:text-slate-900"
            }
          >
            {label}
          </button>
        ))}
      </div>
      {/* Panels share one grid cell so the dialog height matches the taller tab. */}
      <div className="relative grid">
        <div className={`${panelClass} ${tab === "details" ? "" : "invisible"}`} inert={tab !== "details"} aria-hidden={tab !== "details"}>
          <p className="text-sm text-slate-600">
            <span className="font-medium text-slate-700">Created</span>
            <span className="mt-1 block tabular-nums">
              {createdAt ? formatCreated(createdAt) : "Saved when the project is created"}
            </span>
          </p>
          <label className="flex flex-col gap-1 text-sm" htmlFor={`${idPrefix}-name`}>
            <span className="font-medium text-slate-700">Project name</span>
            <input id={`${idPrefix}-name`} value={name} onChange={(event) => onName(event.target.value)} className={inputClass} />
          </label>
          <label className="flex flex-col gap-1 text-sm" htmlFor={`${idPrefix}-description`}>
            <span className="font-medium text-slate-700">Description</span>
            <textarea
              id={`${idPrefix}-description`}
              value={description}
              onChange={(event) => onDescription(event.target.value)}
              rows={3}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm" htmlFor={`${idPrefix}-sku`}>
            <span className="font-medium text-slate-700">SKU</span>
            <input id={`${idPrefix}-sku`} value={sku} onChange={(event) => onSku(event.target.value)} className={inputClass} />
          </label>
          <label className="flex flex-col gap-1 text-sm" htmlFor={`${idPrefix}-contact`}>
            <span className="font-medium text-slate-700">Customer Contact</span>
            <input
              id={`${idPrefix}-contact`}
              value={customerContact}
              onChange={(event) => onCustomerContact(event.target.value)}
              className={inputClass}
            />
          </label>
          <PriorityField id={`${idPrefix}-priority`} value={priority} onChange={onPriority} />
          <label className="flex flex-col gap-1 text-sm" htmlFor={`${idPrefix}-ih-date`}>
            <span className="font-medium text-slate-700">{ihDateLabel}</span>
            <input
              id={`${idPrefix}-ih-date`}
              type="date"
              value={ihDate}
              onChange={(event) => onIhDate(event.target.value)}
              className={inputClass}
            />
          </label>
        </div>
        <div
          className={`${panelClass} ${tab === "billing" ? "" : "invisible"}`}
          inert={tab !== "billing"}
          aria-hidden={tab !== "billing"}
        >
          <label className="flex flex-col gap-1 text-sm" htmlFor={`${idPrefix}-billable`}>
            <span className="font-medium text-slate-700">Billable</span>
            <select
              id={`${idPrefix}-billable`}
              value={billable ? "true" : "false"}
              onChange={(event) => onBillable(event.target.value === "true")}
              className={inputClass}
            >
              <option value="true">True</option>
              <option value="false">False</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm" htmlFor={`${idPrefix}-wrike`}>
            <span className="font-medium text-slate-700">Wrike #</span>
            <input
              id={`${idPrefix}-wrike`}
              value={wrikeNumber}
              onChange={(event) => onWrikeNumber(event.target.value)}
              className={inputClass}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm" htmlFor={`${idPrefix}-allotted`}>
            <span className="font-medium text-slate-700">Allotted hours</span>
            <input
              id={`${idPrefix}-allotted`}
              value={allottedHours}
              inputMode="decimal"
              onChange={(event) => onAllottedHours(event.target.value)}
              className={inputClass}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm" htmlFor={`${idPrefix}-coupa`}>
            <span className="font-medium text-slate-700">Coupa #</span>
            <input
              id={`${idPrefix}-coupa`}
              value={coupaNumber}
              onChange={(event) => onCoupaNumber(event.target.value)}
              className={inputClass}
            />
          </label>
          <ChoiceField id={`${idPrefix}-type`} label="Type" value={projectType} options={PROJECT_TYPES} onChange={onType} />
          <ChoiceField id={`${idPrefix}-brand`} label="Brand" value={brand} options={PROJECT_BRANDS} onChange={onBrand} />
          <ChoiceField
            id={`${idPrefix}-account-unit`}
            label="Accounting unit"
            value={accountUnitId}
            options={PROJECT_ACCOUNT_UNITS}
            onChange={onAccountUnitId}
          />
        </div>
        <div
          className={`${panelClass} h-full ${tab === "notes" ? "" : "invisible"}`}
          inert={tab !== "notes"}
          aria-hidden={tab !== "notes"}
        >
          <label className="flex min-h-0 flex-1 flex-col gap-1 text-sm" htmlFor={`${idPrefix}-notes`}>
            <span className="font-medium text-slate-700">Notes</span>
            <textarea
              id={`${idPrefix}-notes`}
              value={notes}
              onChange={(event) => onNotes(event.target.value)}
              className="min-h-40 flex-1 resize-none rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900"
            />
          </label>
        </div>
        {/* Absolute so a long file list scrolls instead of stretching the dialog. */}
        <div
          className={`absolute inset-0 flex flex-col gap-3 overflow-y-auto bg-white ${tab === "assets" ? "" : "invisible"}`}
          inert={tab !== "assets"}
          aria-hidden={tab !== "assets"}
        >
          <ProjectAssetsPanel idPrefix={idPrefix} assets={assets} onChange={onAssets} />
        </div>
      </div>
    </>
  );
}

function ProjectAssetsPanel({
  idPrefix,
  assets,
  onChange,
}: {
  idPrefix: string;
  assets: ProjectAsset[];
  onChange: (assets: ProjectAsset[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  async function addFiles(list: FileList | null) {
    const files = [...(list ?? [])];
    if (files.length === 0) return;
    const next = [...assets];
    const skipped: string[] = [];
    for (const file of files) {
      if (file.size > MAX_PROJECT_ASSET_BYTES) {
        skipped.push(file.name);
        continue;
      }
      next.push(await readProjectAsset(file));
    }
    onChange(next);
    setError(skipped.length > 0 ? `${skipped.join(", ")} is over 1.5 MB.` : null);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <>
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-slate-600">Upload files for this project, then download them from this list.</p>
        <button type="button" onClick={() => inputRef.current?.click()} className={navyButton}>
          Upload
        </button>
        <input
          ref={inputRef}
          id={`${idPrefix}-assets`}
          type="file"
          multiple
          className="sr-only"
          onChange={(event) => void addFiles(event.target.files)}
        />
      </div>
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      {assets.length === 0 ? (
        <p className="text-sm text-slate-500">No files yet.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {assets.map((asset) => (
            <li key={asset.id} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 px-3 py-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-slate-800">{asset.name}</p>
                <p className="text-xs text-slate-500">{formatAssetSize(asset.sizeBytes)}</p>
              </div>
              <div className="flex shrink-0 gap-2">
                <button type="button" onClick={() => downloadProjectAsset(asset)} className={`${outlineButton} h-8 px-3`}>
                  Download
                </button>
                <button
                  type="button"
                  onClick={() => onChange(assets.filter((item) => item.id !== asset.id))}
                  className="h-8 rounded-lg px-3 text-sm font-medium text-red-700 hover:bg-red-50"
                >
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

function formatCreated(iso: string): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("en-US", { dateStyle: "short", timeStyle: "short" });
}

function ChoiceField<T extends string>({
  id,
  label,
  value,
  options,
  onChange,
}: {
  id: string;
  label: string;
  value: T | "";
  options: readonly T[];
  onChange: (value: T | "") => void;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm" htmlFor={id}>
      <span className="font-medium text-slate-700">{label}</span>
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value as T | "")}
        className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-slate-900"
      >
        <option value="">Select</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function priorityLabel(priority: ProjectPriority): string {
  return priority === "rush" ? "Rush" : "Standard";
}

function PriorityField({
  id,
  value,
  onChange,
}: {
  id: string;
  value: ProjectPriority;
  onChange: (value: ProjectPriority) => void;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm" htmlFor={id}>
      <span className="font-medium text-slate-700">Priority</span>
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value === "rush" ? "rush" : "standard")}
        className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-slate-900"
      >
        <option value="standard">Standard</option>
        <option value="rush">Rush</option>
      </select>
    </label>
  );
}

// Blank is no cap. Anything else must be a number that is zero or greater.
function parseAllottedHours(raw: string): number | null | "invalid" {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const hours = Number(trimmed);
  if (!Number.isFinite(hours) || hours < 0) return "invalid";
  return Math.round(hours * 100) / 100;
}

function formatAllotted(hours: number | null): string {
  if (hours == null) return "—";
  return hours.toLocaleString("en-US", { maximumFractionDigits: 2 });
}

// Counts down this person's 40-hour week. Seconds show only while their clock is running.
function WeekClock({ remaining, running }: { remaining: number; running: boolean }) {
  const label = formatWeekLeft(remaining, running);
  const tone = remaining <= 0 ? "text-red-700" : remaining < 4 * 60 * 60 * 1000 ? "text-amber-700" : "text-[#0f2c4c]";
  return (
    <div
      className="flex h-10 items-center gap-3 self-end rounded-lg border border-slate-300 bg-white px-3 shadow-sm"
      title="Resets each Monday"
    >
      <span className="text-xs font-medium text-slate-500">Week left</span>
      <span className={`min-w-[4.5rem] text-right text-sm font-semibold tabular-nums ${tone}`}>{label}</span>
    </div>
  );
}

function formatWeekLeft(ms: number, withSeconds: boolean): string {
  const totalSeconds = Math.floor(Math.max(0, ms) / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const base = `${hours}h ${String(minutes).padStart(2, "0")}m`;
  return withSeconds ? `${base} ${String(seconds).padStart(2, "0")}s` : base;
}

function HoursIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8v4.5l2.5 1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
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
