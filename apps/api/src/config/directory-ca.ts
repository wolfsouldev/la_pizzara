import { readFileSync } from 'node:fs';
import { X509Certificate } from 'node:crypto';
import { createSecureContext } from 'node:tls';
export function readDirectoryCa(path: string) {
  const ca = readFileSync(path);
  const text = ca.toString('utf8');
  const certificates = text.match(/-----BEGIN CERTIFICATE-----[\s\S]*?-----END CERTIFICATE-----/g);
  if (!certificates?.length || text.includes('PRIVATE KEY')) throw new Error('Se requiere CA pública PEM, nunca una clave privada');
  for (const pem of certificates) {
    const cert = new X509Certificate(pem);
    if (!cert.ca || Date.parse(cert.validFrom) > Date.now() || Date.parse(cert.validTo) <= Date.now()) throw new Error('CA LDAP no válida o caducada');
  }
  createSecureContext({ ca, minVersion: 'TLSv1.2' });
  return ca;
}
