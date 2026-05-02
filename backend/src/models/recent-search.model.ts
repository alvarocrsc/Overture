export interface RecentSearch {
  id: number;
  user_id: number;
  query: string;
  type: 'film' | 'series' | 'person' | 'list' | 'member';
  result_id: string | null;
  created_at: Date;
}
