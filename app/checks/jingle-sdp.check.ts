// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

// A call's description as XMPP apps say it (lib/jingle-sdp.ts): a WebRTC offer the way Chromium
// writes one, with sound and picture bundled, turned to Jingle and back keeps what WebRTC needs
// (codecs and their parameters, feedback, header extensions, sources and their groups, the key
// fingerprint and who leads DTLS, the addresses); the directions read right for each side; a
// description from an app that names no stream gets one, so sound and picture play together; and
// addresses that would tell the DNS, or that Jingle's UDP has no words for, are left out.
// lib/jingle-sdp.ts was also run against Chromium's own WebRTC, both ways (docs/xmpp.md).
// Run with: npm run check
/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { candidatesOf, DTLS, ICE, JINGLE, jingleToSdp, parseCandidate, RTP, sdpToJingle } from '../lib/jingle-sdp';
import { child, children, el, parseXml, render, textOf, type XmlElement } from '../lib/xmpp-xml';

const FINGERPRINT = 'AB:CD:EF:01:23:45:67:89:AB:CD:EF:01:23:45:67:89:AB:CD:EF:01:23:45:67:89:AB:CD:EF:01:23:45:67:89';

const OFFER = [
  'v=0',
  'o=- 4611731400430051336 2 IN IP4 127.0.0.1',
  's=-',
  't=0 0',
  'a=group:BUNDLE 0 1',
  'a=extmap-allow-mixed',
  'a=msid-semantic: WMS stream1',
  'm=audio 9 UDP/TLS/RTP/SAVPF 111 63 0',
  'c=IN IP4 0.0.0.0',
  'a=rtcp:9 IN IP4 0.0.0.0',
  'a=candidate:1 1 udp 2122260223 192.168.1.5 51000 typ host generation 0 network-id 1',
  'a=candidate:2 1 udp 1686052607 203.0.113.7 51000 typ srflx raddr 192.168.1.5 rport 51000 generation 0 network-id 1',
  'a=candidate:3 1 tcp 1518280447 192.168.1.5 9 typ host tcptype active generation 0 network-id 1',
  'a=candidate:4 1 udp 2122260223 4a1b2c3d-1111-2222-3333-444455556666.local 51001 typ host generation 0',
  'a=ice-ufrag:abcd',
  'a=ice-pwd:0123456789abcdefghijklmn',
  'a=ice-options:trickle',
  `a=fingerprint:sha-256 ${FINGERPRINT}`,
  'a=setup:actpass',
  'a=mid:0',
  'a=extmap:1 urn:ietf:params:rtp-hdrext:ssrc-audio-level',
  'a=extmap:2 http://www.webrtc.org/experiments/rtp-hdrext/abs-send-time',
  'a=sendrecv',
  'a=msid:stream1 audio1',
  'a=rtcp-mux',
  'a=rtpmap:111 opus/48000/2',
  'a=rtcp-fb:111 transport-cc',
  'a=fmtp:111 minptime=10;useinbandfec=1',
  'a=rtpmap:63 red/48000/2',
  'a=fmtp:63 111/111',
  'a=rtpmap:0 PCMU/8000',
  'a=ssrc:1001 cname:abc',
  'a=ssrc:1001 msid:stream1 audio1',
  'm=video 9 UDP/TLS/RTP/SAVPF 96 97',
  'c=IN IP4 0.0.0.0',
  'a=rtcp:9 IN IP4 0.0.0.0',
  'a=ice-ufrag:abcd',
  'a=ice-pwd:0123456789abcdefghijklmn',
  'a=ice-options:trickle',
  `a=fingerprint:sha-256 ${FINGERPRINT}`,
  'a=setup:actpass',
  'a=mid:1',
  'a=extmap:3/sendonly urn:3gpp:video-orientation',
  'a=sendrecv',
  'a=msid:stream1 video1',
  'a=rtcp-mux',
  'a=rtcp-rsize',
  'a=rtpmap:96 VP8/90000',
  'a=rtcp-fb:96 goog-remb',
  'a=rtcp-fb:96 nack',
  'a=rtcp-fb:96 nack pli',
  'a=rtpmap:97 rtx/90000',
  'a=fmtp:97 apt=96',
  'a=ssrc-group:FID 2001 2002',
  'a=ssrc:2001 cname:abc',
  'a=ssrc:2001 msid:stream1 video1',
  'a=ssrc:2002 cname:abc',
  'a=ssrc:2002 msid:stream1 video1',
  '',
].join('\r\n');

// As it goes between the apps: written out as XML, and read again.
const sent = (contents: XmlElement[], action = 'session-initiate') =>
  parseXml(render(el('jingle', { xmlns: JINGLE, action, sid: 'a73sjjvkla37jfea' }, ...contents)));

test('an offer from Chromium is said as Jingle with what WebRTC needs', () => {
  const contents = sdpToJingle(OFFER, 'initiator');
  const jingle = sent(contents);
  const [audio, video] = children(jingle, 'content');
  assert.deepEqual(
    children(jingle, 'content').map((c) => [c.attrs.creator, c.attrs.name, c.attrs.senders]),
    [
      ['initiator', '0', 'both'],
      ['initiator', '1', 'both'],
    ],
  );
  const sound = child(audio, 'description', RTP)!;
  assert.equal(sound.attrs.media, 'audio');
  const payloads = children(sound, 'payload-type');
  assert.deepEqual(
    payloads.map((p) => [p.attrs.id, p.attrs.name, p.attrs.clockrate, p.attrs.channels]),
    [
      ['111', 'opus', '48000', '2'],
      ['63', 'red', '48000', '2'],
      ['0', 'PCMU', '8000', undefined],
    ],
  );
  assert.deepEqual(children(payloads[0], 'parameter').map((p) => [p.attrs.name, p.attrs.value]), [['minptime', '10'], ['useinbandfec', '1']]);
  assert.deepEqual(children(payloads[1], 'parameter').map((p) => [p.attrs.name, p.attrs.value]), [['', '111/111']]);
  assert.deepEqual(children(payloads[0], 'rtcp-fb').map((f) => f.attrs.type), ['transport-cc']);
  assert.deepEqual(children(sound, 'rtp-hdrext').map((h) => h.attrs.id), ['1', '2']);
  assert.ok(child(sound, 'extmap-allow-mixed'));
  assert.ok(child(sound, 'rtcp-mux'));
  const transport = child(audio, 'transport', ICE)!;
  assert.deepEqual([transport.attrs.ufrag, transport.attrs.pwd], ['abcd', '0123456789abcdefghijklmn']);
  const fingerprint = child(transport, 'fingerprint', DTLS)!;
  assert.deepEqual([fingerprint.attrs.hash, fingerprint.attrs.setup, textOf(fingerprint)], ['sha-256', 'actpass', FINGERPRINT]);
  // UDP addresses only, and numbers only: no TCP, no browser's hidden .local name.
  assert.deepEqual(
    children(transport, 'candidate').map((c) => [c.attrs.ip, c.attrs.type, c.attrs['rel-addr']]),
    [
      ['192.168.1.5', 'host', undefined],
      ['203.0.113.7', 'srflx', '192.168.1.5'],
    ],
  );
  const picture = child(video, 'description', RTP)!;
  assert.deepEqual(children(children(picture, 'payload-type')[0], 'rtcp-fb').map((f) => `${f.attrs.type} ${f.attrs.subtype ?? ''}`.trim()), ['goog-remb', 'nack', 'nack pli']);
  assert.equal(children(picture, 'rtp-hdrext')[0].attrs.senders, 'initiator');
  assert.deepEqual(children(picture, 'source').map((s) => s.attrs.ssrc), ['2001', '2002']);
  assert.deepEqual(children(child(picture, 'ssrc-group')!, 'source').map((s) => s.attrs.ssrc), ['2001', '2002']);
  const group = child(jingle, 'group')!;
  assert.deepEqual([group.attrs.semantics, ...children(group, 'content').map((c) => c.attrs.name)], ['BUNDLE', '0', '1']);
});

test('the same offer read back is one WebRTC takes as it was', () => {
  const sdp = jingleToSdp(sent(sdpToJingle(OFFER, 'initiator')), 'initiator', 'a73sjjvkla37jfea');
  const lines = sdp.split('\r\n');
  for (const line of [
    'a=group:BUNDLE 0 1',
    'm=audio 9 UDP/TLS/RTP/SAVPF 111 63 0',
    'm=video 9 UDP/TLS/RTP/SAVPF 96 97',
    'a=ice-ufrag:abcd',
    'a=ice-pwd:0123456789abcdefghijklmn',
    `a=fingerprint:sha-256 ${FINGERPRINT}`,
    'a=setup:actpass',
    'a=mid:0',
    'a=mid:1',
    'a=extmap:1 urn:ietf:params:rtp-hdrext:ssrc-audio-level',
    'a=extmap:3/sendonly urn:3gpp:video-orientation',
    'a=extmap-allow-mixed',
    'a=msid:stream1 audio1',
    'a=msid:stream1 video1',
    'a=rtcp-mux',
    'a=rtpmap:111 opus/48000/2',
    'a=rtcp-fb:111 transport-cc',
    'a=fmtp:111 minptime=10;useinbandfec=1',
    'a=rtpmap:63 red/48000/2',
    'a=fmtp:63 111/111',
    'a=rtpmap:0 PCMU/8000',
    'a=rtpmap:96 VP8/90000',
    'a=rtcp-fb:96 nack pli',
    'a=fmtp:97 apt=96',
    'a=ssrc-group:FID 2001 2002',
    'a=ssrc:2001 cname:abc',
    'a=ssrc:2002 msid:stream1 video1',
    'a=candidate:1 1 udp 2122260223 192.168.1.5 51000 typ host generation 0 network-id 1',
    'a=candidate:2 1 udp 1686052607 203.0.113.7 51000 typ srflx raddr 192.168.1.5 rport 51000 generation 0 network-id 1',
  ]) {
    assert.ok(lines.includes(line), `missing: ${line}`);
  }
  assert.equal(lines.filter((l) => l === 'a=sendrecv').length, 2);
  assert.ok(!sdp.includes('.local') && !sdp.includes(' tcp '));
  // The sections in their order, with their lines under them.
  assert.ok(lines.indexOf('m=audio 9 UDP/TLS/RTP/SAVPF 111 63 0') < lines.indexOf('a=mid:0'));
  assert.ok(lines.indexOf('a=mid:0') < lines.indexOf('m=video 9 UDP/TLS/RTP/SAVPF 96 97'));
});

test('directions read right for the side that wrote them', () => {
  // An answer that takes the picture but sends none; its orientation goes only from it (sendonly).
  const answer = OFFER.replace('a=setup:actpass', 'a=setup:active')
    .replace('a=setup:actpass', 'a=setup:active')
    .replace(/a=sendrecv\r\na=msid:stream1 video1/, 'a=recvonly\r\na=msid:stream1 video1');
  const jingle = sent(sdpToJingle(answer, 'responder'), 'session-accept');
  const [audio, video] = children(jingle, 'content');
  assert.equal(audio.attrs.senders, 'both');
  // The responder only receives: only the initiator sends.
  assert.equal(video.attrs.senders, 'initiator');
  assert.equal(children(child(video, 'description', RTP), 'rtp-hdrext')[0].attrs.senders, 'responder');
  assert.equal(child(child(audio, 'transport', ICE), 'fingerprint', DTLS)?.attrs.setup, 'active');
  const back = jingleToSdp(jingle, 'responder', 'x').split('\r\n');
  assert.ok(back.includes('a=recvonly'));
  assert.ok(back.includes('a=setup:active'));
  assert.ok(back.includes('a=extmap:3/sendonly urn:3gpp:video-orientation'));
  // A section turned down (port 0) is not said.
  const turnedDown = OFFER.replace('m=video 9 ', 'm=video 0 ');
  assert.deepEqual(sdpToJingle(turnedDown, 'initiator').filter((c) => c.name === 'content').map((c) => c.attrs.name), ['0']);
});

test('a call from an app that names no stream plays sound and picture together', () => {
  // As Conversations writes a session-initiate: sources with a cname only, no bundle group.
  const source = (ssrc: string) => el('source', { xmlns: 'urn:xmpp:jingle:apps:rtp:ssma:0', ssrc }, el('parameter', { name: 'cname', value: 'xyz' }));
  const transport = el(
    'transport',
    { xmlns: ICE, ufrag: 'Uf', pwd: 'PasswordPasswordPassword' },
    el('fingerprint', { xmlns: DTLS, hash: 'sha-256', setup: 'actpass' }, FINGERPRINT),
    el('candidate', { component: '1', foundation: '7', generation: '0', id: 'c1', ip: '2001:db8::7', network: '0', port: '40000', priority: '2122262783', protocol: 'udp', type: 'host' }),
    el('candidate', { component: '1', foundation: '8', generation: '0', id: 'c2', ip: 'turn.example.org', network: '0', port: '3478', priority: '1', protocol: 'udp', type: 'relay' }),
  );
  const jingle = sent([
    el('content', { creator: 'initiator', name: '0', senders: 'both' }, el('description', { xmlns: RTP, media: 'audio' }, el('payload-type', { id: '111', name: 'opus', clockrate: '48000', channels: '2' }), source('11'), el('rtcp-mux')), transport),
    el('content', { creator: 'initiator', name: '1', senders: 'both' }, el('description', { xmlns: RTP, media: 'video' }, el('payload-type', { id: '96', name: 'VP8', clockrate: '90000' }), source('22'), el('rtcp-mux')), transport),
  ]);
  const lines = jingleToSdp(jingle, 'initiator', 'a73sjjvkla37jfea').split('\r\n');
  const streams = lines.filter((l) => l.startsWith('a=msid:')).map((l) => l.slice(7).split(' ')[0]);
  assert.deepEqual(streams, ['xmpp-a73sjjvkla37jfea', 'xmpp-a73sjjvkla37jfea']);
  assert.ok(!lines.some((l) => l.startsWith('a=group:')));
  assert.ok(lines.includes('a=ssrc:11 cname:xyz'));
  // A numbered address is kept; a name is not looked up.
  assert.ok(lines.includes('a=candidate:7 1 udp 2122262783 2001:db8::7 40000 typ host generation 0 network-id 0'));
  assert.ok(!lines.some((l) => l.includes('turn.example.org')));
});

test('what cannot be a call is said so', () => {
  assert.throws(() => jingleToSdp(sent([el('content', { creator: 'initiator', name: 'f' }, el('description', { xmlns: 'urn:xmpp:jingle:apps:file-transfer:5' }))]), 'initiator'));
  assert.throws(() => jingleToSdp(sent([el('content', { creator: 'initiator', name: 'd' }, el('description', { xmlns: RTP, media: 'application' }, el('payload-type', { id: '5000', name: 'webrtc-datachannel' })), el('transport', { xmlns: ICE }))]), 'initiator'));
  assert.throws(() => jingleToSdp(sent([el('content', { creator: 'initiator', name: '0' }, el('description', { xmlns: RTP, media: 'audio' }), el('transport', { xmlns: ICE }))]), 'initiator'));
});

test('addresses that come one at a time are given to WebRTC with their section', () => {
  const info = sent(
    [
      el(
        'content',
        { creator: 'initiator', name: '0' },
        el(
          'transport',
          { xmlns: ICE, ufrag: 'Uf', pwd: 'PasswordPasswordPassword' },
          el('candidate', { component: '1', foundation: '9', generation: '0', id: 'c3', ip: '198.51.100.4', network: '1', port: '3478', priority: '41885439', protocol: 'udp', type: 'relay', 'rel-addr': '203.0.113.7', 'rel-port': '51000' }),
          el('candidate', { component: '1', foundation: '10', generation: '0', id: 'c4', ip: '198.51.100.4', network: '1', port: '443', priority: '1', protocol: 'tcp', type: 'relay' }),
        ),
      ),
    ],
    'transport-info',
  );
  assert.deepEqual(candidatesOf(info), [{ candidate: 'candidate:9 1 udp 41885439 198.51.100.4 3478 typ relay raddr 203.0.113.7 rport 51000 generation 0 ufrag Uf network-id 1', sdpMid: '0' }]);
  assert.equal(parseCandidate('candidate:1 1 UDP 5 10.0.0.1 9 typ host')?.protocol, 'udp');
  assert.equal(parseCandidate('candidate:1 1 udp 5 abc.local 9 typ host'), null);
  assert.equal(parseCandidate('candidate:1 1 udp 5'), null);
});
