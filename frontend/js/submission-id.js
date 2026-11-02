/* Retry identities are kept in memory only; personal form content is never persisted. */
function uuid() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  if (!globalThis.crypto?.getRandomValues) throw new Error('Secure form submission is unavailable. Please email techtrasier@gmail.com.');
  const bytes = globalThis.crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = [...bytes].map(byte => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function createSubmissionIds(createId = uuid) {
  let fingerprint;
  let currentId;
  return {
    forPayload(payload) {
      const next = JSON.stringify(payload);
      if (next !== fingerprint || !currentId) {
        currentId = createId();
        fingerprint = next;
      }
      return currentId;
    },
    reset() { fingerprint = undefined; currentId = undefined; },
  };
}
