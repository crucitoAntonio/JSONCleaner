import { base64UrlToBytes, cleanToken } from './jwt';

export type VerifyResult =
  { status: 'valid' } | { status: 'invalid' } | { status: 'error'; message: string };

export type KeyKind = 'secret' | 'public-key' | 'unsupported';

const HASHES = { '256': 'SHA-256', '384': 'SHA-384', '512': 'SHA-512' } as const;
const CURVES = { '256': 'P-256', '384': 'P-384', '512': 'P-521' } as const;

type Bits = keyof typeof HASHES;

function parseAlg(alg: unknown): { family: 'HS' | 'RS' | 'PS' | 'ES'; bits: Bits } | null {
  const m = typeof alg === 'string' ? /^(HS|RS|PS|ES)(256|384|512)$/.exec(alg) : null;
  return m ? { family: m[1] as 'HS' | 'RS' | 'PS' | 'ES', bits: m[2] as Bits } : null;
}

export function keyKindFor(alg: unknown): KeyKind {
  const parsed = parseAlg(alg);
  if (!parsed) return 'unsupported';
  return parsed.family === 'HS' ? 'secret' : 'public-key';
}

function secretBytes(secret: string, isBase64: boolean): Uint8Array<ArrayBuffer> | null {
  if (!isBase64) return new TextEncoder().encode(secret);
  const urlSafe = secret.trim().replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return base64UrlToBytes(urlSafe);
}

function pemToSpki(pem: string): Uint8Array<ArrayBuffer> | string {
  if (/BEGIN RSA PUBLIC KEY/.test(pem)) {
    return 'La llave está en formato PKCS#1 (BEGIN RSA PUBLIC KEY). Conviértela a "BEGIN PUBLIC KEY" (SPKI).';
  }
  if (/BEGIN CERTIFICATE/.test(pem)) {
    return 'Es un certificado X.509. Pega solo la llave pública (BEGIN PUBLIC KEY) o un JWK.';
  }
  if (/PRIVATE KEY/.test(pem)) {
    return 'Es una llave privada. Para verificar solo hace falta la pública; no pegues llaves privadas.';
  }
  const m = /-----BEGIN PUBLIC KEY-----([\s\S]+?)-----END PUBLIC KEY-----/.exec(pem);
  if (!m) return 'Pega la llave pública en PEM (-----BEGIN PUBLIC KEY-----) o como JWK.';
  const body = m[1]!.replace(/\s+/g, '').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return base64UrlToBytes(body) ?? 'El contenido del PEM no es Base64 válido.';
}

async function importPublicKey(
  key: string,
  algorithm: RsaHashedImportParams | EcKeyImportParams,
): Promise<CryptoKey | string> {
  const trimmed = key.trim();
  try {
    if (trimmed.startsWith('{')) {
      let jwk: JsonWebKey;
      try {
        jwk = JSON.parse(trimmed) as JsonWebKey;
      } catch {
        return 'El JWK no es JSON válido.';
      }
      if ('d' in jwk) return 'Es una llave privada (JWK con "d"). Pega solo la pública.';
      return await crypto.subtle.importKey('jwk', jwk, algorithm, false, ['verify']);
    }
    const spki = pemToSpki(trimmed);
    if (typeof spki === 'string') return spki;
    return await crypto.subtle.importKey('spki', spki, algorithm, false, ['verify']);
  } catch {
    return 'No se pudo leer la llave, o no corresponde al algoritmo del token.';
  }
}

export async function verifyJwt(
  raw: string,
  key: string,
  opts: { secretIsBase64?: boolean } = {},
): Promise<VerifyResult> {
  const parts = cleanToken(raw).split('.');
  if (parts.length !== 3) return { status: 'error', message: 'El token no tiene 3 partes.' };
  const [h, p, s] = parts as [string, string, string];

  const headerBytes = base64UrlToBytes(h);
  let alg: unknown;
  try {
    alg = headerBytes
      ? (JSON.parse(new TextDecoder().decode(headerBytes)) as { alg?: unknown }).alg
      : undefined;
  } catch {
    alg = undefined;
  }
  const parsed = parseAlg(alg);
  if (!parsed) {
    return {
      status: 'error',
      message: `No se puede verificar el algoritmo "${String(alg)}". Se admiten HS, RS, PS y ES (256/384/512).`,
    };
  }
  if (!key.trim()) {
    return {
      status: 'error',
      message: parsed.family === 'HS' ? 'Escribe el secreto.' : 'Pega la llave pública.',
    };
  }

  const signature = base64UrlToBytes(s);
  if (!signature) return { status: 'error', message: 'La firma no es Base64URL válido.' };
  const data = new TextEncoder().encode(`${h}.${p}`);
  const hash = HASHES[parsed.bits];

  let cryptoKey: CryptoKey | string;
  let verifyAlg: AlgorithmIdentifier | RsaPssParams | EcdsaParams;
  switch (parsed.family) {
    case 'HS': {
      const bytes = secretBytes(key, !!opts.secretIsBase64);
      if (!bytes) return { status: 'error', message: 'El secreto no es Base64 válido.' };
      cryptoKey = await crypto.subtle.importKey('raw', bytes, { name: 'HMAC', hash }, false, [
        'verify',
      ]);
      verifyAlg = 'HMAC';
      break;
    }
    case 'RS':
      cryptoKey = await importPublicKey(key, { name: 'RSASSA-PKCS1-v1_5', hash });
      verifyAlg = 'RSASSA-PKCS1-v1_5';
      break;
    case 'PS':
      cryptoKey = await importPublicKey(key, { name: 'RSA-PSS', hash });
      verifyAlg = { name: 'RSA-PSS', saltLength: Number(parsed.bits) / 8 };
      break;
    case 'ES':
      cryptoKey = await importPublicKey(key, { name: 'ECDSA', namedCurve: CURVES[parsed.bits] });
      verifyAlg = { name: 'ECDSA', hash };
      break;
  }
  if (typeof cryptoKey === 'string') return { status: 'error', message: cryptoKey };

  try {
    const ok = await crypto.subtle.verify(verifyAlg, cryptoKey, signature, data);
    return { status: ok ? 'valid' : 'invalid' };
  } catch {
    return { status: 'invalid' };
  }
}
