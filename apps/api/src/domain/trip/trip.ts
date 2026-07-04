import { DomainError } from "../shared/errors";
import { computeBudget } from "./settlement";
import type {
  Budget,
  ExpenseSnapshot,
  StopSnapshot,
  TripSnapshot,
} from "./types";

export interface InsertStopDraft {
  day: number;
  /** Zero-based position within the day's stops. */
  index: number;
  name: string;
  time: string;
}

export interface AddExpenseDraft {
  description: string;
  amount: number;
  payer: string;
  participants: string[];
}

const DAY_CENTERS: Record<number, [number, number]> = {
  1: [35.68, 139.75],
  2: [35.68, 139.72],
  3: [35.0, 135.77],
  4: [35.01, 135.75],
  5: [34.69, 135.5],
};

/** Trip aggregate root. All itinerary/expense mutations go through here so
 * invariants hold. Reconstitute with `fromSnapshot`, persist `toSnapshot`. */
export class Trip {
  private constructor(private snapshot: TripSnapshot) {}

  static fromSnapshot(snapshot: TripSnapshot): Trip {
    return new Trip({
      ...snapshot,
      stops: [...snapshot.stops].sort((a, b) => a.order - b.order),
      expenses: [...snapshot.expenses].sort(
        (a, b) => a.createdOrder - b.createdOrder,
      ),
    });
  }

  get id(): string {
    return this.snapshot.id;
  }

  toSnapshot(): TripSnapshot {
    return this.snapshot;
  }

  budget(): Budget {
    return computeBudget(this.snapshot.members, this.snapshot.expenses);
  }

  private requireStop(stopId: string): StopSnapshot {
    const stop = this.snapshot.stops.find((s) => s.id === stopId);
    if (!stop) throw new DomainError("stop_not_found", `Stop ${stopId} not found`);
    return stop;
  }

  private requireMember(memberId: string): void {
    if (!this.snapshot.members.some((m) => m.id === memberId)) {
      throw new DomainError("member_not_found", `Member ${memberId} not found`);
    }
  }

  /** Add the member to the stop's votes if absent, else remove. Idempotent. */
  toggleVote(stopId: string, memberId: string): void {
    this.requireMember(memberId);
    const stop = this.requireStop(stopId);
    stop.votes = stop.votes.includes(memberId)
      ? stop.votes.filter((v) => v !== memberId)
      : [...stop.votes, memberId];
  }

  /** Append a non-empty comment authored by the member. */
  addComment(stopId: string, memberId: string, text: string): void {
    this.requireMember(memberId);
    const trimmed = text.trim();
    if (!trimmed) throw new DomainError("empty_comment", "Comment text is required");
    const stop = this.requireStop(stopId);
    stop.comments = [
      ...stop.comments,
      { author: memberId, timeLabel: "Just now", text: trimmed },
    ];
  }

  /** Insert a stop at a position within a day, interpolating coordinates. */
  insertStop(draft: InsertStopDraft, createdBy: string): StopSnapshot {
    this.requireMember(createdBy);
    const name = draft.name.trim();
    if (!name) throw new DomainError("empty_stop_name", "Stop name is required");

    const dayStops = this.snapshot.stops.filter((s) => s.day === draft.day);
    const index = Math.max(0, Math.min(draft.index, dayStops.length));
    const prev = dayStops[index - 1];
    const next = dayStops[index];
    const center = DAY_CENTERS[draft.day] ?? [35.68, 139.75];

    const lat = prev && next
      ? (prev.lat + next.lat) / 2
      : prev
        ? prev.lat + 0.004
        : next
          ? next.lat - 0.004
          : center[0];
    const lng = prev && next
      ? (prev.lng + next.lng) / 2
      : prev
        ? prev.lng + 0.004
        : next
          ? next.lng - 0.004
          : center[1];

    const stop: StopSnapshot = {
      id: `n${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      day: draft.day,
      time: draft.time.trim() || "—",
      duration: "1h",
      name,
      area: "TBD",
      category: "Plan",
      lat,
      lng,
      cost: 0,
      createdBy,
      transit: false,
      order: 0,
      votes: [],
      comments: [],
    };

    // Splice into the global ordering respecting the day position.
    const all = this.snapshot.stops;
    let pos: number;
    if (next) pos = all.indexOf(next);
    else if (prev) pos = all.indexOf(prev) + 1;
    else pos = all.length;
    all.splice(pos, 0, stop);
    all.forEach((s, i) => (s.order = i));

    return stop;
  }

  /** Add an equally-split expense. */
  addExpense(draft: AddExpenseDraft): ExpenseSnapshot {
    const description = draft.description.trim();
    if (!description) throw new DomainError("empty_expense", "Description is required");
    if (!(draft.amount > 0)) throw new DomainError("invalid_amount", "Amount must be positive");
    if (draft.participants.length === 0) {
      throw new DomainError("no_participants", "At least one participant is required");
    }
    this.requireMember(draft.payer);
    for (const p of draft.participants) this.requireMember(p);

    const expense: ExpenseSnapshot = {
      id: `e${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      description,
      payer: draft.payer,
      amount: Math.round(draft.amount),
      participants: [...draft.participants],
      whenLabel: "Just added",
      createdOrder: this.snapshot.expenses.length,
    };
    this.snapshot.expenses.push(expense);
    return expense;
  }

  /** The member flagged as the current user (demo mapping). */
  currentMemberId(): string {
    const me = this.snapshot.members.find((m) => m.isCurrentUser);
    return me?.id ?? this.snapshot.members[0]?.id ?? "";
  }
}
