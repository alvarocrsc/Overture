import { Stack, useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';
import { StatusBar } from 'expo-status-bar';
import {
  LogProvider,
  type LogEpisodeInfo,
  type LogMediaType,
} from '@/src/context/LogContext';

/**
 * Layout for the /log/* route group. Reads initial title info from the
 * navigation params, wraps the stack in LogProvider, and renders a plain
 * Stack with no header (each screen renders its own back button).
 */
export default function LogLayout(): React.JSX.Element {
  const params = useLocalSearchParams<{
    tmdbId?: string;
    mediaType?: string;
    title?: string;
    year?: string;
    director?: string;
    posterPath?: string;
    backdrops?: string;
    seasonNumber?: string;
    episodeNumber?: string;
  }>();

  const tmdbId = useMemo<number>(() => {
    const n = Number(params.tmdbId);
    return Number.isFinite(n) ? n : 0;
  }, [params.tmdbId]);

  const mediaType: LogMediaType =
    params.mediaType === 'series' ? 'series' : 'film';

  // Both numbers must be present and valid for this to be an episode log;
  // anything else is a whole-title log.
  const episode = useMemo<LogEpisodeInfo | null>(() => {
    const seasonNumber = Number(params.seasonNumber);
    const episodeNumber = Number(params.episodeNumber);
    if (!Number.isInteger(seasonNumber) || seasonNumber <= 0) return null;
    if (!Number.isInteger(episodeNumber) || episodeNumber <= 0) return null;
    return { seasonNumber, episodeNumber };
  }, [params.seasonNumber, params.episodeNumber]);

  const availableBackdrops = useMemo<string[]>(() => {
    if (!params.backdrops) return [];
    try {
      const parsed = JSON.parse(params.backdrops);
      if (Array.isArray(parsed)) {
        return parsed.filter((p): p is string => typeof p === 'string');
      }
    } catch {
      // Fall through to empty array if params payload is malformed.
    }
    return [];
  }, [params.backdrops]);

  return (
    <LogProvider
      tmdbId={tmdbId}
      mediaType={mediaType}
      title={params.title ?? ''}
      year={params.year ?? null}
      director={params.director ?? null}
      posterPath={params.posterPath ?? null}
      availableBackdrops={availableBackdrops}
      episode={episode}
    >
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#121212' },
        }}
      >
        <Stack.Screen name="rating" />
        <Stack.Screen name="details" />
      </Stack>
    </LogProvider>
  );
}
