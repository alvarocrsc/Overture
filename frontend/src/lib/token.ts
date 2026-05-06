import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'overture_access_token';

/**
 * Reads the JWT access token from SecureStore.
 * @returns The stored token string, or null if none is found.
 */
export async function getToken(): Promise<string | null> {
  return SecureStore.getItemAsync(TOKEN_KEY);
}

/**
 * Writes the JWT access token to SecureStore.
 * @param token - The access token string to persist.
 */
export async function setToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

/**
 * Removes the JWT access token from SecureStore.
 */
export async function clearToken(): Promise<void> {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}
