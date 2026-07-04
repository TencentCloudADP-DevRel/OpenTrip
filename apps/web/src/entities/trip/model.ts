import type { TripMember } from "@/entities/member";
import type { Stop } from "@/entities/stop";
import type { Budget, Expense } from "@/entities/expense";

export type TripStatus = "active" | "planning" | "settled";

export interface TripDay {
  number: number;
  dateLabel: string;
  city: string;
  color: string;
}

export interface TripSummary {
  id: string;
  title: string;
  startLabel: string;
  endLabel: string;
  status: TripStatus;
  currency: string;
  coverColor: string;
  memberCount: number;
  stopCount: number;
}

export interface Trip {
  id: string;
  title: string;
  status: TripStatus;
  currency: string;
  members: TripMember[];
  days: TripDay[];
  stops: Stop[];
  expenses: Expense[];
  budget: Budget;
}
