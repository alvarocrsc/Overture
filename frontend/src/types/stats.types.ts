/**
 * Shape returned by GET /api/v1/stats/me — see backend stats.service.
 * Each section of the Stats screen consumes a slice of this object.
 */

export type StatsPeriod = 'month' | 'year' | 'all';

export interface StatsOverview {
  total_logged: number;
  films_count: number;
  series_count: number;
  rewatch_count: number;
  avg_rating: number;
  avg_per_week: number;
  review_count: number;
  percentile: string;
}

export interface StatsTime {
  film_minutes: number;
  series_minutes: number;
  total_minutes: number;
  total_days: number;
}

export interface GenreEntry {
  id: number;
  name: string;
  count: number;
}

export interface DecadeEntry {
  decade: number;
  count: number;
}

export interface MostWatchedPerson {
  person_tmdb_id: number;
  person_name: string;
  profile_path: string | null;
  film_count: number;
}

export interface MostWatchedData {
  directors: MostWatchedPerson[];
  actors: MostWatchedPerson[];
}

export interface CalendarEntry {
  /** ISO date string (YYYY-MM-DD) */
  date: string;
  count: number;
  highest_rating: number;
  backdrop_path: string | null;
}

export interface StreakData {
  current: number;
  longest: number;
  /** Length 7. Index 0 = today, index 6 = 6 days ago. */
  last_7_days: boolean[];
}

export interface RatingDistributionEntry {
  /** Rating value, 0.5–5.0 in 0.5 increments. */
  value: number;
  count: number;
}

export interface StatsResponse {
  period: StatsPeriod;
  overview: StatsOverview;
  time: StatsTime;
  top_genres: GenreEntry[];
  top_decades: DecadeEntry[];
  most_watched: MostWatchedData;
  calendar: CalendarEntry[];
  streak: StreakData;
  rating_distribution: RatingDistributionEntry[];
}
