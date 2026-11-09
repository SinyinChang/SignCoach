import { randomBytes } from 'node:crypto';
import { getSignById } from '../src/data/signs.js';
import { STATUS } from '../src/data/feedbackMessages.js';
import { COMPONENT_KEYS } from '../src/feedback/feedbackSchema.js';

const API = '/api/review';
const MAX_CLIP_BYTES = 20 * 1024 * 1024;
const RETENTION_MS = 10 * 60 * 1000;
const ATTEMPT_ID = /^[a-f0-9-]{36}$/;

function json(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
}

async function readBody(req, limit) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req.iterator({ destroyOnReturn: false })) {
    size += chunk.length;
    if (size > limit) {
      req.resume();
      return null;
    }
    chunks.push(chunk);
  }
  return Buffer.concat(chunks, size);
}

function parseFeedback(body) {
  const input = JSON.parse(body.toString());
  const components = {};
  for (const key of COMPONENT_KEYS) {
    const result = input?.[key];
    if (
      !Object.values(STATUS).includes(result?.status) ||
      typeof result.message !== 'string' ||
      !result.message.trim() ||
      result.message.length > 1000
    ) return null;
    components[key] = { status: result.status, message: result.message.trim() };
  }
  return components;
}

export default function reviewServer() {
  function configure(server) {
    const key = randomBytes(32).toString('hex');
    const attempts = new Map();
    let pendingId = null;

    function removeAttempt(id) {
      clearTimeout(attempts.get(id)?.expiry);
      attempts.delete(id);
      if (pendingId === id) pendingId = null;
    }

    function scheduleExpiry(id) {
      return setTimeout(() => removeAttempt(id), RETENTION_MS).unref();
    }

    server.httpServer?.once('listening', () => {
      server.config.logger.info(`  Private operator tab (append to the server URL): /wizard#${key}`);
    });
    server.httpServer?.once('close', () => {
      for (const id of attempts.keys()) removeAttempt(id);
    });

    server.middlewares.use(async (req, res, next) => {
      if (!req.url.startsWith(`${API}/`)) return next();
      res.setHeader('Cache-Control', 'no-store');
      res.setHeader('X-Content-Type-Options', 'nosniff');

      try {
        const url = new URL(req.url, 'http://localhost');
        const [role, id, resource, extra] = url.pathname.slice(API.length + 1).split('/');
        if (role === 'operator') {
          if (req.headers.authorization !== `Bearer ${key}`) {
            return json(res, 401, { error: 'Open the private operator link shown in the server terminal.' });
          }
          if (!id && req.method === 'GET') {
            const attempt = attempts.get(pendingId);
            return json(res, 200, attempt ? { id: pendingId, signId: attempt.signId } : null);
          }
          const attempt = attempts.get(id);
          if (!attempt?.clip || extra !== undefined) {
            return json(res, 404, { error: 'This attempt is no longer awaiting feedback.' });
          }
          if (resource === 'clip' && req.method === 'GET') {
            res.writeHead(200, { 'Content-Type': attempt.mimeType, 'Content-Length': attempt.clip.length });
            return res.end(attempt.clip);
          }
          if (resource === 'feedback' && req.method === 'PUT') {
            const body = await readBody(req, 32 * 1024);
            let components;
            try {
              components = body && parseFeedback(body);
            } catch {
              components = null;
            }
            if (!components) return json(res, 400, { error: 'Provide valid feedback for all four components.' });
            if (attempts.get(id) !== attempt || pendingId !== id) {
              return json(res, 409, { error: 'This attempt is no longer awaiting feedback.' });
            }
            attempt.feedback = { signId: attempt.signId, components };
            attempt.clip = null;
            pendingId = null;
            clearTimeout(attempt.expiry);
            attempt.expiry = scheduleExpiry(id);
            return json(res, 200, { sent: true });
          }
        }

        if (role === 'attempt' && ATTEMPT_ID.test(id ?? '') && resource === undefined) {
          if (req.method === 'PUT') {
            const sign = getSignById(url.searchParams.get('sign'));
            const mimeType = req.headers['content-type']?.split(';')[0].trim();
            if (!sign || !['video/webm', 'video/mp4'].includes(mimeType)) {
              return json(res, 400, { error: 'The sign or video format is invalid.' });
            }
            if (pendingId && pendingId !== id) {
              return json(res, 409, { error: 'Another attempt is awaiting review. Please try again shortly.' });
            }
            const clip = await readBody(req, MAX_CLIP_BYTES);
            if (!clip) return json(res, 413, { error: 'The clip is too large. Try a shorter attempt.' });
            if (!clip.length) return json(res, 400, { error: 'No video was captured. Please try again.' });
            if (pendingId && pendingId !== id) {
              return json(res, 409, { error: 'Another attempt is awaiting review. Please try again shortly.' });
            }
            if (!attempts.has(id)) {
              attempts.set(id, {
                signId: sign.id,
                mimeType,
                clip,
                feedback: null,
                expiry: scheduleExpiry(id),
              });
              pendingId = id;
            }
            return json(res, 200, { received: true });
          }
          if (req.method === 'DELETE') {
            removeAttempt(id);
            res.writeHead(204);
            return res.end();
          }
          if (req.method === 'GET') {
            const attempt = attempts.get(id);
            if (!attempt) return json(res, 404, { error: 'This attempt expired. Please try again.' });
            return json(res, 200, { feedback: attempt.feedback });
          }
        }
        return json(res, 404, { error: 'Unknown review request.' });
      } catch {
        if (!res.destroyed && !res.headersSent) {
          return json(res, 500, { error: 'The review server could not complete the request.' });
        }
      }
    });
  }

  return { name: 'signcoach-review', configureServer: configure, configurePreviewServer: configure };
}
