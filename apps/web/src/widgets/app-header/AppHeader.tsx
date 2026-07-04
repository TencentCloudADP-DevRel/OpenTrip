import { useTranslation } from "react-i18next";
import { signOut, useSession } from "@/shared/auth";
import { LanguageSwitch } from "@/shared/i18n/LanguageSwitch";
import { Button } from "@/shared/ui/button";
import { cn } from "@/shared/lib";

export interface AppHeaderProps {
  onBack?: () => void;
  center?: React.ReactNode;
  className?: string;
}

export function AppHeader({ onBack, center, className }: AppHeaderProps) {
  const { t } = useTranslation("common");
  const { data: session } = useSession();

  return (
    <header
      className={cn(
        "flex h-14 items-center justify-between gap-4 border-b border-border bg-card/80 px-4 backdrop-blur-sm md:px-6",
        className,
      )}
    >
      <div className="flex min-w-0 items-center gap-3">
        {onBack ? (
          <Button variant="ghost" size="sm" onClick={onBack}>
            <svg
              viewBox="0 0 24 24"
              className="size-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="m15 18-6-6 6-6" />
            </svg>
            <span className="hidden sm:inline">{t("actions.back")}</span>
          </Button>
        ) : (
          <span className="font-heading text-lg font-semibold">
            {t("appName")}
          </span>
        )}
      </div>

      {center ? <div className="min-w-0 flex-1 truncate text-center">{center}</div> : null}

      <div className="flex items-center gap-2">
        <LanguageSwitch />
        {session ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => void signOut()}
            aria-label={t("actions.signOut")}
          >
            {t("actions.signOut")}
          </Button>
        ) : null}
      </div>
    </header>
  );
}
