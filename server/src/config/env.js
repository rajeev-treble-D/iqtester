import { isIP } from 'node:net';
import { z } from 'zod';

// Local development convenience; in production the platform injects env vars.
try {
  process.loadEnvFile();
} catch {
  // no .env file - fine
}

const int = (min, max, fallback) => z.coerce.number().int().min(min).max(max).default(fallback);

const schema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: int(1, 65535, 4000),
    MONGODB_URI: z.string().min(1).optional(),
    MONGODB_MAX_POOL: int(1, 500, 20),
    // Optional: DNS servers for Node to use, comma-separated IP addresses (see lib/db.js).
    DNS_SERVERS: z.string().default(''),
    CORS_ORIGINS: z.string().default('http://localhost:5173'),
    TRUST_PROXY: int(0, 10, 0),
    LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
    ATTEMPT_MAX_MINUTES: int(5, 600, 90),
    ATTEMPT_PURGE_DAYS: int(1, 365, 7),
    // The pace screen shows a real percentage only once this many people have reached it.
    PACE_MIN_SAMPLE: int(1, 1_000_000, 30),
    RATE_LIMIT_WINDOW_MS: int(1000, 3_600_000, 60_000),
    RATE_LIMIT_MAX: int(1, 100_000, 240),
    ATTEMPT_CREATE_LIMIT_PER_HOUR: int(1, 100_000, 20),
  })
  .transform((v) => ({
    ...v,
    MONGODB_URI: v.MONGODB_URI ?? 'mongodb://127.0.0.1:27017/iqtest',
    mongoUriWasSet: v.MONGODB_URI !== undefined,
    dnsServers: v.DNS_SERVERS.split(',')
      .map((s) => s.trim())
      .filter(Boolean),
    corsOrigins: v.CORS_ORIGINS.split(',')
      .map((s) => s.trim())
      .filter(Boolean),
    isProd: v.NODE_ENV === 'production',
    isTest: v.NODE_ENV === 'test',
  }));

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error('Invalid environment configuration:\n' + z.prettifyError(parsed.error));
  process.exit(1);
}
const notAnAddress = parsed.data.dnsServers.find((server) => isIP(server) === 0);
if (notAnAddress !== undefined) {
  console.error(`DNS_SERVERS must be IP addresses separated by commas; "${notAnAddress}" is not one.`);
  process.exit(1);
}
if (parsed.data.isProd && !parsed.data.mongoUriWasSet) {
  console.error('MONGODB_URI must be set in production.');
  process.exit(1);
}

export const env = parsed.data;
