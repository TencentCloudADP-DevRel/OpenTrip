import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { TripMember } from "@/entities/member";
import { Avatar } from "@/shared/ui/avatar";
import { Button } from "@/shared/ui/button";

export function FloatingMembers({ members }: { members: TripMember[] }) {
  const { t } = useTranslation("common");
  const [copied, setCopied] = useState(false);

  const invite = () => {
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className="pointer-events-none absolute right-4 bottom-4 flex items-center gap-2">
      <div className="pointer-events-auto flex items-center rounded-full border border-border bg-card/90 p-1 shadow-md backdrop-blur-sm">
        {members.map((m, i) => (
          <Avatar
            key={m.id}
            initials={m.initials}
            name={m.name}
            bg={m.avatarBg}
            fg={m.avatarFg}
            size={28}
            stackIndex={i}
          />
        ))}
      </div>
      <Button
        variant="brand"
        size="sm"
        className="pointer-events-auto shadow-md"
        onClick={invite}
      >
        {copied ? t("actions.inviteCopied") : t("actions.invite")}
      </Button>
    </div>
  );
}
