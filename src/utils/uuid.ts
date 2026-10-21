/**
 * Generador seguro de UUID v4 con soporte para contextos no seguros (HTTP / IP local)
 * y navegadores que no implementan `crypto.randomUUID()`.
 */
export function randomUUID(): string {
  if (typeof crypto !== 'undefined') {
    if (typeof crypto.randomUUID === 'function') {
      try {
        return crypto.randomUUID();
      } catch {
        // En algunos webviews o contextos inseguros, crypto.randomUUID puede lanzar error
      }
    }

    if (typeof crypto.getRandomValues === 'function') {
      try {
        const bytes = new Uint8Array(16);
        crypto.getRandomValues(bytes);
        bytes[6] = (bytes[6] & 0x0f) | 0x40; // Versión 4
        bytes[8] = (bytes[8] & 0x3f) | 0x80; // Variante RFC4122
        const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
        return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
      } catch {
        // Continuar al fallback
      }
    }
  }

  // Fallback RFC4122 v4 basado en performance/timestamp y Math.random
  let d = Date.now();
  let d2 = (typeof performance !== 'undefined' && performance.now && performance.now() * 1000) || 0;
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    let r = Math.random() * 16;
    if (d > 0) {
      r = (d + r) % 16 | 0;
      d = Math.floor(d / 16);
    } else if (d2 > 0) {
      r = (d2 + r) % 16 | 0;
      d2 = Math.floor(d2 / 16);
    } else {
      r = r | 0;
    }
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

// Polyfill global para que cualquier código de terceros o nativo que invoque
// `crypto.randomUUID()` funcione sin lanzar TypeError en contextos HTTP.
if (typeof globalThis !== 'undefined') {
  try {
    const g = globalThis as unknown as { crypto?: { randomUUID?: () => string; getRandomValues?: Crypto['getRandomValues'] } };
    if (!g.crypto) {
      g.crypto = { randomUUID };
    } else if (typeof g.crypto.randomUUID !== 'function') {
      try {
        Object.defineProperty(g.crypto, 'randomUUID', {
          value: randomUUID,
          configurable: true,
          writable: true,
        });
      } catch {
        g.crypto.randomUUID = randomUUID;
      }
    }
  } catch {
    // Silencioso en caso de entornos con descriptores sellados
  }
}
