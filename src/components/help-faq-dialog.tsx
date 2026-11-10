"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type HelpCategory = "getting-started" | "time-clock" | "projects" | "billing" | "notes-assets" | "archive";

type HelpArticle = {
  id: string;
  category: HelpCategory;
  question: string;
  answer: string;
  tags: string[];
};

const CATEGORIES: { id: HelpCategory | "all"; label: string }[] = [
  { id: "all", label: "All" },
  { id: "getting-started", label: "Getting started" },
  { id: "time-clock", label: "Time clock" },
  { id: "projects", label: "Projects" },
  { id: "billing", label: "Billing" },
  { id: "notes-assets", label: "Notes & assets" },
  { id: "archive", label: "Archive" },
];

// Keep answers short and action-oriented so search + skim stay fast.
const ARTICLES: HelpArticle[] = [
  {
    id: "what-is-hours",
    category: "getting-started",
    question: "What is Hours / Time Clock?",
    answer:
      "Hours is where you track time against projects. Create a project, start your clock, pause or stop when needed, and fill in Details, Billing, Notes, and Assets as the job moves.",
    tags: ["overview", "hours", "time", "intro"],
  },
  {
    id: "open-help",
    category: "getting-started",
    question: "How do I find help again?",
    answer: "Use the ? icon at the bottom of the left nav. Search by keyword or browse a category on the left.",
    tags: ["faq", "help", "search"],
  },
  {
    id: "create-project",
    category: "projects",
    question: "How do I create a project?",
    answer:
      "Click the + button on Hours. Fill Details (name and IH date are required), then add Billing, Notes, or Assets if you have them. Press Create.",
    tags: ["new", "add", "create", "+"],
  },
  {
    id: "edit-project",
    category: "projects",
    question: "How do I edit a project?",
    answer: "Click the project name in the table. Update any tab, then Save. Complete or Cancel from the same dialog when the job is done.",
    tags: ["edit", "save", "details"],
  },
  {
    id: "description-format",
    category: "projects",
    question: "How do description bullets and checklists work?",
    answer:
      "In Description, use Bullets or Checklist to format lines. Checklist items show a preview where you can check boxes on and off.",
    tags: ["description", "bullets", "checklist", "format"],
  },
  {
    id: "status-meanings",
    category: "projects",
    question: "What do the Status options mean?",
    answer:
      "Status on Details is the workflow stage: In Progress, Approved, In Review, Onboard Ready, or Dealer Logo. Completing or cancelling a project moves it out of the queue into Archive.",
    tags: ["status", "workflow", "in progress", "approved"],
  },
  {
    id: "copy-project",
    category: "projects",
    question: "How do I copy a project?",
    answer:
      "Open the project, click the copy icon next to Edit project, check the fields to bring over, then Create copy. Hours and sessions never copy.",
    tags: ["copy", "duplicate", "clone"],
  },
  {
    id: "multi-brand",
    category: "billing",
    question: "Can a project have more than one brand?",
    answer: "Yes. On Billing, Brand is a checklist—select every brand that applies.",
    tags: ["brand", "multi", "checkbox"],
  },
  {
    id: "billable-ot",
    category: "billing",
    question: "What are Billable and OT available?",
    answer:
      "Billable marks whether time on the project can be billed. OT available says whether overtime is allowed for that job. Both are True/False on the Billing tab.",
    tags: ["billable", "ot", "overtime", "billing"],
  },
  {
    id: "start-pause-stop",
    category: "time-clock",
    question: "How do I start, pause, and stop time?",
    answer:
      "Use the green play, gold pause, and red stop buttons on each row. Play starts (or resumes) your clock on that project. Pause holds your time. Stop ends the session without completing the project.",
    tags: ["play", "pause", "stop", "clock", "timer"],
  },
  {
    id: "one-clock",
    category: "time-clock",
    question: "Can I run more than one clock at once?",
    answer:
      "You only run one clock at a time. Starting another project pauses the one you were on. Other people can still be running on the same project.",
    tags: ["one", "single", "multiple", "running"],
  },
  {
    id: "week-limit",
    category: "time-clock",
    question: "What is Week left?",
    answer:
      "Week left shows how much of your 40-hour week remains. It resets each Monday. When you hit zero, play is blocked and a running clock pauses automatically.",
    tags: ["week", "40", "cap", "limit", "hours"],
  },
  {
    id: "my-hours",
    category: "time-clock",
    question: "Where do I see my hours?",
    answer: "Click the clock icon next to +. Pick Day, Week, or Month to see your worked time by project for that range.",
    tags: ["my hours", "report", "export", "day", "week", "month"],
  },
  {
    id: "search-projects",
    category: "getting-started",
    question: "How do I find a project in the list?",
    answer: "Use Search at the top of Hours. It matches name, description, notes, brands, Wrike #, SKU, contact, priority, and status.",
    tags: ["search", "filter", "find"],
  },
  {
    id: "notes-feed",
    category: "notes-assets",
    question: "How do project notes work?",
    answer:
      "Open Notes on a project. Each note shows who wrote it and when. Add a note and it is saved right away with your name and a timestamp so the team can follow along.",
    tags: ["notes", "comment", "timestamp", "team"],
  },
  {
    id: "assets",
    category: "notes-assets",
    question: "How do I attach files?",
    answer: "Open the Assets tab, click Upload, then download or remove files from the list. Files over 1.5 MB are skipped.",
    tags: ["assets", "files", "upload", "download"],
  },
  {
    id: "complete-cancel",
    category: "archive",
    question: "What happens when I Complete or Cancel?",
    answer:
      "Both stop every clock on the project and lock it. The row leaves the Hours queue and moves to Archive. Worked hours stay on the project.",
    tags: ["complete", "cancel", "close", "done"],
  },
  {
    id: "archive-revive",
    category: "archive",
    question: "How do I archive or revive a project?",
    answer:
      "Completed and cancelled projects appear under Archive in the hamburger menu. Open Archive and click Revive to pull a project back into the queue as In Progress.",
    tags: ["archive", "revive", "restore", "hamburger"],
  },
  {
    id: "priority-rush",
    category: "projects",
    question: "What does Priority do?",
    answer: "Priority is Standard or Rush. Rush jobs are marked so the team can spot urgent work in the list.",
    tags: ["priority", "rush", "standard"],
  },
  {
    id: "created-vs-ih",
    category: "projects",
    question: "What is the difference between Created and IH date?",
    answer:
      "Created is set when the project is made and cannot be edited. IH date is the job date you choose and can change on Details.",
    tags: ["created", "ih", "date"],
  },
];

const outlineButton =
  "h-10 rounded-lg border border-slate-300 bg-white px-4 text-sm font-medium text-slate-800 transition-colors hover:border-slate-400 hover:bg-slate-100";

export function HelpFaqDialog({ onClose }: { onClose: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<HelpCategory | "all">("all");
  const [openId, setOpenId] = useState<string | null>(ARTICLES[0]?.id ?? null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    dialog.showModal();
    // Focus search so people can type right away.
    requestAnimationFrame(() => searchRef.current?.focus());
    return () => dialog.close();
  }, []);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return ARTICLES.filter((article) => {
      if (category !== "all" && article.category !== category) return false;
      if (!needle) return true;
      const haystack = `${article.question} ${article.answer} ${article.tags.join(" ")}`.toLowerCase();
      return haystack.includes(needle);
    });
  }, [category, query]);

  // Keep the open article in view when filters change.
  useEffect(() => {
    if (filtered.length === 0) {
      setOpenId(null);
      return;
    }
    if (!filtered.some((article) => article.id === openId)) {
      setOpenId(filtered[0].id);
    }
  }, [filtered, openId]);

  const counts = useMemo(() => {
    const map = Object.fromEntries(CATEGORIES.map((item) => [item.id, 0])) as Record<string, number>;
    map.all = ARTICLES.length;
    for (const article of ARTICLES) map[article.category] += 1;
    return map;
  }, []);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="help-faq-title"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      className="m-auto max-h-[calc(100%-2rem)] w-[min(52rem,calc(100%-2rem))] overflow-hidden rounded-xl border border-slate-200 bg-white p-0 text-slate-900 shadow-lg backdrop:bg-slate-900/40"
    >
      <div className="flex max-h-[min(40rem,calc(100vh-2rem))] flex-col">
        <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-5 py-4">
          <div>
            <h2 id="help-faq-title" className="text-lg font-semibold">
              Help & FAQs
            </h2>
            <p className="text-sm text-slate-500">Search or browse how-to topics for Hours.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="text-xl leading-none text-slate-500">
            ×
          </button>
        </div>

        <div className="border-b border-slate-200 px-5 py-3">
          <label className="flex flex-col gap-1 text-sm" htmlFor="help-faq-search">
            <span className="font-medium text-slate-700">Search</span>
            <input
              ref={searchRef}
              id="help-faq-search"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Try: pause, archive, brand, copy…"
              className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-slate-900"
            />
          </label>
        </div>

        <div className="flex min-h-0 flex-1 flex-col sm:flex-row">
          <nav
            aria-label="Help categories"
            className="flex shrink-0 gap-1 overflow-x-auto border-b border-slate-200 p-3 sm:w-48 sm:flex-col sm:overflow-y-auto sm:border-r sm:border-b-0"
          >
            {CATEGORIES.map((item) => {
              const active = category === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setCategory(item.id)}
                  className={`whitespace-nowrap rounded-lg px-3 py-2 text-left text-sm ${
                    active
                      ? "bg-[#0f2c4c] font-medium text-white"
                      : "text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  <span className="flex items-center justify-between gap-2">
                    <span>{item.label}</span>
                    <span className={active ? "text-white/70" : "text-slate-400"}>{counts[item.id]}</span>
                  </span>
                </button>
              );
            })}
          </nav>

          <div className="min-h-0 flex-1 overflow-y-auto p-4">
            {filtered.length === 0 ? (
              <p className="text-sm text-slate-500">No topics match that search. Try another word or pick All.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {filtered.map((article) => {
                  const open = openId === article.id;
                  return (
                    <li key={article.id} className="rounded-lg border border-slate-200">
                      <button
                        type="button"
                        aria-expanded={open}
                        onClick={() => setOpenId(open ? null : article.id)}
                        className="flex w-full items-start justify-between gap-3 px-3 py-3 text-left"
                      >
                        <span>
                          <span className="block text-sm font-medium text-slate-900">{article.question}</span>
                          <span className="mt-0.5 block text-xs text-slate-500">
                            {CATEGORIES.find((item) => item.id === article.category)?.label}
                          </span>
                        </span>
                        <span aria-hidden="true" className="mt-0.5 text-slate-400">
                          {open ? "−" : "+"}
                        </span>
                      </button>
                      {open ? (
                        <p className="border-t border-slate-100 px-3 py-3 text-sm leading-relaxed text-slate-700">
                          {article.answer}
                        </p>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

        <div className="flex justify-end border-t border-slate-200 px-5 py-3">
          <button type="button" onClick={onClose} className={outlineButton}>
            Close
          </button>
        </div>
      </div>
    </dialog>
  );
}
