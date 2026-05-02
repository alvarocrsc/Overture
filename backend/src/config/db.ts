import mysql from 'mysql2/promise';

const requiredEnvVars = ['DB_HOST', 'DB_PORT', 'DB_USER', 'DB_NAME'] as const;

for (const key of requiredEnvVars) {
  if (!process.env[key]) {
    console.error(`Missing required environment variable: ${key}`);
    process.exit(1);
  }
}

const pool = mysql.createPool({
  host: process.env['DB_HOST'],
  port: Number(process.env['DB_PORT']),
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

export default pool;
