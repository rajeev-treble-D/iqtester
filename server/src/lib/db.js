import mongoose from 'mongoose';
import dns from 'node:dns';
import { env } from '../config/env.js';
import { logger } from './logger.js';

// Defence in depth against NoSQL injection: query filters built from request
// data can't smuggle in operators like {$ne: null}. (All input is also
// validated with zod before it gets anywhere near a query.)
mongoose.set('sanitizeFilter', true);
mongoose.set('strictQuery', true);

let closing = false;

export async function connectDb(uri = env.MONGODB_URI) {
  closing = false;
  // A mongodb+srv:// address needs a DNS SRV lookup, which Node does with its
  // own resolver rather than the operating system's. On some machines that
  // resolver finds no usable DNS server and falls back to 127.0.0.1; the
  // lookup is then refused ("querySrv ECONNREFUSED") although everything else
  // on the machine resolves the name. DNS_SERVERS says which servers to ask.
  if (env.dnsServers.length > 0) {
    dns.setServers(env.dnsServers);
    dns.promises.setServers(env.dnsServers);
  }
  mongoose.connection.on('disconnected', () => {
    if (!closing) logger.warn('mongodb disconnected');
  });
  mongoose.connection.on('reconnected', () => logger.info('mongodb reconnected'));
  await mongoose.connect(uri, {
    maxPoolSize: env.MONGODB_MAX_POOL,
    serverSelectionTimeoutMS: 5000,
    // Build indexes explicitly (seed / deploy step), not on every boot in production.
    autoIndex: !env.isProd,
  });
}

export async function disconnectDb() {
  closing = true;
  await mongoose.disconnect();
}
