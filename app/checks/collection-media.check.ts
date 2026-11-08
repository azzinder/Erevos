// SPDX-FileCopyrightText: 2026 azzinder
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL-3.0 section 7 apply: see AUTHORS.md.

// The Collection's music and videos beyond playing a file: the list as the player's screen changes
// it (lib/collection-queue.ts: shuffle, repeat, speed, which files start where they were left),
// where files were left, kept sealed in the place's catalogue (lock/collection-data.ts), and what a
// file says of itself, read from its first bytes for the page's player (lib/media-tags.ts).
// Run with: npm run check
/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { bytesSource } from '../lib/attachments';
import { current, jumpTo, newQueue, nextIndex, nextRepeat, nextSpeed, positionToKeep, previousIndex, setShuffle } from '../lib/collection-queue';
import { randomBytes, utf8Encode } from '../lib/crypto';
import { readTags } from '../lib/media-tags';
import { srtToVtt, subtitlesFor, subtitlesText, subtitlesType } from '../lib/subtitles';
import { foundStations, HLS, httpsLink, linkStations, playableStations, playlistLinks, playlistStations, radioSearchUrl, RadioLinkError, stationLink } from '../lib/collection-radio';
import {
  channelGroups,
  channelLink,
  channelMatches,
  extinf,
  groupName,
  homeCountry,
  IPTV_ORG_ALL,
  IPTV_ORG_COUNTRIES,
  iptvOrgCountry,
  listFromLink,
  logoType,
  MOST_LISTED_CHANNELS,
  playableChannels,
  tvChannels,
} from '../lib/collection-tv';
import { moved, playlistItems } from '../lib/collection-view';
import {
  addChannel,
  addChannels,
  deleteChannel,
  deleteChannelGroup,
  MAX_CHANNELS,
  renameChannel,
  setCollectionOption,
  addPlaylist,
  addStation,
  addStations,
  addToCollection,
  addToPlaylist,
  deleteItems,
  deletePlaylist,
  deleteStation,
  renameStation,
  keepPositions,
  loadCollection,
  NoSuchPlaylistError,
  positionOf,
  renamePlaylist,
  setPlaylistItems,
  type CollectionItem,
  type CollectionPlace,
} from '../lock/collection-data';
import { setCurrentSpace } from '../lock/keys';
import { blobs, files } from './files-memory';

const t = (name: string, fn: () => Promise<void> | void) =>
  test(name, async () => {
    files.clear();
    blobs.clear();
    setCurrentSpace(null);
    await fn();
  });

const place = (key = randomBytes(32)): CollectionPlace => ({ holder: 'space', space: 0, key });
const song = { name: 'song.mp3', mime: 'audio/mpeg', kind: 'file' as const };

// A random that goes round a fixed list, so a shuffle is the same each run.
const seeded = (values: number[]) => {
  let i = 0;
  return () => values[i++ % values.length];
};

t('a list plays in its order, and stops at its end unless it repeats', () => {
  let q = newQueue(3, 1);
  assert.equal(current(q), 1);
  assert.equal(nextIndex(q), 2);
  assert.equal(previousIndex(q), 0);
  q = jumpTo(q, 2);
  assert.equal(nextIndex(q), null);
  assert.equal(nextIndex({ ...q, repeat: 'all' }), 0);
  // Repeating one file plays it again when it ends by itself; Next still goes on.
  assert.equal(nextIndex({ ...q, repeat: 'one' }, true), 2);
  assert.equal(nextIndex({ ...jumpTo(q, 0), repeat: 'one' }), 1);
  assert.equal(previousIndex({ ...jumpTo(q, 0), repeat: 'all' }), 2);
  assert.equal(previousIndex(jumpTo(q, 0)), null);
  assert.deepEqual(newQueue(0, 0).order, []);
  assert.equal(nextIndex(newQueue(0, 0)), null);
});

t('shuffled, every file plays once, the one playing first, and back in order at the same file', () => {
  const q = newQueue(6, 3, true, 'off', seeded([0.9, 0.1, 0.5, 0.3, 0.7]));
  assert.equal(current(q), 3);
  assert.deepEqual([...q.order].sort(), [0, 1, 2, 3, 4, 5]);
  assert.notDeepEqual(q.order, [3, 0, 1, 2, 4, 5]);
  // Walking it plays each once, then stops.
  let walk = q;
  const played = [current(walk)];
  for (let next = nextIndex(walk); next !== null; next = nextIndex(walk)) {
    walk = jumpTo(walk, next);
    played.push(next);
  }
  assert.deepEqual([...played].sort(), [0, 1, 2, 3, 4, 5]);
  const back = setShuffle(jumpTo(q, q.order[4]), false);
  assert.deepEqual(back.order, [0, 1, 2, 3, 4, 5]);
  assert.equal(current(back), q.order[4]);
  const again = setShuffle(back, true, seeded([0.2]));
  assert.equal(current(again), q.order[4]);
  assert.equal(again.at, 0);
});

t('repeat and speed go round', () => {
  assert.equal(nextRepeat('off'), 'all');
  assert.equal(nextRepeat('all'), 'one');
  assert.equal(nextRepeat('one'), 'off');
  assert.equal(nextSpeed(1), 1.25);
  assert.equal(nextSpeed(2), 0.5);
  assert.equal(nextSpeed(0.5), 0.75);
});

t('only videos and long music start where they were left, and not from a moment in or near the end', () => {
  const minute = 60_000;
  // A song of 4 minutes: nothing kept.
  assert.equal(positionToKeep(false, 2 * minute, 4 * minute), null);
  assert.equal(positionToKeep(false, 2 * minute, -1), null);
  // A long one, and any video.
  assert.equal(positionToKeep(false, 12 * minute, 40 * minute), 12 * minute);
  assert.equal(positionToKeep(true, 2 * minute, 5 * minute), 2 * minute);
  assert.equal(positionToKeep(true, 2 * minute, -1), 2 * minute);
  // Barely begun, near its end, or played to its end: forgotten.
  assert.equal(positionToKeep(true, 5_000, 5 * minute), 0);
  assert.equal(positionToKeep(true, 5 * minute - 10_000, 5 * minute), 0);
  assert.equal(positionToKeep(true, 0, 5 * minute), 0);
});

t('where files were left is kept sealed with the place, seen only with its key, and goes with the file', async () => {
  const p = place();
  const a = await addToCollection(p, bytesSource(randomBytes(10)), song);
  const b = await addToCollection(p, bytesSource(randomBytes(10)), { ...song, name: 'film.mp4', mime: 'video/mp4' });
  await keepPositions(p, [
    { id: a.id, ms: 754_000 },
    { id: b.id, ms: 61_000.4 },
    { id: 'f'.repeat(32), ms: 5 },
  ]);
  let c = await loadCollection(p);
  assert.equal(positionOf(c, a.id), 754_000);
  assert.equal(positionOf(c, b.id), 61_000);
  assert.equal(c.positions?.length, 2);
  // Not readable in what is kept, and not seen with another key.
  for (const text of files.values()) assert.ok(!text.includes('754000'));
  assert.equal((await loadCollection(place())).positions, undefined);
  // 0 forgets it; a deleted file's goes with it.
  await keepPositions(p, [{ id: a.id, ms: 0 }]);
  await deleteItems(p, [b.id]);
  c = await loadCollection(p);
  assert.equal(positionOf(c, a.id), 0);
  assert.equal(c.positions, undefined);
});

// ID3v2.3 with a title, an artist (UTF-16) and a cover.
function id3(): Uint8Array {
  const frame = (id: string, body: number[]) => [...utf8Encode(id), 0, 0, 0, body.length, 0, 0, ...body];
  const title = frame('TIT2', [3, ...utf8Encode('Τραγούδι')]);
  const artist = frame('TPE1', [1, 0xff, 0xfe, ...[...'Ana'].flatMap((ch) => [ch.charCodeAt(0), 0])]);
  const cover = frame('APIC', [0, ...utf8Encode('image/jpeg'), 0, 3, ...utf8Encode('front'), 0, 0xff, 0xd8, 0xff, 0xe0]);
  const body = [...title, ...artist, ...cover];
  const size = body.length;
  return Uint8Array.from([...utf8Encode('ID3'), 3, 0, 0, (size >> 21) & 0x7f, (size >> 14) & 0x7f, (size >> 7) & 0x7f, size & 0x7f, ...body, 0xff, 0xfb]);
}

// An M4A's ftyp and moov/udta/meta/ilst with ©nam and ©alb.
function m4a(): Uint8Array {
  const box = (type: number[], body: number[]) => {
    const size = 8 + body.length;
    return [(size >> 24) & 0xff, (size >> 16) & 0xff, (size >> 8) & 0xff, size & 0xff, ...type, ...body];
  };
  const name = (s: string) => [...s].map((ch) => ch.charCodeAt(0));
  const data = (text: string) => box(name('data'), [0, 0, 0, 1, 0, 0, 0, 0, ...utf8Encode(text)]);
  const ilst = box(name('ilst'), [...box([0xa9, ...name('nam')], data('Night')), ...box([0xa9, ...name('alb')], data('Album'))]);
  const meta = box(name('meta'), [0, 0, 0, 0, ...ilst]);
  return Uint8Array.from([...box(name('ftyp'), name('M4A 0000')), ...box(name('moov'), box(name('udta'), meta))]);
}

t("a song's tags are read from its first bytes: ID3, MP4 and FLAC", () => {
  const tags = readTags(id3());
  assert.equal(tags.title, 'Τραγούδι');
  assert.equal(tags.artist, 'Ana');
  assert.equal(tags.picture?.mime, 'image/jpeg');
  assert.deepEqual([...tags.picture!.bytes], [0xff, 0xd8, 0xff, 0xe0]);
  assert.deepEqual(readTags(m4a()), { title: 'Night', album: 'Album' });
  // FLAC's Vorbis comments.
  const comment = (s: string) => [s.length, 0, 0, 0, ...utf8Encode(s)];
  const vorbis = [...comment('x'), 2, 0, 0, 0, ...comment('TITLE=Song'), ...comment('ARTIST=Band')];
  const flac = Uint8Array.from([...utf8Encode('fLaC'), 0x84, 0, 0, vorbis.length, ...vorbis]);
  assert.deepEqual(readTags(flac), { title: 'Song', artist: 'Band' });
  // Cut short, or nothing of the kind: nothing.
  assert.deepEqual(readTags(id3().slice(0, 12)), {});
  assert.deepEqual(readTags(randomBytes(100)), {});
  assert.deepEqual(readTags(new Uint8Array(0)), {});
});

const file = (id: string, name: string, folder = '', kind: 'file' | 'photo' = 'file'): CollectionItem => ({
  id: id.padEnd(32, '0'),
  file: { name, mime: 'application/octet-stream', kind, size: 10, id: id.padEnd(32, '0'), key: '', chunk: 1, count: 1 },
  folder,
  added: 1,
  at: 1,
});

t("a video's subtitles are the .srt or .vtt beside it with its name, the one with no language first", () => {
  const film = file('a', 'Ταινία.mkv', 'f');
  const subs = file('b', 'ταινία.SRT', 'f');
  const english = file('c', 'Ταινία.en.srt', 'f');
  const elsewhere = file('d', 'Ταινία.srt', '');
  const other = file('e', 'Άλλη.srt', 'f');
  const notes = file('g', 'Ταινία.txt', 'f');
  assert.equal(subtitlesFor([film, english, subs, elsewhere, other, notes], film)?.id, subs.id);
  assert.equal(subtitlesFor([film, english, elsewhere, other], film)?.id, english.id);
  assert.equal(subtitlesFor([film, elsewhere, other, notes, file('h', 'Ταινία.final cut.srt', 'f')], film), null);
  assert.equal(subtitlesType(file('v', 'x.vtt')), 'text/vtt');
  assert.equal(subtitlesType(subs), 'application/x-subrip');
});

t('SubRip becomes WebVTT for the page, in any line breaks, and its text is UTF-8 or Latin-1', () => {
  const srt = '﻿1\r\n00:00:01,500 --> 00:00:04,000\r\nΓεια σου\r\nκόσμε\r\n\r\n2\r\n0:01:02,05 --> 0:01:03,100\r\n<i>Bye</i>\r\n\r\n3\r\n00:00:05,000 --> 00:00:06,000\r\n\r\n';
  assert.equal(srtToVtt(srt), 'WEBVTT\n\n00:00:01.500 --> 00:00:04.000\nΓεια σου\nκόσμε\n\n00:01:02.050 --> 00:01:03.100\n<i>Bye</i>\n');
  assert.equal(srtToVtt('WEBVTT\n\n00:00.000 --> 00:01.000\nHi\n'), 'WEBVTT\n\n00:00.000 --> 00:01.000\nHi\n');
  assert.equal(subtitlesText(utf8Encode('Καλημέρα')), 'Καλημέρα');
  assert.equal(subtitlesText(Uint8Array.from([0x63, 0x61, 0x66, 0xe9])), 'café');
});

t('playlists are kept sealed with the place, in their order, and a deleted one leaves a mark', async () => {
  const p = place();
  const a = await addToCollection(p, bytesSource(randomBytes(10)), song);
  const b = await addToCollection(p, bytesSource(randomBytes(10)), { ...song, name: 'two.mp3' });
  const c = await addToCollection(p, bytesSource(randomBytes(10)), { ...song, name: 'notes.pdf', mime: 'application/pdf' });
  const night = await addPlaylist(p, '  Night  ', [b.id, a.id, b.id, 'f'.repeat(32)]);
  assert.equal(night.name, 'Night');
  // Each file once, and only files there are.
  assert.deepEqual(night.items, [b.id, a.id]);
  const again = await addPlaylist(p, 'Night');
  assert.notEqual(again.name, 'Night');
  await addToPlaylist(p, night.id, [a.id, c.id]);
  await setPlaylistItems(p, night.id, moved([b.id, a.id, c.id], 2, -1));
  await renamePlaylist(p, night.id, 'Late');
  let col = await loadCollection(p);
  const late = col.playlists!.find((l) => l.id === night.id)!;
  assert.equal(late.name, 'Late');
  assert.deepEqual(late.items, [b.id, c.id, a.id]);
  // Only its music plays, in its order.
  assert.deepEqual(playlistItems(col, late).map((i) => i.id), [b.id, a.id]);
  // Not readable in what is kept, nor seen with another key.
  for (const text of files.values()) assert.ok(!text.includes('Late'));
  assert.equal((await loadCollection(place())).playlists, undefined);
  // A file deleted goes from its playlists; a playlist deleted leaves a mark, its files stay.
  await deleteItems(p, [b.id]);
  await deletePlaylist(p, again.id);
  col = await loadCollection(p);
  assert.deepEqual(col.playlists!.map((l) => l.items), [[c.id, a.id]]);
  assert.ok(col.gone.some((g) => g.id === again.id));
  assert.equal(col.items.length, 2);
  await assert.rejects(addToPlaylist(p, again.id, [a.id]), NoSuchPlaylistError);
});

t('a file moves up or down in its list, and stays at an end', () => {
  assert.deepEqual(moved(['a', 'b', 'c'], 0, 1), ['b', 'a', 'c']);
  assert.deepEqual(moved(['a', 'b', 'c'], 2, -1), ['a', 'c', 'b']);
  assert.deepEqual(moved(['a', 'b', 'c'], 0, -1), ['a', 'b', 'c']);
  assert.deepEqual(moved(['a', 'b', 'c'], 2, 1), ['a', 'b', 'c']);
});

t('a station is an https link only, a playlist gives its first https link, and HLS stays as it is', async () => {
  assert.equal(httpsLink(' https://radio.example/live '), 'https://radio.example/live');
  assert.equal(httpsLink('http://radio.example/live'), null);
  assert.equal(httpsLink('https://user:pw@radio.example/'), null);
  assert.equal(httpsLink('ftp://radio.example/'), null);
  assert.equal(httpsLink('radio'), null);
  const pls = '[playlist]\r\nNumberOfEntries=2\r\nFile1=http://a.example/plain\r\nTitle1=A\r\nFile2=https://b.example/stream\r\n';
  assert.deepEqual(playlistLinks(pls), { hls: false, links: ['http://a.example/plain', 'https://b.example/stream'] });
  assert.deepEqual(playlistLinks('#EXTM3U\n#EXTINF:-1,One\nhttps://c.example/one.mp3\n'), { hls: false, links: ['https://c.example/one.mp3'] });
  assert.equal(playlistLinks('#EXTM3U\n#EXT-X-STREAM-INF:BANDWIDTH=1\nlow.m3u8\n').hls, true);
  const asked: string[] = [];
  const get = (body: string, status = 200) => async (url: string) => {
    asked.push(url);
    return { status, bytes: utf8Encode(body) };
  };
  assert.deepEqual(await stationLink('https://s.example/live.mp3', get('')), { url: 'https://s.example/live.mp3', mime: '' });
  assert.deepEqual(await stationLink('https://s.example/live.m3u8', get('')), { url: 'https://s.example/live.m3u8', mime: HLS });
  assert.equal(asked.length, 0);
  assert.deepEqual(await stationLink('https://s.example/x.pls', get(pls)), { url: 'https://b.example/stream', mime: '' });
  assert.deepEqual(await stationLink('https://s.example/x.m3u', get('#EXTM3U\n#EXT-X-TARGETDURATION:6\n')), { url: 'https://s.example/x.m3u', mime: HLS });
  await assert.rejects(stationLink('http://s.example/live', get('')), RadioLinkError);
  await assert.rejects(stationLink('https://s.example/x.pls', get('File1=http://only.example/\n')), RadioLinkError);
  await assert.rejects(stationLink('https://s.example/x.pls', get('', 404)), RadioLinkError);
});

t('a playlist of many stations gives each of them; one station with mirrors stays one', async () => {
  const many = '\uFEFF#EXTM3U\r\n#EXTINF:-1 tvg-logo="x" group-title="Jazz, Blues",Jazz FM\r\nhttps://jazz.example/live\r\n#EXTINF:-1,Rock\r\nhttp://rock.example/plain\r\n#EXTINF:-1,News\r\nhttps://news.example/hls.m3u8\r\n#EXTINF:-1,Again\r\nhttps://jazz.example/live\r\n';
  assert.deepEqual(playlistStations(many), [
    { name: 'Jazz FM', url: 'https://jazz.example/live' },
    { name: 'Rock', url: 'http://rock.example/plain' },
    { name: 'News', url: 'https://news.example/hls.m3u8' },
  ]);
  assert.deepEqual(playlistStations('[playlist]\nFile1=https://a.example/1\nTitle1=One\nFile2=https://b.example/2\nTitle2=Two\nNumberOfEntries=2\n'), [
    { name: 'One', url: 'https://a.example/1' },
    { name: 'Two', url: 'https://b.example/2' },
  ]);
  assert.deepEqual(playlistStations('#EXTM3U\n#EXTINF:-1,Same\nhttps://m1.example/\n#EXTINF:-1,Same\nhttps://m2.example/\n'), [{ name: 'Same', url: 'https://m1.example/' }]);
  assert.deepEqual(playlistStations('#EXTM3U\n#EXT-X-STREAM-INF:BANDWIDTH=1\nhttps://x.example/low.m3u8\n'), []);
  assert.deepEqual(playlistStations('hello\nnot a link\n'), []);
  const { stations, plain } = playableStations(playlistStations(many));
  assert.equal(plain, 1);
  assert.deepEqual(stations, [
    { name: 'Jazz FM', url: 'https://jazz.example/live', mime: '' },
    { name: 'News', url: 'https://news.example/hls.m3u8', mime: HLS },
  ]);
  let asked = 0;
  const get = (body: string) => async () => {
    asked++;
    return { status: 200, bytes: utf8Encode(body) };
  };
  const got = await linkStations('https://s.example/list.m3u', get(many));
  assert.ok('many' in got && got.many.length === 2 && got.plain === 1);
  assert.equal(asked, 1);
  assert.deepEqual(await linkStations('https://s.example/one.pls', get('File1=https://b.example/stream\n')), { one: { url: 'https://b.example/stream', mime: '' } });
  assert.equal(asked, 2);
  assert.deepEqual(await linkStations('https://s.example/live.mp3', get('')), { one: { url: 'https://s.example/live.mp3', mime: '' } });
  assert.equal(asked, 2);
});

t('stations of a playlist are added at once, skipping those already here and http links', async () => {
  const p = place();
  await addStation(p, 'Jazz', { url: 'https://jazz.example/live', mime: '' });
  const result = await addStations(p, [
    { name: 'Jazz again', url: 'https://jazz.example/live', mime: '' },
    { name: 'Jazz', url: 'https://other.example/jazz', mime: '' },
    { name: 'Plain', url: 'http://plain.example/', mime: '' },
    { name: 'News', url: 'https://news.example/hls.m3u8', mime: HLS },
  ]);
  assert.deepEqual(result, { added: 2, skipped: 2 });
  const c = await loadCollection(p);
  assert.equal(c.stations?.length, 3);
  assert.notEqual(c.stations?.[1].name, 'Jazz');
  assert.equal(c.stations?.[2].mime, HLS);
  assert.deepEqual(await addStations(p, []), { added: 0, skipped: 0 });
});

t('Radio Browser is asked only the words typed, and only its stations with an https link are offered', () => {
  assert.equal(radioSearchUrl('   '), null);
  assert.equal(radioSearchUrl(' jazz & blues '), 'https://de1.api.radio-browser.info/json/stations/search?name=jazz%20%26%20blues&limit=30&hidebroken=true');
  const answer = [
    { name: ' Jazz  FM ', url: 'http://plain.example/', url_resolved: 'https://jazz.example/live', country: 'Greece', codec: 'MP3', bitrate: 128, hls: 0 },
    { name: 'Plain', url: 'http://plain.example/', url_resolved: 'http://plain.example/' },
    { name: 'Live', url: 'https://hls.example/x', url_resolved: '', hls: 1 },
    { name: 'Again', url_resolved: 'https://jazz.example/live' },
    { name: '', url_resolved: 'https://nameless.example/' },
  ];
  assert.deepEqual(foundStations(utf8Encode(JSON.stringify(answer))), [
    { name: 'Jazz FM', url: 'https://jazz.example/live', mime: '', about: 'Greece · MP3 · 128 kbps' },
    { name: 'Live', url: 'https://hls.example/x', mime: HLS, about: '' },
  ]);
  assert.deepEqual(foundStations(utf8Encode('not json')), []);
  assert.deepEqual(foundStations(utf8Encode('{"a":1}')), []);
});

t('stations are kept sealed with the place, https only, and a deleted one leaves a mark', async () => {
  const p = place();
  const one = await addStation(p, 'Jazz', { url: 'https://jazz.example/live', mime: '' });
  const two = await addStation(p, 'Jazz', { url: 'https://jazz.example/hls.m3u8', mime: HLS });
  assert.notEqual(two.name, 'Jazz');
  await assert.rejects(addStation(p, 'Plain', { url: 'http://plain.example/', mime: '' }));
  await renameStation(p, one.id, 'Night jazz');
  let c = await loadCollection(p);
  assert.deepEqual(
    c.stations?.map((s) => [s.name, s.url, s.mime]),
    [
      ['Night jazz', 'https://jazz.example/live', ''],
      [two.name, 'https://jazz.example/hls.m3u8', HLS],
    ],
  );
  for (const text of files.values()) assert.ok(!text.includes('jazz.example'));
  assert.equal((await loadCollection(place())).stations, undefined);
  await deleteStation(p, two.id);
  c = await loadCollection(p);
  assert.equal(c.stations?.length, 1);
  assert.ok(c.gone.some((g) => g.id === two.id));
});

t('an IPTV list gives each channel with its group and logo, names with commas, and keeps same-name channels', () => {
  const list = [
    '﻿#EXTM3U x-tvg-url="https://epg.example/guide.xml"',
    '#EXTINF:-1 tvg-id="a.gr" tvg-name="Alpha, HD" tvg-logo="https://logo.example/a.png" group-title="News;General",Alpha, the news (720p)',
    '#EXTVLCOPT:http-user-agent=Something',
    'https://a.example/live/index.m3u8',
    '#EXTINF:-1 tvg-logo="http://logo.example/b.png",Beta',
    '#EXTGRP:Sports',
    'https://b.example/stream.ts',
    '#EXTINF:-1 tvg-name="Gamma",',
    'http://plain.example/g.m3u8',
    '#EXTINF:-1 group-title="News",Alpha, the news (720p)',
    'https://a2.example/live.m3u8?token=1',
    '#EXTINF:-1 group-title="Music",',
    'https://m.example/play?type=m3u8',
    '',
  ].join('\r\n');
  assert.deepEqual(tvChannels(list), [
    { name: 'Alpha, the news (720p)', url: 'https://a.example/live/index.m3u8', group: 'News', logo: 'https://logo.example/a.png' },
    { name: 'Beta', url: 'https://b.example/stream.ts', group: 'Sports', logo: 'http://logo.example/b.png' },
    { name: 'Gamma', url: 'http://plain.example/g.m3u8', group: '', logo: '' },
    { name: 'Alpha, the news (720p)', url: 'https://a2.example/live.m3u8?token=1', group: 'News', logo: '' },
    { name: '', url: 'https://m.example/play?type=m3u8', group: 'Music', logo: '' },
  ]);
  assert.deepEqual(extinf('#EXTINF:-1 tvg-name="a, b" group-title="x",Name, with comma'), { attributes: { 'tvg-name': 'a, b', 'group-title': 'x' }, name: 'Name, with comma' });
  assert.deepEqual(tvChannels('#EXTM3U\n#EXT-X-TARGETDURATION:6\n#EXTINF:6,\nhttps://s.example/1.ts\n'), []);
  const { channels, plain } = playableChannels(tvChannels(list));
  assert.equal(plain, 1);
  assert.deepEqual(
    channels.map((c) => [c.name, c.mime, c.group, c.logo]),
    [
      ['Alpha, the news (720p)', HLS, 'News', 'https://logo.example/a.png'],
      ['Beta', '', 'Sports', ''],
      ['Alpha, the news (720p)', HLS, 'News', ''],
      ['m.example', HLS, 'Music', ''],
    ],
  );
  // Never more than a list may add.
  const huge = Array.from({ length: MOST_LISTED_CHANNELS + 5 }, (_, i) => `#EXTINF:-1,C${i}\nhttps://c.example/${i}.m3u8`).join('\n');
  assert.equal(tvChannels(huge).length, MOST_LISTED_CHANNELS);
});

t('a list by its link is fetched once; one channel by its link is not fetched; https only', async () => {
  const asked: string[] = [];
  const get = (body: string, status = 200) => async (url: string) => {
    asked.push(url);
    return { status, bytes: utf8Encode(body) };
  };
  const got = await listFromLink('https://iptv.example/list.m3u', get('#EXTM3U\n#EXTINF:-1 group-title="Kids",One\nhttps://one.example/a.m3u8\n#EXTINF:-1,Two\nhttp://two.example/\n'));
  assert.ok('many' in got && got.many.length === 1 && got.plain === 1 && got.many[0].group === 'Kids');
  assert.deepEqual(asked, ['https://iptv.example/list.m3u']);
  assert.deepEqual(await listFromLink('https://iptv.example/x', get('#EXTM3U\n#EXT-X-STREAM-INF:BANDWIDTH=1\nlow.m3u8\n')), { one: { url: 'https://iptv.example/x', mime: HLS } });
  await assert.rejects(listFromLink('https://iptv.example/x', get('', 404)), RadioLinkError);
  await assert.rejects(listFromLink('https://iptv.example/x', get('hello')), RadioLinkError);
  await assert.rejects(listFromLink('http://iptv.example/list.m3u', get('')), RadioLinkError);
  assert.equal(asked.length, 4);
  assert.deepEqual(channelLink(' https://tv.example/live.m3u8 '), { url: 'https://tv.example/live.m3u8', mime: HLS });
  assert.deepEqual(channelLink('https://tv.example/live.ts'), { url: 'https://tv.example/live.ts', mime: '' });
  assert.throws(() => channelLink('http://tv.example/live.m3u8'), RadioLinkError);
  assert.equal(iptvOrgCountry('GR'), 'https://iptv-org.github.io/iptv/countries/gr.m3u');
  assert.equal(iptvOrgCountry('greece'), null);
  assert.equal(IPTV_ORG_ALL, 'https://iptv-org.github.io/iptv/index.m3u');
  assert.equal(homeCountry('el-GR', 'el'), 'gr');
  assert.equal(homeCountry('en-US', 'en'), 'us');
  assert.equal(homeCountry(undefined, 'el'), 'gr');
  assert.equal(homeCountry('de', 'de'), 'de');
  assert.ok(IPTV_ORG_COUNTRIES.includes('gr') && IPTV_ORG_COUNTRIES.every((c) => /^[a-z]{2}$/.test(c)));
});

t('channels are grouped and searched, and only a picture is taken for a logo', () => {
  const list = [
    { name: 'Ωμέγα', group: 'News' },
    { name: 'Alpha', group: '' },
    { name: 'Beta', group: 'Kids' },
    { name: 'Gamma', group: 'News' },
  ];
  assert.deepEqual(
    channelGroups(list).map((g) => [g.group, g.channels.map((c) => c.name)]),
    [
      ['Kids', ['Beta']],
      ['News', ['Ωμέγα', 'Gamma']],
      ['', ['Alpha']],
    ],
  );
  assert.ok(channelMatches(list[0], 'ωμεγα'));
  assert.ok(channelMatches(list[3], 'news'));
  assert.ok(!channelMatches(list[2], 'news'));
  assert.equal(groupName(' Sports;News '), 'Sports');
  assert.equal(groupName('x'.repeat(100)).length, 60);
  assert.equal(logoType(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d])), 'image/png');
  assert.equal(logoType(new Uint8Array([0xff, 0xd8, 0xff, 0xe0])), 'image/jpeg');
  assert.equal(logoType(utf8Encode('RIFF\0\0\0\0WEBPVP8 ')), 'image/webp');
  assert.equal(logoType(utf8Encode('<svg xmlns="http://www.w3.org/2000/svg"/>')), null);
});

t('channels are kept sealed with the place, https only, without duplicate links, and a group goes at once', async () => {
  const p = place();
  const result = await addChannels(p, [
    { name: 'Alpha', url: 'https://a.example/live.m3u8', mime: HLS, group: 'News;General', logo: 'https://logo.example/a.png' },
    { name: 'Alpha', url: 'https://a2.example/live.m3u8', mime: HLS, group: 'News' },
    { name: 'Again', url: 'https://a.example/live.m3u8', mime: HLS },
    { name: 'Plain', url: 'http://plain.example/', mime: '' },
    { name: 'Beta', url: 'https://b.example/b.ts', mime: '', group: 'Kids', logo: 'http://logo.example/b.png' },
  ]);
  assert.deepEqual(result, { added: 3, skipped: 2 });
  let c = await loadCollection(p);
  assert.deepEqual(
    c.channels?.map((s) => [s.name, s.mime, s.group, s.logo]),
    [
      ['Alpha', HLS, 'News', 'https://logo.example/a.png'],
      ['Alpha', HLS, 'News', ''],
      ['Beta', '', 'Kids', ''],
    ],
  );
  for (const text of files.values()) assert.ok(!text.includes('a.example'));
  assert.equal((await loadCollection(place())).channels, undefined);
  const one = await addChannel(p, { name: 'Gamma', url: 'https://g.example/g.m3u8', mime: HLS });
  assert.equal(one.group, '');
  await assert.rejects(addChannel(p, { name: 'Gamma again', url: 'https://g.example/g.m3u8', mime: HLS }));
  await renameChannel(p, one.id, 'Gamma TV');
  c = await loadCollection(p);
  assert.equal(c.channels?.find((s) => s.id === one.id)?.name, 'Gamma TV');
  assert.equal(await deleteChannelGroup(p, 'News'), 2);
  assert.equal(await deleteChannelGroup(p, 'News'), 0);
  await deleteChannel(p, one.id);
  c = await loadCollection(p);
  assert.deepEqual(c.channels?.map((s) => s.name), ['Beta']);
  assert.ok(c.gone.some((g) => g.id === one.id));
  await deleteChannelGroup(p, 'Kids');
  assert.equal((await loadCollection(p)).channels, undefined);
  // The logos are off until turned on, a choice of the place's own.
  assert.equal(c.showLogos, undefined);
  await setCollectionOption(p, 'showLogos', true);
  assert.equal((await loadCollection(p)).showLogos, true);
});

t('a place keeps at most MAX_CHANNELS channels', async () => {
  const p = place();
  const many = Array.from({ length: MAX_CHANNELS + 3 }, (_, i) => ({ name: `C${i}`, url: `https://c.example/${i}.m3u8`, mime: HLS }));
  assert.deepEqual(await addChannels(p, many), { added: MAX_CHANNELS, skipped: 3 });
  assert.equal((await loadCollection(p)).channels?.length, MAX_CHANNELS);
});
