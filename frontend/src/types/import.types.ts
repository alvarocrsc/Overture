/** Lifecycle status of a Letterboxd import job. */
export type ImportStatus = 'pending' | 'processing' | 'completed' | 'failed';

/** Stage the backend importer is currently working through. */
export type ImportStep =
  | 'preparing'
  | 'diary'
  | 'ratings'
  | 'watchlist'
  | 'likes'
  | 'reviews';

/**
 * A Letterboxd import job as returned by GET /import/:id.
 * `total_items` counts the user-facing sources (diary + watchlist + likes);
 * dates arrive as ISO strings over the wire.
 *
 * `current_step` drives the live status line in the progress banner. It is
 * optional so the client keeps working against a backend that doesn't yet
 * report it (the banner falls back to a generic, progress-derived message).
 */
export interface ImportJob {
  id: number;
  status: ImportStatus;
  total_items: number;
  imported_items: number;
  skipped_items: number;
  failed_items: number;
  error_log: string[] | null;
  current_step?: ImportStep | null;
  created_at: string;
  updated_at: string;
}
