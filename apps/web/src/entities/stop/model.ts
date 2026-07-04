export interface StopComment {
  author: string;
  timeLabel: string;
  text: string;
}

export type StopCategory =
  | "Sight"
  | "Food"
  | "Stay"
  | "Shopping"
  | "Activity"
  | "Walk"
  | "Park"
  | "Transit"
  | "Plan";

export interface Stop {
  id: string;
  day: number;
  time: string;
  duration: string;
  name: string;
  area: string;
  category: StopCategory;
  lat: number;
  lng: number;
  cost: number;
  createdBy: string;
  transit: boolean;
  /** Free-form note in Markdown (may embed image URLs). */
  note: string;
  votes: string[];
  comments: StopComment[];
}
