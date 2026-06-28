export function ok(data, meta = {}) {
  return { ok: true, data, meta };
}

export function fail(message, code = "SERVER_ERROR", details = {}) {
  return { ok: false, error: { code, message, details } };
}
