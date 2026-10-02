"use client";

import { useEffect, useRef, useState } from "react";
import { downloadExcel } from "@/lib/excel";
import { getPricesSnapshot } from "@/lib/prices";
import {
  REPORTS,
  orderReport,
  priceReport,
  reportFilename,
  timeReport,
  type ReportId,
} from "@/lib/reports";
import { getProjectsSnapshot } from "@/lib/time-clock";
import type { OrderLineSummary } from "@/lib/types";

const navyButton =
  "h-10 rounded-lg bg-[#0f2c4c] px-4 text-sm font-medium text-white transition-colors hover:bg-[#1a4a73] disabled:cursor-not-allowed disabled:opacity-50";

// Opened from the hamburger menu. Each button downloads one Excel file.
export function ReportsDialog({ onClose }: { onClose: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [busy, setBusy] = useState<ReportId | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    dialog.showModal();
    return () => dialog.close();
  }, []);

  async function exportReport(id: ReportId) {
    setBusy(id);
    setError(null);
    setNote(null);
    try {
      if (id === "prices") {
        const prices = getPricesSnapshot();
        downloadExcel(reportFilename(id), priceReport(prices));
        setNote(savedNote("Price tables", prices.length));
      } else if (id === "time") {
        const projects = getProjectsSnapshot();
        const sheet = timeReport(projects, Date.now());
        downloadExcel(reportFilename(id), sheet);
        setNote(savedNote("Time clock", sheet.rows.length));
      } else {
        const lines = await loadOrders();
        downloadExcel(reportFilename(id), orderReport(lines));
        setNote(savedNote("Orders", lines.length));
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not build that report.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="reports-title"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      className="m-auto w-[min(32rem,calc(100%-2rem))] rounded-xl border border-slate-200 bg-white p-0 text-slate-900 shadow-lg backdrop:bg-slate-900/40"
    >
      <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-5 py-4">
        <div>
          <h2 id="reports-title" className="text-lg font-semibold">
            Reports
          </h2>
          <p className="text-sm text-slate-500">Download an Excel file. Column lists are a first pass.</p>
        </div>
        <button type="button" onClick={onClose} aria-label="Close" className="text-xl leading-none text-slate-500">
          ×
        </button>
      </div>

      <ul className="flex flex-col gap-3 px-5 py-4">
        {REPORTS.map((report) => (
          <li
            key={report.id}
            className="flex items-center justify-between gap-4 rounded-lg border border-slate-200 px-3 py-3"
          >
            <div>
              <p className="text-sm font-medium">{report.label}</p>
              <p className="text-sm text-slate-500">{report.detail}</p>
            </div>
            <button
              type="button"
              className={navyButton}
              disabled={busy != null}
              onClick={() => exportReport(report.id)}
            >
              {busy === report.id ? "Exporting…" : "Export"}
            </button>
          </li>
        ))}
      </ul>

      {error ? <p className="px-5 pb-4 text-sm text-red-700">{error}</p> : null}
      {note ? <p className="px-5 pb-4 text-sm text-slate-600">{note}</p> : null}
    </dialog>
  );
}

function savedNote(label: string, count: number): string {
  if (count === 0) return `${label} downloaded with headers only. There are no rows yet.`;
  const noun = count === 1 ? "row" : "rows";
  return `${label} downloaded, ${count} ${noun}.`;
}

async function loadOrders(): Promise<OrderLineSummary[]> {
  const response = await fetch("/api/orders");
  const body = (await response.json()) as { lines?: OrderLineSummary[]; message?: string };
  if (!response.ok) {
    throw new Error(body.message || "Could not load orders.");
  }
  return body.lines ?? [];
}
