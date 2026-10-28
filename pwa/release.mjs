// The Erevos web app's release key, and the signatures made with it (README.md).
//
//   node pwa/release.mjs keygen <private key file> [public key file]
//       Makes a new Ed25519 key. The private half goes to the file, encrypted with a passphrase
//       you type, readable by you only; the public half to pwa/release-key.pub, for the
//       repository (or to the file given). Shows the key's fingerprint, which the app shows too.
//   node pwa/release.mjs sign <web app> <private key file> [--android <build> <sha256>]
//       Signs <web app>/release.json (made by pwa/build.mjs) into release.sig, after checking that
//       the service worker there carries this key's public half. With --android, also signs the
//       statement that names the Android app of the same release, by its build and SHA-256, into
//       <web app>/android-update.json, which the server serves beside the web app: Check for
//       updates installs an APK only when it is signed so (app/lib/update-signature.ts).
//   node pwa/release.mjs verify <web app folder, or https://address> [public key file]
//       Checks a release, in a folder or as a server serves it: the signature, every file's hash,
//       and that the service worker carries the key. From a server, Element Call's files
//       (/element-call/) are read from the release's second origin (`origins.call`), which must
//       give the same release.json, release.sig and service worker. Anyone can run it.
//
// The passphrase can also come from EREVOS_RELEASE_PASSPHRASE (for tests; on your own computer,
// typing it is better).
import { createHash, createPrivateKey, createPublicKey, generateKeyPairSync, sign, verify } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC = path.join(here, 'release-key.pub');

function fail(text) {
  console.error(text);
  process.exit(1);
}

/** As the service worker shows it: the first 128 bits of the SHA-256 of the raw public key. */
export function fingerprint(raw) {
  return createHash('sha256').update(raw).digest('hex').slice(0, 32).match(/.{4}/g).join(' ');
}

function rawPublic(key) {
  return (key.type === 'public' ? key : createPublicKey(key)).export({ format: 'der', type: 'spki' }).subarray(-32);
}

function publicFromRaw(raw) {
  // An Ed25519 SubjectPublicKeyInfo is this 12-byte prefix and the 32-byte key.
  return createPublicKey({ key: Buffer.concat([Buffer.from('302a300506032b6570032100', 'hex'), raw]), format: 'der', type: 'spki' });
}

async function passphrase(question) {
  if (process.env.EREVOS_RELEASE_PASSPHRASE) return process.env.EREVOS_RELEASE_PASSPHRASE;
  if (!process.stdin.isTTY) fail('Type the passphrase in a terminal, or set EREVOS_RELEASE_PASSPHRASE.');
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
  // Nothing typed is shown.
  rl._writeToOutput = (text) => {
    if (text.includes(question)) process.stdout.write(text);
  };
  const answer = await new Promise((resolve) => rl.question(question, resolve));
  rl.close();
  process.stdout.write('\n');
  return answer;
}

async function keygen(file, publicFile = PUBLIC) {
  if (!file) fail('usage: node pwa/release.mjs keygen <private key file> [public key file]');
  if (fs.existsSync(file)) fail(`${file} is already there. A new key would lock every installed web app out of updates; move the old one away first if you mean it.`);
  const first = await passphrase('Passphrase for the release key: ');
  if (first.length < 12) fail('Use a passphrase of 12 characters or more.');
  if ((await passphrase('Once more: ')) !== first) fail('The two passphrases differ.');
  const { privateKey, publicKey } = generateKeyPairSync('ed25519');
  fs.mkdirSync(path.dirname(path.resolve(file)), { recursive: true });
  fs.writeFileSync(file, privateKey.export({ format: 'pem', type: 'pkcs8', cipher: 'aes-256-cbc', passphrase: first }), { mode: 0o600 });
  const raw = rawPublic(publicKey);
  fs.writeFileSync(publicFile, `${raw.toString('base64')}\n`);
  console.log(`Private key: ${file} (keep it, and a copy offline; without it no update can be signed)`);
  console.log(`Public key:  ${publicFile}${publicFile === PUBLIC ? ' (commit it)' : ''}`);
  console.log(`Fingerprint: ${fingerprint(raw)}`);
}

/** What the release key signs for the Android app, as app/lib/update-signature.ts statementOf makes it. */
export const androidStatement = (build, sha256) => `erevos android update v1\nbuild ${build}\nsha256 ${sha256}\n`;

async function signRelease(dir, file, ...more) {
  if (!dir || !file) fail('usage: node pwa/release.mjs sign <web app> <private key file> [--android <build> <sha256>]');
  let android = null;
  if (more.length) {
    const [flag, build, sha256] = more;
    if (flag !== '--android' || !/^[1-9]\d*$/.test(build ?? '') || !/^[0-9a-f]{64}$/.test(sha256 ?? '')) {
      fail('usage: node pwa/release.mjs sign <web app> <private key file> [--android <build> <sha256, lowercase hex>]');
    }
    android = androidStatement(Number(build), sha256);
  }
  const key = createPrivateKey({ key: fs.readFileSync(file), passphrase: await passphrase('Passphrase for the release key: ') });
  const raw = rawPublic(key);
  const worker = fs.readFileSync(path.join(dir, 'sw.js'), 'utf8');
  if (!worker.includes(`'${raw.toString('base64')}'`)) fail('The service worker in that build carries another public key. Build it with this key (pwa/release-key.pub).');
  const body = fs.readFileSync(path.join(dir, 'release.json'));
  const release = JSON.parse(body);
  fs.writeFileSync(path.join(dir, 'release.sig'), `${sign(null, body, key).toString('base64')}\n`);
  console.log(`Signed release ${release.version} (${Object.keys(release.files).length} files) with ${fingerprint(raw)}.`);
  if (android) {
    const signature = sign(null, Buffer.from(android), key).toString('base64');
    fs.writeFileSync(path.join(dir, 'android-update.json'), `${JSON.stringify({ statement: android, signature })}\n`);
    console.log(`Signed the Android app of the same release: ${android.trim().split('\n').slice(1).join(', ')}.`);
  }
}

async function read(from, name) {
  if (/^https?:\/\//.test(from)) {
    const response = await fetch(new URL(name, from.endsWith('/') ? from : `${from}/`), { cache: 'no-store' });
    if (!response.ok) throw new Error(`${name}: ${response.status}`);
    return Buffer.from(await response.arrayBuffer());
  }
  return fs.readFileSync(path.join(from, name));
}

async function verifyRelease(from, keyFile = PUBLIC) {
  if (!from) fail('usage: node pwa/release.mjs verify <web app folder, or https://address> [public key file]');
  const raw = Buffer.from(fs.readFileSync(keyFile, 'utf8').trim(), 'base64');
  const body = await read(from, 'release.json');
  const signature = Buffer.from((await read(from, 'release.sig')).toString().trim(), 'base64');
  if (!verify(null, body, publicFromRaw(raw), signature)) fail(`NOT SIGNED with the key ${fingerprint(raw)}.`);
  const release = JSON.parse(body);
  const wrong = [];
  // Element Call's origin, where its frame comes from: its worker checks the same release there.
  const call = /^https?:\/\//.test(from) && release.origins ? release.origins.call : from;
  if (call !== from) {
    for (const name of ['release.json', 'release.sig', 'sw.js']) {
      const there = await read(call, name).catch(() => null);
      if (!there || !there.equals(await read(from, name))) wrong.push(`${call}/${name} (not the same as ${from}'s)`);
    }
  }
  for (const [name, hash] of Object.entries(release.files)) {
    const bytes = await read(name.startsWith('/element-call/') ? call : from, name.slice(1));
    if (createHash('sha256').update(bytes).digest('hex') !== hash) wrong.push(name);
    if (name === '/sw.js' && !bytes.toString().includes(`'${raw.toString('base64')}'`)) wrong.push('/sw.js (another key)');
  }
  if (wrong.length) fail(`Signed release ${release.version}, but these files differ from it:\n  ${wrong.join('\n  ')}`);
  // The Android app's statement, where there is one.
  const android = await read(from, 'android-update.json').catch(() => null);
  if (android) {
    const { statement, signature: signed } = JSON.parse(android);
    if (!/^erevos android update v1\nbuild [1-9]\d*\nsha256 [0-9a-f]{64}\n$/.test(statement ?? '')) fail('android-update.json does not say what it should.');
    if (!verify(null, Buffer.from(statement), publicFromRaw(raw), Buffer.from(signed ?? '', 'base64'))) fail(`android-update.json is NOT SIGNED with the key ${fingerprint(raw)}.`);
    console.log(`OK: the Android app, ${statement.trim().split('\n').slice(1).join(', ')}.`);
  }
  console.log(`OK: release ${release.version}${release.label ? ` (${release.label})` : ''} from ${release.created} (commit ${release.commit ?? 'unknown'}), ${Object.keys(release.files).length} files, signed with ${fingerprint(raw)}.`);
  console.log(`SHA-256 of release.json: ${createHash('sha256').update(body).digest('hex')}`);
}

// Run as a command; imported (by the checks), only what it exports.
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [command, ...rest] = process.argv.slice(2);
  if (command === 'keygen') await keygen(...rest);
  else if (command === 'sign') await signRelease(...rest);
  else if (command === 'verify') await verifyRelease(...rest);
  else fail('usage: node pwa/release.mjs keygen|sign|verify …');
}
