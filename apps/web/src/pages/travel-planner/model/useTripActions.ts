import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { Trip } from "@/entities/trip";
import {
  addComment,
  addExpense,
  addTripDay,
  insertStop,
  toggleVote,
  type AddExpenseInput,
  type InsertStopInput,
} from "@/shared/api";
import { queryKeys } from "@/shared/config";

/** Trip mutations. Each returns the updated Trip; we write it straight into the
 * query cache so the UI reflects server-computed budget/settlement. */
export function useTripActions(tripId: string) {
  const qc = useQueryClient();
  const onSuccess = (trip: Trip) => qc.setQueryData(queryKeys.trip(tripId), trip);

  const vote = useMutation({
    mutationFn: (stopId: string) => toggleVote(tripId, stopId),
    onSuccess,
  });
  const comment = useMutation({
    mutationFn: (v: { stopId: string; text: string }) =>
      addComment(tripId, v.stopId, v.text),
    onSuccess,
  });
  const stop = useMutation({
    mutationFn: (input: InsertStopInput) => insertStop(tripId, input),
    onSuccess,
  });
  const expense = useMutation({
    mutationFn: (input: AddExpenseInput) => addExpense(tripId, input),
    onSuccess,
  });
  const day = useMutation({
    mutationFn: () => addTripDay(tripId),
    onSuccess,
  });

  return { vote, comment, stop, expense, day };
}
