import React from 'react';
import type { SearchResult } from '@/src/types/search.types';
import MediaSearchItem from './MediaSearchItem';
import PersonSearchItem from './PersonSearchItem';
import ListSearchItem from './ListSearchItem';
import MemberSearchItem from './MemberSearchItem';

interface Props {
  result: SearchResult;
  onPress?: () => void;
  onRemove?: () => void;
}

export default function SearchResultItem({ result, onPress, onRemove }: Props) {
  const handlePress = onPress ?? (() => {});
  switch (result.type) {
    case 'film':
    case 'series':
      return (
        <MediaSearchItem
          item={result}
          onPress={handlePress}
          onLogPress={() => {}}
          onWatchlistPress={() => {}}
          {...(onRemove ? { onRemove } : {})}
        />
      );
    case 'person':
      return (
        <PersonSearchItem
          item={result}
          onPress={handlePress}
          {...(onRemove ? { onRemove } : {})}
        />
      );
    case 'list':
      return (
        <ListSearchItem
          item={result}
          onPress={handlePress}
          onSavePress={() => {}}
          {...(onRemove ? { onRemove } : {})}
        />
      );
    case 'member':
      return (
        <MemberSearchItem
          item={result}
          onPress={handlePress}
          onFollowPress={() => {}}
          {...(onRemove ? { onRemove } : {})}
        />
      );
  }
}
