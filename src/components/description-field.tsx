"use client";

import { useRef } from "react";

// Plain text with light markers: "- " for bullets, "- [ ]" / "- [x]" for checklists.
const inputClass = "rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900";
const toolButton =
  "h-8 rounded-md border border-slate-300 bg-white px-2.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50";

export function DescriptionField({
  id,
  value,
  onChange,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);

  function applyLinePrefix(kind: "bullet" | "check") {
    const el = ref.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const before = value.slice(0, start);
    const selected = value.slice(start, end) || "";
    const after = value.slice(end);
    const lineStart = before.lastIndexOf("\n") + 1;
    const block = value.slice(lineStart, end) || "";
    const lines = (block.length > 0 ? block : "").split("\n");
    const mapped = (lines.length === 1 && lines[0] === "" ? [""] : lines).map((line) => {
      const stripped = line.replace(/^(\s*)(?:- \[ \]|- \[x\]|- )\s?/i, "$1");
      if (kind === "bullet") return `${stripped.match(/^\s*/)?.[0] ?? ""}- ${stripped.trimStart()}`;
      return `${stripped.match(/^\s*/)?.[0] ?? ""}- [ ] ${stripped.trimStart()}`;
    });
    const next = value.slice(0, lineStart) + mapped.join("\n") + after;
    onChange(next);
    requestAnimationFrame(() => {
      el.focus();
      const cursor = lineStart + mapped.join("\n").length;
      el.setSelectionRange(cursor, cursor);
    });
  }

  function toggleCheckboxAt(lineIndex: number) {
    const lines = value.split("\n");
    const line = lines[lineIndex];
    if (line == null) return;
    if (/^(\s*)- \[ \]/.test(line)) {
      lines[lineIndex] = line.replace(/^(\s*)- \[ \]/, "$1- [x]");
    } else if (/^(\s*)- \[x\]/i.test(line)) {
      lines[lineIndex] = line.replace(/^(\s*)- \[x\]/i, "$1- [ ]");
    } else {
      return;
    }
    onChange(lines.join("\n"));
  }

  const lines = value.split("\n");
  const hasChecklist = lines.some((line) => /^(\s*)- \[[ x]\]/i.test(line));

  return (
    <div className="flex flex-col gap-1 text-sm">
      <div className="flex items-center justify-between gap-2">
        <label htmlFor={id} className="font-medium text-slate-700">
          Description
        </label>
        <div className="flex gap-1">
          <button type="button" className={toolButton} onClick={() => applyLinePrefix("bullet")}>
            Bullets
          </button>
          <button type="button" className={toolButton} onClick={() => applyLinePrefix("check")}>
            Checklist
          </button>
        </div>
      </div>
      <textarea
        ref={ref}
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={4}
        className={inputClass}
      />
      {/* Clickable preview so checklist boxes can be toggled without editing markers by hand. */}
      {hasChecklist ? (
        <ul className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-800">
          {lines.map((line, index) => {
            const check = line.match(/^(\s*)- \[([ x])\]\s?(.*)$/i);
            if (check) {
              const checked = check[2].toLowerCase() === "x";
              return (
                <li key={index} className="flex items-start gap-2 py-0.5">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleCheckboxAt(index)}
                    className="mt-1"
                    aria-label={checked ? "Mark incomplete" : "Mark complete"}
                  />
                  <span className={checked ? "text-slate-500 line-through" : ""}>{check[3]}</span>
                </li>
              );
            }
            const bullet = line.match(/^(\s*)- (.*)$/);
            if (bullet) {
              return (
                <li key={index} className="flex gap-2 py-0.5">
                  <span aria-hidden="true">•</span>
                  <span>{bullet[2]}</span>
                </li>
              );
            }
            return line ? (
              <li key={index} className="list-none py-0.5">
                {line}
              </li>
            ) : (
              <li key={index} className="list-none h-3" />
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
