import type { Trip } from "./trip";
import type { TripStatus } from "./types";

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

/** Repository port for the Trip aggregate. Implemented in infrastructure. */
export interface TripRepository {
  findSummaries(): Promise<TripSummary[]>;
  findById(id: string): Promise<Trip | null>;
  save(trip: Trip): Promise<void>;
}
