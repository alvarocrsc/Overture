import React from 'react';

import TrailerPlayer from '@/src/components/shared/TrailerPlayer';

interface SeriesTrailerTabProps {
  tmdbId: number;
}

/**
 * Series Trailer tab — plays the series' trailer inline via the shared
 * {@link TrailerPlayer}. The backend now exposes `GET /series/:tmdbId/trailer`,
 * so series render a real embedded player instead of a static empty state.
 */
export default function SeriesTrailerTab({
  tmdbId,
}: SeriesTrailerTabProps): React.JSX.Element {
  return <TrailerPlayer mediaType="series" tmdbId={tmdbId} />;
}
