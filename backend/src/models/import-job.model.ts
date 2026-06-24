/**
 * A Letterboxd import job. Mirrors a row of the `import_jobs` table.
 *
 * `error_log` is a MySQL JSON column — mysql2 returns it already parsed into an
 * array of human-readable, row-level error strings (or null when there were
 * none). `total_items` counts only the sources that contribute to user-facing
 * progress (diary + watchlist + likes); ratings.csv and reviews.csv are applied
 * supplementarily and are not counted.
 */
export interface ImportJob {
  id: number;
  user_id: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  total_items: number;
  imported_items: number;
  skipped_items: number;
  failed_items: number;
  error_log: string[] | null;
  current_step: string | null;
  started_at: Date | null;
  completed_at: Date | null;
  created_at: Date;
  updated_at: Date;
}
