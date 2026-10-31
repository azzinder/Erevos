// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

import { el, child, children, textOf, type XmlElement } from './xmpp-xml';

// A WebRTC session description (SDP) as Jingle says it, and back: how XMPP apps such as
// Conversations, Monal and Dino describe a call (XEP-0166 Jingle, XEP-0167 RTP sessions, XEP-0176
// ICE-UDP, XEP-0320 DTLS-SRTP, XEP-0293 RTCP feedback, XEP-0294 header extensions, XEP-0338
// bundling, XEP-0339 sources). Each SDP media section is one Jingle content, named by its mid.

export const JINGLE = 'urn:xmpp:jingle:1';
export const RTP = 'urn:xmpp:jingle:apps:rtp:1';
export const ICE = 'urn:xmpp:jingle:transports:ice-udp:1';
export const DTLS = 'urn:xmpp:jingle:apps:dtls:0';
const RTCP_FB = 'urn:xmpp:jingle:apps:rtp:rtcp-fb:0';
const HDREXT = 'urn:xmpp:jingle:apps:rtp:rtp-hdrext:0';
const SSMA = 'urn:xmpp:jingle:apps:rtp:ssma:0';
export const GROUPING = 'urn:xmpp:jingle:apps:grouping:0';

/** Who wrote a description: the side that called (initiator) or the one that answered (responder). */
export type Role = 'initiator' | 'responder';

/** One address to try, as Jingle has it (XEP-0176). */
export type JingleCandidate = {
  component: string;
  foundation: string;
  generation: string;
  id: string;
  ip: string;
  port: string;
  priority: string;
  protocol: string;
  type: string;
  relAddr?: string;
  relPort?: string;
  network?: string;
};

type Media = { kind: string; lines: string[] };

const attr = (lines: string[], name: string): string | undefined => lines.find((l) => l.startsWith(`a=${name}:`))?.slice(name.length + 3);
const attrs = (lines: string[], name: string): string[] => lines.filter((l) => l.startsWith(`a=${name}:`)).map((l) => l.slice(name.length + 3));
const flag = (lines: string[], name: string) => lines.includes(`a=${name}`);

/** An SDP's session lines and its media sections. */
function split(sdp: string): { session: string[]; media: Media[] } {
  const session: string[] = [];
  const media: Media[] = [];
  for (const raw of sdp.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    if (line.startsWith('m=')) media.push({ kind: line.slice(2).split(' ')[0], lines: [line] });
    else if (media.length) media[media.length - 1].lines.push(line);
    else session.push(line);
  }
  return { session, media };
}

const isAddress = (ip: string) => /^[0-9a-f:.]+$/i.test(ip) && /[.:]/.test(ip);

/** An SDP candidate line (without `a=`), or null for one Jingle has no words for. */
export function parseCandidate(line: string): JingleCandidate | null {
  const parts = line.replace(/^a=/, '').replace(/^candidate:/, '').trim().split(/\s+/);
  if (parts.length < 8 || parts[6] !== 'typ') return null;
  const [foundation, component, protocol, priority, ip, port, , type] = parts;
  // TCP addresses need more than XEP-0176 says; the UDP ones are enough. A browser's hidden
  // address (a .local name) means nothing to the other side.
  if (protocol.toLowerCase() !== 'udp' || !isAddress(ip)) return null;
  const extra: Record<string, string> = {};
  for (let i = 8; i + 1 < parts.length; i += 2) extra[parts[i]] = parts[i + 1];
  return {
    component,
    foundation,
    generation: extra.generation ?? '0',
    id: Math.random().toString(36).slice(2, 12),
    ip,
    port,
    priority,
    protocol: protocol.toLowerCase(),
    type,
    ...(extra.raddr ? { relAddr: extra.raddr, relPort: extra.rport ?? '0' } : {}),
    ...(extra['network-id'] ? { network: extra['network-id'] } : {}),
  };
}

/** A Jingle candidate as an SDP candidate line, without `a=`. */
export function candidateLine(c: JingleCandidate, ufrag?: string): string {
  const rel = c.relAddr ? ` raddr ${c.relAddr} rport ${c.relPort ?? '0'}` : '';
  return `candidate:${c.foundation} ${c.component} ${c.protocol} ${c.priority} ${c.ip} ${c.port} typ ${c.type}${rel} generation ${c.generation || '0'}${ufrag ? ` ufrag ${ufrag}` : ''}${c.network ? ` network-id ${c.network}` : ''}`;
}

export function candidateElement(c: JingleCandidate): XmlElement {
  return el('candidate', {
    component: c.component,
    foundation: c.foundation,
    generation: c.generation,
    id: c.id,
    ip: c.ip,
    network: c.network ?? '0',
    port: c.port,
    priority: c.priority,
    protocol: c.protocol,
    type: c.type,
    'rel-addr': c.relAddr,
    'rel-port': c.relPort,
  });
}

export function candidateOf(element: XmlElement): JingleCandidate | null {
  const a = element.attrs;
  if (!a.foundation || !a.component || !a.ip || !a.port || !a.priority || !a.type) return null;
  if ((a.protocol ?? 'udp').toLowerCase() !== 'udp') return null;
  // Addresses are only numbers: a name here would be looked up, which tells the DNS of the call.
  if (!isAddress(a.ip)) return null;
  return {
    component: a.component,
    foundation: a.foundation,
    generation: a.generation ?? '0',
    id: a.id ?? '',
    ip: a.ip,
    port: a.port,
    priority: a.priority,
    protocol: 'udp',
    type: a.type,
    ...(a['rel-addr'] ? { relAddr: a['rel-addr'], relPort: a['rel-port'] ?? '0' } : {}),
    ...(a.network ? { network: a.network } : {}),
  };
}

const SENDERS: Record<string, Record<Role, string>> = {
  sendrecv: { initiator: 'both', responder: 'both' },
  sendonly: { initiator: 'initiator', responder: 'responder' },
  recvonly: { initiator: 'responder', responder: 'initiator' },
  inactive: { initiator: 'none', responder: 'none' },
};

function direction(lines: string[]): string {
  return ['sendrecv', 'sendonly', 'recvonly', 'inactive'].find((d) => flag(lines, d)) ?? 'sendrecv';
}

/** The parameters of an fmtp line, `minptime=10;useinbandfec=1`; one without a name (as RED's `111/111`) keeps an empty one. */
function fmtpParameters(text: string): XmlElement[] {
  return text
    .split(';')
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => {
      const at = p.indexOf('=');
      return at < 0 ? el('parameter', { name: '', value: p }) : el('parameter', { name: p.slice(0, at).trim(), value: p.slice(at + 1).trim() });
    });
}

function rtcpFb(text: string): XmlElement {
  const [type, subtype] = text.trim().split(/\s+/);
  return el('rtcp-fb', { xmlns: RTCP_FB, type, subtype });
}

/** One media section as a Jingle content, written by `role`. */
function contentOf(media: Media, session: string[], role: Role): XmlElement | null {
  const { lines } = media;
  const mline = lines[0].slice(2).split(' ');
  const mid = attr(lines, 'mid');
  // A section turned down (port 0) or with no name cannot be said.
  if (!mid || mline[1] === '0') return null;
  const formats = mline.slice(3);
  const rtpmaps = new Map(attrs(lines, 'rtpmap').map((l) => [l.split(' ')[0], l.slice(l.indexOf(' ') + 1)]));
  const fmtps = new Map(attrs(lines, 'fmtp').map((l) => [l.split(' ')[0], l.slice(l.indexOf(' ') + 1)]));
  const fbs = attrs(lines, 'rtcp-fb');
  const payloads = formats.flatMap((pt) => {
    const map = rtpmaps.get(pt);
    if (!map) return [];
    const [name, clockrate, channels] = map.split('/');
    return [
      el(
        'payload-type',
        { id: pt, name, clockrate, channels: channels && channels !== '1' ? channels : undefined },
        ...fmtpParameters(fmtps.get(pt) ?? ''),
        ...fbs.filter((f) => f.split(' ')[0] === pt).map((f) => rtcpFb(f.slice(f.indexOf(' ') + 1))),
      ),
    ];
  });
  const extmaps = attrs(lines, 'extmap').map((l) => {
    const [idDir, uri] = l.split(/\s+/);
    const [id, dir] = idDir.split('/');
    const senders = dir ? SENDERS[dir]?.[role] : undefined;
    return el('rtp-hdrext', { xmlns: HDREXT, id, uri, senders: senders && senders !== 'both' ? senders : undefined });
  });
  // The sources and their groups (XEP-0339), with the stream they belong to.
  const sources = new Map<string, XmlElement[]>();
  for (const line of attrs(lines, 'ssrc')) {
    const [ssrc, ...rest] = line.split(' ');
    const text = rest.join(' ');
    const at = text.indexOf(':');
    const name = at < 0 ? text : text.slice(0, at);
    const value = at < 0 ? '' : text.slice(at + 1);
    if (!sources.has(ssrc)) sources.set(ssrc, []);
    sources.get(ssrc)!.push(el('parameter', { name, value }));
  }
  const msid = attr(lines, 'msid');
  if (msid) {
    for (const params of sources.values()) if (!params.some((p) => p.attrs.name === 'msid')) params.push(el('parameter', { name: 'msid', value: msid }));
  }
  const groups = attrs(lines, 'ssrc-group').map((l) => {
    const [semantics, ...ssrcs] = l.split(' ');
    return el('ssrc-group', { xmlns: SSMA, semantics }, ...ssrcs.map((s) => el('source', { ssrc: s })));
  });
  const description = el(
    'description',
    { xmlns: RTP, media: media.kind },
    ...payloads,
    ...fbs.filter((f) => f.startsWith('* ')).map((f) => rtcpFb(f.slice(2))),
    ...extmaps,
    flag(lines, 'extmap-allow-mixed') || flag(session, 'extmap-allow-mixed') ? el('extmap-allow-mixed', { xmlns: HDREXT }) : null,
    ...[...sources].map(([ssrc, params]) => el('source', { xmlns: SSMA, ssrc }, ...params)),
    ...groups,
    flag(lines, 'rtcp-mux') ? el('rtcp-mux') : null,
  );
  const ufrag = attr(lines, 'ice-ufrag') ?? attr(session, 'ice-ufrag');
  const pwd = attr(lines, 'ice-pwd') ?? attr(session, 'ice-pwd');
  const fingerprint = attr(lines, 'fingerprint') ?? attr(session, 'fingerprint');
  const setup = attr(lines, 'setup') ?? attr(session, 'setup') ?? 'actpass';
  const [hash, value] = (fingerprint ?? '').split(' ');
  const transport = el(
    'transport',
    { xmlns: ICE, ufrag, pwd },
    fingerprint ? el('fingerprint', { xmlns: DTLS, hash, setup }, value) : null,
    ...attrs(lines, 'candidate').flatMap((line) => {
      const c = parseCandidate(line);
      return c ? [candidateElement(c)] : [];
    }),
  );
  return el('content', { creator: 'initiator', name: mid, senders: SENDERS[direction(lines)][role] }, description, transport);
}

/** The Jingle contents of a description written by `role`, and its bundle group, for a
 *  session-initiate (an offer) or a session-accept (an answer). */
export function sdpToJingle(sdp: string, role: Role): XmlElement[] {
  const { session, media } = split(sdp);
  const contents = media.flatMap((m) => {
    const c = contentOf(m, session, role);
    return c ? [c] : [];
  });
  const bundle = attr(session, 'group');
  const out: XmlElement[] = [...contents];
  if (bundle?.startsWith('BUNDLE ')) {
    const names = bundle.split(' ').slice(1).filter((n) => contents.some((c) => c.attrs.name === n));
    if (names.length) out.push(el('group', { xmlns: GROUPING, semantics: 'BUNDLE' }, ...names.map((name) => el('content', { name }))));
  }
  return out;
}

const DIRECTION: Record<string, Record<Role, string>> = {
  both: { initiator: 'sendrecv', responder: 'sendrecv' },
  initiator: { initiator: 'sendonly', responder: 'recvonly' },
  responder: { initiator: 'recvonly', responder: 'sendonly' },
  none: { initiator: 'inactive', responder: 'inactive' },
};

/** A Jingle <jingle> (or its contents) written by `role` as the SDP WebRTC takes: the offer of a
 *  session-initiate, or the answer of a session-accept. Throws when a content cannot be read.
 *  `setup`: the DTLS role their side took once the call was set up, for a description of the call
 *  as it is now, with video added (their first offer said actpass, which an answer cannot). */
export function jingleToSdp(jingle: XmlElement, role: Role, sid = '0', setup?: string): string {
  const contents = children(jingle, 'content').filter((c) => child(c, 'description', RTP) && child(c, 'transport', ICE));
  if (!contents.length) throw new Error('No audio or video in the call.');
  const group = children(jingle, 'group', GROUPING).find((g) => g.attrs.semantics === 'BUNDLE');
  // One stream for every track that names none, so sound and picture play together.
  const stream = `xmpp-${sid.replace(/[^A-Za-z0-9-]/g, '').slice(0, 24) || 'call'}`;
  const out = ['v=0', `o=- ${Date.now()} 2 IN IP4 0.0.0.0`, 's=-', 't=0 0'];
  if (group) out.push(`a=group:BUNDLE ${children(group, 'content').map((c) => c.attrs.name).join(' ')}`);
  out.push('a=msid-semantic: WMS *');
  for (const content of contents) {
    const description = child(content, 'description', RTP)!;
    const transport = child(content, 'transport', ICE)!;
    const kind = description.attrs.media;
    if (kind !== 'audio' && kind !== 'video') throw new Error(`No ${kind} in calls.`);
    const payloads = children(description, 'payload-type').filter((p) => /^\d+$/.test(p.attrs.id ?? ''));
    if (!payloads.length) throw new Error('No codec in the call.');
    const name = content.attrs.name ?? kind;
    out.push(`m=${kind} 9 UDP/TLS/RTP/SAVPF ${payloads.map((p) => p.attrs.id).join(' ')}`);
    out.push('c=IN IP4 0.0.0.0', 'a=rtcp:9 IN IP4 0.0.0.0');
    if (transport.attrs.ufrag) out.push(`a=ice-ufrag:${transport.attrs.ufrag}`);
    if (transport.attrs.pwd) out.push(`a=ice-pwd:${transport.attrs.pwd}`);
    out.push('a=ice-options:trickle');
    const fingerprint = child(transport, 'fingerprint', DTLS);
    if (fingerprint) {
      out.push(`a=fingerprint:${fingerprint.attrs.hash ?? 'sha-256'} ${textOf(fingerprint).trim()}`);
      out.push(`a=setup:${setup ?? fingerprint.attrs.setup ?? (role === 'initiator' ? 'actpass' : 'active')}`);
    }
    out.push(`a=mid:${name}`);
    for (const ext of children(description, 'rtp-hdrext', HDREXT)) {
      const senders = ext.attrs.senders;
      const dir = senders && senders !== 'both' ? `/${DIRECTION[senders]?.[role] ?? 'sendrecv'}` : '';
      out.push(`a=extmap:${ext.attrs.id}${dir} ${ext.attrs.uri}`);
    }
    if (child(description, 'extmap-allow-mixed', HDREXT)) out.push('a=extmap-allow-mixed');
    out.push(`a=${DIRECTION[content.attrs.senders ?? 'both']?.[role] ?? 'sendrecv'}`);
    const sources = children(description, 'source', SSMA);
    const msid = sources.flatMap((s) => children(s, 'parameter').filter((p) => p.attrs.name === 'msid')).map((p) => p.attrs.value)[0];
    out.push(`a=msid:${msid ?? `${stream} ${stream}-${name}`}`);
    if (child(description, 'rtcp-mux')) out.push('a=rtcp-mux');
    for (const p of payloads) {
      const id = p.attrs.id;
      out.push(`a=rtpmap:${id} ${p.attrs.name}/${p.attrs.clockrate ?? '90000'}${p.attrs.channels && p.attrs.channels !== '1' ? `/${p.attrs.channels}` : ''}`);
      for (const fb of children(p, 'rtcp-fb', RTCP_FB)) out.push(`a=rtcp-fb:${id} ${fb.attrs.type}${fb.attrs.subtype ? ` ${fb.attrs.subtype}` : ''}`);
      const params = children(p, 'parameter');
      if (params.length) out.push(`a=fmtp:${id} ${params.map((x) => (x.attrs.name ? `${x.attrs.name}=${x.attrs.value ?? ''}` : (x.attrs.value ?? ''))).join(';')}`);
    }
    for (const fb of children(description, 'rtcp-fb', RTCP_FB)) out.push(`a=rtcp-fb:* ${fb.attrs.type}${fb.attrs.subtype ? ` ${fb.attrs.subtype}` : ''}`);
    for (const g of children(description, 'ssrc-group', SSMA)) out.push(`a=ssrc-group:${g.attrs.semantics} ${children(g, 'source').map((s) => s.attrs.ssrc).join(' ')}`);
    for (const s of sources) {
      const params = children(s, 'parameter');
      if (!params.length) out.push(`a=ssrc:${s.attrs.ssrc} cname:${stream}`);
      for (const p of params) out.push(`a=ssrc:${s.attrs.ssrc} ${p.attrs.name}${p.attrs.value ? `:${p.attrs.value}` : ''}`);
    }
    for (const c of children(transport, 'candidate')) {
      const candidate = candidateOf(c);
      if (candidate) out.push(`a=${candidateLine(candidate)}`);
    }
  }
  return `${out.join('\r\n')}\r\n`;
}

/** The DTLS role a description takes (a=setup), or undefined. */
export function setupOf(sdp: string): string | undefined {
  return /^a=setup:(\w+)/m.exec(sdp)?.[1];
}

/** The other side of a DTLS role: theirs, once ours is set. */
export function otherSetup(setup: string | undefined): string | undefined {
  return setup === 'active' ? 'passive' : setup === 'passive' ? 'active' : undefined;
}

/** The candidates of a transport-info, each as WebRTC adds it: its line, and the content (mid) it is for. */
export function candidatesOf(jingle: XmlElement): { candidate: string; sdpMid: string }[] {
  return children(jingle, 'content').flatMap((content) => {
    const transport = child(content, 'transport', ICE);
    return children(transport, 'candidate').flatMap((c) => {
      const candidate = candidateOf(c);
      return candidate ? [{ candidate: candidateLine(candidate, transport?.attrs.ufrag), sdpMid: content.attrs.name ?? '' }] : [];
    });
  });
}
