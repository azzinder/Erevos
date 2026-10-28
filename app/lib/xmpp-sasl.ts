import { hmac } from '@noble/hashes/hmac.js';
import { sha1 } from '@noble/hashes/legacy.js';
import { pbkdf2 } from '@noble/hashes/pbkdf2.js';
import { sha256 } from '@noble/hashes/sha2.js';

import { fromBase64, randomBytes, toBase64, utf8Decode, utf8Encode } from './crypto';
import { t } from './i18n';

// Signing in to an XMPP server (RFC 6120 §6): SCRAM (RFC 5802, RFC 7677), which proves the
// password without sending it and proves the server knows it too, or PLAIN only inside TLS, for
// servers with nothing better. Channel binding (the -PLUS kinds) is not used.

export type Mechanism = 'SCRAM-SHA-256' | 'SCRAM-SHA-1' | 'PLAIN';

/** The best kind both sides know, PLAIN only over TLS. */
export function pickMechanism(offered: string[], secure: boolean): Mechanism | null {
  for (const kind of ['SCRAM-SHA-256', 'SCRAM-SHA-1'] as const) if (offered.includes(kind)) return kind;
  return secure && offered.includes('PLAIN') ? 'PLAIN' : null;
}

/** The username part of SCRAM's messages: '=' and ',' written as RFC 5802 asks. */
const saslName = (user: string) => user.replace(/=/g, '=3D').replace(/,/g, '=2C');

export type Sasl = {
  /** What goes in <auth>: base64, or '=' for empty. */
  first: string;
  /** Answers the server's challenge (base64) with the response (base64). */
  answer(challenge: string): string;
  /** Checks the server's last word (base64, from <success>); throws when it does not prove the password. */
  finish(success: string): void;
};

export function startSasl(mechanism: Mechanism, user: string, password: string, givenNonce?: string): Sasl {
  const secret = password.normalize('NFKC');
  if (mechanism === 'PLAIN') {
    return {
      first: toBase64(utf8Encode(`\0${user}\0${secret}`)),
      answer: () => {
        throw new Error('PLAIN has no challenge');
      },
      finish: () => undefined,
    };
  }
  const hash = mechanism === 'SCRAM-SHA-256' ? sha256 : sha1;
  const nonce = givenNonce ?? toBase64(randomBytes(18)).replace(/[=,]/g, '');
  const firstBare = `n=${saslName(user)},r=${nonce}`;
  let serverSignature: Uint8Array | null = null;
  return {
    first: toBase64(utf8Encode(`n,,${firstBare}`)),
    answer(challenge: string): string {
      const serverFirst = utf8Decode(fromBase64(challenge));
      const parts = Object.fromEntries(serverFirst.split(',').map((p) => [p[0], p.slice(2)]));
      const iterations = Number(parts.i);
      if (!parts.r?.startsWith(nonce) || parts.r.length <= nonce.length || !parts.s || !Number.isInteger(iterations)) {
        throw new Error(t('The XMPP server answered sign-in in a way it should not.'));
      }
      // Fewer rounds than RFC 5802 asks would let a server that was broken into learn the password quickly.
      if (iterations < 4096 || iterations > 1_000_000) throw new Error(t('The XMPP server asks for an unsafe sign-in.'));
      const salted = pbkdf2(hash, utf8Encode(secret), fromBase64(parts.s), { c: iterations, dkLen: hash.outputLen });
      const clientKey = hmac(hash, salted, utf8Encode('Client Key'));
      const storedKey = hash(clientKey);
      const finalBare = `c=biws,r=${parts.r}`;
      const authMessage = utf8Encode(`${firstBare},${serverFirst},${finalBare}`);
      const signature = hmac(hash, storedKey, authMessage);
      const proof = clientKey.map((b, i) => b ^ signature[i]);
      serverSignature = hmac(hash, hmac(hash, salted, utf8Encode('Server Key')), authMessage);
      return toBase64(utf8Encode(`${finalBare},p=${toBase64(proof)}`));
    },
    finish(success: string): void {
      const text = utf8Decode(fromBase64(success || ''));
      const v = text.split(',').find((p) => p.startsWith('v='))?.slice(2);
      if (!serverSignature || !v || toBase64(serverSignature) !== v) {
        throw new Error(t('The XMPP server did not prove it knows the password: it may not be the real one.'));
      }
    },
  };
}
