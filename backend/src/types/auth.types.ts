/**
 * The decoded JWT payload attached to every authenticated request.
 * Populated by the verifyAccessToken middleware.
 */
export interface AuthPayload {
  userId: number;
  role: string;
}
