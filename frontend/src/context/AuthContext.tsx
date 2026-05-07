import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import { router } from 'expo-router';
import api from '../lib/api';
import { clearToken, getToken, setToken } from '../lib/token';

export interface User {
  id: number;
  username: string;
  email: string;
  avatar_url: string | null;
  accent_color: string;
}

export interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (
    username: string,
    email: string,
    password: string,
  ) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

/**
 * Returns the auth context. Must be called inside an AuthProvider subtree.
 * @throws If used outside of AuthProvider.
 */
export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}

interface LoginResponseData {
  data: {
    accessToken: string;
    user: User;
  };
}

interface MeResponseData {
  data: User;
}

/**
 * Provides authentication state and actions to the entire app.
 * On mount it rehydrates the session from SecureStore; exposes login,
 * register, and logout helpers that update state and navigate accordingly.
 */
export default function AuthProvider({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect((): void => {
    const hydrate = async (): Promise<void> => {
      const token = await getToken();
      if (token) {
        await api
          .get<MeResponseData>('/users/me')
          .then((res) => {
            setUser(res.data.data);
          })
          .catch(async (): Promise<void> => {
            await clearToken();
          });
      }
      setIsLoading(false);
    };

    void hydrate();
  }, []);

  /**
   * Stores credentials in memory and SecureStore without navigating.
   * Used by both login and register so navigation stays with the caller.
   */
  const applyCredentials = useCallback(
    async (accessToken: string, userData: User): Promise<void> => {
      await setToken(accessToken);
      setUser(userData);
    },
    [],
  );

  /**
   * Authenticates the user with email and password.
   * Stores the access token and navigates to the home screen on success.
   * @throws The raw axios error on failure, so the form can display it.
   */
  const login = useCallback(
    async (email: string, password: string): Promise<void> => {
      const res = await api.post<LoginResponseData>('/auth/login', {
        email,
        password,
      });
      await applyCredentials(res.data.data.accessToken, res.data.data.user);
      router.replace('/home');
    },
    [applyCredentials],
  );

  /**
   * Registers a new account and authenticates, but does NOT navigate.
   * The calling screen is responsible for navigating after success.
   * @throws The raw axios error on failure, so the form can display it.
   */
  const register = useCallback(
    async (
      username: string,
      email: string,
      password: string,
    ): Promise<void> => {
      await api.post('/auth/register', { username, email, password });
      const res = await api.post<LoginResponseData>('/auth/login', {
        email,
        password,
      });
      await applyCredentials(res.data.data.accessToken, res.data.data.user);
    },
    [applyCredentials],
  );

  /**
   * Logs the current user out. Best-effort server call — clears the local
   * token and redirects to login regardless of server response.
   */
  const logout = useCallback(async (): Promise<void> => {
    await api.post('/auth/logout').catch((): void => {
      // best effort — ignore server errors on logout
    });
    await clearToken();
    setUser(null);
    router.replace('/login');
  }, []);

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: user !== null,
    login,
    register,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}
