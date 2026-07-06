export { apiFetch, ApiError } from "./client";
export {
  searchPlaces,
  reversePlace,
  type PlaceResult,
  type SearchPlacesOptions,
} from "./geocode";
export {
  fetchTrips,
  fetchTrip,
  createTrip,
  renameTrip,
  addTripDay,
  updateTripDay,
  reorderTripDays,
  insertStop,
  toggleVote,
  addComment,
  addExpense,
  type CreateTripInput,
  type UpdateTripDayInput,
  type InsertStopInput,
  type AddExpenseInput,
} from "./trips";
export {
  fetchPreferences,
  updatePreferences,
  type UserPreference,
  type UpdatePreferencesInput,
} from "./preferences";
