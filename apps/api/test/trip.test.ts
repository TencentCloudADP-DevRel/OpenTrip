import { describe, expect, it } from "vitest";
import { Trip } from "../src/domain/trip";
import { computeBudget } from "../src/domain/trip";
import { seedTrips } from "../src/infrastructure/persistence/seed-data";

function freshTrip(): Trip {
  // Deep clone so aggregate mutations don't leak across tests.
  const snapshot = structuredClone(seedTrips()[0]!.snapshot);
  return Trip.fromSnapshot(snapshot);
}

describe("Trip aggregate", () => {
  it("toggles a vote in and out for a member", () => {
    const trip = freshTrip();
    trip.toggleVote("s2", "lynn");
    expect(trip.toSnapshot().stops.find((s) => s.id === "s2")!.votes).toContain("lynn");
    trip.toggleVote("s2", "lynn");
    expect(trip.toSnapshot().stops.find((s) => s.id === "s2")!.votes).not.toContain("lynn");
  });

  it("rejects an empty comment", () => {
    const trip = freshTrip();
    expect(() => trip.addComment("s1", "lynn", "   ")).toThrow();
  });

  it("appends a trimmed comment authored by the member", () => {
    const trip = freshTrip();
    trip.addComment("s1", "lynn", "  Sounds great  ");
    const comments = trip.toSnapshot().stops.find((s) => s.id === "s1")!.comments;
    expect(comments.at(-1)).toMatchObject({ author: "lynn", text: "Sounds great" });
  });

  it("inserts a stop within a day and keeps ordering contiguous", () => {
    const trip = freshTrip();
    const before = trip.toSnapshot().stops.filter((s) => s.day === 1).length;
    trip.insertStop({ day: 1, index: 1, name: "Coffee break", time: "10:45" }, "lynn");
    const day1 = trip.toSnapshot().stops.filter((s) => s.day === 1);
    expect(day1.length).toBe(before + 1);
    expect(day1[1]!.name).toBe("Coffee break");
    const orders = trip.toSnapshot().stops.map((s) => s.order);
    expect(orders).toEqual([...orders].sort((a, b) => a - b));
  });

  it("rejects an expense with no participants", () => {
    const trip = freshTrip();
    expect(() =>
      trip.addExpense({ description: "x", amount: 100, payer: "lynn", participants: [] }),
    ).toThrow();
  });
});

describe("computeBudget", () => {
  const members = [
    { id: "a", name: "A", shortName: "A", initials: "A", avatarBg: "", avatarFg: "", isCurrentUser: true },
    { id: "b", name: "B", shortName: "B", initials: "B", avatarBg: "", avatarFg: "", isCurrentUser: false },
  ];

  it("nets paid minus fair share", () => {
    const budget = computeBudget(members, [
      { id: "e1", description: "dinner", payer: "a", amount: 100, participants: ["a", "b"], whenLabel: "", createdOrder: 0 },
    ]);
    expect(budget.total).toBe(100);
    expect(budget.balances.find((x) => x.memberId === "a")!.net).toBe(50);
    expect(budget.balances.find((x) => x.memberId === "b")!.net).toBe(-50);
  });

  it("produces a minimal settlement transferring debtor -> creditor", () => {
    const budget = computeBudget(members, [
      { id: "e1", description: "dinner", payer: "a", amount: 100, participants: ["a", "b"], whenLabel: "", createdOrder: 0 },
    ]);
    expect(budget.settlements).toEqual([{ from: "b", to: "a", amount: 50 }]);
  });

  it("matches the seed trip totals", () => {
    const trip = seedTrips()[0]!.snapshot;
    const budget = computeBudget(trip.members, trip.expenses);
    // Sum of all seed expenses.
    expect(budget.total).toBe(351900);
    // Balances net to zero.
    const sum = budget.balances.reduce((n, b) => n + b.net, 0);
    expect(Math.abs(sum)).toBeLessThanOrEqual(1);
  });
});
