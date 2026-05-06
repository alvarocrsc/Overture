import { createContext, useCallback, useContext, useState } from 'react';

interface RegisterState {
  email: string;
  password: string;
  username: string;
  /** Local URI from expo-image-picker, or null if skipped. */
  avatarUri: string | null;
  /** TMDB IDs of selected favourite films/series. Max 4. */
  favoriteFilmIds: number[];
}

export interface RegisterContextType extends RegisterState {
  setEmail: (v: string) => void;
  setPassword: (v: string) => void;
  setUsername: (v: string) => void;
  setAvatarUri: (v: string | null) => void;
  /**
   * Adds filmId if not already present and count < 4.
   * Removes filmId if already present.
   */
  toggleFavorite: (filmId: number) => void;
  /** Resets all register state to initial values. */
  reset: () => void;
}

const initialState: RegisterState = {
  email: '',
  password: '',
  username: '',
  avatarUri: null,
  favoriteFilmIds: [],
};

const RegisterContext = createContext<RegisterContextType | null>(null);

/**
 * Returns the register context. Must be called inside a RegisterProvider.
 * @throws If used outside of RegisterProvider.
 */
export function useRegister(): RegisterContextType {
  const ctx = useContext(RegisterContext);
  if (!ctx) {
    throw new Error('useRegister must be used within a RegisterProvider');
  }
  return ctx;
}

/**
 * Provides shared multi-step registration state to all register route
 * screens (email → password → username → profile-picture → favorites).
 * Wrap app/(auth)/register/_layout.tsx with this provider.
 */
export function RegisterProvider({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  const [state, setState] = useState<RegisterState>(initialState);

  const setEmail = useCallback((v: string): void => {
    setState((prev) => ({ ...prev, email: v }));
  }, []);

  const setPassword = useCallback((v: string): void => {
    setState((prev) => ({ ...prev, password: v }));
  }, []);

  const setUsername = useCallback((v: string): void => {
    setState((prev) => ({ ...prev, username: v }));
  }, []);

  const setAvatarUri = useCallback((v: string | null): void => {
    setState((prev) => ({ ...prev, avatarUri: v }));
  }, []);

  const toggleFavorite = useCallback((filmId: number): void => {
    setState((prev) => {
      const exists = prev.favoriteFilmIds.includes(filmId);
      if (exists) {
        return {
          ...prev,
          favoriteFilmIds: prev.favoriteFilmIds.filter((id) => id !== filmId),
        };
      }
      if (prev.favoriteFilmIds.length >= 4) {
        return prev;
      }
      return { ...prev, favoriteFilmIds: [...prev.favoriteFilmIds, filmId] };
    });
  }, []);

  const reset = useCallback((): void => {
    setState(initialState);
  }, []);

  const value: RegisterContextType = {
    ...state,
    setEmail,
    setPassword,
    setUsername,
    setAvatarUri,
    toggleFavorite,
    reset,
  };

  return <RegisterContext.Provider value={value}>{children}</RegisterContext.Provider>;
}
