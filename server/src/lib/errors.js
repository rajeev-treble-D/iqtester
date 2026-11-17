import { z } from 'zod';
import { logger } from './logger.js';

export class HttpError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
    this.name = 'HttpError';
  }
}

export const badRequest = (message, details) => new HttpError(400, 'bad_request', message, details);
export const unauthorized = () => new HttpError(401, 'unauthorized', 'Missing or malformed credentials.');
export const notFound = (what = 'Resource') => new HttpError(404, 'not_found', `${what} not found.`);
export const conflict = (code, message, details) => new HttpError(409, code, message, details);
export const gone = (code, message) => new HttpError(410, code, message);

/** Validate untrusted input; anything that doesn't match the schema is a 400. */
export function parse(schema, data) {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw badRequest('Request validation failed.', z.flattenError(result.error));
  }
  return result.data;
}

export const notFoundHandler = (_req, _res, next) => next(notFound('Route'));

export const errorHandler = (err, req, res, _next) => {
  let status = 500;
  let body = { error: { code: 'internal_error', message: 'Something went wrong.' } };

  if (err instanceof HttpError) {
    status = err.status;
    body = { error: { code: err.code, message: err.message, details: err.details } };
  } else if (isBodyParserError(err)) {
    // express.json(): malformed JSON, payload too large, wrong charset...
    status = err.status;
    body = { error: { code: err.type ?? 'bad_request', message: 'Request body could not be read.' } };
  }

  if (status >= 500) {
    // Never leak internals to the client; log them with the request id instead.
    (req.log ?? logger).error({ err }, 'unhandled error');
  }
  res.status(status).json(body);
};

function isBodyParserError(err) {
  if (typeof err !== 'object' || err === null) return false;
  const status = err.status;
  return typeof status === 'number' && status >= 400 && status < 500;
}
