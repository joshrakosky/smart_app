"use client";

import { useState } from "react";
import { CURRENT_USER, type ProjectNote } from "@/lib/time-clock";

// GPC-style note cards: avatar initial, author, relative time, then the body.
export function ProjectNotesFeed({
  notes,
  onAdd,
}: {
  notes: ProjectNote[];
  onAdd: (body: string) => void;
}) {
  const [draft, setDraft] = useState("");

  function submit() {
    const body = draft.trim();
    if (!body) return;
    onAdd(body);
    setDraft("");
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="flex max-h-56 flex-col gap-2 overflow-y-auto">
        {notes.length === 0 ? (
          <p className="text-sm text-slate-500">No notes yet. Add the first one below.</p>
        ) : (
          notes.map((note) => (
            <article
              key={note.id}
              className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-slate-900"
            >
              <div className="flex items-start gap-3">
                <span
                  aria-hidden="true"
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#0f2c4c] text-sm font-semibold text-white"
                >
                  {initials(note.author)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{note.author}</p>
                  <p className="text-xs text-slate-500">{relativeTime(note.createdAt)}</p>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-slate-800">{note.body}</p>
                </div>
              </div>
            </article>
          ))
        )}
      </div>
      <div className="flex flex-col gap-2 border-t border-slate-200 pt-3">
        <label className="flex flex-col gap-1 text-sm" htmlFor="project-note-draft">
          <span className="font-medium text-slate-700">Add a note</span>
          <textarea
            id="project-note-draft"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            rows={3}
            placeholder={`Writing as ${CURRENT_USER}`}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900"
          />
        </label>
        <button
          type="button"
          onClick={submit}
          disabled={!draft.trim()}
          className="h-10 w-fit rounded-lg bg-[#0f2c4c] px-4 text-sm font-medium text-white transition-colors hover:bg-[#1a4a73] disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          Add note
        </button>
      </div>
    </div>
  );
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
  return `${parts[0].slice(0, 1)}${parts[parts.length - 1].slice(0, 1)}`.toUpperCase();
}

function relativeTime(iso: string, now = Date.now()): string {
  const at = Date.parse(iso);
  if (Number.isNaN(at)) return "";
  const delta = Math.max(0, now - at);
  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;
  if (delta < minute) return "Just now";
  if (delta < hour) {
    const n = Math.floor(delta / minute);
    return `${n} minute${n === 1 ? "" : "s"} ago`;
  }
  if (delta < day) {
    const n = Math.floor(delta / hour);
    return `${n} hour${n === 1 ? "" : "s"} ago`;
  }
  if (delta < 7 * day) {
    const n = Math.floor(delta / day);
    return `${n} day${n === 1 ? "" : "s"} ago`;
  }
  return new Date(at).toLocaleString("en-US", { dateStyle: "short", timeStyle: "short" });
}
