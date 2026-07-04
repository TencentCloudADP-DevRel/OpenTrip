import { cn } from "@/shared/lib";

export interface AvatarProps {
  initials: string;
  name: string;
  bg: string;
  fg: string;
  size?: number;
  /** Stacked index: >0 applies a negative margin + card ring for clustering. */
  stackIndex?: number;
  /** Explicit paint order within a stack (higher sits on top). */
  zIndex?: number;
  className?: string;
}

export function Avatar({
  initials,
  name,
  bg,
  fg,
  size = 26,
  stackIndex,
  zIndex,
  className,
}: AvatarProps) {
  const stacked = stackIndex != null;
  return (
    <span
      title={name}
      aria-label={name}
      className={cn(
        "inline-flex flex-none items-center justify-center rounded-full font-semibold",
        stacked && "ring-2 ring-card",
        className,
      )}
      style={{
        width: size,
        height: size,
        fontSize: Math.round(size * 0.38),
        background: bg,
        color: fg,
        marginLeft: stacked && stackIndex > 0 ? -7 : 0,
        zIndex,
      }}
    >
      {initials}
    </span>
  );
}
