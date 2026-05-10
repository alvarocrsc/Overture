import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import api from '@/src/lib/api';
import type { RatingDistributionEntry, StatsResponse } from '@/src/types/stats.types';

interface StatsApiResponse {
  data: StatsResponse;
}

/**
 * Fetches the all-time rating distribution for a user. Returns 10 entries
 * (0.5–5.0 stars). When `userId` is omitted, fetches the authenticated
 * user's distribution from `/stats/me`; otherwise from `/stats/user/:id`.
 */
export function useRatingDistribution(
  userId?: number,
): UseQueryResult<RatingDistributionEntry[]> {
  const isMe = userId == null;
  return useQuery({
    queryKey: ['rating-distribution', isMe ? 'me' : userId, 'all'],
    queryFn: async (): Promise<RatingDistributionEntry[]> => {
      const url = isMe ? '/stats/me' : `/stats/user/${userId}`;
      const res = await api.get<StatsApiResponse>(url, {
        params: { period: 'all' },
      });
      const payload = res.data?.data?.rating_distribution;
      return Array.isArray(payload) ? payload : [];
    },
    staleTime: 5 * 60 * 1000,
  });
}
