"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { PriceFormDialog } from "@/components/price-form-dialog";
import {
  QUEUE_KIND_LABELS,
  cancelOnboarding,
  completeOnboarding,
  getOnboardingServerSnapshot,
  getOnboardingSnapshot,
  subscribeOnboarding,
  type OnboardingItem,
} from "@/lib/onboarding";

const iconButton =
  "flex h-8 w-8 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-700 transition-colors hover:border-slate-400 hover:bg-slate-100 hover:text-[#0f2c4c]";
const headerCell =
  "sticky top-0 z-10 whitespace-nowrap border-r border-b border-slate-200 bg-slate-50 px-4 py-2.5 font-medium last:border-r-0";
const bodyCell = "border-r border-b border-slate-200 px-4 py-2.5 last:border-r-0";
const outlineButton =
  "h-10 rounded-lg border border-slate-300 bg-white px-4 text-sm font-medium text-slate-800 transition-colors hover:border-slate-400 hover:bg-slate-100";
const navyButton =
  "h-10 rounded-lg bg-[#0f2c4c] px-4 text-sm font-medium text-white transition-colors hover:bg-[#1a4a73]";
const dangerButton = "h-10 rounded-lg bg-red-600 px-4 text-sm font-medium text-white transition-colors hover:bg-red-500";

type QueueConfirm = { item: OnboardingItem; action: "complete" | "cancel" };

// Open queue only. Done and cancelled stay in storage and leave this table.
export function OnboardingBoard() {
  const items = useSyncExternalStore(subscribeOnboarding, getOnboardingSnapshot, getOnboardingServerSnapshot);
  const open = items.filter((item) => item.status === "open");
  const [review, setReview] = useState<OnboardingItem | null>(null);
  const [confirm, setConfirm] = useState<QueueConfirm | null>(null);

  return (
    <div className="flex flex-col gap-4">
      <section aria-label="Onboarding queue" className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-4 py-3">
          <h2 className="text-base font-semibold">Queue</h2>
          <p className="mt-0.5 text-sm text-slate-500">
            Keep ecomm and backend product records aligned. Notes list what changed on each save.
          </p>
        </div>
        <div className="h-[416px] overflow-auto">
          <table className="w-full min-w-[56rem] border-separate border-spacing-0 text-center text-sm">
            <thead className="text-slate-600">
              <tr>
                <th className={headerCell}>Queue date</th>
                <th className={headerCell}>Product</th>
                <th className={headerCell}>SKU</th>
                <th className={headerCell}>Change</th>
                <th className={`${headerCell} text-left`}>Notes</th>
                <th className={headerCell}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {open.length === 0 ? (
                <tr>
                  <td className="px-4 py-6 text-slate-500" colSpan={6}>
                    Nothing is waiting for onboarding.
                  </td>
                </tr>
              ) : (
                open.map((item) => (
                  <tr key={item.id} className="even:bg-slate-100">
                    <td className={`${bodyCell} whitespace-nowrap`}>{formatQueued(item.queuedAt)}</td>
                    <td className={bodyCell}>
                      <button
                        type="button"
                        onClick={() => setReview(item)}
                        className="font-medium text-[#0f2c4c] underline-offset-2 hover:underline"
                      >
                        {item.product.name}
                      </button>
                    </td>
                    <td className={`${bodyCell} whitespace-nowrap`}>{item.product.sku || "—"}</td>
                    <td className={bodyCell}>{QUEUE_KIND_LABELS[item.kind]}</td>
                    {/* Auto-filled from the save diff — view only for now. */}
                    <td className={`${bodyCell} max-w-xs whitespace-pre-wrap text-left text-xs leading-snug text-slate-700`}>
                      {item.note.trim() || "—"}
                    </td>
                    <td className={bodyCell}>
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          aria-label={`Complete ${item.product.name}`}
                          onClick={() => setConfirm({ item, action: "complete" })}
                          className={iconButton}
                        >
                          <CheckIcon />
                        </button>
                        <button
                          type="button"
                          aria-label={`Cancel ${item.product.name}`}
                          onClick={() => setConfirm({ item, action: "cancel" })}
                          className={iconButton}
                        >
                          <CancelIcon />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {review ? (
        <PriceFormDialog
          key={review.id}
          editing={review.product}
          readOnly
          onClose={() => setReview(null)}
          onSave={() => {}}
          onImport={() => {}}
        />
      ) : null}

      {confirm ? (
        <QueueConfirmDialog
          name={confirm.item.product.name}
          action={confirm.action}
          onClose={() => setConfirm(null)}
          onConfirm={() => {
            if (confirm.action === "complete") completeOnboarding(confirm.item.id);
            else cancelOnboarding(confirm.item.id);
            setConfirm(null);
          }}
        />
      ) : null}

    </div>
  );
}

function QueueConfirmDialog({
  name,
  action,
  onClose,
  onConfirm,
}: {
  name: string;
  action: "complete" | "cancel";
  onClose: () => void;
  onConfirm: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const completing = action === "complete";

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    dialog.showModal();
    return () => dialog.close();
  }, []);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="queue-confirm-title"
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
          <h2 id="queue-confirm-title" className="text-lg font-semibold">
            {completing ? "Complete onboarding?" : "Cancel onboarding?"}
          </h2>
          <button type="button" onClick={onClose} aria-label="Close" className="text-xl leading-none text-slate-500">
            ×
          </button>
        </div>
        <p className="text-sm text-slate-600">
          {completing
            ? `${name} will leave the queue.`
            : `${name} will leave the queue without being completed.`}
        </p>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className={outlineButton}>
            {completing ? "Not yet" : "Keep"}
          </button>
          <button type="submit" className={completing ? navyButton : dangerButton}>
            {completing ? "Complete" : "Cancel"}
          </button>
        </div>
      </form>
    </dialog>
  );
}

function formatQueued(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

function CheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M5 12.5 9.2 17 19 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// Plain X — no circle — so cancel reads differently from a status badge.
function CancelIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}
