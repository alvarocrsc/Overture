import React from 'react';
import { router } from 'expo-router';
import type {
  FilmSearchResult,
  MemberSearchResult,
  SearchResult,
  SeriesSearchResult,
} from '@/src/types/search.types';
import { useFollowActions } from '@/src/hooks/useFollowActions';
import { useWatchlistToggle } from '@/src/hooks/useWatchlist';
import { useLoggedStatus } from '@/src/hooks/useLogged';
import { useAuth } from '@/src/context/AuthContext';
import { useOverlayNavigator } from '@/src/context/OverlayNavigatorContext';
import MediaSearchItem from './MediaSearchItem';
import PersonSearchItem from './PersonSearchItem';
import ListSearchItem from './ListSearchItem';
import MemberSearchItem from './MemberSearchItem';

interface Props {
  result: SearchResult;
  onPress?: () => void;
  onRemove?: () => void;
}

/**
 * Inner component for member rows so we can call hooks (useFollowActions)
 * without violating the rules of hooks inside a switch statement.
 */
function MemberResultRow({
  result,
  onPress,
  onRemove,
}: {
  result: MemberSearchResult;
  onPress: () => void;
  onRemove?: () => void;
}) {
  const { user } = useAuth();
  const isSelf = user?.id === result.id;
  const { isFollowing, toggle } = useFollowActions(result.id, result.isFollowing ?? false);
  const overlay = useOverlayNavigator();
  return (
    <MemberSearchItem
      item={result}
      isFollowing={isFollowing}
      showFollowButton={!isSelf}
      onPress={() => {
        onPress();
        overlay.present('user', { id: result.id });
      }}
      onFollowPress={toggle}
      {...(onRemove ? { onRemove } : {})}
    />
  );
}

function MediaResultRow({
  result,
  onPress,
  onRemove,
}: {
  result: FilmSearchResult | SeriesSearchResult;
  onPress: () => void;
  onRemove?: () => void;
}) {
  const watchlist = useWatchlistToggle(result.tmdbId, result.type);
  const isLogged = useLoggedStatus(result.tmdbId, result.type);

  const handleLogPress = (): void => {
    if (isLogged) return;
    const creator =
      result.type === 'film' ? result.director : result.creator;
    router.push({
      pathname: '/log/rating',
      params: {
        tmdbId: String(result.tmdbId),
        mediaType: result.type,
        title: result.title,
        year: result.year ?? '',
        director: creator ?? '',
        posterPath: result.posterPath ?? '',
        backdrops: JSON.stringify([]),
      },
    });
  };

  return (
    <MediaSearchItem
      item={result}
      isLogged={isLogged}
      isInWatchlist={watchlist.inWatchlist}
      onPress={onPress}
      onLogPress={handleLogPress}
      onWatchlistPress={watchlist.toggle}
      {...(onRemove ? { onRemove } : {})}
    />
  );
}

export default function SearchResultItem({ result, onPress, onRemove }: Props) {
  const handlePress = onPress ?? (() => {});
  switch (result.type) {
    case 'film':
    case 'series':
      return (
        <MediaResultRow
          result={result}
          onPress={handlePress}
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
        <MemberResultRow
          result={result}
          onPress={handlePress}
          {...(onRemove ? { onRemove } : {})}
        />
      );
  }
}
