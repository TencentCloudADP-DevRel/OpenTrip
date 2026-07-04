import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { Trip } from "@/entities/trip";
import type { TripMember } from "@/entities/member";
import type { AddExpenseInput } from "@/shared/api";
import { formatMoney } from "@/shared/lib";
import { cn } from "@/shared/lib";
import { Avatar } from "@/shared/ui/avatar";
import { Button } from "@/shared/ui/button";
import { Card, CardContent } from "@/shared/ui/card";
import { Checkbox } from "@/shared/ui/checkbox";
import { Input } from "@/shared/ui/input";

function memberOf(trip: Trip, id: string): TripMember {
  return trip.members.find((m) => m.id === id) ?? trip.members[0]!;
}

export function BudgetBoard({
  trip,
  currentUserId,
  onAddExpense,
}: {
  trip: Trip;
  currentUserId: string;
  onAddExpense: (input: AddExpenseInput) => void;
}) {
  const { t } = useTranslation("planner");
  const { t: tc } = useTranslation("common");
  const { budget, currency } = trip;

  const [open, setOpen] = useState(false);
  const [desc, setDesc] = useState("");
  const [amount, setAmount] = useState("");
  const [payer, setPayer] = useState(currentUserId);
  const [parts, setParts] = useState<Record<string, boolean>>(
    Object.fromEntries(trip.members.map((m) => [m.id, true])),
  );

  const submit = () => {
    const value = Number.parseFloat(amount);
    const participants = trip.members.map((m) => m.id).filter((id) => parts[id]);
    if (!desc.trim() || !(value > 0) || participants.length === 0) return;
    onAddExpense({
      description: desc.trim(),
      amount: Math.round(value),
      payer,
      participants,
    });
    setDesc("");
    setAmount("");
    setOpen(false);
  };

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-5 p-4 md:p-6">
      <div className="grid grid-cols-3 gap-3">
        <Stat label={t("budget.total")} value={formatMoney(budget.total, currency)} />
        <Stat label={t("budget.perPerson")} value={formatMoney(budget.perPerson, currency)} />
        <Stat label={t("budget.expenses")} value={String(trip.expenses.length)} />
      </div>

      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">{t("budget.expenseList")}</h3>
        <Button
          variant={open ? "secondary" : "primary"}
          size="sm"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? tc("actions.close") : t("budget.addExpense")}
        </Button>
      </div>

      {open ? (
        <Card>
          <CardContent className="flex flex-col gap-3 p-4">
            <Input
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder={t("budget.descPlaceholder")}
            />
            <Input
              type="number"
              inputMode="numeric"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder={t("budget.amountPlaceholder")}
            />
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-muted-foreground">
                {t("budget.payer")}
              </span>
              <div className="flex flex-wrap gap-1.5">
                {trip.members.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    aria-pressed={payer === m.id}
                    onClick={() => setPayer(m.id)}
                    className={cn(
                      "h-7 rounded-full border px-3 text-xs font-medium transition-colors active:scale-[0.96]",
                      payer === m.id
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-card text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {m.shortName}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-muted-foreground">
                {t("budget.splitBetween")}
              </span>
              <div className="flex flex-wrap gap-3">
                {trip.members.map((m) => (
                  <Checkbox
                    key={m.id}
                    checked={!!parts[m.id]}
                    onCheckedChange={(v) =>
                      setParts((prev) => ({ ...prev, [m.id]: v }))
                    }
                    label={m.shortName}
                  />
                ))}
              </div>
            </div>
            <Button variant="brand" onClick={submit}>
              {t("budget.save")}
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <div className="flex flex-col divide-y divide-border rounded-2xl border border-border bg-card">
        {[...trip.expenses].reverse().map((e) => {
          const m = memberOf(trip, e.payer);
          return (
            <div key={e.id} className="flex items-center gap-3 p-3.5">
              <Avatar
                initials={m.initials}
                name={m.name}
                bg={m.avatarBg}
                fg={m.avatarFg}
                size={30}
              />
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-sm font-medium">{e.description}</span>
                <span className="truncate text-xs text-muted-foreground">
                  {t("budget.paidBy", {
                    name: m.isCurrentUser ? t("budget.paidByYou") : m.shortName,
                    when: e.whenLabel,
                    count: e.participants.length,
                  })}
                </span>
              </div>
              <div className="flex flex-none flex-col items-end">
                <span className="font-mono text-sm font-semibold tabular-nums">
                  {formatMoney(e.amount, currency)}
                </span>
                <span className="font-mono text-xs text-muted-foreground tabular-nums">
                  {t("budget.each", {
                    amount: formatMoney(e.amount / e.participants.length, currency),
                  })}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex flex-col gap-2">
        <h3 className="text-sm font-semibold">{t("budget.balances")}</h3>
        <div className="flex flex-col divide-y divide-border rounded-2xl border border-border bg-card">
          {budget.balances.map((b) => {
            const m = memberOf(trip, b.memberId);
            const positive = b.net >= 0;
            return (
              <div key={b.memberId} className="flex items-center gap-3 p-3.5">
                <Avatar
                  initials={m.initials}
                  name={m.name}
                  bg={m.avatarBg}
                  fg={m.avatarFg}
                  size={30}
                />
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-sm font-medium">
                    {m.isCurrentUser ? t("budget.you", { name: m.name }) : m.name}
                  </span>
                  <span className="truncate text-xs text-muted-foreground">
                    {t("budget.balanceSub", {
                      paid: formatMoney(b.paid, currency),
                      share: formatMoney(b.share, currency),
                    })}
                  </span>
                </div>
                <span
                  className={cn(
                    "flex-none whitespace-nowrap font-mono text-sm font-semibold tabular-nums",
                    positive ? "text-success-foreground" : "text-destructive-foreground",
                  )}
                >
                  {positive ? "+" : "−"}
                  {formatMoney(Math.abs(b.net), currency)}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <h3 className="text-sm font-semibold">{t("budget.settleUp")}</h3>
        <p className="text-xs text-muted-foreground">
          {t("budget.transfersClear", { count: budget.settlements.length })}
        </p>
        <div className="flex flex-col gap-2">
          {budget.settlements.map((s, i) => {
            const from = memberOf(trip, s.from);
            const to = memberOf(trip, s.to);
            return (
              <div
                key={i}
                className="flex items-center gap-2 rounded-xl border border-border bg-card p-3"
              >
                <Avatar initials={from.initials} name={from.name} bg={from.avatarBg} fg={from.avatarFg} size={30} />
                <span className="text-sm font-medium">{from.shortName}</span>
                <span className="text-xs text-muted-foreground">{t("budget.owes")}</span>
                <svg viewBox="0 0 24 24" className="size-4 text-muted-foreground" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M5 12h14 M12 5l7 7-7 7" />
                </svg>
                <Avatar initials={to.initials} name={to.name} bg={to.avatarBg} fg={to.avatarFg} size={30} />
                <span className="text-sm font-medium">{to.shortName}</span>
                <span className="ml-auto font-mono text-sm font-semibold tabular-nums">
                  {formatMoney(s.amount, currency)}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card className="flex flex-col gap-1 p-4">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="font-mono text-xl font-semibold tabular-nums">{value}</span>
    </Card>
  );
}
