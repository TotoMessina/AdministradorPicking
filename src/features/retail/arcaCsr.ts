// Pedido de certificado (CSR) para ARCA generado en el navegador. La clave privada se crea en este equipo
// y no pasa por ningún servidor hasta que la persona la carga junto con el certificado.

type Bytes = Uint8Array<ArrayBuffer>;
const text = new TextEncoder();

const concat = (parts: Bytes[]): Bytes => {
  const out = new Uint8Array(parts.reduce((n, part) => n + part.length, 0));
  let at = 0;
  for (const part of parts) { out.set(part, at); at += part.length; }
  return out;
};
const length = (n: number) => n < 0x80 ? [n] : n < 0x100 ? [0x81, n] : [0x82, n >> 8, n & 0xff];
const der = (tag: number, ...parts: Bytes[]) => {
  const body = concat(parts);
  return concat([new Uint8Array([tag, ...length(body.length)]), body]);
};
const oid = (value: string) => {
  const [first, second, ...rest] = value.split('.').map(Number);
  const bytes = [first * 40 + second];
  for (const part of rest) {
    const chunk = [part & 0x7f];
    for (let v = part >> 7; v; v >>= 7) chunk.unshift((v & 0x7f) | 0x80);
    bytes.push(...chunk);
  }
  return der(0x06, new Uint8Array(bytes));
};
const utf8 = (value: string) => der(0x0c, text.encode(value) as Bytes);
const printable = (value: string) => der(0x13, text.encode(value) as Bytes);
const attribute = (type: string, value: Bytes) => der(0x31, der(0x30, oid(type), value));
const pem = (label: string, data: ArrayBuffer | Bytes) => {
  const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
  let binary = '';
  bytes.forEach(byte => { binary += String.fromCharCode(byte); });
  return `-----BEGIN ${label}-----\n${btoa(binary).match(/.{1,64}/g)!.join('\n')}\n-----END ${label}-----\n`;
};

/** Mismo pedido que `openssl req -subj "/C=AR/O=…/CN=…/serialNumber=CUIT …"`, firmado con RSA 2048 y SHA-256. */
export async function generateArcaCsr(cuit: string, razonSocial: string, alias = 'kiosco_pos') {
  if (!globalThis.crypto?.subtle) throw new Error('Este navegador no puede generar claves. Usá el comando de OpenSSL de abajo');
  const keys = await crypto.subtle.generateKey(
    { name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' },
    true,
    ['sign', 'verify'],
  );
  const publicKey = new Uint8Array(await crypto.subtle.exportKey('spki', keys.publicKey));
  const subject = der(0x30,
    attribute('2.5.4.6', printable('AR')),
    attribute('2.5.4.10', utf8(razonSocial.trim().slice(0, 64) || 'Comercio')),
    attribute('2.5.4.3', utf8(alias)),
    attribute('2.5.4.5', printable(`CUIT ${cuit}`)),
  );
  const info = der(0x30, der(0x02, new Uint8Array([0])), subject, publicKey, new Uint8Array([0xa0, 0]));
  const signature = new Uint8Array(await crypto.subtle.sign('RSASSA-PKCS1-v1_5', keys.privateKey, info));
  const request = der(0x30, info, der(0x30, oid('1.2.840.113549.1.1.11'), new Uint8Array([0x05, 0])), der(0x03, new Uint8Array([0]), signature));
  return {
    csr: pem('CERTIFICATE REQUEST', request),
    privateKey: pem('PRIVATE KEY', await crypto.subtle.exportKey('pkcs8', keys.privateKey)),
  };
}
