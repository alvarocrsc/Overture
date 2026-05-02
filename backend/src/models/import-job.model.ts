export interface ImportJob {
  id: number;
  user_id: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  total_items: number;
  imported_items: number;
  error_log: string | null;
  created_at: Date;
  updated_at: Date;
}
