import React from 'react';

import TrailerPlayer from '@/src/components/shared/TrailerPlayer';

interface TrailerTabProps {
  tmdbId: number;
}

/**
 * Film Trailer tab — plays the film's trailer inline via the shared
 * {@link TrailerPlayer}.
 */
export default function TrailerTab({ tmdbId }: TrailerTabProps): React.JSX.Element {
  return <TrailerPlayer mediaType="film" tmdbId={tmdbId} />;
}
