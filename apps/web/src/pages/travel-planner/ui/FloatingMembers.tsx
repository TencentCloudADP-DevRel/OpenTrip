import type { TripMember } from "@/entities/member";
import { Avatar } from "@/shared/ui/avatar";
import { InviteDialog } from "./InviteDialog";

export function FloatingMembers({
  tripId,
  members,
  canInvite,
  onlineUserIds,
}: {
  tripId: string;
  members: TripMember[];
  canInvite: boolean;
  onlineUserIds: string[];
}) {
  const online = new Set(onlineUserIds);
  return (
    <div className="pointer-events-none absolute right-3 bottom-3 z-20 flex items-center gap-2.5">
      <div className="pointer-events-auto flex items-center">
        {members.map((m, i) => (
          <span
            key={m.id}
            className="relative inline-flex"
            style={{
              zIndex: members.length - i,
              marginLeft: i > 0 ? -7 : 0,
            }}
          >
            <Avatar
              name={m.name}
              bg={m.avatarBg}
              fg={m.avatarFg}
              src={m.image}
              seed={m.id}
              size={30}
            />
            {m.userId && online.has(m.userId) ? (
              <span
                className="absolute right-0 bottom-0 size-2.5 rounded-full bg-success shadow-[0_0_0_2px_var(--color-background)]"
                aria-hidden="true"
              />
            ) : null}
          </span>
        ))}
      </div>
      {canInvite ? <InviteDialog tripId={tripId} /> : null}
    </div>
  );
}
