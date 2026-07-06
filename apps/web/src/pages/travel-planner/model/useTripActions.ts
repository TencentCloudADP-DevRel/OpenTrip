import { useMutation, useQueryClient } from "@tanstack/react-query";
import { reorderTripDays as reorderDaysLocal, type Trip } from "@/entities/trip";
import {
  addComment,
  addExpense,
  addTripDay,
  insertStop,
  reorderTripDays,
  toggleVote,
  updateTripDay,
  type AddExpenseInput,
  type InsertStopInput,
  type UpdateTripDayInput,
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
  const dayUpdate = useMutation({
    mutationFn: (input: { dayNumber: number; patch: UpdateTripDayInput }) =>
      updateTripDay(tripId, input.dayNumber, input.patch),
    onSuccess,
  });
  // Reorder days optimistically so the board reflects the drop instantly, then
  // reconcile with the server-computed trip. On error, restore the snapshot.
  const dayReorder = useMutation({
    mutationFn: (order: number[]) => reorderTripDays(tripId, order),
    onMutate: async (order: number[]) => {
      await qc.cancelQueries({ queryKey: queryKeys.trip(tripId) });
      const previous = qc.getQueryData<Trip>(queryKeys.trip(tripId));
      if (previous) {
        qc.setQueryData(queryKeys.trip(tripId), reorderDaysLocal(previous, order));
      }
      return { previous };
    },
    onError: (_err, _order, context) => {
      if (context?.previous) {
        qc.setQueryData(queryKeys.trip(tripId), context.previous);
      }
    },
    onSuccess,
  });

  return { vote, comment, stop, expense, day, dayUpdate, dayReorder };
}
