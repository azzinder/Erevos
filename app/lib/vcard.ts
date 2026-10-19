import { cleanFields, cleanLine, fieldsName, parseBirthday, splitName, type Entry, type Fields, type Kind } from './contacts';
import { fromBase64, toBase64, utf8Decode, utf8Encode } from './crypto';

// vCards (.vcf), the file every contacts app reads and writes, and the MECARD some QR codes hold
// (app/contacts.tsx). Read: versions 2.1, 3.0 and 4.0 as phones and computers write them, with
// folded lines, quoted-printable text in its own character set (an old Greek phone's ISO-8859-7
// among them), Apple's labels, the groups and a photo inside. Written: 3.0, which they all read.
// Nothing is fetched: a photo given as a web address is left out.

/** A contact as a vCard holds it: its fields, the name it shows, its photo and its groups' names. */
export type VCard = Fields & { name: string; photo: Uint8Array | null; groups: string[] };

/** The most contacts read from one file, and the largest photo kept. */
export const MAX_CARDS = 5000;
const MAX_PHOTO = 2_000_000;

// Bytes as a string of one character for each, and back: a vCard is read as bytes, as each of
// its lines may be in its own character set.
function byteString(bytes: Uint8Array): string {
  let out = '';
  for (let i = 0; i < bytes.length; i += 8192) out += String.fromCharCode(...bytes.subarray(i, i + 8192));
  return out;
}

function bytesOf(text: string): Uint8Array {
  const out = new Uint8Array(text.length);
  for (let i = 0; i < text.length; i++) out[i] = text.charCodeAt(i) & 255;
  return out;
}

function validUtf8(bytes: Uint8Array): boolean {
  for (let i = 0; i < bytes.length; ) {
    const b = bytes[i];
    const more = b < 0x80 ? 0 : b >= 0xc2 && b < 0xe0 ? 1 : b >= 0xe0 && b < 0xf0 ? 2 : b >= 0xf0 && b < 0xf5 ? 3 : -1;
    if (more < 0 || i + more >= bytes.length) return false;
    for (let k = 1; k <= more; k++) if ((bytes[i + k] & 0xc0) !== 0x80) return false;
    i += more + 1;
  }
  return true;
}

// Greek in ISO-8859-7 and in Windows-1253: the letters sit 0x2d0 below their Unicode, the rest
// is Latin-1 but for these.
const ISO_GREEK: Record<number, number> = { 0xa1: 0x2018, 0xa2: 0x2019, 0xa4: 0x20ac, 0xa5: 0x20af, 0xaa: 0x37a, 0xaf: 0x2015 };
const WINDOWS_GREEK: Record<number, number> = {
  0x80: 0x20ac, 0x82: 0x201a, 0x83: 0x192, 0x84: 0x201e, 0x85: 0x2026, 0x86: 0x2020, 0x87: 0x2021, 0x89: 0x2030, 0x8b: 0x2039,
  0x91: 0x2018, 0x92: 0x2019, 0x93: 0x201c, 0x94: 0x201d, 0x95: 0x2022, 0x96: 0x2013, 0x97: 0x2014, 0x99: 0x2122, 0x9b: 0x203a,
  0xa1: 0x385, 0xa2: 0x386, 0xaf: 0x2015, 0xb5: 0xb5, 0xb6: 0xb6,
};
const LATIN_IN_GREEK = new Set([0xb7, 0xbb, 0xbd]);

function greek(bytes: Uint8Array, windows: boolean): string {
  const own = windows ? WINDOWS_GREEK : ISO_GREEK;
  let out = '';
  for (const b of bytes) out += String.fromCharCode(own[b] ?? (b >= 0xb4 && !LATIN_IN_GREEK.has(b) ? b + 0x2d0 : b));
  return out;
}

/** Bytes as text in the character set a line names: UTF-8 when it names none. */
function decode(bytes: Uint8Array, charset: string): string {
  const name = charset.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (name === 'iso88597' || name === 'greek' || name === 'elot928') return greek(bytes, false);
  if (name === 'windows1253' || name === 'cp1253') return greek(bytes, true);
  if ((name === '' || name === 'utf8') && validUtf8(bytes)) return utf8Decode(bytes);
  // Latin-1, Windows-1252, ASCII and the rest, as near as it comes.
  return byteString(bytes);
}

function quotedPrintable(text: string): Uint8Array {
  const out: number[] = [];
  for (let i = 0; i < text.length; i++) {
    const hex = text[i] === '=' ? text.slice(i + 1, i + 3) : '';
    if (/^[0-9A-Fa-f]{2}$/.test(hex)) {
      out.push(parseInt(hex, 16));
      i += 2;
    } else out.push(text.charCodeAt(i) & 255);
  }
  return Uint8Array.from(out);
}

/** Splits at `sep` where it is not in quotes. */
function splitOutsideQuotes(text: string, sep: string): string[] {
  const parts: string[] = [];
  let part = '';
  let quoted = false;
  for (const c of text) {
    if (c === '"') quoted = !quoted;
    if (c === sep && !quoted) {
      parts.push(part);
      part = '';
    } else part += c;
  }
  parts.push(part);
  return parts;
}

/** Splits at `sep` where it is not escaped with a backslash; the escapes stay for unescape(). */
function components(text: string, sep: string): string[] {
  const parts: string[] = [];
  let part = '';
  for (let i = 0; i < text.length; i++) {
    if (text[i] === '\\' && i + 1 < text.length) {
      part += text[i] + text[i + 1];
      i++;
    } else if (text[i] === sep) {
      parts.push(part);
      part = '';
    } else part += text[i];
  }
  parts.push(part);
  return parts;
}

function unescape(text: string): string {
  return text.replace(/\\([nN]|.)/g, (_, c: string) => (c === 'n' || c === 'N' ? '\n' : c));
}

type Line = { group: string; name: string; params: Map<string, string[]>; value: string };

// The lines as written, joined again: a line that starts with a space or tab goes on the one
// before (3.0, 4.0, and 2.1's long photos), as does the line after quoted-printable's soft
// break, an = at the end.
function unfold(raw: string): string[] {
  const lines: string[] = [];
  for (const line of raw.split(/\r\n|\r|\n/)) {
    const last = lines.length - 1;
    if (last >= 0 && /^[ \t]/.test(line) && lines[last] !== '') lines[last] += line.slice(1);
    else if (last >= 0 && lines[last].endsWith('=') && /^[^:]*QUOTED-PRINTABLE/i.test(lines[last])) lines[last] = lines[last].slice(0, -1) + line;
    else lines.push(line);
  }
  return lines;
}

const ENCODINGS = new Set(['QUOTED-PRINTABLE', 'BASE64', 'B', '8BIT', '7BIT']);

/** A line's group (item1), its property's name (TEL), its parameters, and its value as written. */
function parseLine(text: string): Line | null {
  let colon = -1;
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    if (text[i] === '"') quoted = !quoted;
    else if (text[i] === ':' && !quoted) {
      colon = i;
      break;
    }
  }
  if (colon < 0) return null;
  const [head, ...rest] = splitOutsideQuotes(text.slice(0, colon), ';');
  let name = head.trim().toUpperCase();
  const dot = name.lastIndexOf('.');
  const group = dot >= 0 ? name.slice(0, dot) : '';
  name = name.slice(dot + 1);
  const params = new Map<string, string[]>();
  for (const param of rest) {
    const eq = param.indexOf('=');
    const bare = param.trim().toUpperCase();
    // 2.1's bare words: a type (CELL), or an encoding without its name.
    const key = eq >= 0 ? param.slice(0, eq).trim().toUpperCase() : ENCODINGS.has(bare) ? 'ENCODING' : 'TYPE';
    const raw = eq >= 0 ? param.slice(eq + 1) : param;
    const values = (key === 'LABEL' ? [raw] : splitOutsideQuotes(raw, ',')).map((v) => v.trim().replace(/^"(.*)"$/s, '$1'));
    params.set(key, [...(params.get(key) ?? []), ...values]);
  }
  return { group, name, params, value: text.slice(colon + 1) };
}

/** A line's value as text, still with its backslash escapes. */
function textOf(line: Line): string {
  const encoding = (line.params.get('ENCODING')?.[0] ?? '').toUpperCase();
  const bytes = encoding === 'QUOTED-PRINTABLE' ? quotedPrintable(line.value) : bytesOf(line.value);
  return decode(bytes, line.params.get('CHARSET')?.[0] ?? '');
}

const typesOf = (line: Line) => new Set((line.params.get('TYPE') ?? []).map((v) => v.toUpperCase()));

// Apple's own labels, written _$!<Mobile>!$_.
const APPLE_KINDS: Record<string, Kind> = { mobile: 'mobile', iphone: 'mobile', home: 'home', work: 'work', main: 'main', homefax: 'fax', workfax: 'fax', otherfax: 'fax', pager: 'pager', other: 'other' };

function kindFrom(line: Line, label: string, field: 'phones' | 'emails' | 'addresses'): { kind: Kind; label: string } {
  const apple = label.match(/^_\$!<(.*)>!\$_$/);
  if (apple) return { kind: APPLE_KINDS[apple[1].toLowerCase()] ?? 'other', label: '' };
  if (label.trim()) return { kind: 'custom', label: label.trim() };
  const types = typesOf(line);
  if (field === 'phones') {
    if (types.has('FAX')) return { kind: 'fax', label: '' };
    if (types.has('PAGER')) return { kind: 'pager', label: '' };
    if (types.has('CELL') || types.has('MOBILE') || types.has('IPHONE')) return { kind: 'mobile', label: '' };
    if (types.has('MAIN') || types.has('COMPANY-MAIN')) return { kind: 'main', label: '' };
  }
  if (field === 'emails' && types.has('CELL')) return { kind: 'mobile', label: '' };
  if (types.has('HOME')) return { kind: 'home', label: '' };
  if (types.has('WORK')) return { kind: 'work', label: '' };
  if (types.has('OTHER')) return { kind: 'other', label: '' };
  // A number of no kind is most likely a mobile now; an email or an address, home.
  return { kind: field === 'phones' ? 'mobile' : field === 'emails' ? 'other' : 'home', label: '' };
}

function photoOf(line: Line): Uint8Array | null {
  const encoding = (line.params.get('ENCODING')?.[0] ?? '').toUpperCase();
  const value = line.value.trim();
  const data = value.match(/^data:image\/[a-z+.-]+;base64,(.*)$/is);
  if (!data && encoding !== 'B' && encoding !== 'BASE64') return null;
  const base64 = data ? data[1] : value;
  if (base64.length > (MAX_PHOTO * 4) / 3 + 8) return null;
  const bytes = fromBase64(base64);
  return bytes.length > 0 ? bytes : null;
}

/** The address of an ADR line: its own label (4.0), or its parts on lines. */
function addressOf(line: Line, text: string): string {
  const label = line.params.get('LABEL')?.[0];
  // A parameter writes its new lines as \n, or as ^n (RFC 6868).
  if (label?.trim()) return unescape(decode(bytesOf(label), line.params.get('CHARSET')?.[0] ?? '')).replace(/\^(n|'|\^)/g, (_, c: string) => (c === 'n' ? '\n' : c === "'" ? '"' : '^'));
  const [box = '', extended = '', street = '', city = '', region = '', code = '', country = ''] = components(text, ';').map(unescape);
  const town = [code, city].filter((p) => p.trim()).join(' ');
  return [box, extended, street, town, region, country].map((p) => p.trim()).filter(Boolean).join('\n');
}

function cardFrom(lines: Line[]): VCard | null {
  const labels = new Map<string, string>();
  for (const line of lines) if (line.group && line.name === 'X-ABLABEL') labels.set(line.group, unescape(textOf(line)));
  let fn = '';
  let given = '';
  let family = '';
  let company = '';
  let title = '';
  let birthday = '';
  let photo: Uint8Array | null = null;
  const phones: Entry[] = [];
  const emails: Entry[] = [];
  const addresses: Entry[] = [];
  const notes: string[] = [];
  const groups: string[] = [];
  for (const line of lines) {
    const label = line.group ? (labels.get(line.group) ?? '') : '';
    switch (line.name) {
      case 'FN':
        fn = unescape(textOf(line));
        break;
      case 'N': {
        const [last = '', first = '', middle = ''] = components(textOf(line), ';').map(unescape);
        given = [first, middle].filter((p) => p.trim()).join(' ');
        family = last;
        break;
      }
      case 'ORG':
        company = components(textOf(line), ';').map(unescape).filter((p) => p.trim()).join(', ');
        break;
      case 'TITLE':
        title = unescape(textOf(line));
        break;
      case 'TEL':
        phones.push({ value: unescape(textOf(line)).replace(/^tel:/i, ''), ...kindFrom(line, label, 'phones') });
        break;
      case 'EMAIL':
        emails.push({ value: unescape(textOf(line)).replace(/^mailto:/i, ''), ...kindFrom(line, label, 'emails') });
        break;
      case 'ADR':
        addresses.push({ value: addressOf(line, textOf(line)), ...kindFrom(line, label, 'addresses') });
        break;
      case 'NOTE':
        notes.push(unescape(textOf(line)));
        break;
      case 'BDAY': {
        const day = parseBirthday(unescape(textOf(line)));
        if (day) birthday = unescape(textOf(line));
        break;
      }
      case 'PHOTO':
        photo = photo ?? photoOf(line);
        break;
      case 'CATEGORIES':
        groups.push(...components(textOf(line), ',').map((g) => cleanLine(unescape(g), 80)).filter(Boolean));
        break;
    }
  }
  const fields = cleanFields({ given, family, company, title, phones, emails, addresses, note: notes.filter((n) => n.trim()).join('\n\n'), birthday });
  const shown = cleanLine(fn);
  // Only the whole name: split it as Android does, unless it is the company's.
  if (!fields.given && !fields.family && shown && shown !== fields.company) Object.assign(fields, splitName(shown));
  const name = shown || fieldsName(fields);
  if (!name) return null;
  return { ...fields, name, photo, groups: [...new Set(groups)] };
}

/** The contacts in a .vcf file (its bytes) or in a text (a QR code's), at most MAX_CARDS. */
export function parseVCards(data: Uint8Array | string): VCard[] {
  let raw = byteString(typeof data === 'string' ? utf8Encode(data) : data);
  if (raw.startsWith(String.fromCharCode(0xef, 0xbb, 0xbf))) raw = raw.slice(3);
  const cards: VCard[] = [];
  let current: Line[] | null = null;
  // A vCard inside another (2.1's AGENT) is left out.
  let inner = 0;
  for (const text of unfold(raw)) {
    if (!text.trim()) continue;
    const line = parseLine(text);
    if (!line) continue;
    const value = line.value.trim().toUpperCase();
    if (line.name === 'BEGIN' && value === 'VCARD') {
      if (current) inner++;
      else current = [];
    } else if (line.name === 'END' && value === 'VCARD') {
      if (inner > 0) inner--;
      else if (current) {
        const card = cardFrom(current);
        if (card) cards.push(card);
        current = null;
        if (cards.length >= MAX_CARDS) break;
      }
    } else if (current && inner === 0) current.push(line);
  }
  return cards;
}

/** The contact in a MECARD (MECARD:N:Family,Given;TEL:…;;), as some QR codes hold one. */
export function parseMeCard(text: string): VCard | null {
  const body = text.trim().replace(/^MECARD:/i, '');
  if (body === text.trim()) return null;
  const fields: Fields = { given: '', family: '', company: '', title: '', phones: [], emails: [], addresses: [], note: '', birthday: '' };
  for (const part of components(body, ';')) {
    const colon = part.indexOf(':');
    if (colon < 0) continue;
    const key = part.slice(0, colon).trim().toUpperCase();
    const value = unescape(part.slice(colon + 1));
    if (key === 'N') {
      const [family = '', given = ''] = components(part.slice(colon + 1), ',').map(unescape);
      if (given.trim()) Object.assign(fields, { given, family });
      else Object.assign(fields, splitName(family));
    } else if (key === 'TEL' || key === 'TEL-AV') fields.phones.push({ value, kind: 'mobile', label: '' });
    else if (key === 'EMAIL') fields.emails.push({ value, kind: 'other', label: '' });
    else if (key === 'ADR') fields.addresses.push({ value, kind: 'home', label: '' });
    else if (key === 'NOTE') fields.note = value;
    else if (key === 'ORG') fields.company = value;
    else if (key === 'BDAY' && parseBirthday(value)) fields.birthday = value;
  }
  const clean = cleanFields(fields);
  const name = fieldsName(clean);
  return name ? { ...clean, name, photo: null, groups: [] } : null;
}

/** The contact a QR code holds, as a vCard or a MECARD, or null when it holds none. */
export function contactFromQr(text: string): VCard | null {
  const trimmed = text.trim();
  if (/^BEGIN:VCARD/i.test(trimmed)) return parseVCards(trimmed)[0] ?? null;
  if (/^MECARD:/i.test(trimmed)) return parseMeCard(trimmed);
  return null;
}

const TEL_TYPES: Record<Kind, string> = { mobile: 'CELL', home: 'HOME', work: 'WORK', main: 'MAIN', fax: 'FAX', pager: 'PAGER', other: 'OTHER', custom: 'OTHER' };
const MAIL_TYPES: Record<Kind, string> = { mobile: 'CELL', home: 'HOME', work: 'WORK', main: 'OTHER', fax: 'OTHER', pager: 'OTHER', other: 'OTHER', custom: 'OTHER' };

const escape = (text: string) => text.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');

const octets = (c: number) => (c < 0x80 ? 1 : c < 0x800 ? 2 : c < 0x10000 ? 3 : 4);

/** A line cut at 75 octets, as 3.0 asks, never inside a character; the rest on lines after it that start with a space. */
function fold(line: string): string {
  const parts: string[] = [];
  let part = '';
  let size = 0;
  let most = 75;
  for (const ch of line) {
    const n = octets(ch.codePointAt(0)!);
    if (size + n > most) {
      parts.push(part);
      part = '';
      size = 0;
      most = 74;
    }
    part += ch;
    size += n;
  }
  parts.push(part);
  return parts.join('\r\n ');
}

/** A contact as a vCard 3.0, with its photo (JPEG or PNG) and its groups when given. */
export function writeVCard(card: Fields & { name?: string; photo?: Uint8Array | null; groups?: string[] }): string {
  const f = cleanFields(card);
  const lines = ['BEGIN:VCARD', 'VERSION:3.0', `N:${[f.family, f.given, '', '', ''].map(escape).join(';')}`, `FN:${escape(cleanLine(card.name ?? '') || fieldsName(f))}`];
  if (f.company) lines.push(`ORG:${escape(f.company)}`);
  if (f.title) lines.push(`TITLE:${escape(f.title)}`);
  let item = 0;
  // An entry of the owner's own kind goes in a group with its label, as Apple and Google write it.
  const entry = (property: string, e: Entry, types: Record<Kind, string>, value: string) => {
    if (e.kind === 'custom' && e.label) {
      item++;
      lines.push(`item${item}.${property}:${value}`, `item${item}.X-ABLabel:${escape(e.label)}`);
    } else lines.push(`${property};TYPE=${types[e.kind]}:${value}`);
  };
  for (const p of f.phones) entry('TEL', p, TEL_TYPES, escape(p.value));
  for (const e of f.emails) entry('EMAIL', e, MAIL_TYPES, escape(e.value));
  for (const a of f.addresses) entry('ADR', a, MAIL_TYPES, ['', '', a.value, '', '', '', ''].map(escape).join(';'));
  if (parseBirthday(f.birthday)) lines.push(`BDAY:${f.birthday}`);
  if (f.note) lines.push(`NOTE:${escape(f.note)}`);
  const groups = [...new Set((card.groups ?? []).map((g) => cleanLine(g, 80)).filter(Boolean))];
  if (groups.length > 0) lines.push(`CATEGORIES:${groups.map(escape).join(',')}`);
  if (card.photo && card.photo.length > 0) {
    const png = card.photo[0] === 0x89 && card.photo[1] === 0x50;
    lines.push(`PHOTO;ENCODING=b;TYPE=${png ? 'PNG' : 'JPEG'}:${toBase64(card.photo)}`);
  }
  lines.push('END:VCARD');
  return `${lines.map(fold).join('\r\n')}\r\n`;
}

/** Text as the bytes of its UTF-8, one character for each: how lib/qr.ts takes text that is not Latin. */
export function qrBytes(text: string): string {
  return byteString(utf8Encode(text));
}
