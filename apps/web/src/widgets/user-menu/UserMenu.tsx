import { useEffect, useId, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { signOut, useSession } from "@/shared/auth";
import { LanguageSwitch } from "@/shared/i18n/LanguageSwitch";
import { Avatar } from "@/shared/ui/avatar";
import { cn } from "@/shared/lib";

/** Deterministic avatar palette so a given user keeps a stable color. */
const PALETTE: Array<{ bg: string; fg: string }> = [
  { bg: "#dde7fb", fg: "#2b4d93" },
  { bg: "#d9efe6", fg: "#1f6b4d" },
  { bg: "#f3e8d3", fg: "#7a5a1e" },
  { bg: "#f0dceb", fg: "#82397a" },
  { bg: "#dde2ee", fg: "#3c4760" },
];

function hashIndex(seed: string, mod: number): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return Math.abs(h) % mod;
}

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}

/** Sidebar footer: avatar trigger that opens an upward menu holding account
 * info, the language switch, and sign out. Mirrors Kalmia's UserMenu pattern. */
export function UserMenu() {
  const { t } = useTranslation("common");
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerId = useId();

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const user = session?.user;
  const name = user?.name?.trim() || user?.email || "";
  const email = user?.email ?? "";
  const seed = user?.id ?? name;
  const color = PALETTE[hashIndex(seed || "?", PALETTE.length)]!;

  return (
    <div ref={containerRef} className="relative flex-none p-2">
      {open && (
        <div
          role="menu"
          className="wf-enter absolute inset-x-2 bottom-full mb-2 flex flex-col rounded-xl border border-border bg-popover p-1 shadow-lg"
        >
          <div className="flex items-center gap-2.5 px-2 py-2">
            <Avatar initials={initialsOf(name)} name={name} bg={color.bg} fg={color.fg} size={32} />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{name}</p>
              {email && email !== name ? (
                <p className="truncate text-xs text-muted-foreground">{email}</p>
              ) : null}
            </div>
          </div>

          <div className="my-1 h-px bg-border" />

          <div className="flex items-center justify-between gap-2 px-2 py-1.5">
            <span className="text-xs font-medium text-muted-foreground">
              {t("language")}
            </span>
            <LanguageSwitch />
          </div>

          <div className="my-1 h-px bg-border" />

          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              void signOut();
            }}
            className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left text-sm font-medium text-foreground transition-colors duration-100 hover:bg-accent"
          >
            <svg
              viewBox="0 0 24 24"
              className="size-4 text-muted-foreground"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <path d="m16 17 5-5-5-5" />
              <path d="M21 12H9" />
            </svg>
            {t("actions.signOut")}
          </button>
        </div>
      )}

      <button
        id={triggerId}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex w-full items-center gap-2.5 rounded-xl px-2 py-2 text-left",
          "transition-[background-color,transform] duration-150 ease-[var(--ease-out)] active:scale-[0.98]",
          open ? "bg-accent" : "hover:bg-accent",
        )}
      >
        <Avatar initials={initialsOf(name)} name={name} bg={color.bg} fg={color.fg} size={32} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{name}</p>
          {email && email !== name ? (
            <p className="truncate text-xs text-muted-foreground">{email}</p>
          ) : null}
        </div>
        <svg
          viewBox="0 0 24 24"
          className="size-4 flex-none text-muted-foreground"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="m7 15 5 5 5-5" />
          <path d="m7 9 5-5 5 5" />
        </svg>
      </button>
    </div>
  );
}
