import { useId } from "react";
import { cn } from "@/shared/lib";

export interface CheckboxProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label?: string;
  className?: string;
  id?: string;
}

/** Accessible checkbox: a real input for semantics + a styled box. */
export function Checkbox({
  checked,
  onCheckedChange,
  label,
  className,
  id,
}: CheckboxProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;

  return (
    <label
      htmlFor={inputId}
      className={cn(
        "inline-flex cursor-pointer items-center gap-2 text-sm select-none",
        className,
      )}
    >
      <span className="relative inline-flex size-[18px] items-center justify-center">
        <input
          id={inputId}
          type="checkbox"
          checked={checked}
          onChange={(e) => onCheckedChange(e.target.checked)}
          className="peer absolute inset-0 cursor-pointer appearance-none rounded-sm border border-input bg-card outline-none checked:border-brand checked:bg-brand transition-colors duration-150"
        />
        <svg
          viewBox="0 0 24 24"
          className="pointer-events-none relative size-3 text-brand-foreground opacity-0 peer-checked:opacity-100"
          fill="none"
          stroke="currentColor"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M20 6 9 17l-5-5" />
        </svg>
      </span>
      {label ? <span>{label}</span> : null}
    </label>
  );
}
