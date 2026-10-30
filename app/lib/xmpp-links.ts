// A link's preview in an XMPP message, as Link Metadata (XEP-0511) carries it beside the words: the
// page's address, title and description, with no picture. Only the sender's phone makes one
// (lib/make-preview.ts), and only in a chat without encryption: OMEMO hides the words only, so a
// preview beside them would tell the servers what the link is. One that comes beside an encrypted
// message is not shown, as its servers could have put it there.

import { isWebLink, MAX_PREVIEW_TEXT, MAX_PREVIEW_TITLE, type Preview } from './chat-parts';
import { child, children, el, textOf, type XmlElement } from './xmpp-xml';

export const NS_RDF = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#';
export const NS_OG = 'https://ogp.me/ns#';

/** The preview a message carries, or null. */
export function previewOf(message: XmlElement): Preview | null {
  const description = children(message, 'Description', NS_RDF)[0];
  if (!description) return null;
  const about = description.attrs['rdf:about'] ?? description.attrs.about;
  const url = [textOf(child(description, 'url', NS_OG)).trim(), about].find(isWebLink);
  const title = textOf(child(description, 'title', NS_OG)).trim().slice(0, MAX_PREVIEW_TITLE);
  const text = textOf(child(description, 'description', NS_OG)).trim().slice(0, MAX_PREVIEW_TEXT);
  if (!url || (!title && !text)) return null;
  return { url, title, text };
}

/** A preview beside a message's words: its picture stays on the phone that made it. */
export function previewElement(preview: Preview): XmlElement {
  return el(
    'Description',
    { xmlns: NS_RDF, 'xmlns:og': NS_OG, 'rdf:about': preview.url, 'xmlns:rdf': NS_RDF },
    el('url', { xmlns: NS_OG }, preview.url),
    preview.title ? el('title', { xmlns: NS_OG }, preview.title) : null,
    preview.text ? el('description', { xmlns: NS_OG }, preview.text) : null,
  );
}
