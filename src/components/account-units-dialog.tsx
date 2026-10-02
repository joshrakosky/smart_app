"use client";

import { useEffect, useRef, useState, useSyncExternalStore, type FormEvent } from "react";
import {
  addAccountUnit,
  getAccountUnitsServerSnapshot,
  getAccountUnitsSnapshot,
  subscribeAccountUnits,
} from "@/lib/account-units";
import { STAKEHOLDERS, stakeholderName } from "@/lib/stakeholders";

const addButton =
  "flex h-10 w-10 items-center justify-center rounded-lg bg-[#0f2c4c] text-xl leading-none text-white transition-colors hover:bg-[#1a4a73] disabled:cursor-not-allowed disabled:opacity-50";

// Opened from the hamburger menu. The + adds a category; the margin is stored for later.
export function AccountUnitsDialog({ onClose }: { onClose: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const units = useSyncExternalStore(subscribeAccountUnits, getAccountUnitsSnapshot, getAccountUnitsServerSnapshot);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [stakeholderId, setStakeholderId] = useState(1);
  const [margin, setMargin] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    dialog.showModal();
    return () => dialog.close();
  }, []);

  function resetForm() {
    setAdding(false);
    setName("");
    setStakeholderId(1);
    setMargin("");
    setError("");
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    const created = addAccountUnit({
      name,
      stakeholderId,
      marginPercent: Number(margin),
    });
    if (!created) {
      setError("Enter a name and a margin under 100.");
      return;
    }
    resetForm();
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="account-units-title"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      className="m-auto w-[min(36rem,calc(100%-2rem))] rounded-xl border border-slate-200 bg-white p-0 text-slate-900 shadow-lg backdrop:bg-slate-900/40"
    >
      <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-5 py-4">
        <div>
          <h2 id="account-units-title" className="text-lg font-semibold">
            Account Units
          </h2>
          <p className="text-sm text-slate-500">
            Test categories. The margin will later set retail from wholesale.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setAdding(true)}
            disabled={adding}
            aria-label="Add account unit"
            className={addButton}
          >
            +
          </button>
          <button type="button" onClick={onClose} aria-label="Close" className="text-xl leading-none text-slate-500">
            ×
          </button>
        </div>
      </div>
      {adding ? (
        <form onSubmit={onSubmit} className="grid gap-3 border-b border-slate-200 px-5 py-4 sm:grid-cols-[1fr_1fr_6rem_auto]">
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-slate-700">AU</span>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              aria-label="Account unit name"
              className="h-10 rounded-lg border border-slate-300 px-3"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-slate-700">Stakeholder</span>
            <select
              value={stakeholderId}
              onChange={(event) => setStakeholderId(Number(event.target.value))}
              aria-label="Account unit stakeholder"
              className="h-10 rounded-lg border border-slate-300 bg-white px-3"
            >
              {STAKEHOLDERS.map((stakeholder) => (
                <option key={stakeholder.id} value={stakeholder.id}>
                  {stakeholder.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-slate-700">Margin</span>
            <input
              value={margin}
              onChange={(event) => setMargin(event.target.value)}
              inputMode="decimal"
              aria-label="Account unit margin"
              className="h-10 rounded-lg border border-slate-300 px-3"
            />
          </label>
          <div className="flex items-end gap-2">
            <button type="submit" className="h-10 rounded-lg bg-[#0f2c4c] px-3 text-sm font-medium text-white">
              Add
            </button>
            <button type="button" onClick={resetForm} className="h-10 text-sm text-slate-600">
              Cancel
            </button>
          </div>
          {error ? <p className="text-sm text-red-700 sm:col-span-4">{error}</p> : null}
        </form>
      ) : null}
      <div className="px-5 py-4">
        <table className="w-full table-fixed text-center text-sm">
          <thead className="text-slate-600">
            <tr>
              <th className="py-2 font-medium">AU</th>
              <th className="py-2 font-medium">Stakeholder</th>
              <th className="py-2 font-medium">Margin</th>
            </tr>
          </thead>
          <tbody>
            {units.map((unit) => (
              <tr key={unit.id} className="border-t border-slate-100">
                <td className="py-2">{unit.name}</td>
                <td className="py-2">{stakeholderName(unit.stakeholderId)}</td>
                <td className="py-2 tabular-nums">{unit.marginPercent}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </dialog>
  );
}
