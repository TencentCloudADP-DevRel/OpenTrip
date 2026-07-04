import type { Trip } from "../domain/trip";
import type { TripSnapshot } from "../domain/trip";

export interface TripDto {
  id: string;
  title: string;
  status: string;
  currency: string;
  members: TripSnapshot["members"];
  days: TripSnapshot["days"];
  stops: Array<{
    id: string;
    day: number;
    time: string;
    duration: string;
    name: string;
    area: string;
    category: string;
    lat: number;
    lng: number;
    cost: number;
    createdBy: string;
    transit: boolean;
    votes: string[];
    comments: { author: string; timeLabel: string; text: string }[];
  }>;
  expenses: Array<{
    id: string;
    description: string;
    payer: string;
    amount: number;
    participants: string[];
    whenLabel: string;
  }>;
  budget: ReturnType<Trip["budget"]>;
}

/** Serialize the aggregate to the client DTO, dropping persistence-only fields
 * (order, createdOrder) and attaching the computed budget. */
export function toTripDto(trip: Trip): TripDto {
  const s = trip.toSnapshot();
  return {
    id: s.id,
    title: s.title,
    status: s.status,
    currency: s.currency,
    members: s.members,
    days: s.days,
    stops: s.stops.map((st) => ({
      id: st.id,
      day: st.day,
      time: st.time,
      duration: st.duration,
      name: st.name,
      area: st.area,
      category: st.category,
      lat: st.lat,
      lng: st.lng,
      cost: st.cost,
      createdBy: st.createdBy,
      transit: st.transit,
      votes: st.votes,
      comments: st.comments,
    })),
    expenses: s.expenses.map((e) => ({
      id: e.id,
      description: e.description,
      payer: e.payer,
      amount: e.amount,
      participants: e.participants,
      whenLabel: e.whenLabel,
    })),
    budget: trip.budget(),
  };
}
