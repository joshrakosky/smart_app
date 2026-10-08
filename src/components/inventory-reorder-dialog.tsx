"use client";

import { useEffect, useRef, useState } from "react";
import {
  PRODUCTION_ORDER_STATUSES,
  PRODUCTION_ORDER_STATUS_LABELS,
  type InventoryReorder,
  type ProductionOrderStatus,
} from "@/lib/inventory";

const fieldClass =
  "h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-base text-slate-900 shadow-sm";
const navyButton =
  "h-10 rounded-lg bg-[#0f2c4c] px-4 text-sm font-medium text-white transition-colors hover:bg-[#1a4a73]";
const dangerButton = "h-10 rounded-lg bg-red-600 px-4 text-sm font-medium text-white transition-colors hover:bg-red-500";

// Same form for a new order and a saved one. Reopening fills the fields back in.
export function InventoryReorderDialog({
  product,
  order,
  onClose,
  onSave,
  onComplete,
  onCancelOrder,
}: {
  product: string;
  order: InventoryReorder | null;
  onClose: () => void;
  onSave: (input: {
    pvNumber: string;
    quantity: number | null;
    estimatedCompletion: string;
    status: ProductionOrderStatus;
  }) => boolean;
  onComplete: () => void;
  onCancelOrder: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [pvNumber, setPvNumber] = useState(order?.pvNumber ?? "");
  const [quantity, setQuantity] = useState(order?.quantity == null ? "" : String(order.quantity));
  const [estimatedCompletion, setEstimatedCompletion] = useState(order?.estimatedCompletion ?? "");
  const [status, setStatus] = useState<ProductionOrderStatus>(order?.status ?? "in-progress");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    dialog.showModal();
    return () => dialog.close();
  }, []);

  function draft() {
    const trimmed = quantity.trim();
    if (trimmed && (!Number.isInteger(Number(trimmed)) || Number(trimmed) < 1)) return null;
    return {
      pvNumber,
      quantity: trimmed ? Number(trimmed) : null,
      estimatedCompletion,
      status,
    };
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="inventory-reorder-title"
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
          const input = draft();
          if (!input) {
            setError("Reorder quantity needs to be a whole number, or left blank.");
            return;
          }
          if (!onSave(input)) {
            setError("Could not save this production order.");
            return;
          }
          onClose();
        }}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id="inventory-reorder-title" className="text-lg font-semibold">
              Production order
            </h2>
            <p className="text-sm text-slate-500">{product}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="text-xl leading-none text-slate-500">
            ×
          </button>
        </div>

        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-slate-700">Status</span>
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value as ProductionOrderStatus)}
            className={fieldClass}
          >
            {PRODUCTION_ORDER_STATUSES.map((item) => (
              <option key={item} value={item}>
                {PRODUCTION_ORDER_STATUS_LABELS[item]}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-slate-700">PV#</span>
          <input value={pvNumber} onChange={(event) => setPvNumber(event.target.value)} className={fieldClass} />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-slate-700">Reorder quantity</span>
          <input
            inputMode="numeric"
            value={quantity}
            onChange={(event) => setQuantity(event.target.value)}
            className={fieldClass}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-slate-700">Estimated completion</span>
          <input
            type="date"
            value={estimatedCompletion}
            onChange={(event) => setEstimatedCompletion(event.target.value)}
            className={fieldClass}
          />
        </label>
        {error ? <p className="text-sm text-red-700">{error}</p> : null}
        <div className="flex gap-2">
          <button type="submit" className={navyButton}>
            Save
          </button>
          <button
            type="button"
            className={navyButton}
            onClick={() => {
              const input = draft();
              if (!input) {
                setError("Reorder quantity needs to be a whole number, or left blank.");
                return;
              }
              // Complete uses the fields currently on the form, including ones not saved yet.
              if (!onSave(input)) {
                setError("Could not save this production order.");
                return;
              }
              onComplete();
            }}
          >
            Complete
          </button>
          <button
            type="button"
            className={dangerButton}
            onClick={() => {
              if (order) onCancelOrder();
              else onClose();
            }}
          >
            Cancel
          </button>
        </div>
      </form>
    </dialog>
  );
}
