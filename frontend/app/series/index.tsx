import React from 'react';
import { LoggedTitlesScreen } from '@/src/components/library/LoggedTitlesScreen';

/** `/series` — the signed-in user's logged series library. */
export default function SeriesLibraryScreen(): React.JSX.Element {
  return <LoggedTitlesScreen mediaType="series" />;
}
