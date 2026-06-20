import React from 'react';
import { useLocalSearchParams } from 'expo-router';

import ListsOverviewContent from '@/src/components/lists/ListsOverviewContent';

/**
 * Route `/lists/folder/[folderId]` — the contents of a single folder.
 */
export default function FolderScreen(): React.JSX.Element {
  const { folderId } = useLocalSearchParams<{ folderId: string }>();
  return <ListsOverviewContent folderId={Number(folderId)} />;
}
