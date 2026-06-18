import React, { useEffect, useState } from 'react';
import { Share } from 'react-native';

import { backdropUrl, logoUrl } from '@/src/lib/tmdb';
import type { FilmDetail, FilmImages } from '@/src/types/film.types';
import BottomDrawer from '@/src/components/drawers/bottom-drawer';
import MoreOptionsDrawerContent from '@/src/components/drawers/more-options-drawer-content';
import AddToListDrawerContent from '@/src/components/drawers/add-to-list-drawer-content';
import CreateListDrawerContent from '@/src/components/drawers/create-list-drawer-content';
import { useInvalidateLists } from '@/src/hooks/use-lists';

interface FilmActionDrawerProps {
  visible: boolean;
  onClose: () => void;
  film: FilmDetail;
  images: FilmImages | undefined;
  /** Called when the user toggles the LOGGED indicator. */
  onToggleLogged: () => void;
  /** Called when the user picks a new star rating (0.5 increments). */
  onChangeRating: (value: number) => void;
  /** Called when the user toggles the LIKED indicator. */
  onToggleLiked: () => void;
  /** Called when the user taps "Change poster | Backdrop". */
  onChangeAppearance: () => void;
}

type Step = 'more' | 'add-to-list' | 'create-list';

/**
 * Per-film action drawer. Orchestrates three steps inside the shared
 * `BottomDrawer` shell:
 *
 * 1. **More options** — logged / rating / liked toggles plus Add to
 *    list, Change poster | Backdrop and Share actions.
 * 2. **Add to list** — user's lists with optimistic toggles.
 * 3. **Create list** — form to create a brand-new list.
 */
export default function FilmActionDrawer({
  visible,
  onClose,
  film,
  images,
  onToggleLogged,
  onChangeRating,
  onToggleLiked,
  onChangeAppearance,
}: FilmActionDrawerProps): React.JSX.Element {
  const [step, setStep] = useState<Step>('more');
  const [rating, setRating] = useState<number>(film.user_rating ?? 0);
  const invalidateLists = useInvalidateLists();

  useEffect(() => {
    if (visible) {
      setStep('more');
      setRating(film.user_rating ?? 0);
    }
  }, [visible, film.user_rating]);

  const handleRatingChange = (value: number): void => {
    setRating(value);
    onChangeRating(value);
  };

  const handleShare = async (): Promise<void> => {
    try {
      await Share.share({ message: `${film.title} on Overture` });
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

  const backdropPath = film.custom_backdrop_path ?? film.backdrop_path;
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
      titleFallback={film.title}
      tagline={film.tagline ?? null}
      onDone={handleClose}
      showDoneButton={step !== 'create-list'}
    >
      {step === 'more' ? (
        <MoreOptionsDrawerContent
          isLogged={film.is_logged}
          isLiked={film.is_liked}
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
          mediaType="film"
          tmdbId={film.tmdb_id}
          onBack={() => setStep('more')}
          onCreateNew={() => setStep('create-list')}
        />
      ) : (
        <CreateListDrawerContent
          mediaType="film"
          tmdbId={film.tmdb_id}
          onBack={() => setStep('add-to-list')}
          onListCreated={() => setStep('add-to-list')}
        />
      )}
    </BottomDrawer>
  );
}
