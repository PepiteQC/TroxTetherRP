// C:\troxtetherworld\public\ai\agents\ether-prism\lib\index.js
// Librairies partagées pour EtherPrism

export function generateUUID() {
  return crypto.randomUUID();
}

export function deepMerge(target, source) {
  const output = JSON.parse(JSON.stringify(target));
  for (const [key, value] of Object.entries(source)) {
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      output[key] = deepMerge(output[key] || {}, value);
    } else {
      output[key] = value;
    }
  }
  return output;
}

export function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function formatCurrency(amount, currency = '$') {
  return `${currency}${amount.toLocaleString('fr-FR')}`;
}

export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

export function weightedRandom(items, weights) {
  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < items.length; i++) {
    r -= weights[i];
    if (r <= 0) return items[i];
  }
  return items[items.length - 1];
}