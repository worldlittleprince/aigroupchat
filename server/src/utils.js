export function withTimeout(promise, ms) {
  const timeout = new Promise((_resolve, reject) => {
    const t = setTimeout(() => {
      clearTimeout(t);
      reject(new Error('timeout'));
    }, ms);
  });
  return Promise.race([promise, timeout]);
}

export function isNoResponse(text) {
  if (!text) return true;
  const t = String(text).trim();
  if (!t) return true;
  if (t === '[NO_RESPONSE]') return true;
  if (t.includes('[NO_RESPONSE]') && t.replace('[NO_RESPONSE]', '').trim().length === 0) return true;
  return false;
}

export function truncate(str, max) {
  const s = String(str || '');
  if (s.length <= max) return s;
  return s.slice(0, max);
}

