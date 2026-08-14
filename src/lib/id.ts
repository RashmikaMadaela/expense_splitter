/**
 * `crypto.randomUUID()` is only defined in a secure context (https, or
 * localhost). Serving this app over plain http:// on a LAN IP - a realistic way
 * to use it on an actual trip - leaves it undefined, which would throw the
 * moment someone adds a person. Fall back to `crypto.getRandomValues`, and to
 * `Math.random` only if neither is available.
 */
export function randomId(): string {
  const c = globalThis.crypto;

  if (typeof c?.randomUUID === 'function') {
    return c.randomUUID();
  }

  if (typeof c?.getRandomValues === 'function') {
    const bytes = c.getRandomValues(new Uint8Array(16));
    return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  }

  return `${Date.now().toString(16)}-${Math.random().toString(16).slice(2, 14)}`;
}
