/** Lifecycle status of a Letterboxd import job. */
export type ImportStatus = 'pending' | 'processing' | 'completed' | 'failed';

/**
 * A Letterboxd import job as returned by GET /import/:id.
 * `total_items` counts the user-facing sources (diary + watchlist + likes);
 * dates arrive as ISO strings over the wire.
 */
export interface ImportJob {
  id: number;
  status: ImportStatus;
  total_items: number;
  imported_items: number;
  skipped_items: number;
  failed_items: number;
  error_log: string[] | null;
  created_at: string;
  updated_at: string;
}
