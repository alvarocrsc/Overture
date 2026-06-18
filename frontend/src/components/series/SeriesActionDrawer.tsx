import React, { useEffect, useState } from 'react';
import { Share } from 'react-native';

import { backdropUrl, logoUrl } from '@/src/lib/tmdb';
import type { SeriesDetail, SeriesImages } from '@/src/types/series.types';
import BottomDrawer from '@/src/components/drawers/bottom-drawer';
import MoreOptionsDrawerContent from '@/src/components/drawers/more-options-drawer-content';
import AddToListDrawerContent from '@/src/components/drawers/add-to-list-drawer-content';
import CreateListDrawerContent from '@/src/components/drawers/create-list-drawer-content';
import { useInvalidateLists } from '@/src/hooks/use-lists';

interface SeriesActionDrawerProps {
  visible: boolean;
  onClose: () => void;
  series: SeriesDetail;
  images: SeriesImages | undefined;
  onToggleLogged: () => void;
  onChangeRating: (value: number) => void;
  onToggleLiked: () => void;
  onChangeAppearance: () => void;
}

type Step = 'more' | 'add-to-list' | 'create-list';

/**
 * Per-series action drawer. See `FilmActionDrawer` for the three-step
 * orchestration pattern — this is the series-typed mirror.
 */
export default function SeriesActionDrawer({
  visible,
  onClose,
  series,
  images,
  onToggleLogged,
  onChangeRating,
  onToggleLiked,
  onChangeAppearance,
}: SeriesActionDrawerProps): React.JSX.Element {
  const [step, setStep] = useState<Step>('more');
  const [rating, setRating] = useState<number>(series.user_rating ?? 0);
  const invalidateLists = useInvalidateLists();

  useEffect(() => {
    if (visible) {
      setStep('more');
      setRating(series.user_rating ?? 0);
    }
  }, [visible, series.user_rating]);

  const handleRatingChange = (value: number): void => {
    setRating(value);
    onChangeRating(value);
  };

  const handleShare = async (): Promise<void> => {
    try {
      await Share.share({ message: `${series.title} on Overture` });
    } catch {
      // User dismissed share sheet — nothing to do.
    }
  };

  const handleClose = (): void => {
    if (step === 'add-to-list' || step === 'create-list') {
      invalidateLists();
    }
    onClose();
  };

  const backdropPath = series.custom_backdrop_path ?? series.backdrop_path;
  const backdropImageUri = backdropUrl(backdropPath, 'w1280');

  const logo =
    images?.logos.find((l) => l.iso_639_1 === 'en') ?? images?.logos[0];
  const logoSrc = logo ? logoUrl(logo.file_path, 'w300') : null;

  return (
    <BottomDrawer
      visible={visible}
      onClose={handleClose}
      backdropImageUri={backdropImageUri}
      logoUri={logoSrc}
      titleFallback={series.title}
      tagline={null}
      onDone={handleClose}
      showDoneButton={step !== 'create-list'}
    >
      {step === 'more' ? (
        <MoreOptionsDrawerContent
          isLogged={series.is_logged}
          isLiked={series.is_liked}
          rating={rating}
          onToggleLogged={onToggleLogged}
          onChangeRating={handleRatingChange}
          onToggleLiked={onToggleLiked}
          onPressAddToList={() => setStep('add-to-list')}
          onChangeAppearance={onChangeAppearance}
          onShare={handleShare}
        />
      ) : step === 'add-to-list' ? (
        <AddToListDrawerContent
          mediaType="series"
          tmdbId={series.tmdb_id}
          onBack={() => setStep('more')}
          onCreateNew={() => setStep('create-list')}
        />
      ) : (
        <CreateListDrawerContent
          mediaType="series"
          tmdbId={series.tmdb_id}
          onBack={() => setStep('add-to-list')}
          onListCreated={() => setStep('add-to-list')}
        />
      )}
    </BottomDrawer>
  );
}
