/**
 * Custom application error class that carries an HTTP status code.
 * Throw this in services and controllers to produce a structured error response.
 *
 * @example
 * throw new AppError('Film not found', 404);
 */
export class AppError extends Error {
  public readonly statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    // Restore prototype chain for instanceof checks after TypeScript compilation
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
