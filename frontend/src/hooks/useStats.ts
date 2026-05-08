import { useQuery } from '@tanstack/react-query';
import api from '@/src/lib/api';
import type { StatsPeriod, StatsResponse } from '@/src/types/stats.types';

export type { StatsPeriod };

interface StatsApiResponse {
  data: StatsResponse;
}

/**
 * Fetches the authenticated user's stats for the given period.
 * Cached for 2 minutes since stats can change as new entries are logged.
 *
 * @param period - month / year / all
 */
export function useStats(period: StatsPeriod) {
  return useQuery({
    queryKey: ['stats', period],
    queryFn: async (): Promise<StatsResponse> => {
      const res = await api.get<StatsApiResponse>('/stats/me', {
        params: { period },
      });
      return res.data.data;
    },
    staleTime: 2 * 60 * 1000,
  });
}
