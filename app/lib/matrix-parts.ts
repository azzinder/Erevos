// What a Matrix message can be besides words and files, as Element and Element X write it, read
// and made here (lib/matrix.ts takes them in): a poll (MSC3381, under its unstable names, which is
// what Element sends, and its stable ones, which it reads), the votes on it and its end; a place
// (m.location, MSC3488); a link's preview, which only the sender's phone made (MSC4095, as Beeper
// and Element X carry it), with no picture; and where a message stands in a thread (m.thread).
// Each is checked as it comes: what is not of its shape is none, and shows as the words it carries.

import { checkedPlace, isWebLink, MAX_OPTION, MAX_OPTIONS, MAX_PREVIEW_TEXT, MAX_PREVIEW_TITLE, MAX_QUESTION, type Place, type Poll, type Preview } from './chat-parts';

type Json = Record<string, unknown>;

/** A poll in a room: its question, its answers by their IDs, how many may be chosen, and the votes on it. */
export type MatrixPoll = {
  q: string;
  answers: { id: string; text: string }[];
  /** How many answers one may choose: 1 for one only. */
  max: number;
  /** Whether the votes show before it ends (disclosed), as Element shows them. */
  disclosed: boolean;
  /** Each voter's latest choice: the answers' IDs, and when they chose. */
  votes?: Record<string, { ids: string[]; ts: number }>;
  /** When its maker ended it, as the homeserver dated the end: votes after that do not count. */
  ended?: number;
  /** We ended it, and the homeserver has not passed the end back yet. */
  closing?: true;
};

/** Whether a poll takes no more votes. */
export const pollOver = (poll: MatrixPoll) => poll.ended !== undefined || !!poll.closing;

export const POLL_START = ['org.matrix.msc3381.poll.start', 'm.poll.start'];
export const POLL_RESPONSE = ['org.matrix.msc3381.poll.response', 'm.poll.response'];
export const POLL_END = ['org.matrix.msc3381.poll.end', 'm.poll.end'];
const DISCLOSED = ['org.matrix.msc3381.poll.disclosed', 'm.poll.disclosed'];
/** The most voters a poll keeps. */
const MOST_VOTERS = 500;

/** Text as MSC1767 carries it: a plain string, or a list of bodies with their types. */
function textOf(value: unknown, most: number): string {
  if (typeof value === 'string') return value.trim().slice(0, most);
  if (Array.isArray(value)) {
    const plain = (value as Json[]).find((v) => v && typeof v.body === 'string' && (!v.mimetype || v.mimetype === 'text/plain'));
    return typeof plain?.body === 'string' ? plain.body.trim().slice(0, most) : '';
  }
  return '';
}

const textIn = (v: Json | undefined, most: number) => textOf(v?.['org.matrix.msc1767.text'], most) || textOf(v?.['m.text'], most) || textOf(v?.body, most);

/** A poll's start as it may come, or null when it is not of its shape. */
export function pollOfContent(content: Json): MatrixPoll | null {
  const start = (content['org.matrix.msc3381.poll.start'] ?? content['m.poll']) as Json | undefined;
  if (!start || typeof start !== 'object') return null;
  const q = textIn(start.question as Json | undefined, MAX_QUESTION);
  const answers: MatrixPoll['answers'] = [];
  for (const answer of Array.isArray(start.answers) ? (start.answers as Json[]) : []) {
    const id = typeof answer?.id === 'string' ? answer.id : typeof answer?.['m.id'] === 'string' ? String(answer['m.id']) : '';
    const text = textIn(answer, MAX_OPTION);
    if (id && id.length <= 100 && text && !answers.some((a) => a.id === id)) answers.push({ id, text });
  }
  if (!q || answers.length < 2) return null;
  const shown = answers.slice(0, MAX_OPTIONS);
  const max = typeof start.max_selections === 'number' && Number.isInteger(start.max_selections) && start.max_selections >= 1 ? Math.min(start.max_selections, shown.length) : 1;
  return { q, answers: shown, max, disclosed: DISCLOSED.includes(String(start.kind ?? DISCLOSED[0])) };
}

/** The answers a vote chose, as it came: none takes it back; those the poll has not, or past its most, do not count. */
export function votedOf(content: Json, poll: MatrixPoll): string[] | null {
  const response = (content['org.matrix.msc3381.poll.response'] as Json | undefined)?.answers ?? content['m.selections'];
  if (!Array.isArray(response)) return null;
  const known = new Set(poll.answers.map((a) => a.id));
  // A vote with an answer the poll has not is spoiled, as the MSC says: it counts as none.
  if (response.some((id) => typeof id !== 'string' || !known.has(id))) return [];
  return [...new Set(response as string[])].slice(0, poll.max);
}

/** Takes a vote in: each voter's latest counts, and none after the poll ended. Whether it changed what shows. */
export function takeVote(poll: MatrixPoll, sender: string, ids: string[], ts: number): boolean {
  if (poll.ended !== undefined && ts > poll.ended) return false;
  const votes = (poll.votes ??= {});
  const before = votes[sender];
  if (before && before.ts > ts) return false;
  if (!before && Object.keys(votes).length >= MOST_VOTERS) return false;
  votes[sender] = { ids, ts };
  return true;
}

/** Ends a poll at `ts`: votes cast later no longer count. */
export function endPoll(poll: MatrixPoll, ts: number): void {
  poll.ended = poll.ended === undefined ? ts : Math.min(poll.ended, ts);
  delete poll.closing;
  for (const [who, vote] of Object.entries(poll.votes ?? {})) if (vote.ts > poll.ended) delete poll.votes![who];
}

/** The poll as an Erevos poll's card shows it (components/poll.tsx), with each voter's choices by number. */
export function pollShown(poll: MatrixPoll): { poll: Poll; votes: { who: string; chose: number[] }[] } {
  const at = new Map(poll.answers.map((a, i) => [a.id, i]));
  return {
    poll: { q: poll.q, o: poll.answers.map((a) => a.text), ...(poll.max > 1 ? { m: true } : {}) },
    votes: Object.entries(poll.votes ?? {})
      .map(([who, vote]) => ({ who, chose: vote.ids.map((id) => at.get(id)).filter((i): i is number => i !== undefined).sort((a, b) => a - b) }))
      .filter((vote) => vote.chose.length > 0),
  };
}

/** A new poll's event content, as Element sends one, with its words for an app that shows no polls. */
export function pollContent(poll: Poll): Json {
  const answers = poll.o.map((text, i) => ({ id: `a${i + 1}`, 'org.matrix.msc1767.text': text }));
  const fallback = [poll.q, ...poll.o.map((text, i) => `${i + 1}. ${text}`)].join('\n');
  return {
    'org.matrix.msc3381.poll.start': {
      question: { 'org.matrix.msc1767.text': poll.q, body: poll.q, msgtype: 'm.text' },
      kind: DISCLOSED[0],
      max_selections: poll.m ? poll.o.length : 1,
      answers,
    },
    'org.matrix.msc1767.text': fallback,
  };
}

/** A vote's event content: the answers chosen, by ID, on the poll `target`; none takes it back. */
export function voteContent(target: string, ids: string[]): Json {
  return { 'm.relates_to': { rel_type: 'm.reference', event_id: target }, 'org.matrix.msc3381.poll.response': { answers: ids } };
}

/** A poll's end, as its maker sends it. */
export function endContent(target: string, words: string): Json {
  return { 'm.relates_to': { rel_type: 'm.reference', event_id: target }, 'org.matrix.msc3381.poll.end': {}, 'org.matrix.msc1767.text': words };
}

/** A place from a geo: URI (RFC 5870), as m.location carries it: geo:lat,lon, with ;u= how near, metres. */
export function placeOfGeo(uri: unknown): Place | null {
  if (typeof uri !== 'string' || uri.length > 200) return null;
  const found = /^geo:(-?\d{1,3}(?:\.\d+)?),(-?\d{1,3}(?:\.\d+)?)(?:,-?\d+(?:\.\d+)?)?((?:;[^;?]*)*)/i.exec(uri.trim());
  if (!found) return null;
  const u = /;u=(\d+(?:\.\d+)?)/i.exec(found[3] ?? '')?.[1];
  return checkedPlace({ lat: Number(found[1]), lon: Number(found[2]), ...(u ? { acc: Number(u) } : {}) });
}

/** A place a message content carries (m.location), or null. */
export function placeOfContent(content: Json): Place | null {
  const location = content['org.matrix.msc3488.location'] as Json | undefined;
  if (content.msgtype !== 'm.location' && !location) return null;
  return placeOfGeo(location?.uri) ?? placeOfGeo(content.geo_uri);
}

/** A geo: URI of a place, as Matrix and XMPP apps write one. */
export function geoUri(place: Place): string {
  return `geo:${place.lat},${place.lon}${place.acc !== undefined ? `;u=${place.acc}` : ''}`;
}

/** Where we are, as an m.location message's content, as Element sends one. */
export function locationContent(place: Place, words: string, ts = Date.now()): Json {
  const uri = geoUri(place);
  const body = `${words} ${uri}`;
  return {
    msgtype: 'm.location',
    body,
    geo_uri: uri,
    'org.matrix.msc3488.location': { uri, description: words },
    'org.matrix.msc3488.asset': { type: 'm.self' },
    'org.matrix.msc3488.ts': ts,
    'org.matrix.msc1767.text': body,
  };
}

const PREVIEWS = 'com.beeper.linkpreviews';

/** The preview a message carries of a link in its words (MSC4095), without its picture, or none. */
export function previewOfContent(content: Json): Preview | null {
  const list = content[PREVIEWS];
  const first = Array.isArray(list) ? (list[0] as Json | undefined) : undefined;
  if (!first || typeof first !== 'object') return null;
  const url = [first['og:url'], first.matched_url].find(isWebLink);
  const title = typeof first['og:title'] === 'string' ? first['og:title'].trim().slice(0, MAX_PREVIEW_TITLE) : '';
  const text = typeof first['og:description'] === 'string' ? first['og:description'].trim().slice(0, MAX_PREVIEW_TEXT) : '';
  if (!url || (!title && !text)) return null;
  return { url, title, text };
}

/** A preview the sender's phone made, as MSC4095 carries it next to the words; its picture stays here. */
export function previewContent(preview: Preview): Json {
  return { [PREVIEWS]: [{ matched_url: preview.url, 'og:url': preview.url, ...(preview.title ? { 'og:title': preview.title } : {}), ...(preview.text ? { 'og:description': preview.text } : {}) }] };
}

/** Where a message stands in a thread (m.thread): its root, and the message it answers there when that is not only the thread's fallback. */
export function threadOf(content: Json): { root: string; answers?: string } | null {
  const relation = content['m.relates_to'] as Json | undefined;
  if (relation?.rel_type !== 'm.thread' || typeof relation.event_id !== 'string' || !relation.event_id.startsWith('$')) return null;
  const to = (relation['m.in_reply_to'] as Json | undefined)?.event_id;
  return { root: relation.event_id, ...(relation.is_falling_back !== true && typeof to === 'string' && to.startsWith('$') ? { answers: to } : {}) };
}

/** The relation of a message in the thread of `root`: an answer to `answers` there, or the thread's latest as its fallback, as Element writes it. */
export function threadRelation(root: string, latest: string, answers?: string): Json {
  return { rel_type: 'm.thread', event_id: root, is_falling_back: !answers, 'm.in_reply_to': { event_id: answers ?? latest } };
}
