// C:\troxtetherworld\public\api\middleware\index.js
// Middleware API centralisé

import { rateLimit } from './rateLimit.js';
import { auth } from './auth.js';
import { validate } from './validate.js';
import { sanitize } from './sanitize.js';
import { audit } from './audit.js';
import { errorHandler } from './errorHandler.js';

export {
  rateLimit,
  auth,
  validate,
  sanitize,
  audit,
  errorHandler
};

export function composeMiddleware(...middlewares) {
  return async (req, res, next) => {
    let index = 0;
    const runNext = async () => {
      if (index < middlewares.length) {
        try {
          await middlewares[index++](req, res, runNext);
        } catch (err) {
          next(err);
        }
      } else {
        next();
      }
    };
    await runNext();
  };
}