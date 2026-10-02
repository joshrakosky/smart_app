// Projects and contractor sessions live in this browser until sign-in and the database exist.
// The signed-in person will replace CURRENT_USER. One person runs one clock at a time.
// Two people can run on the same project. The row time is the sum of every session.

export const CURRENT_USER = "Contractor 1";

export type SessionStatus = "running" | "paused";
export type ProjectClose = "complete" | "cancelled" | null;
export type ProjectLabel = "In Progress" | "On Hold" | "Complete" | "Cancelled";

export type WorkSession = {
  person: string;
  status: SessionStatus;
  accumulatedMs: number;
  runningSince: number | null;
};

export type Project = {
  id: string;
  name: string;
  ihDate: string;
  close: ProjectClose;
  sessions: WorkSession[];
};

const STORAGE_KEY = "smart-projects";
const MINUTE = 60 * 1000;

export const SEED_PROJECTS: Project[] = [
  {
    id: "seed-brochure",
    name: "Brochure reprint",
    ihDate: "2026-09-18",
    close: null,
    sessions: [
      { person: "Contractor 1", status: "paused", accumulatedMs: (2 * 60 + 15) * MINUTE, runningSince: null },
    ],
  },
  {
    id: "seed-posters",
    name: "Dealer posters",
    ihDate: "2026-09-22",
    close: null,
    sessions: [
      { person: "Contractor 2", status: "paused", accumulatedMs: 45 * MINUTE, runningSince: null },
    ],
  },
  {
    id: "seed-banners",
    name: "Banner stands",
    ihDate: "2026-09-26",
    close: null,
    sessions: [
      { person: "Contractor 3", status: "paused", accumulatedMs: (1 * 60 + 5) * MINUTE, runningSince: null },
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
  if (project.sessions.some((session) => session.status === "running")) return "In Progress";
  return "On Hold";
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

function settle(session: WorkSession, now: number): WorkSession {
  if (session.status !== "running") return session;
  return {
    ...session,
    status: "paused",
    accumulatedMs: sessionMs(session, now),
    runningSince: null,
  };
}

// Starting here pauses this person's other projects. Other people keep running.
export function startProject(projects: Project[], projectId: string, now: number, person = CURRENT_USER): Project[] {
  return projects.map((project) => {
    if (project.close) return project;
    const sessions = project.sessions.map((session) =>
      session.person === person && project.id !== projectId ? settle(session, now) : session,
    );
    if (project.id !== projectId) return { ...project, sessions };

    const mine = sessions.find((session) => session.person === person);
    const nextSessions = mine
      ? sessions.map((session) =>
          session.person === person ? { ...settle(session, now), status: "running" as const, runningSince: now } : session,
        )
      : [...sessions, { person, status: "running" as const, accumulatedMs: 0, runningSince: now }];
    return { ...project, sessions: nextSessions };
  });
}

export function pauseProject(projects: Project[], projectId: string, now: number, person = CURRENT_USER): Project[] {
  return projects.map((project) => {
    if (project.id !== projectId || project.close) return project;
    return {
      ...project,
      sessions: project.sessions.map((session) => (session.person === person ? settle(session, now) : session)),
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
      sessions: project.sessions.map((session) => settle(session, now)),
    };
  });
}

function normalizeProject(value: unknown): Project | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Partial<Project>;
  if (typeof row.id !== "string" || typeof row.name !== "string" || typeof row.ihDate !== "string") return null;
  const close = row.close === "complete" || row.close === "cancelled" ? row.close : null;
  const sessions = Array.isArray(row.sessions) ? row.sessions.filter(isSession) : [];
  return { id: row.id, name: row.name, ihDate: row.ihDate, close, sessions };
}

function isSession(value: unknown): value is WorkSession {
  if (!value || typeof value !== "object") return false;
  const row = value as Partial<WorkSession>;
  return typeof row.person === "string" && (row.status === "running" || row.status === "paused");
}
