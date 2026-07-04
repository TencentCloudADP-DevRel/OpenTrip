import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { Trip } from "@/entities/trip";
import type { Stop } from "@/entities/stop";
import type { TripMember } from "@/entities/member";
import { formatMoney } from "@/shared/lib";
import { Avatar } from "@/shared/ui/avatar";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";

function memberOf(trip: Trip, id: string): TripMember {
  return trip.members.find((m) => m.id === id) ?? trip.members[0]!;
}

export function StopDetail({
  trip,
  stop,
  currentUserId,
  onClose,
  onToggleVote,
  onComment,
}: {
  trip: Trip;
  stop: Stop;
  currentUserId: string;
  onClose: () => void;
  onToggleVote: (stopId: string) => void;
  onComment: (stopId: string, text: string) => void;
}) {
  const { t } = useTranslation("planner");
  const { t: tc } = useTranslation("common");
  const [draft, setDraft] = useState("");
  const voted = stop.votes.includes(currentUserId);
  const addedBy = memberOf(trip, stop.createdBy);

  const submit = () => {
    const text = draft.trim();
    if (!text) return;
    onComment(stop.id, text);
    setDraft("");
  };

  return (
    <div className="wf-enter flex h-full flex-col">
      <div className="flex items-start justify-between gap-2 border-b border-border p-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-base font-semibold tracking-[-0.01em]">
            {stop.name}
          </h2>
          <p className="font-mono text-xs text-muted-foreground tabular-nums">
            {t("detail.dayTime", {
              day: stop.day,
              time: stop.time,
              dur: stop.duration,
            })}
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          aria-label={tc("actions.close")}
          onClick={onClose}
        >
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
            <path d="M18 6 6 18 M6 6l12 12" />
          </svg>
        </Button>
      </div>

      <div className="flex flex-col gap-4 overflow-auto p-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge>{stop.category}</Badge>
          <span className="text-sm text-muted-foreground">{stop.area}</span>
          <span className="ml-auto font-mono text-sm font-semibold tabular-nums">
            {stop.cost
              ? t("detail.perPerson", {
                  amount: formatMoney(stop.cost, trip.currency),
                })
              : t("detail.free")}
          </span>
        </div>
        <p className="text-xs text-muted-foreground">
          {t("detail.addedBy", { name: addedBy.shortName })}
        </p>

        <div className="flex items-center justify-between rounded-xl border border-border bg-secondary/50 p-3">
          <div className="flex items-center">
            {stop.votes.length ? (
              stop.votes.map((id, k) => {
                const m = memberOf(trip, id);
                return (
                  <Avatar
                    key={id}
                    initials={m.initials}
                    name={m.name}
                    bg={m.avatarBg}
                    fg={m.avatarFg}
                    size={24}
                    stackIndex={k}
                  />
                );
              })
            ) : (
              <span className="text-xs text-muted-foreground">
                {t("detail.noVotes")}
              </span>
            )}
            {stop.votes.length ? (
              <span className="ml-3 text-xs text-muted-foreground">
                {t("detail.wantThis", {
                  count: stop.votes.length,
                  total: trip.members.length,
                })}
              </span>
            ) : null}
          </div>
          <Button
            variant={voted ? "secondary" : "brand"}
            size="sm"
            onClick={() => onToggleVote(stop.id)}
          >
            {voted ? t("detail.voted") : t("detail.vote")}
          </Button>
        </div>

        <div className="flex flex-col gap-3">
          <h3 className="text-sm font-semibold">
            {stop.comments.length
              ? t("detail.commentsWithCount", { count: stop.comments.length })
              : t("detail.commentsEmpty")}
          </h3>
          {stop.comments.map((c, i) => {
            const m = memberOf(trip, c.author);
            return (
              <div key={i} className="flex gap-2.5">
                <Avatar
                  initials={m.initials}
                  name={m.name}
                  bg={m.avatarBg}
                  fg={m.avatarFg}
                  size={26}
                />
                <div className="flex flex-col gap-0.5">
                  <div className="flex items-baseline gap-2">
                    <span className="text-sm font-medium">{m.shortName}</span>
                    <span className="text-xs text-muted-foreground">
                      {c.timeLabel}
                    </span>
                  </div>
                  <p className="text-sm text-foreground/90">{c.text}</p>
                </div>
              </div>
            );
          })}

          <div className="flex gap-2">
            <Input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") submit();
              }}
              placeholder={t("detail.commentPlaceholder")}
            />
            <Button variant="brand" size="md" onClick={submit}>
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
                <path d="m22 2-7 20-4-9-9-4Z M22 2 11 13" />
              </svg>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
