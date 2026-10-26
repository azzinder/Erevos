import type { QueuesData } from '../lock/queues-data';
import type { Queue } from '../lock/space-data';
import { contactQueuesAt } from './contact-queues';
import type { E2E } from './e2e';
import { sameRelay } from './relay';

// Which of a space's queues the web app's pushes go for (lib/web-push.web.ts), on the relay at
// `url`: its own queue, its groups' and public groups' there (lib/queue-move.ts), and its contacts'
// own queues there (lib/contact-queues.ts) with the ones made ahead, so a contact given one while
// Erevos was open still wakes it once closed. Never a hidden place's, nor the queue the contact
// link names (a request shows when the app opens), nor one the space or a contact moved away from:
// what comes there is read once Erevos is open, as junk that made it move may. With no Tor in the
// web app the relay sees a space's contact queues waited on together while it is open, and with
// one push address for them all, it can tie them while it is closed too (docs/threat-model.md).

type Contacts = Pick<E2E, 'contactQueues' | 'readyAt'>;

/** The recipient ids (hex) of the queues that push, `queue` first, each once. */
export function pushedQueues(queue: Queue, kept: Pick<QueuesData, 'group' | 'public'> | null, e2e: Contacts | null, url: string): string[] {
  const groups = [kept?.group, kept?.public].flatMap((k) => (k && sameRelay(k.url, url) ? [k.queue.recipientHex] : []));
  const contacts = e2e ? [...contactQueuesAt(e2e.contactQueues(), url).flatMap((q) => (q.was ? [] : [q.r])), ...e2e.readyAt(url)] : [];
  return [...new Set([queue.recipientHex, ...groups, ...contacts])];
}

/** The contact queues on the relay at `url` that may still have the push address from before and
 *  no longer push: the ones contacts moved away from (Mine.was), and those no one is to write to
 *  any more, not deleted there yet (E2E.goneQueues). Theirs goes too when notifications are turned off. */
export function leftAt(e2e: Pick<E2E, 'contactQueues' | 'goneQueues'> | null, url: string): string[] {
  if (!e2e) return [];
  const was = contactQueuesAt(e2e.contactQueues(), url).flatMap((q) => (q.was ? [q.r] : []));
  return [...was, ...e2e.goneQueues().flatMap((g) => (sameRelay(g.u, url) ? [g.r] : []))];
}
