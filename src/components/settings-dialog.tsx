"use client";

import { useEffect, useRef, useState, useSyncExternalStore, type FormEvent } from "react";

const THEME_KEY = "smart-theme";

type Theme = "light" | "dark";

const themeListeners = new Set<() => void>();

function subscribeTheme(listener: () => void) {
  themeListeners.add(listener);
  return () => themeListeners.delete(listener);
}

function readTheme(): Theme {
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

function applyTheme(next: Theme) {
  document.documentElement.classList.toggle("dark", next === "dark");
  localStorage.setItem(THEME_KEY, next);
  for (const listener of themeListeners) listener();
}

// Opened from the hamburger menu. Appearance is saved on this browser.
// Password changes wait for sign-in.
export function SettingsDialog({ onClose }: { onClose: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const theme = useSyncExternalStore(subscribeTheme, readTheme, () => "light" as Theme);
  const [currentPassword, setCurrentPassword] = useState("");
  const [nextPassword, setNextPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordNote, setPasswordNote] = useState<string | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    dialog.showModal();
    return () => dialog.close();
  }, []);

  function chooseTheme(next: Theme) {
    applyTheme(next);
  }

  function updatePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPasswordNote(null);

    if (!currentPassword) {
      setPasswordError("Enter the current password.");
      return;
    }
    if (nextPassword.length < 8) {
      setPasswordError("Use at least 8 characters.");
      return;
    }
    if (nextPassword !== confirmPassword) {
      setPasswordError("New passwords do not match.");
      return;
    }

    setPasswordError(null);
    setCurrentPassword("");
    setNextPassword("");
    setConfirmPassword("");
    setPasswordNote("Sign-in is not connected yet, so this password is not saved to an account.");
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="settings-title"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      className="m-auto w-[min(32rem,calc(100%-2rem))] rounded-xl border border-slate-200 bg-white p-0 text-slate-900 shadow-lg backdrop:bg-slate-900/40"
    >
      <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-5 py-4">
        <div>
          <h2 id="settings-title" className="text-lg font-semibold">
            Settings
          </h2>
          <p className="text-sm text-slate-500">Password and appearance for this browser.</p>
        </div>
        <button type="button" onClick={onClose} aria-label="Close" className="text-xl leading-none text-slate-500">
          ×
        </button>
      </div>

      <div className="flex flex-col gap-5 px-5 py-4">
        <section>
          <h3 className="text-sm font-medium">Appearance</h3>
          <p className="mt-1 text-sm text-slate-500">Choose light or dark for this browser.</p>
          <div className="mt-3 flex gap-2" role="group" aria-label="Color theme">
            <ThemeButton active={theme === "light"} onClick={() => chooseTheme("light")}>
              Light
            </ThemeButton>
            <ThemeButton active={theme === "dark"} onClick={() => chooseTheme("dark")}>
              Dark
            </ThemeButton>
          </div>
        </section>

        <section className="border-t border-slate-200 pt-5">
          <h3 className="text-sm font-medium">Password</h3>
          <p className="mt-1 text-sm text-slate-500">Update the password you use to sign in.</p>
          <form className="mt-3 flex flex-col gap-3" onSubmit={updatePassword}>
            <Field
              label="Current password"
              value={currentPassword}
              onChange={setCurrentPassword}
              autoComplete="current-password"
            />
            <Field label="New password" value={nextPassword} onChange={setNextPassword} autoComplete="new-password" />
            <Field
              label="Confirm new password"
              value={confirmPassword}
              onChange={setConfirmPassword}
              autoComplete="new-password"
            />
            {passwordError ? <p className="text-sm text-red-700">{passwordError}</p> : null}
            {passwordNote ? <p className="text-sm text-slate-600">{passwordNote}</p> : null}
            <button
              type="submit"
              className="mt-1 h-10 w-fit rounded-lg bg-[#0f2c4c] px-4 text-sm font-medium text-white transition-colors hover:bg-[#1a4a73]"
            >
              Update password
            </button>
          </form>
        </section>
      </div>
    </dialog>
  );
}

function ThemeButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`h-10 rounded-lg border px-4 text-sm font-medium transition-colors ${
        active
          ? "border-[#0f2c4c] bg-[#0f2c4c] text-white"
          : "border-slate-300 bg-white text-slate-800 hover:bg-slate-100"
      }`}
    >
      {children}
    </button>
  );
}

function Field({
  label,
  value,
  onChange,
  autoComplete,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: string;
}) {
  const id = label.toLowerCase().replaceAll(" ", "-");
  return (
    <label className="flex flex-col gap-1 text-sm" htmlFor={id}>
      <span className="font-medium text-slate-700">{label}</span>
      <input
        id={id}
        type="password"
        autoComplete={autoComplete}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-slate-900"
      />
    </label>
  );
}
