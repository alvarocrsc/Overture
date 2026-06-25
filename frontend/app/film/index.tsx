import React from 'react';
import { LoggedTitlesScreen } from '@/src/components/library/LoggedTitlesScreen';

/** `/film` — the signed-in user's logged films library. */
export default function FilmsLibraryScreen(): React.JSX.Element {
  return <LoggedTitlesScreen mediaType="film" />;
}
