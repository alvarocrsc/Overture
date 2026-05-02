import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import type { SignOptions } from 'jsonwebtoken';
import { query, execute } from '../config/db';
import { AppError } from '../utils/app-error';
import type { User } from '../models/user.model';
import type { RegisterInput, LoginInput } from '../validators/auth.validators';

const SALT_ROUNDS = 12;

/**
 * Builds jwt.sign options with an expiresIn value from an env-var string
 * (e.g. '15m', '7d'). These are valid ms-format strings at runtime.
 * The double cast is needed because @types/jsonwebtoken uses the branded
 * ms.StringValue type which plain `string` is not assignable to statically.
 */
function jwtSignOptions(expiresIn: string): SignOptions {
  return {
    expiresIn: expiresIn as unknown as NonNullable<SignOptions['expiresIn']>,
  };
}

export interface RegisterResult {
  userId: number;
}

export interface UserPublic {
  id: number;
  username: string;
  email: string;
  avatar_url: string | null;
  accent_color: string;
}

export interface LoginResult {
  accessToken: string;
  refreshToken: string;
  user: UserPublic;
}

export interface RefreshResult {
  accessToken: string;
}

/**
 * Creates a new user account and initialises a default user_preferences row.
 * Throws 409 if the email or username is already taken.
 * @param data - Validated registration input.
 * @returns The newly created user's ID.
 */
export async function registerUser(data: RegisterInput): Promise<RegisterResult> {
  const [existingEmail] = await query<Pick<User, 'id'>>(
    'SELECT id FROM users WHERE email = ?',
    [data.email],
  );
  if (existingEmail) throw new AppError('Email already in use', 409);

  const [existingUsername] = await query<Pick<User, 'id'>>(
    'SELECT id FROM users WHERE username = ?',
    [data.username],
  );
  if (existingUsername) throw new AppError('Username already taken', 409);

  const passwordHash = await bcrypt.hash(data.password, SALT_ROUNDS);

  const userResult = await execute(
    `INSERT INTO users (username, email, password_hash, role, accent_color)
     VALUES (?, ?, ?, 'user', '#1A77DA')`,
    [data.username, data.email, passwordHash],
  );

  const userId = userResult.insertId;

  await execute(
    `INSERT INTO user_preferences (user_id, preferred_content, onboarding_completed)
     VALUES (?, 'both', false)`,
    [userId],
  );

  return { userId };
}

/**
 * Authenticates a user by email and password.
 * Returns a signed access token, refresh token, and public user data.
 * Always throws 401 with a generic message to prevent credential enumeration.
 * @param data - Validated login input.
 * @returns Access token, refresh token, and public user fields.
 */
export async function loginUser(data: LoginInput): Promise<LoginResult> {
  const [user] = await query<User>(
    `SELECT id, username, email, password_hash, role, avatar_url, accent_color
     FROM users WHERE email = ?`,
    [data.email],
  );

  if (!user) throw new AppError('Invalid credentials', 401);

  const passwordMatch = await bcrypt.compare(data.password, user.password_hash);
  if (!passwordMatch) throw new AppError('Invalid credentials', 401);

  // Non-null assertions are safe: JWT env vars are validated at startup in index.ts
  const accessSecret = process.env['JWT_ACCESS_SECRET']!;
  const refreshSecret = process.env['JWT_REFRESH_SECRET']!;

  const accessToken = jwt.sign(
    { userId: user.id, username: user.username, role: user.role },
    accessSecret,
    jwtSignOptions(process.env['JWT_ACCESS_EXPIRES_IN'] ?? '15m'),
  );

  const refreshToken = jwt.sign(
    { userId: user.id },
    refreshSecret,
    jwtSignOptions(process.env['JWT_REFRESH_EXPIRES_IN'] ?? '7d'),
  );

  return {
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      avatar_url: user.avatar_url,
      accent_color: user.accent_color,
    },
  };
}

/**
 * Verifies a refresh token and issues a new access token.
 * jwt.verify throws JsonWebTokenError / TokenExpiredError on invalid tokens;
 * both are caught by the global errorHandler and returned as 401 responses.
 * @param token - The refresh token read from the httpOnly cookie.
 * @returns A new access token.
 */
export async function refreshAccessToken(token: string): Promise<RefreshResult> {
  // Non-null assertion is safe: JWT env vars are validated at startup in index.ts
  const refreshSecret = process.env['JWT_REFRESH_SECRET']!;

  // jwt.verify throws on invalid/expired tokens → caught by global errorHandler
  const decoded = jwt.verify(token, refreshSecret) as { userId: number };

  const [user] = await query<Pick<User, 'id' | 'username' | 'role'>>(
    'SELECT id, username, role FROM users WHERE id = ?',
    [decoded.userId],
  );

  if (!user) throw new AppError('User not found', 401);

  const accessSecret = process.env['JWT_ACCESS_SECRET']!;

  const accessToken = jwt.sign(
    { userId: user.id, username: user.username, role: user.role },
    accessSecret,
    jwtSignOptions(process.env['JWT_ACCESS_EXPIRES_IN'] ?? '15m'),
  );

  return { accessToken };
}
