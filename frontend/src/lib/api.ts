import axios, {
  type AxiosResponse,
  type InternalAxiosRequestConfig,
  isAxiosError,
} from 'axios';
import { router, type Href } from 'expo-router';
import { clearToken, getToken, setToken } from './token';

declare module 'axios' {
  interface InternalAxiosRequestConfig {
    _retry?: boolean;
  }
}

/**
 * A plain axios instance used exclusively for the token-refresh call.
 * It has no interceptors, preventing infinite retry loops when the
 * refresh endpoint itself returns a 401.
 */
const refreshAxios = axios.create({
  baseURL: process.env.EXPO_PUBLIC_API_URL,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});

/**
 * The configured axios instance used by every screen and service in the app.
 * Automatically attaches the JWT access token to outgoing requests and
 * handles silent token refresh on 401 responses.
 */
const api = axios.create({
  baseURL: process.env.EXPO_PUBLIC_API_URL,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});

/**
 * Request interceptor — attaches the JWT access token as a Bearer header
 * before every outgoing request, if a token is present in SecureStore.
 */
api.interceptors.request.use(
  async (config: InternalAxiosRequestConfig): Promise<InternalAxiosRequestConfig> => {
    const token = await getToken();
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
);

/**
 * Response interceptor — on a 401 response, attempts a silent token refresh
 * using the httpOnly refresh-token cookie. If the refresh succeeds the
 * original request is retried with the new token. If it fails the user is
 * redirected to the login screen.
 */
api.interceptors.response.use(
  (response: AxiosResponse): AxiosResponse => response,
  async (error: unknown): Promise<AxiosResponse> => {
    if (!isAxiosError(error)) {
      return Promise.reject(error);
    }

    const config = error.config;

    if (error.response?.status === 401 && config && !config._retry) {
      config._retry = true;

      const refreshed = await refreshAxios
        .post<{ data: { accessToken: string } }>('/auth/refresh-token')
        .catch(async (): Promise<null> => {
          await clearToken();
          router.replace('/(auth)/login' as unknown as Href);
          return null;
        });

      if (refreshed === null) {
        return Promise.reject(error);
      }

      const newToken = refreshed.data.data.accessToken;
      await setToken(newToken);
      config.headers['Authorization'] = `Bearer ${newToken}`;
      return api(config);
    }

    return Promise.reject(error);
  },
);

export default api;
