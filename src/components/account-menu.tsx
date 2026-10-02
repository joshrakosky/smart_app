"use client";

import { useEffect, useRef, useState } from "react";
import { AccountUnitsDialog } from "@/components/account-units-dialog";
import { ImportDialog } from "@/components/import-dialog";
import { ReportsDialog } from "@/components/reports-dialog";
import { SettingsDialog } from "@/components/settings-dialog";

// Settings moved here from the left rail. Log out is a placeholder until sign-in exists.
export function AccountMenu() {
  const [open, setOpen] = useState(false);
  const [reportsOpen, setReportsOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [unitsOpen, setUnitsOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function closeOnOutside(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", closeOnOutside);
    return () => document.removeEventListener("mousedown", closeOnOutside);
  }, []);

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        aria-label="Menu"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className="hover-lift flex h-10 w-10 items-center justify-center rounded-lg text-white hover:bg-white/10"
      >
        <span className="flex flex-col gap-1.5" aria-hidden="true">
          <span className="block h-0.5 w-5 bg-white" />
          <span className="block h-0.5 w-5 bg-white" />
          <span className="block h-0.5 w-5 bg-white" />
        </span>
      </button>
      {open ? (
        <div className="absolute right-0 z-30 mt-2 w-44 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 text-sm text-slate-900 shadow-lg">
          <button
            type="button"
            className="block w-full px-3 py-2 text-left hover:bg-slate-50"
            onClick={() => {
              setOpen(false);
              setReportsOpen(true);
            }}
          >
            Reports
          </button>
          <button
            type="button"
            className="block w-full px-3 py-2 text-left hover:bg-slate-50"
            onClick={() => {
              setOpen(false);
              setImportOpen(true);
            }}
          >
            Import
          </button>
          <button
            type="button"
            className="block w-full px-3 py-2 text-left hover:bg-slate-50"
            onClick={() => {
              setOpen(false);
              setUnitsOpen(true);
            }}
          >
            Account Units
          </button>
          <button
            type="button"
            className="block w-full px-3 py-2 text-left hover:bg-slate-50"
            onClick={() => {
              setOpen(false);
              setSettingsOpen(true);
            }}
          >
            Settings
          </button>
          <button
            type="button"
            className="block w-full px-3 py-2 text-left hover:bg-slate-50"
            onClick={() => setOpen(false)}
          >
            Log out
          </button>
        </div>
      ) : null}
      {reportsOpen ? <ReportsDialog onClose={() => setReportsOpen(false)} /> : null}
      {importOpen ? <ImportDialog onClose={() => setImportOpen(false)} /> : null}
      {unitsOpen ? <AccountUnitsDialog onClose={() => setUnitsOpen(false)} /> : null}
      {settingsOpen ? <SettingsDialog onClose={() => setSettingsOpen(false)} /> : null}
    </div>
  );
}
