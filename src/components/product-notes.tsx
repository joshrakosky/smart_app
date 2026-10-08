"use client";

import { useEffect, useRef, useState } from "react";

// Notes for one product or onboarding queue row. Queue notes auto-fill from
// what changed on save; the team can still edit before completing.
export function ProductNotes({
  product,
  notes,
  onClose,
  onSave,
  title = "Product Notes",
}: {
  product: string;
  notes: string;
  onClose: () => void;
  onSave: (notes: string) => void;
  title?: string;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [draft, setDraft] = useState(notes);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    dialog.showModal();
    return () => dialog.close();
  }, []);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="product-notes-title"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      className="m-auto w-[min(32rem,calc(100%-2rem))] rounded-xl border border-slate-200 bg-white p-0 text-slate-900 shadow-lg backdrop:bg-slate-900/40"
    >
      <form
        className="flex flex-col gap-4 p-5"
        onSubmit={(event) => {
          event.preventDefault();
          onSave(draft);
          onClose();
        }}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id="product-notes-title" className="text-lg font-semibold">
              {title}
            </h2>
            <p className="text-sm text-slate-500">{product}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="text-xl leading-none text-slate-500">
            ×
          </button>
        </div>
        <textarea
          aria-label="Notes"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          rows={5}
          className="rounded-lg border border-slate-300 px-3 py-2 text-base text-slate-900 shadow-sm"
        />
        <button
          type="submit"
          className="h-10 w-fit rounded-lg bg-[#0f2c4c] px-4 text-sm font-medium text-white transition-colors hover:bg-[#1a4a73]"
        >
          Save
        </button>
      </form>
    </dialog>
  );
}
