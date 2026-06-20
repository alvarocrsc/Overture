import React from 'react';

import ListsOverviewContent from '@/src/components/lists/ListsOverviewContent';

/**
 * Route `/lists/me` — the authenticated user's root-level lists overview.
 */
export default function ListsRootScreen(): React.JSX.Element {
  return <ListsOverviewContent folderId={null} />;
}
