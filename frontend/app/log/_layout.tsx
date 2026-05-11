import { Stack, useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';
import { StatusBar } from 'expo-status-bar';
import { LogProvider, type LogMediaType } from '@/src/context/LogContext';

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
  }>();

  const tmdbId = useMemo<number>(() => {
    const n = Number(params.tmdbId);
    return Number.isFinite(n) ? n : 0;
  }, [params.tmdbId]);

  const mediaType: LogMediaType =
    params.mediaType === 'series' ? 'series' : 'film';

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
