import type { Trip, TripSummary } from "@/entities/trip";
import { apiFetch } from "./client";

export function fetchTrips(): Promise<TripSummary[]> {
  return apiFetch<TripSummary[]>("/api/trips");
}

export function fetchTrip(id: string): Promise<Trip> {
  return apiFetch<Trip>(`/api/trips/${id}`);
}

export interface InsertStopInput {
  day: number;
  index: number;
  name: string;
  time: string;
}

export function insertStop(tripId: string, input: InsertStopInput): Promise<Trip> {
  return apiFetch<Trip>(`/api/trips/${tripId}/stops`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function toggleVote(tripId: string, stopId: string): Promise<Trip> {
  return apiFetch<Trip>(`/api/trips/${tripId}/stops/${stopId}/vote`, {
    method: "POST",
  });
}

export function addComment(
  tripId: string,
  stopId: string,
  text: string,
): Promise<Trip> {
  return apiFetch<Trip>(`/api/trips/${tripId}/stops/${stopId}/comments`, {
    method: "POST",
    body: JSON.stringify({ text }),
  });
}

export interface AddExpenseInput {
  description: string;
  amount: number;
  payer: string;
  participants: string[];
}

export function addExpense(tripId: string, input: AddExpenseInput): Promise<Trip> {
  return apiFetch<Trip>(`/api/trips/${tripId}/expenses`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}
