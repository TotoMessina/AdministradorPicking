import { createECDH, randomBytes } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync, appendFileSync } from 'node:fs';

// Creates secrets in ignored files; never prints them or replaces existing keys.
const file = '.env.push.local';
if (existsSync(file)) {
  console.log('Las claves push ya existen en .env.push.local. Se conservaron.');
} else {
  const ecdh = createECDH('prime256v1');
  ecdh.generateKeys();
  const publicKey = ecdh.getPublicKey().toString('base64url');
  const privateKey = ecdh.getPrivateKey().toString('base64url');
  const local = existsSync('.env.local') ? readFileSync('.env.local', 'utf8') : '';
  if (/^VITE_VAPID_PUBLIC_KEY=.+$/m.test(local)) {
    throw new Error('Ya hay una clave pública configurada. Recuperá su clave privada antes de generar otro par.');
  }
  writeFileSync(file, `VAPID_PUBLIC_KEY=${publicKey}\nVAPID_PRIVATE_KEY=${privateKey}\nPUSH_DISPATCH_SECRET=${randomBytes(32).toString('base64url')}\n# Reemplazar con el email real de contacto del responsable del sistema.\nVAPID_SUBJECT=mailto:REEMPLAZAR@example.com\n`, { mode: 0o600 });
  if (/^VITE_VAPID_PUBLIC_KEY=.*$/m.test(local)) {
    writeFileSync('.env.local', local.replace(/^VITE_VAPID_PUBLIC_KEY=.*$/m, `VITE_VAPID_PUBLIC_KEY=${publicKey}`));
  } else appendFileSync('.env.local', `\nVITE_VAPID_PUBLIC_KEY=${publicKey}\n`);
  console.log('Claves guardadas en .env.push.local y clave pública agregada a .env.local. Configurá VAPID_SUBJECT antes de desplegar.');
}
