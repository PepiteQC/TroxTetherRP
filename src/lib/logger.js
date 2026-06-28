// lib/logger.js
export const log = (...args) => {
  console.log('[ETHER-PRISM]', ...args);
};

export const warn = (...args) => {
  console.warn('[ETHER-PRISM:WARN]', ...args);
};

export const error = (...args) => {
  console.error('[ETHER-PRISM:ERROR]', ...args);
};
