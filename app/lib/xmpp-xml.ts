// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

// The XML of XMPP (RFC 6120), as lib/xmpp.ts reads and writes it: elements with their namespace,
// attributes and children, read as they come from a stream that never ends, or one frame at a time
// (RFC 7395, over WebSocket). Only what XMPP uses: no DTDs, no entities beyond XML's own five and
// numbered characters; processing instructions and comments are skipped.

export type XmlNode = XmlElement | string;

export type XmlElement = {
  /** The local name, without a prefix. */
  name: string;
  /** Its namespace, declared on it or inherited. */
  ns: string;
  attrs: Record<string, string>;
  children: XmlNode[];
};

/** An element to send: `attrs` with undefined values are left out, children may be text. */
export function el(name: string, attrs: Record<string, string | number | undefined> = {}, ...children: (XmlNode | null | undefined | false)[]): XmlElement {
  const kept: Record<string, string> = {};
  for (const [key, value] of Object.entries(attrs)) if (value !== undefined) kept[key] = String(value);
  const ns = kept.xmlns ?? '';
  return { name, ns, attrs: kept, children: children.filter((c): c is XmlNode => c !== null && c !== undefined && c !== false) };
}

const ESCAPES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' };

export function escapeXml(text: string): string {
  // Characters XML 1.0 cannot carry are left out.
  // eslint-disable-next-line no-control-regex
  return text.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f￾￿]/g, '').replace(/[&<>"']/g, (c) => ESCAPES[c]);
}

/** The element as text, its namespace written only where it changes. */
export function render(element: XmlElement, parentNs = ''): string {
  const attrs = { ...element.attrs };
  if (element.ns && element.ns !== parentNs) attrs.xmlns = element.ns;
  else if (attrs.xmlns === parentNs) delete attrs.xmlns;
  const head = element.name + Object.entries(attrs).map(([k, v]) => ` ${k}='${escapeXml(v)}'`).join('');
  if (!element.children.length) return `<${head}/>`;
  const ns = element.ns || parentNs;
  const inner = element.children.map((c) => (typeof c === 'string' ? escapeXml(c) : render(c, ns))).join('');
  return `<${head}>${inner}</${element.name}>`;
}

/** The first child named `name` (in `ns`, when given). */
export function child(element: XmlElement | undefined, name: string, ns?: string): XmlElement | undefined {
  return element?.children.find((c): c is XmlElement => typeof c !== 'string' && c.name === name && (ns === undefined || c.ns === ns));
}

export function children(element: XmlElement | undefined, name?: string, ns?: string): XmlElement[] {
  return (element?.children ?? []).filter((c): c is XmlElement => typeof c !== 'string' && (name === undefined || c.name === name) && (ns === undefined || c.ns === ns));
}

/** All the text inside, children's too. */
export function textOf(element: XmlElement | undefined): string {
  if (!element) return '';
  return element.children.map((c) => (typeof c === 'string' ? c : textOf(c))).join('');
}

/** The child at the end of `path`, each step `name` or `name|ns`. */
export function find(element: XmlElement | undefined, ...path: string[]): XmlElement | undefined {
  let at = element;
  for (const step of path) {
    const [name, ns] = step.split('|');
    at = child(at, name, ns);
  }
  return at;
}

const NAMED: Record<string, string> = { lt: '<', gt: '>', amp: '&', quot: '"', apos: "'" };

function unescape(text: string): string {
  return text.replace(/&(#x[0-9a-fA-F]+|#[0-9]+|[a-z]+);/g, (whole, code: string) => {
    if (code[0] === '#') {
      const n = code[1] === 'x' ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
      return n > 0 && n <= 0x10ffff ? String.fromCodePoint(n) : '';
    }
    return NAMED[code] ?? whole;
  });
}

export class XmlError extends Error {}

type Open = { name: string; prefix: string; attrs: Record<string, string>; scope: Record<string, string>; element: XmlElement };

/** What a stream reader gives: the stream's start, one of its stanzas, or its end. */
export type StreamEvent = { kind: 'open'; attrs: Record<string, string> } | { kind: 'stanza'; element: XmlElement } | { kind: 'close' };

const MOST_BUFFER = 4 * 1024 * 1024;

/** Reads an XMPP stream as it comes, in pieces cut anywhere. With `frames`, each piece is whole
 *  elements of their own (RFC 7395): each top-level element is given as a stanza. */
export class XmlStream {
  private buffer = '';
  private stack: Open[] = [];
  private decoder = new TextDecoder('utf-8');
  private readonly frames: boolean;
  constructor(frames = false) {
    this.frames = frames;
  }

  /** Starts over, for a stream opened again (after STARTTLS or signing in). */
  reset(): void {
    this.buffer = '';
    this.stack = [];
    this.decoder = new TextDecoder('utf-8');
  }

  push(piece: string | Uint8Array): StreamEvent[] {
    this.buffer += typeof piece === 'string' ? piece : this.decoder.decode(piece, { stream: true });
    if (this.buffer.length > MOST_BUFFER) throw new XmlError('a stanza too large');
    const events: StreamEvent[] = [];
    let at = 0;
    const base = this.frames ? 0 : 1;
    while (at < this.buffer.length) {
      const lt = this.buffer.indexOf('<', at);
      // Text is taken once what follows it has come: an entity may be cut in two.
      if (lt < 0) break;
      if (lt > at) this.text(this.buffer.slice(at, lt));
      at = lt;
      const rest = this.buffer.slice(at, at + 9);
      if (rest.startsWith('<?')) {
        const end = this.buffer.indexOf('?>', at);
        if (end < 0) break;
        at = end + 2;
        continue;
      }
      if (rest.startsWith('<!--')) {
        const end = this.buffer.indexOf('-->', at);
        if (end < 0) break;
        at = end + 3;
        continue;
      }
      if (rest.startsWith('<![CDATA[')) {
        const end = this.buffer.indexOf(']]>', at);
        if (end < 0) break;
        this.text(this.buffer.slice(at + 9, end), true);
        at = end + 3;
        continue;
      }
      if (rest.startsWith('<!')) throw new XmlError('a declaration XMPP does not allow');
      const end = tagEnd(this.buffer, at);
      if (end < 0) break;
      const tag = this.buffer.slice(at + 1, end);
      at = end + 1;
      if (tag.startsWith('/')) {
        const name = tag.slice(1).trim();
        const open = this.stack.pop();
        if (!open) throw new XmlError('a closing tag without its opening');
        if (open.name !== name) throw new XmlError(`</${name}> closes <${open.name}>`);
        if (!this.frames && this.stack.length === 0) events.push({ kind: 'close' });
        else if (this.stack.length === base) events.push({ kind: 'stanza', element: open.element });
        continue;
      }
      const selfClosing = tag.endsWith('/');
      const { name, attrs } = parseTag(selfClosing ? tag.slice(0, -1) : tag);
      const parent = this.stack[this.stack.length - 1];
      const scope = { ...(parent?.scope ?? {}) };
      for (const [key, value] of Object.entries(attrs)) {
        if (key === 'xmlns') scope[''] = value;
        else if (key.startsWith('xmlns:')) scope[key.slice(6)] = value;
      }
      const colon = name.indexOf(':');
      const prefix = colon >= 0 ? name.slice(0, colon) : '';
      const local = colon >= 0 ? name.slice(colon + 1) : name;
      const element: XmlElement = { name: local, ns: scope[prefix] ?? '', attrs, children: [] };
      if (!this.frames && this.stack.length === 0) {
        if (local !== 'stream') throw new XmlError(`a stream that begins with <${name}>`);
        this.stack.push({ name, prefix, attrs, scope, element });
        events.push({ kind: 'open', attrs });
        continue;
      }
      parent?.element.children.push(element);
      if (selfClosing) {
        if (this.stack.length === base) events.push({ kind: 'stanza', element });
        continue;
      }
      this.stack.push({ name, prefix, attrs, scope, element });
    }
    this.buffer = this.buffer.slice(at);
    return events;
  }

  private text(raw: string, cdata = false): void {
    const open = this.stack[this.stack.length - 1];
    // Text between stanzas (whitespace keep-alives) belongs to no one.
    if (!open || (!this.frames && this.stack.length < 2)) return;
    open.element.children.push(cdata ? raw : unescape(raw));
  }
}

/** Where a tag that begins at `from` ends (its '>'), quotes counted; -1 while it has not come. */
function tagEnd(text: string, from: number): number {
  let quote = '';
  for (let i = from + 1; i < text.length; i++) {
    const c = text[i];
    if (quote) {
      if (c === quote) quote = '';
    } else if (c === '"' || c === "'") quote = c;
    else if (c === '>') return i;
  }
  return -1;
}

function parseTag(tag: string): { name: string; attrs: Record<string, string> } {
  const match = /^\s*([^\s/>]+)/.exec(tag);
  if (!match) throw new XmlError('a tag without a name');
  const attrs: Record<string, string> = {};
  const re = /([^\s=]+)\s*=\s*("([^"]*)"|'([^']*)')/g;
  let m: RegExpExecArray | null;
  const rest = tag.slice(match[0].length);
  while ((m = re.exec(rest))) attrs[m[1]] = unescape(m[3] ?? m[4] ?? '');
  return { name: match[1], attrs };
}

/** One whole element from text, as a WebSocket frame carries it. */
export function parseXml(text: string): XmlElement {
  const events = new XmlStream(true).push(text);
  const first = events.find((e): e is { kind: 'stanza'; element: XmlElement } => e.kind === 'stanza');
  if (!first) throw new XmlError('no element');
  return first.element;
}
