// Checks app/lib/jingle-sdp.ts against Chromium's own WebRTC: two peers in one page, each
// description and each address passing through Jingle XML (written out and read again) on its way,
// as an XMPP call carries them. They must connect, with sound (and picture) in one stream.
// Usage, from app/: node --import ./checks/register.mjs ../docs/xmpp-checks/jingle-browser.ts [--video] [--trickle] [--show]
// (--trickle sends the addresses one at a time, as transport-info; --show prints what went.)
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import type { AddressInfo } from 'node:net';

import { candidatesOf, ICE, JINGLE, jingleToSdp, sdpToJingle } from '../../app/lib/jingle-sdp';
import { el, parseXml, render, type XmlElement } from '../../app/lib/xmpp-xml';

const { chromium } = createRequire(import.meta.url)('playwright');
const video = process.argv.includes('--video');
const trickle = process.argv.includes('--trickle');
const show = process.argv.includes('--show');

const wire = (contents: XmlElement[], action: string) => parseXml(render(el('jingle', { xmlns: JINGLE, action, sid: 'abc' }, ...contents)));

// Real addresses, not the .local names Chromium hides them behind: Jingle has none of those.
const browser = await chromium.launch({ args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream', '--disable-features=WebRtcHideLocalIpsWithMdns'] });
const page = await browser.newPage();
// A page of its own, as WebRTC and the camera need a secure one: localhost is.
const server = createServer((_request, response) => response.end('<!doctype html><title>jingle</title>'));
await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
await page.goto(`http://localhost:${(server.address() as AddressInfo).port}/`);

await page.evaluate(async (video: boolean) => {
  const w = window as any;
  for (const [name, list, tracks] of [['a', 'candidatesA', 'tracksA'], ['b', 'candidatesB', 'tracksB']]) {
    const pc = new RTCPeerConnection({ iceServers: [] });
    w[name] = pc;
    w[list] = [];
    w[tracks] = [];
    pc.onicecandidate = (e) => e.candidate && w[list].push(e.candidate.toJSON());
    pc.ontrack = (e) => w[tracks].push({ kind: e.track.kind, streams: e.streams.map((s) => s.id) });
    const media = await navigator.mediaDevices.getUserMedia({ audio: true, video });
    media.getTracks().forEach((track) => pc.addTrack(track, media));
  }
}, video);

const described = (who: string) =>
  page.evaluate(
    async ({ who, wait }: { who: string; wait: boolean }) => {
      const pc = (window as any)[who] as RTCPeerConnection;
      if (wait && pc.iceGatheringState !== 'complete') {
        await new Promise<void>((resolve) => {
          pc.addEventListener('icegatheringstatechange', () => pc.iceGatheringState === 'complete' && resolve());
          setTimeout(resolve, 4000);
        });
      }
      return pc.localDescription!.sdp;
    },
    { who, wait: !trickle },
  );

await page.evaluate(async () => {
  const w = window as any;
  await w.a.setLocalDescription(await w.a.createOffer());
});
const offer = await described('a');
const initiate = wire(sdpToJingle(offer, 'initiator'), 'session-initiate');
const offerBack = jingleToSdp(initiate, 'initiator', 'abc');
if (show) console.log(`${offer}\n${render(initiate)}\n${offerBack}`);
await page.evaluate(async (sdp: string) => {
  const w = window as any;
  await w.b.setRemoteDescription({ type: 'offer', sdp });
  await w.b.setLocalDescription(await w.b.createAnswer());
}, offerBack);
const answer = await described('b');
const accept = wire(sdpToJingle(answer, 'responder'), 'session-accept');
const answerBack = jingleToSdp(accept, 'responder', 'abc');
if (show) console.log(`${answer}\n${render(accept)}\n${answerBack}`);
await page.evaluate(async (sdp: string) => {
  await (window as any).a.setRemoteDescription({ type: 'answer', sdp });
}, answerBack);

// One address as Jingle says it, by way of a one-section description around it.
function candidateElements(line: string): XmlElement[] {
  const one = `v=0\r\no=- 1 2 IN IP4 0.0.0.0\r\ns=-\r\nt=0 0\r\nm=audio 9 UDP/TLS/RTP/SAVPF 111\r\na=mid:0\r\na=rtpmap:111 opus/48000/2\r\na=${line}\r\n`;
  const transport = sdpToJingle(one, 'initiator')[0].children.find((c): c is XmlElement => typeof c !== 'string' && c.name === 'transport');
  return (transport?.children ?? []).filter((c): c is XmlElement => typeof c !== 'string' && c.name === 'candidate');
}

if (trickle) {
  await new Promise((resolve) => setTimeout(resolve, 1500));
  for (const [from, to] of [['candidatesA', 'b'], ['candidatesB', 'a']]) {
    const list = (await page.evaluate((from: string) => (window as any)[from], from)) as { candidate: string; sdpMid: string }[];
    for (const c of list) {
      const info = wire([el('content', { creator: 'initiator', name: c.sdpMid }, el('transport', { xmlns: ICE }, ...candidateElements(c.candidate)))], 'transport-info');
      for (const back of candidatesOf(info)) {
        await page.evaluate(async ({ to, back }: { to: string; back: { candidate: string; sdpMid: string } }) => (window as any)[to].addIceCandidate(back), { to, back });
      }
    }
  }
}

const state = await page.evaluate(async () => {
  const w = window as any;
  for (let i = 0; i < 50 && (w.a.connectionState !== 'connected' || w.b.connectionState !== 'connected'); i++) await new Promise((resolve) => setTimeout(resolve, 200));
  return { a: w.a.connectionState, b: w.b.connectionState, tracksA: w.tracksA, tracksB: w.tracksB };
});
console.log(JSON.stringify(state));
await browser.close();
server.close();
const oneStream = (tracks: { streams: string[] }[]) => new Set(tracks.flatMap((t) => t.streams)).size === 1;
process.exit(state.a === 'connected' && state.b === 'connected' && oneStream(state.tracksA) && oneStream(state.tracksB) ? 0 : 1);
