export type SortOption = "recent" | "highest" | "lowest" | "helpful";

export const SORT_OPTIONS: SortOption[] = [
  "recent",
  "highest",
  "lowest",
  "helpful",
];

export interface Review {
  authorName?: string;
  comment?: string;
  helpfulCount?: number;
  id?: string;
  notHelpfulCount?: number;
  pictures?: string[];
  reviewDate?: string;
  score?: number;
}

export interface WidgetState {
  allReviews: Review[];
  averageRating: number;
  count: number;
  loading: boolean;
  photosOnly: boolean;
  selectedScore: number;
  sort: SortOption;
  voted: Set<string>;
}

export interface I18n {
  count: string;
  customer: string;
  empty: string;
  formEmail: string;
  formName: string;
  formRating: string;
  formSubmit: string;
  formSuccess: string;
  formTitle: string;
  helpful: string;
  loading: string;
  notHelpful: string;
  photoAlt: string;
  photosOnly: string;
  sortHelpful: string;
  sortHighest: string;
  sortLabel: string;
  sortLowest: string;
  sortRecent: string;
  summaryLink: string;
  writeReview: string;
}

export interface ReviewsPayload {
  averageRating?: number;
  count?: number;
  reviews?: Review[];
}
