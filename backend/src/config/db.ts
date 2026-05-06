import mysql from 'mysql2/promise';
import type { ResultSetHeader } from 'mysql2';

const requiredEnvVars = ['DB_HOST', 'DB_PORT', 'DB_USER', 'DB_NAME'] as const;

for (const key of requiredEnvVars) {
  if (!process.env[key]) {
    console.error(`Missing required environment variable: ${key}`);
    process.exit(1);
  }
}

// On macOS/Linux with MySQL 8.4+, caching_sha2_password over TCP requires
// SSL which mysql2 doesn't negotiate by default. Connecting via Unix socket
// bypasses the SSL requirement while keeping the same auth plugin.
const socketPath = process.env['DB_SOCKET'];

const pool = mysql.createPool({
  ...(socketPath
    ? { socketPath }
    : { host: process.env['DB_HOST'], port: Number(process.env['DB_PORT']) }),
  user: process.env['DB_USER'],
  password: process.env['DB_PASSWORD'] ?? '',
  database: process.env['DB_NAME'],
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

/**
 * A recursive type that mirrors mysql2's ExecuteValues, allowing the query
 * helper to accept parameterised SQL values without importing mysql2 internals.
 */
type SqlParam =
  | string
  | number
  | boolean
  | null
  | Buffer
  | Date
  | SqlParam[]
  | { [key: string]: SqlParam };

/**
 * Executes a parameterised SQL query against the connection pool.
 * @param sql - The SQL statement with `?` placeholders.
 * @param params - Optional array of values to bind.
 * @returns An array of rows typed as T.
 */
export async function query<T>(sql: string, params?: SqlParam[]): Promise<T[]> {
  const [rows] = await pool.execute<mysql.RowDataPacket[]>(sql, params);
  return rows as unknown as T[];
}

/**
 * Executes a write (INSERT / UPDATE / DELETE) statement and returns the
 * result header, which includes `insertId` and `affectedRows`.
 * @param sql - The SQL statement with `?` placeholders.
 * @param params - Optional array of values to bind.
 * @returns The ResultSetHeader for the executed statement.
 */
export async function execute(
  sql: string,
  params?: SqlParam[],
): Promise<ResultSetHeader> {
  const [result] = await pool.execute<ResultSetHeader>(sql, params);
  return result;
}

export default pool;
