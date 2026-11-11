/**
 * Minimal JWS + X.509 verification for Apple StoreKit signed transactions.
 *
 * Only WebCrypto is used so the code runs in Cloudflare Workers. The JWS is
 * signed by Apple with an ES256 key; the signing certificate chains up to the
 * pinned Apple root CAs below.
 */

const APPLE_ROOT_G3 =
  'MIICQzCCAcmgAwIBAgIILcX8iNLFS5UwCgYIKoZIzj0EAwMwZzEbMBkGA1UEAwwSQXBwbGUgUm9vdCBDQSAtIEczMSYwJAYDVQQLDB1BcHBsZSBDZXJ0aWZpY2F0aW9uIEF1dGhvcml0eTETMBEGA1UECgwKQXBwbGUgSW5jLjELMAkGA1UEBhMCVVMwHhcNMTQwNDMwMTgxOTA2WhcNMzkwNDMwMTgxOTA2WjBnMRswGQYDVQQDDBJBcHBsZSBSb290IENBIC0gRzMxJjAkBgNVBAsMHUFwcGxlIENlcnRpZmljYXRpb24gQXV0aG9yaXR5MRMwEQYDVQQKDApBcHBsZSBJbmMuMQswCQYDVQQGEwJVUzB2MBAGByqGSM49AgEGBSuBBAAiA2IABJjpLz1AcqTtkyJygRMc3RCV8cWjTnHcFBbZDuWmBSp3ZHtfTjjTuxxEtX/1H7YyYl3J6YRbTzBPEVoA/VhYDKX1DyxNB0cTddqXl5dvMVztK517IDvYuVTZXpmkOlEKMaNCMEAwHQYDVR0OBBYEFLuw3qFYM4iapIqZ3r6966/ayySrMA8GA1UdEwEB/wQFMAMBAf8wDgYDVR0PAQH/BAQDAgEGMAoGCCqGSM49BAMDA2gAMGUCMQCD6cHEFl4aXTQY2e3v9GwOAEZLuN+yRhHFD/3meoyhpmvOwgPUnPWTxnS4at+qIxUCMG1mihDK1A3UT82NQz60imOlM27jbdoXt2QfyFMm+YhidDkLF1vLUagM6BgD56KyKA==';

const APPLE_ROOT_G2 =
  'MIIFkjCCA3qgAwIBAgIIAeDltYNno+AwDQYJKoZIhvcNAQEMBQAwZzEbMBkGA1UEAwwSQXBwbGUgUm9vdCBDQSAtIEcyMSYwJAYDVQQLDB1BcHBsZSBDZXJ0aWZpY2F0aW9uIEF1dGhvcml0eTETMBEGA1UECgwKQXBwbGUgSW5jLjELMAkGA1UEBhMCVVMwHhcNMTQwNDMwMTgxMDA5WhcNMzkwNDMwMTgxMDA5WjBnMRswGQYDVQQDDBJBcHBsZSBSb290IENBIC0gRzIxJjAkBgNVBAsMHUFwcGxlIENlcnRpZmljYXRpb24gQXV0aG9yaXR5MRMwEQYDVQQKDApBcHBsZSBJbmMuMQswCQYDVQQGEwJVUzCCAiIwDQYJKoZIhvcNAQEBBQADggIPADCCAgoCggIBANgREkhI2imKScUcx+xuM23+TfvgHN6sXuI2pyT5f1BrTM65MFQn5bPW7SXmMLYFN14UIhHF6Kob0vuy0gmVOKTvKkmMXT5xZgM4+xb1hYjkWpIMBDLyyED7Ul+f9sDx47pFoFDVEovy3d6RhiPw9bZyLgHaC/YuOQhfGaFjQQscp5TBhsRTL3b2CtcM0YM/GlMZ81fVJ3/8E7j4ko380yhDPLVoACVdJ2LT3VXdRCCQgzWTxb+4Gftr49wIQuavbfqeQMpOhYV4SbHXw8EwOTKrfl+q04tvny0aIWhwZ7Oj8ZhBbZF8+NfbqOdfIRqMM78xdLe40fTgIvS/cjTf94FNcX1RoeKz8NMoFnNvzcytN31O661A4T+B/fc9Cj6i8b0xlilZ3MIZgIxbdMYs0xBTJh0UT8TUgWY8h2czJxQI6bR3hDRSj4n4aJgXv8O7qhOTH11UL6jHfPsNFL4VPSQ08prcdUFmIrQB1guvkJ4M6mL4m1k8COKWNORj3rw31OsMiANDC1CvoDTdUE0V+1ok2Az6DGOeHwOx4e7hqkP0ZmUoNwIx7wHHHtHMn23KVDpA287PT0aLSmWaasZobNfMmRtHsHLDd4/E92GcdB/O/WuhwpyUgquUoue9G7q5cDmVF8Up8zlYNPXEpMZ7YLlmQ1A/bmH8DvmGqmAMQ0uVAgMBAAGjQjBAMB0GA1UdDgQWBBTEmRNsGAPCe8CjoA1/coB6HHcmjTAPBgNVHRMBAf8EBTADAQH/MA4GA1UdDwEB/wQEAwIBBjANBgkqhkiG9w0BAQwFAAOCAgEAUabz4vS4PZO/Lc4Pu1vhVRROTtHlznldgX/+tvCHM/jvlOV+3Gp5pxy+8JS3ptEwnMgNCnWefZKVfhidfsJxaXwU6s+DDuQUQp50DhDNqxq6EWGBeNjxtUVAeKuowM77fWM3aPbn+6/Gw0vsHzYmE1SGlHKy6gLti23kDKaQwFd1z4xCfVzmMX3zybKSaUYOiPjjLUKyOKimGY3xn83uamW8GrAlvacp/fQ+onVJv57byfenHmOZ4VxG/5IFjPoeIPmGlFYl5bRXOJ3riGQUIUkhOb9iZqmxospvPyFgxYnURTbImHy99v6ZSYA7LNKmp4gDBDEZt7Y6YUX6yfIjyGNzv1aJMbDZfGKnexWoiIqrOEDCzBL/FePwN983csvMmOa/orz6JopxVtfnJBtIRD6e/J/JzBrsQzwBvDR4yGn1xuZW7AYJNpDrFEobXsmII9oDMJELuDY++ee1KG++P+w8j2Ud5cAeh6Squpj9kuNsJnfdBrRkBof0Tta6SqoWqPQFZ2aWuuJVecMsXUmPgEkrihLHdoBR37q9ZV0+N0djMenl9MU/S60EinpxLK8JQzcPqOMyT/RFtm2XNuyE9QoB6he7hY1Ck3DDUOUUi78/w0EP3SIEIwiKum1xRKtzCTrJ+VKACd+66eYWyi4uTLLT3OUEVLLUNIAytbwPF+E=';

export interface StoreKitTransaction {
  transactionId?: string;
  originalTransactionId?: string;
  bundleId?: string;
  productId?: string;
  purchaseDate?: number;
  expiresDate?: number;
  revocationDate?: number;
  appAccountToken?: string;
  environment?: string;
  type?: string;
}

interface Tlv {
  tag: number;
  start: number;
  contentStart: number;
  end: number;
}

interface Certificate {
  der: Uint8Array;
  tbs: Uint8Array;
  signature: Uint8Array;
  signatureAlgorithm: string;
  spki: Uint8Array;
  issuer: Uint8Array;
  subject: Uint8Array;
}

const OID = {
  commonName: '2.5.4.3',
  ecPublicKey: '1.2.840.10045.2.1',
  prime256v1: '1.2.840.10045.3.1.7',
  secp384r1: '1.3.132.0.34',
  secp521r1: '1.3.132.0.35',
  rsaEncryption: '1.2.840.113549.1.1.1',
  ecdsaWithSHA256: '1.2.840.10045.4.3.2',
  ecdsaWithSHA384: '1.2.840.10045.4.3.3',
  ecdsaWithSHA512: '1.2.840.10045.4.3.4',
  sha256WithRSA: '1.2.840.113549.1.1.11',
  sha384WithRSA: '1.2.840.113549.1.1.12',
  sha512WithRSA: '1.2.840.113549.1.1.13',
} as const;

function readTlv(buffer: Uint8Array, offset: number): Tlv {
  if (offset + 2 > buffer.length) throw new Error('DER_TRUNCATED');
  const tag = buffer[offset];
  let cursor = offset + 1;
  let length = buffer[cursor++];
  if (length & 0x80) {
    const bytes = length & 0x7f;
    if (bytes === 0 || bytes > 4 || cursor + bytes > buffer.length) throw new Error('DER_LENGTH');
    length = 0;
    for (let index = 0; index < bytes; index += 1) length = length * 256 + buffer[cursor++];
  }
  const end = cursor + length;
  if (end > buffer.length) throw new Error('DER_TRUNCATED');
  return { tag, start: offset, contentStart: cursor, end };
}

function readChildren(buffer: Uint8Array, parent: Tlv): Tlv[] {
  const children: Tlv[] = [];
  let cursor = parent.contentStart;
  while (cursor < parent.end) {
    const child = readTlv(buffer, cursor);
    children.push(child);
    cursor = child.end;
  }
  return children;
}

function derivative(buffer: Uint8Array, tlv: Tlv): Uint8Array {
  return buffer.slice(tlv.start, tlv.end);
}

function oidToString(buffer: Uint8Array, tlv: Tlv): string {
  const bytes = buffer.slice(tlv.contentStart, tlv.end);
  if (bytes.length === 0) return '';
  const parts: number[] = [Math.floor(bytes[0] / 40), bytes[0] % 40];
  let value = 0;
  for (let index = 1; index < bytes.length; index += 1) {
    value = value * 128 + (bytes[index] & 0x7f);
    if (!(bytes[index] & 0x80)) {
      parts.push(value);
      value = 0;
    }
  }
  return parts.join('.');
}

export function base64ToBytes(value: string): Uint8Array {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
  return Uint8Array.from(atob(padded), (char) => char.charCodeAt(0));
}

function parseCertificate(der: Uint8Array): Certificate {
  const root = readTlv(der, 0);
  if (root.tag !== 0x30) throw new Error('CERT_INVALID');
  const [tbsTlv, algorithmTlv, signatureTlv] = readChildren(der, root);
  if (!tbsTlv || !algorithmTlv || !signatureTlv) throw new Error('CERT_INVALID');
  if (tbsTlv.tag !== 0x30 || algorithmTlv.tag !== 0x30 || signatureTlv.tag !== 0x03) {
    throw new Error('CERT_INVALID');
  }

  const algorithmChildren = readChildren(der, algorithmTlv);
  const signatureAlgorithm = oidToString(der, algorithmChildren[0]);

  const tbsChildren = readChildren(der, tbsTlv);
  let index = 0;
  if (tbsChildren[index]?.tag === 0xa0) index += 1;
  index += 1; // serialNumber
  index += 1; // inner signature algorithm
  const issuer = derivative(der, tbsChildren[index]);
  index += 1; // issuer
  index += 1; // validity
  const subject = derivative(der, tbsChildren[index]);
  index += 1; // subject
  const spki = derivative(der, tbsChildren[index]);
  if (!issuer || !subject || !spki) throw new Error('CERT_INVALID');

  const signature = der.slice(signatureTlv.contentStart + 1, signatureTlv.end);

  return {
    der,
    tbs: derivative(der, tbsTlv),
    signature,
    signatureAlgorithm,
    spki,
    issuer,
    subject,
  };
}

function curveFromOid(oid: string): 'P-256' | 'P-384' | 'P-521' {
  if (oid === OID.prime256v1) return 'P-256';
  if (oid === OID.secp384r1) return 'P-384';
  if (oid === OID.secp521r1) return 'P-521';
  throw new Error('UNSUPPORTED_CURVE');
}

async function importPublicKey(
  spki: Uint8Array,
  rsaHash: 'SHA-256' | 'SHA-384' | 'SHA-512' = 'SHA-256',
): Promise<CryptoKey> {
  const root = readTlv(spki, 0);
  const [algorithmTlv, keyTlv] = readChildren(spki, root);
  if (!algorithmTlv || !keyTlv) throw new Error('SPKI_INVALID');
  const algorithmChildren = readChildren(spki, algorithmTlv);
  const algorithmOid = oidToString(spki, algorithmChildren[0]);

  if (algorithmOid === OID.ecPublicKey) {
    const parameterOid = algorithmChildren[1]
      ? oidToString(spki, algorithmChildren[1])
      : OID.prime256v1;
    return crypto.subtle.importKey(
      'spki',
      spki,
      { name: 'ECDSA', namedCurve: curveFromOid(parameterOid) },
      false,
      ['verify'],
    );
  }
  if (algorithmOid === OID.rsaEncryption) {
    return crypto.subtle.importKey(
      'spki',
      spki,
      { name: 'RSASSA-PKCS1-v1_5', hash: rsaHash },
      false,
      ['verify'],
    );
  }
  throw new Error('UNSUPPORTED_KEY');
}

function derSignatureToRaw(signature: Uint8Array, size: number): Uint8Array {
  const sequence = readTlv(signature, 0);
  const [rTlv, sTlv] = readChildren(signature, sequence);
  if (!rTlv || !sTlv) throw new Error('SIGNATURE_INVALID');
  const raw = new Uint8Array(size * 2);
  const normalize = (tlv: Tlv): Uint8Array => {
    let value = signature.slice(tlv.contentStart, tlv.end);
    while (value.length > 1 && value[0] === 0) value = value.slice(1);
    return value;
  };
  const r = normalize(rTlv);
  const s = normalize(sTlv);
  raw.set(r, size - r.length);
  raw.set(s, size * 2 - s.length);
  return raw;
}

async function verifyCertificateSignature(
  certificate: Certificate,
  issuerSpki: Uint8Array,
): Promise<boolean> {
  try {
    switch (certificate.signatureAlgorithm) {
      case OID.ecdsaWithSHA256: {
        const key = await importPublicKey(issuerSpki);
        return crypto.subtle.verify(
          { name: 'ECDSA', hash: 'SHA-256' },
          key,
          derSignatureToRaw(certificate.signature, 32),
          certificate.tbs,
        );
      }
      case OID.ecdsaWithSHA384: {
        const key = await importPublicKey(issuerSpki);
        return crypto.subtle.verify(
          { name: 'ECDSA', hash: 'SHA-384' },
          key,
          derSignatureToRaw(certificate.signature, 48),
          certificate.tbs,
        );
      }
      case OID.ecdsaWithSHA512: {
        const key = await importPublicKey(issuerSpki);
        return crypto.subtle.verify(
          { name: 'ECDSA', hash: 'SHA-512' },
          key,
          derSignatureToRaw(certificate.signature, 66),
          certificate.tbs,
        );
      }
      case OID.sha256WithRSA: {
        const key = await importPublicKey(issuerSpki, 'SHA-256');
        return crypto.subtle.verify(
          { name: 'RSASSA-PKCS1-v1_5' },
          key,
          certificate.signature,
          certificate.tbs,
        );
      }
      case OID.sha384WithRSA: {
        const key = await importPublicKey(issuerSpki, 'SHA-384');
        return crypto.subtle.verify(
          { name: 'RSASSA-PKCS1-v1_5' },
          key,
          certificate.signature,
          certificate.tbs,
        );
      }
      case OID.sha512WithRSA: {
        const key = await importPublicKey(issuerSpki, 'SHA-512');
        return crypto.subtle.verify(
          { name: 'RSASSA-PKCS1-v1_5' },
          key,
          certificate.signature,
          certificate.tbs,
        );
      }
      default:
        return false;
    }
  } catch {
    return false;
  }
}

function sameBytes(left: Uint8Array, right: Uint8Array): boolean {
  if (left.length !== right.length) return false;
  let diff = 0;
  for (let index = 0; index < left.length; index += 1) diff |= left[index] ^ right[index];
  return diff === 0;
}

function decodeSegment(value: string): string {
  return new TextDecoder().decode(base64ToBytes(value));
}

/**
 * Verifies the JWS signature and certificate chain, returning the decoded
 * payload. `trustedRoots` are DER certificates accepted as trust anchors.
 */
export async function verifySignedJws<T>(
  jws: string,
  trustedRoots: Uint8Array[],
): Promise<T> {
  const segments = jws.split('.');
  if (segments.length !== 3) throw new Error('JWS_INVALID');
  const [headerSegment, payloadSegment, signatureSegment] = segments;

  const header = JSON.parse(decodeSegment(headerSegment)) as {
    alg?: string;
    x5c?: string[];
  };
  if (header.alg !== 'ES256') throw new Error('JWS_ALGORITHM');
  if (!Array.isArray(header.x5c) || header.x5c.length < 2) throw new Error('JWS_CHAIN');

  const chain = header.x5c.map((value) => parseCertificate(base64ToBytes(value)));
  const leaf = chain[0];

  const leafKey = await importPublicKey(leaf.spki);
  const signed = new TextEncoder().encode(`${headerSegment}.${payloadSegment}`);
  const signatureOk = await crypto.subtle.verify(
    { name: 'ECDSA', hash: 'SHA-256' },
    leafKey,
    base64ToBytes(signatureSegment),
    signed,
  );
  if (!signatureOk) throw new Error('JWS_SIGNATURE');

  const roots = trustedRoots.map((der) => parseCertificate(der));
  const trusted = (candidate: Certificate): boolean =>
    roots.some((root) => sameBytes(root.der, candidate.der));

  let anchored = false;
  for (let index = 0; index < chain.length - 1; index += 1) {
    const child = chain[index];
    const parent = chain[index + 1];
    if (!sameBytes(child.issuer, parent.subject)) throw new Error('JWS_ISSUER');
    if (!(await verifyCertificateSignature(child, parent.spki))) {
      throw new Error('JWS_CHAIN_SIGNATURE');
    }
    if (trusted(parent)) anchored = true;
  }

  if (!anchored) {
    const last = chain[chain.length - 1];
    for (const root of roots) {
      if (!sameBytes(last.issuer, root.subject)) continue;
      if (await verifyCertificateSignature(last, root.spki)) {
        anchored = true;
        break;
      }
    }
  }
  if (!anchored) throw new Error('JWS_UNTRUSTED');

  return JSON.parse(decodeSegment(payloadSegment)) as T;
}

export function appleRootCertificates(): Uint8Array[] {
  return [base64ToBytes(APPLE_ROOT_G3), base64ToBytes(APPLE_ROOT_G2)];
}

export async function verifyStoreKitTransaction(jws: string): Promise<StoreKitTransaction> {
  return verifySignedJws<StoreKitTransaction>(jws, appleRootCertificates());
}
