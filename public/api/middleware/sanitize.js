// C:\troxtetherworld\public\api\middleware\sanitize.js
// Nettoyage et assainissement des entrées

export function sanitize(input) {
  if (typeof input === 'string') {
    return sanitizeString(input);
  }
  if (Array.isArray(input)) {
    return input.map(sanitize);
  }
  if (typeof input === 'object' && input !== null) {
    const sanitized = {};
    for (const [key, value] of Object.entries(input)) {
      sanitized[sanitizeKey(key)] = sanitize(value);
    }
    return sanitized;
  }
  return input;
}

function sanitizeString(str) {
  return str
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
    .replace(/javascript\s*:/gi, '')
    .replace(/data:\s*text\/html/gi, '')
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '')
    .trim();
}

function sanitizeKey(key) {
  return key.replace(/[^a-zA-Z0-9_-]/g, '_');
}

// Middleware Express
export function sanitizeMiddleware(req, res, next) {
  if (req.body) req.body = sanitize(req.body);
  if (req.query) req.query = sanitize(req.query);
  if (req.params) req.params = sanitize(req.params);
  next();
}