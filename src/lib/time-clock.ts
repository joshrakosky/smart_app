// Projects and contractor sessions live in this browser until sign-in and the database exist.
// The signed-in person will replace CURRENT_USER. One person runs one clock at a time.
// Two people can run on the same project. The row time is the sum of every session.
// Day buckets record worked ms by local date so the Hours export can bill person / day / project.

export const CURRENT_USER = "Contractor 1";

export type SessionStatus = "running" | "paused";
export type ProjectClose = "complete" | "cancelled" | null;
export type ProjectPriority = "rush" | "standard";
// Workflow status lives on Details. Complete / Cancelled come from close and land in Archive.
export const PROJECT_WORKFLOW_STATUSES = [
  "in-progress",
  "approved",
  "in-review",
  "onboard-ready",
  "dealer-logo",
] as const;
export type ProjectWorkflowStatus = (typeof PROJECT_WORKFLOW_STATUSES)[number];
export const PROJECT_WORKFLOW_STATUS_LABELS: Record<ProjectWorkflowStatus, string> = {
  "in-progress": "In Progress",
  approved: "Approved",
  "in-review": "In Review",
  "onboard-ready": "Onboard Ready",
  "dealer-logo": "Dealer Logo",
};
export type ProjectLabel = (typeof PROJECT_WORKFLOW_STATUS_LABELS)[ProjectWorkflowStatus] | "Complete" | "Cancelled";
// Type and Brand are chosen when a project is created. Empty means not set yet.
export const PROJECT_TYPES = ["Creative", "Admin"] as const;
export type ProjectType = (typeof PROJECT_TYPES)[number] | "";
export const PROJECT_BRANDS = [
  "Trane Residential",
  "American Standard",
  "RunTru",
  "Oxbox",
  "Ameristar",
  "Trane Commercial",
  "Trane Supply",
  "Thermoking",
] as const;
export type ProjectBrand = (typeof PROJECT_BRANDS)[number];
// Billing account units. The value stored on the project is the label itself.
export const PROJECT_ACCOUNT_UNITS = [
  "Creative-CQ55002872-Conference",
  "Creative-CQ55002872-CustomerCare",
  "Creative-CQ55002874-Ameristar",
  "Creative-CQ55002874-AmStd",
  "Creative-CQ55002874-Handbook",
  "Creative-CQ55002874-Home-AmStd",
  "Creative-CQ55002874-Home-Trane",
  "Creative-CQ55002874-Lowe's",
  "Creative-CQ55002874-MAX",
  "Creative-CQ55002874-Oxbox",
  "Creative-CQ55002874-PIM",
  "Creative-CQ55002874-RunTru",
  "Creative-CQ55002874-Trane",
  "Creative-CQ55002874-Trane Supply",
  "Creative-CQ55002874-Brand Guidelines",
  "Creative-CQ55002874-ThermoKing",
  "Creative-CQ55002874-EPG",
] as const;
export type ProjectAccountUnit = (typeof PROJECT_ACCOUNT_UNITS)[number] | "";

export type DayHours = {
  date: string; // YYYY-MM-DD in local time
  ms: number;
};

export type WorkSession = {
  person: string;
  status: SessionStatus;
  accumulatedMs: number;
  runningSince: number | null;
  // Time spent paused. pausedSince is set only while a pause is being counted.
  pausedMs: number;
  pausedSince: number | null;
  // Worked time rolled up by day. On/off the same project the same day merges here.
  days: DayHours[];
};

// One note in the project feed. Oldest first; everyone on the team can add.
export type ProjectNote = {
  id: string;
  author: string;
  body: string;
  createdAt: string;
};

export type Project = {
  id: string;
  name: string;
  description: string;
  // Timestamped feed. Older single-string notes migrate into one entry on load.
  notes: ProjectNote[];
  wrikeNumber: string;
  // Optional product SKU. Blank is allowed.
  sku: string;
  // Optional Coupa purchase number. Blank is allowed.
  coupaNumber: string;
  // Who to reach at the customer for this job.
  customerContact: string;
  // Rush jobs jump the queue. Standard is the default for older projects.
  priority: ProjectPriority;
  // Creative or Admin. Blank on projects created before the dropdown existed.
  type: ProjectType;
  // One or more brands. Empty until someone checks a box.
  brands: ProjectBrand[];
  // One of PROJECT_ACCOUNT_UNITS. Blank until someone picks a unit.
  accountUnitId: ProjectAccountUnit;
  // Time on this project can be billed. Older projects stay unchecked.
  billable: boolean;
  // Overtime is allowed on this job. Older projects stay false.
  otAvailable: boolean;
  // Max hours allowed on the project. Null until someone sets a cap.
  allottedHours: number | null;
  // Manual workflow status on Details. Archive still uses close.
  workflowStatus: ProjectWorkflowStatus;
  ihDate: string;
  // ISO time the project was created. Empty on rows saved before this field existed.
  createdAt: string;
  close: ProjectClose;
  sessions: WorkSession[];
};

// One export line: who worked, which day, which project, and the billing fields copied from that project.
export type TimeLine = {
  person: string;
  date: string;
  project: string;
  wrikeNumber: string;
  customerContact: string;
  sku: string;
  ms: number;
  billable: boolean;
};

const STORAGE_KEY = "smart-projects";
const MINUTE = 60 * 1000;

export const SEED_PROJECTS: Project[] = [
  {
    id: "seed-brochure",
    name: "Brochure reprint",
    description: "",
    notes: [],
    wrikeNumber: "",
    sku: "",
    coupaNumber: "",
    customerContact: "",
    priority: "standard",
    type: "",
    brands: [],
    accountUnitId: "",
    billable: false,
    otAvailable: false,
    allottedHours: null,
    workflowStatus: "in-progress",
    ihDate: "2026-09-18",
    createdAt: "2026-09-18T13:00:00.000Z",
    close: null,
    sessions: [
      {
        person: "Contractor 1",
        status: "paused",
        accumulatedMs: (2 * 60 + 15) * MINUTE,
        runningSince: null,
        pausedMs: 0,
        pausedSince: null,
        // Same person, same project, two days — on and off across the week.
        days: [
          { date: "2026-09-17", ms: 75 * MINUTE },
          { date: "2026-09-18", ms: 60 * MINUTE },
        ],
      },
    ],
  },
  {
    id: "seed-posters",
    name: "Dealer posters",
    description: "",
    notes: [],
    wrikeNumber: "",
    sku: "",
    coupaNumber: "",
    customerContact: "",
    priority: "standard",
    type: "",
    brands: [],
    accountUnitId: "",
    billable: false,
    otAvailable: false,
    allottedHours: null,
    workflowStatus: "in-progress",
    ihDate: "2026-09-22",
    createdAt: "2026-09-22T13:00:00.000Z",
    close: null,
    sessions: [
      {
        person: "Contractor 1",
        status: "paused",
        accumulatedMs: 40 * MINUTE,
        runningSince: null,
        pausedMs: 0,
        pausedSince: null,
        days: [{ date: "2026-09-18", ms: 40 * MINUTE }],
      },
      {
        person: "Contractor 2",
        status: "paused",
        accumulatedMs: 45 * MINUTE,
        runningSince: null,
        pausedMs: 0,
        pausedSince: null,
        days: [{ date: "2026-09-22", ms: 45 * MINUTE }],
      },
    ],
  },
  {
    id: "seed-banners",
    name: "Banner stands",
    description: "",
    notes: [],
    wrikeNumber: "",
    sku: "",
    coupaNumber: "",
    customerContact: "",
    priority: "standard",
    type: "",
    brands: [],
    accountUnitId: "",
    billable: false,
    otAvailable: false,
    allottedHours: null,
    workflowStatus: "in-progress",
    ihDate: "2026-09-26",
    createdAt: "2026-09-26T13:00:00.000Z",
    close: null,
    sessions: [
      {
        person: "Contractor 1",
        status: "paused",
        accumulatedMs: 25 * MINUTE,
        runningSince: null,
        pausedMs: 0,
        pausedSince: null,
        days: [{ date: "2026-09-18", ms: 25 * MINUTE }],
      },
      {
        person: "Contractor 3",
        status: "paused",
        accumulatedMs: (1 * 60 + 5) * MINUTE,
        runningSince: null,
        pausedMs: 0,
        pausedSince: null,
        days: [{ date: "2026-09-26", ms: (1 * 60 + 5) * MINUTE }],
      },
    ],
  },
];

let cachedProjects: Project[] | null = null;
const listeners = new Set<() => void>();

export function subscribeProjects(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getProjectsSnapshot(): Project[] {
  if (!cachedProjects) cachedProjects = loadProjects();
  return cachedProjects;
}

export function getProjectsServerSnapshot(): Project[] {
  return SEED_PROJECTS;
}

export function replaceProjects(next: Project[]) {
  cachedProjects = next;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  for (const listener of listeners) listener();
}

export function loadProjects(): Project[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return SEED_PROJECTS;
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return SEED_PROJECTS;
    return parsed.map(normalizeProject).filter((project): project is Project => project != null);
  } catch {
    return SEED_PROJECTS;
  }
}

export function projectStatus(project: Project): ProjectLabel {
  if (project.close === "complete") return "Complete";
  if (project.close === "cancelled") return "Cancelled";
  return PROJECT_WORKFLOW_STATUS_LABELS[project.workflowStatus];
}

export function sessionMs(session: WorkSession, now: number): number {
  if (session.status === "running" && session.runningSince != null) {
    return session.accumulatedMs + Math.max(0, now - session.runningSince);
  }
  return session.accumulatedMs;
}

export function projectTotalMs(project: Project, now: number): number {
  return project.sessions.reduce((sum, session) => sum + sessionMs(session, now), 0);
}

export function userSession(project: Project, person = CURRENT_USER): WorkSession | undefined {
  return project.sessions.find((session) => session.person === person);
}

// Per-person label for the status hover tip.
export function sessionLabel(session: WorkSession): "In Progress" | "Paused" {
  return session.status === "running" ? "In Progress" : "Paused";
}

// Hours and minutes. Seconds show only while this project's clocks are running.
export function formatDuration(ms: number, withSeconds = false): string {
  const totalSeconds = Math.floor(Math.max(0, ms) / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (withSeconds) {
    return `${hours}h ${String(minutes).padStart(2, "0")}m ${String(seconds).padStart(2, "0")}s`;
  }
  if (hours === 0) return `${minutes}m`;
  return `${hours}h ${minutes}m`;
}

export function localDateKey(at: number): string {
  const d = new Date(at);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// The My hours popup looks at one of these windows around "now".
export type HoursSpan = "day" | "week" | "month";

// Inclusive local dates. Week is Monday through Sunday. Month is the calendar month.
export function hoursSpanRange(span: HoursSpan, at: number): { from: string; to: string } {
  const day = new Date(at);
  day.setHours(12, 0, 0, 0);
  if (span === "day") {
    const key = localDateKey(day.getTime());
    return { from: key, to: key };
  }
  if (span === "week") {
    const weekday = day.getDay();
    const monday = new Date(day);
    monday.setDate(day.getDate() - (weekday === 0 ? 6 : weekday - 1));
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    return { from: localDateKey(monday.getTime()), to: localDateKey(sunday.getTime()) };
  }
  const first = new Date(day.getFullYear(), day.getMonth(), 1, 12);
  const last = new Date(day.getFullYear(), day.getMonth() + 1, 0, 12);
  return { from: localDateKey(first.getTime()), to: localDateKey(last.getTime()) };
}

// Every local date from `from` through `to`, inclusive. Noon keeps daylight-saving days stable.
export function eachDate(from: string, to: string): string[] {
  const dates: string[] = [];
  const cursor = new Date(`${from}T12:00:00`);
  const end = new Date(`${to}T12:00:00`);
  if (Number.isNaN(cursor.getTime()) || Number.isNaN(end.getTime())) return dates;
  while (cursor.getTime() <= end.getTime()) {
    dates.push(localDateKey(cursor.getTime()));
    cursor.setDate(cursor.getDate() + 1);
  }
  return dates;
}

function startOfNextLocalDay(at: number): number {
  const d = new Date(at);
  d.setHours(24, 0, 0, 0);
  return d.getTime();
}

function addDayMs(days: DayHours[], date: string, ms: number): DayHours[] {
  if (ms <= 0) return days;
  const index = days.findIndex((entry) => entry.date === date);
  if (index < 0) return [...days, { date, ms }];
  return days.map((entry, i) => (i === index ? { ...entry, ms: entry.ms + ms } : entry));
}

// Split a running stretch across local midnights so overnight work lands on both days.
export function creditWork(days: DayHours[], from: number, to: number): DayHours[] {
  if (to <= from) return days;
  let next = days;
  let cursor = from;
  while (cursor < to) {
    const end = Math.min(to, startOfNextLocalDay(cursor));
    next = addDayMs(next, localDateKey(cursor), end - cursor);
    cursor = end;
  }
  return next;
}

// Day totals for a session, including any stretch still running.
export function sessionDays(session: WorkSession, now: number): DayHours[] {
  if (session.status === "running" && session.runningSince != null) {
    return creditWork(session.days, session.runningSince, now);
  }
  return session.days;
}

// Flat billing lines for the account manager export.
export function timeLines(projects: Project[], now: number): TimeLine[] {
  const map = new Map<string, TimeLine>();
  for (const project of projects) {
    for (const session of project.sessions) {
      for (const entry of sessionDays(session, now)) {
        if (entry.ms <= 0) continue;
        const key = `${session.person}\0${entry.date}\0${project.id}`;
        const prior = map.get(key);
        if (prior) prior.ms += entry.ms;
        else {
          map.set(key, {
            person: session.person,
            date: entry.date,
            project: project.name,
            wrikeNumber: project.wrikeNumber,
            customerContact: project.customerContact,
            sku: project.sku,
            ms: entry.ms,
            billable: project.billable,
          });
        }
      }
    }
  }
  return [...map.values()].sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    if (a.person !== b.person) return a.person.localeCompare(b.person);
    return a.project.localeCompare(b.project);
  });
}

// One person, 40 hours, Monday through Sunday. The next Monday starts a fresh 40.
export const WEEKLY_CAP_MS = 40 * 60 * 60 * 1000;

// Time left this week. Running work counts. Pause time does not. Never goes below zero.
export function weeklyRemainingMs(projects: Project[], at: number, person = CURRENT_USER): number {
  if (at <= 0) return WEEKLY_CAP_MS;
  const { from, to } = hoursSpanRange("week", at);
  const worked = timeLines(projects, at)
    .filter((line) => line.person === person && line.date >= from && line.date <= to)
    .reduce((sum, line) => sum + line.ms, 0);
  return Math.max(0, WEEKLY_CAP_MS - worked);
}

// The Hours export bills whole minutes. The on-screen clock still shows hours and minutes.
export function reportMinutes(ms: number): number {
  return Math.round(ms / MINUTE);
}

// Freeze worked time and start the pause clock. An existing pause is left alone.
function hold(session: WorkSession, now: number): WorkSession {
  if (session.status !== "running" || session.runningSince == null) return session;
  const from = session.runningSince;
  return {
    ...session,
    status: "paused",
    accumulatedMs: session.accumulatedMs + Math.max(0, now - from),
    runningSince: null,
    pausedSince: now,
    days: creditWork(session.days, from, now),
  };
}

function resume(session: WorkSession, now: number): WorkSession {
  const extraPause = session.pausedSince != null ? Math.max(0, now - session.pausedSince) : 0;
  return {
    ...session,
    status: "running",
    runningSince: now,
    pausedMs: session.pausedMs + extraPause,
    pausedSince: null,
  };
}

// Freeze worked time and the pause clock. The hours stay.
function stopSession(session: WorkSession, now: number): WorkSession {
  const extraPause = session.pausedSince != null ? Math.max(0, now - session.pausedSince) : 0;
  let days = session.days;
  let accumulatedMs = session.accumulatedMs;
  if (session.status === "running" && session.runningSince != null) {
    const from = session.runningSince;
    const worked = Math.max(0, now - from);
    days = creditWork(days, from, now);
    accumulatedMs += worked;
  }
  return {
    ...session,
    status: "paused",
    accumulatedMs,
    runningSince: null,
    pausedMs: session.pausedMs + extraPause,
    pausedSince: null,
    days,
  };
}

export function updateProject(
  projects: Project[],
  projectId: string,
  patch: {
    name: string;
    description: string;
    notes: ProjectNote[];
    wrikeNumber: string;
    sku: string;
    coupaNumber: string;
    customerContact: string;
    priority: ProjectPriority;
    type: ProjectType;
    brands: ProjectBrand[];
    accountUnitId: ProjectAccountUnit;
    billable: boolean;
    otAvailable: boolean;
    allottedHours: number | null;
    workflowStatus: ProjectWorkflowStatus;
    ihDate: string;
  },
): Project[] {
  return projects.map((project) => (project.id === projectId ? { ...project, ...patch } : project));
}

// Pull a completed or cancelled job back into the active queue.
export function reviveProject(projects: Project[], projectId: string): Project[] {
  return projects.map((project) =>
    project.id === projectId ? { ...project, close: null, workflowStatus: "in-progress" as const } : project,
  );
}

// Append a note from the signed-in person. Body is trimmed; blanks are ignored.
export function addProjectNote(
  projects: Project[],
  projectId: string,
  body: string,
  author = CURRENT_USER,
  at = new Date().toISOString(),
): Project[] {
  const text = body.trim();
  if (!text) return projects;
  const note: ProjectNote = { id: crypto.randomUUID(), author, body: text, createdAt: at };
  return projects.map((project) =>
    project.id === projectId ? { ...project, notes: [...project.notes, note] } : project,
  );
}

// Fields someone can opt into when copying a project into a fresh row.
export type ProjectCopyField =
  | "name"
  | "description"
  | "sku"
  | "customerContact"
  | "priority"
  | "ihDate"
  | "wrikeNumber"
  | "coupaNumber"
  | "type"
  | "brands"
  | "accountUnitId"
  | "billable"
  | "otAvailable"
  | "allottedHours"
  | "workflowStatus"
  | "notes"
  | "assets";

export const PROJECT_COPY_FIELDS: { id: ProjectCopyField; label: string }[] = [
  { id: "name", label: "Project name" },
  { id: "description", label: "Description" },
  { id: "sku", label: "SKU" },
  { id: "customerContact", label: "Customer Contact" },
  { id: "priority", label: "Priority" },
  { id: "ihDate", label: "IH date" },
  { id: "wrikeNumber", label: "Wrike #" },
  { id: "coupaNumber", label: "Coupa #" },
  { id: "type", label: "Type" },
  { id: "brands", label: "Brand" },
  { id: "accountUnitId", label: "Accounting unit" },
  { id: "billable", label: "Billable" },
  { id: "otAvailable", label: "OT available" },
  { id: "allottedHours", label: "Allotted hours" },
  { id: "workflowStatus", label: "Status" },
  { id: "notes", label: "Notes" },
  { id: "assets", label: "Assets" },
];

export function blankProject(id: string, now = new Date()): Project {
  return {
    id,
    name: "",
    description: "",
    notes: [],
    wrikeNumber: "",
    sku: "",
    coupaNumber: "",
    customerContact: "",
    priority: "standard",
    type: "",
    brands: [],
    accountUnitId: "",
    billable: false,
    otAvailable: false,
    allottedHours: null,
    workflowStatus: "in-progress",
    ihDate: "",
    createdAt: now.toISOString(),
    close: null,
    sessions: [],
  };
}

// Build a new open project from selected fields. Hours and sessions never copy.
export function buildCopiedProject(
  source: Project,
  selected: ReadonlySet<ProjectCopyField>,
  id: string,
  now = new Date(),
): Project {
  const next = blankProject(id, now);
  if (selected.has("name")) next.name = source.name ? `Copy of ${source.name}` : "";
  if (selected.has("description")) next.description = source.description;
  if (selected.has("sku")) next.sku = source.sku;
  if (selected.has("customerContact")) next.customerContact = source.customerContact;
  if (selected.has("priority")) next.priority = source.priority;
  if (selected.has("ihDate")) next.ihDate = source.ihDate;
  if (selected.has("wrikeNumber")) next.wrikeNumber = source.wrikeNumber;
  if (selected.has("coupaNumber")) next.coupaNumber = source.coupaNumber;
  if (selected.has("type")) next.type = source.type;
  if (selected.has("brands")) next.brands = [...source.brands];
  if (selected.has("accountUnitId")) next.accountUnitId = source.accountUnitId;
  if (selected.has("billable")) next.billable = source.billable;
  if (selected.has("otAvailable")) next.otAvailable = source.otAvailable;
  if (selected.has("allottedHours")) next.allottedHours = source.allottedHours;
  if (selected.has("workflowStatus")) next.workflowStatus = source.workflowStatus;
  if (selected.has("notes")) {
    next.notes = source.notes.map((note) => ({ ...note, id: crypto.randomUUID() }));
  }
  return next;
}

// Starting here pauses this person's other projects and starts their pause clocks.
export function startProject(projects: Project[], projectId: string, now: number, person = CURRENT_USER): Project[] {
  return projects.map((project) => {
    if (project.close) return project;
    const sessions = project.sessions.map((session) =>
      session.person === person && project.id !== projectId ? hold(session, now) : session,
    );
    if (project.id !== projectId) return { ...project, sessions };

    const mine = sessions.find((session) => session.person === person);
    const nextSessions = mine
      ? sessions.map((session) =>
          session.person === person ? (session.status === "running" ? session : resume(session, now)) : session,
        )
      : [
          ...sessions,
          {
            person,
            status: "running" as const,
            accumulatedMs: 0,
            runningSince: now,
            pausedMs: 0,
            pausedSince: null,
            days: [],
          },
        ];
    return { ...project, sessions: nextSessions };
  });
}

export function pauseProject(projects: Project[], projectId: string, now: number, person = CURRENT_USER): Project[] {
  return projects.map((project) => {
    if (project.id !== projectId || project.close) return project;
    return {
      ...project,
      sessions: project.sessions.map((session) => (session.person === person ? hold(session, now) : session)),
    };
  });
}

export function stopProject(projects: Project[], projectId: string, now: number, person = CURRENT_USER): Project[] {
  return projects.map((project) => {
    if (project.id !== projectId || project.close) return project;
    return {
      ...project,
      sessions: project.sessions.map((session) => (session.person === person ? stopSession(session, now) : session)),
    };
  });
}

// Complete and Cancel both stop every clock and lock the row. The hours stay.
export function closeProject(projects: Project[], projectId: string, close: Exclude<ProjectClose, null>, now: number): Project[] {
  return projects.map((project) => {
    if (project.id !== projectId || project.close) return project;
    return {
      ...project,
      close,
      sessions: project.sessions.map((session) => stopSession(session, now)),
    };
  });
}

function normalizeProject(value: unknown): Project | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Partial<Project>;
  // Copy ihDate out so the session mapper keeps the string, not string | undefined.
  const ihDate = row.ihDate;
  if (typeof row.id !== "string" || typeof row.name !== "string" || typeof ihDate !== "string") return null;
  const close = row.close === "complete" || row.close === "cancelled" ? row.close : null;
  const sessions = Array.isArray(row.sessions)
    ? row.sessions
        .map((session) => normalizeSession(session, ihDate))
        .filter((session): session is WorkSession => session != null)
    : [];
  return {
    id: row.id,
    name: row.name,
    description: typeof row.description === "string" ? row.description : "",
    notes: notesFrom(row.notes),
    wrikeNumber: typeof row.wrikeNumber === "string" ? row.wrikeNumber : "",
    sku: typeof row.sku === "string" ? row.sku : "",
    coupaNumber: typeof row.coupaNumber === "string" ? row.coupaNumber : "",
    customerContact: typeof row.customerContact === "string" ? row.customerContact : "",
    priority: row.priority === "rush" ? "rush" : "standard",
    type: listedValue(row.type, PROJECT_TYPES),
    brands: brandsFrom(row),
    accountUnitId: listedValue(row.accountUnitId, PROJECT_ACCOUNT_UNITS),
    billable: row.billable === true,
    otAvailable: row.otAvailable === true,
    allottedHours: allottedHoursFrom(row.allottedHours),
    workflowStatus: workflowStatusFrom(row.workflowStatus),
    ihDate,
    createdAt: createdAtFrom(row.createdAt, ihDate),
    close,
    sessions,
  };
}

function listedValue<T extends string>(value: unknown, allowed: readonly T[]): T | "" {
  return typeof value === "string" && (allowed as readonly string[]).includes(value) ? (value as T) : "";
}

function workflowStatusFrom(value: unknown): ProjectWorkflowStatus {
  return typeof value === "string" && (PROJECT_WORKFLOW_STATUSES as readonly string[]).includes(value)
    ? (value as ProjectWorkflowStatus)
    : "in-progress";
}

// New shape is an array. Older localStorage rows used a single brand string.
function brandsFrom(row: Partial<Project> & { brand?: unknown }): ProjectBrand[] {
  if (Array.isArray(row.brands)) {
    return row.brands.filter(
      (brand): brand is ProjectBrand =>
        typeof brand === "string" && (PROJECT_BRANDS as readonly string[]).includes(brand),
    );
  }
  const legacy = listedValue(row.brand, PROJECT_BRANDS);
  return legacy ? [legacy] : [];
}

// New shape is a feed. Older rows stored one free-form string.
function notesFrom(value: unknown): ProjectNote[] {
  if (Array.isArray(value)) {
    return value
      .map((entry) => {
        if (!entry || typeof entry !== "object") return null;
        const row = entry as Partial<ProjectNote>;
        if (typeof row.id !== "string" || typeof row.body !== "string" || !row.body.trim()) return null;
        return {
          id: row.id,
          author: typeof row.author === "string" && row.author.trim() ? row.author : CURRENT_USER,
          body: row.body,
          createdAt:
            typeof row.createdAt === "string" && !Number.isNaN(Date.parse(row.createdAt))
              ? row.createdAt
              : new Date().toISOString(),
        } satisfies ProjectNote;
      })
      .filter((note): note is ProjectNote => note != null);
  }
  if (typeof value === "string" && value.trim()) {
    return [
      {
        id: "legacy-note",
        author: CURRENT_USER,
        body: value,
        createdAt: new Date().toISOString(),
      },
    ];
  }
  return [];
}

function allottedHoursFrom(value: unknown): number | null {
  if (value == null || value === "") return null;
  const hours = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(hours) || hours < 0) return null;
  return Math.round(hours * 100) / 100;
}

function createdAtFrom(value: unknown, ihDate: string): string {
  if (typeof value === "string" && !Number.isNaN(Date.parse(value))) return value;
  // Projects saved before this field existed use the IH date so Created still has a time.
  const fallback = new Date(`${ihDate}T12:00:00`);
  return Number.isNaN(fallback.getTime()) ? "" : fallback.toISOString();
}

function normalizeDay(value: unknown): DayHours | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Partial<DayHours>;
  if (typeof row.date !== "string" || typeof row.ms !== "number" || row.ms < 0) return null;
  return { date: row.date, ms: row.ms };
}

function normalizeSession(value: unknown, fallbackDate: string): WorkSession | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Partial<WorkSession>;
  if (typeof row.person !== "string" || (row.status !== "running" && row.status !== "paused")) return null;
  const runningSince = typeof row.runningSince === "number" ? row.runningSince : null;
  // A running flag without a start time cannot keep counting.
  const status = row.status === "running" && runningSince == null ? "paused" : row.status;
  const accumulatedMs = typeof row.accumulatedMs === "number" ? row.accumulatedMs : 0;
  const parsedDays = Array.isArray(row.days)
    ? row.days.map(normalizeDay).filter((entry): entry is DayHours => entry != null)
    : [];
  // Older rows only had a total. Park that total on the IH date so export still has a line.
  const days =
    parsedDays.length > 0 ? parsedDays : accumulatedMs > 0 ? [{ date: fallbackDate, ms: accumulatedMs }] : [];
  return {
    person: row.person,
    status,
    accumulatedMs,
    runningSince: status === "running" ? runningSince : null,
    pausedMs: typeof row.pausedMs === "number" ? row.pausedMs : 0,
    pausedSince: typeof row.pausedSince === "number" ? row.pausedSince : null,
    days,
  };
}
