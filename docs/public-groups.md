# Public groups

A public group is a group chat that anyone with its link, or its QR code, can ask to join. It is
the same MLS group as a private one (crates/erevos-group, app/lib/groups.ts), with an owner, admins
and moderation. This note says how it works and what it gives away. Not audited. The app's side is
app/lib/public-groups.ts, with what travels in app/lib/public-rules.ts and its checks, phones with
the real core and relays, in app/checks/public-groups.check.ts.

## Who does what

- **The owner** made the group, or had it handed over. Its phone is the group's *keeper*: the one
  member whose MLS commits count, as the admin's are in a private group. It lets people in, takes
  them out, and changes the group's rules. Only one phone commits, so commits never race and no
  server has to put them in order; a commit from anyone else is refused by every member's core.
- **Admins** are members the owner named. They take members out, ban them, mute them, delete a
  message for everyone, and let in or turn away people who ask, when the group asks for that.
- **Members** talk, and can show the link to others.

## Joining by the link while the owner's phone is off

The owner's phone makes a *door*: a queue of its own on the owner's relay, kept for this group, and
a key pair whose secret stays on the owner's phone. The link holds the group's id and name, the
door's sender id, the relay's address and key, and the door's public key:

    erevos://join?g=<group id>&d=<door sender id>&relay=<relay>&rk=<relay key>&k=<door key>&n=<name>

1. Whoever opens the link chooses the name the group sees. Their phone makes a signing key for this
   group alone and a key package with it, saying that name and where to reach them (their relay,
   their queue's sender id, and the key group messages to them are sealed to). It seals the key
   package to the door's key and sends it to the door, through its own relay (two-hop, as to a
   contact on another relay).
2. The request waits in the door on the relay until the owner's phone is on: up to 14 days, as any
   message. The owner's phone looks at its doors every few seconds while Erevos is open, and every
   minute or so in the background.
3. The owner's phone opens the request, checks the key package's signatures, that the member says
   its own signing key as its id, that it is not banned, and that the group is not full. Then:
   - With approval off, it lets them in at once: one commit adds them, the welcome goes to them,
     sealed to their key, straight to their queue, and the commit to everyone else.
   - With approval on, it keeps the request and tells the admins, inside the group. Any admin
     lets them in or turns them away; the owner's phone does it as soon as it hears.
   - Turned away, banned or full, it sends them a short answer saying so.
4. The asking phone accepts a welcome only for a group it asked to join.

So a join needs the owner's phone to be on at some time: it waits on the relay meanwhile, as a
message to a phone that is off does. The admins cannot let someone in while the owner's phone is
off; they can only say yes or no once it has told them.

## What the relays see

- **The owner's relay** sees a queue made, sealed requests coming into it (from other relays, or
  from phones on the same relay), the owner's phone taking them, and the queue deleted when the link
  changes. It cannot open a request: it is sealed to the door's key, which only the owner's phone
  has. It learns how many people asked, and when, but not who.
- **Each member's relay** sees what it sees for a private group: sealed packets coming into the
  member's queue. Each group message is sealed again for each member, so what reaches one member's
  queue looks like nothing another gets, and no relay can tell which group it is for or who else is
  in it. A welcome or an answer looks the same.
- **An asking phone's relay** passes a sealed send on to the owner's relay, as for any contact
  there; it does not see the door, nor what is in it.

No relay reads anything, and none learns who is in the group. The relay holds nothing of the
group's but the door and the messages on their way.

## How the admins stay in agreement

- **The rules travel in the group itself.** The group's MLS group context holds a rules extension:
  the keeper's leaf, then the rules as JSON: the admins (by their signing keys in the group),
  whether joining needs approval, the link, the bans and the mutes. MLS binds the group context to
  the keys of each epoch, so every member in an epoch has the same rules, or cannot read the others
  at all. Only the keeper changes them, with a commit, and a new member gets them in its welcome.
- **Moderation goes as group messages.** An admin's step (mute, take out, ban, delete, let in) is a
  message in the group, sealed for every member like any other. Each member's phone takes it only
  if its sender was an admin *in the epoch it was written in* (from the rules of that epoch, which
  every member has alike), so it counts the same everywhere, whatever order messages come in.
- **The last step counts.** For each member's mute or ban, the step with the latest time counts,
  and with the same time, the one from the admin whose key sorts first. Every member reaches the
  same result. The owner's phone folds what it has into the rules with its next commit, so someone
  who joins later starts from the same place.
- **The owner names the admins**, makes the link, turns approval on or off, and hands the group over.
  These change the rules, so they are the keeper's commits.

## Taking out, banning, muting, deleting

- **Taking out:** the moment a member's phone hears an admin take someone out, it stops sending to
  them and shows nothing more from them. The owner's phone then takes them out of the MLS group,
  so they cannot read anything sent after, even if a phone has not heard yet. Their own phone hears
  it too, and the group closes there.
- **Banning** is taking out, and the owner's phone also turns away that phone's requests from then
  on: by the signing key it had in the group, and by its queue and its key. A ban stops the same
  Erevos coming back through the link; someone with a new relay queue can still ask. Against that,
  turn approval on, or change the link.
- **Muting:** members' phones show nothing a muted member writes, and the muted member's own phone
  says so and does not send. Taking the mute off lets them write again.
- **Deleting for everyone:** an admin's phone tells every member to delete one message, by its
  sender and its tag. A message that comes after it was deleted is not shown. A member whose phone
  is modified can keep what it read: deleting for everyone never takes back what was read.

## Changing the link, handing over

- **Changing the link:** the owner's phone makes a new door and deletes the old queue on the relay,
  so a request to the old link finds no queue there and the phone that sent it says the link no
  longer works. The new link goes to the members in the rules. Requests waiting in the old door are
  lost.
- **Handing over:** the owner chooses a member, usually an admin. One commit makes that member's
  phone the keeper; that phone then makes a door of its own, on its own relay, so the link changes.
  The old owner is an admin from then on, and its old door is deleted, with the requests that
  waited at it for an admin.
- **New keys every week:** the keeper's phone commits new keys for its own leaf, and each member
  asks it, in a group message only it gets, to put it in anew with a key package signed with the
  key made for the group: one commit takes its leaf out and the key package in, and the welcome
  goes to it alone, sealed to its key. The member keeps its key, its name and its role, and what
  the others write meanwhile waits for the welcome. A muted member asks too; one taken out or
  banned is not let in again this way.
- If the owner's phone is lost for good, nobody can let people in again or change the rules; the
  group goes on for those in it, and the admins still mute, take out (for every phone that hears)
  and delete. Hand the group over before changing phones.

## Limits

- **100 members.** The welcome holds the group's whole tree, and has to fit in one relay message
  (64 KiB): at 100 members it is about 54 KB (crates/erevos-group, its test of the most members).
  The owner's phone turns away anyone past that.
- **Every message goes to every member,** sealed for each, from the sender's phone: with 100 members
  that is 100 sends, as for a private group.
- **The rules stay under 4 KB:** the oldest bans and mutes drop out past that.
- **Waiting to be let in:** the owner's phone keeps 50 requests at most; past that, it turns away
  the newest.

## What stays as it is

Private groups, made from contacts, work as before: the admin is leaf 0, the only one who commits,
contacts are asked and join through their chat, and every member signs with the key of its own
that it has in every private group. Their key packages say nothing new, so phones on an older
Erevos join them as before. A public group needs this Erevos on every phone in it.

## What a public group gives away

- **Anyone with the link can read the group from when they join**, without approval, as soon as the
  owner's phone lets them in. They read nothing from before. With approval, from when an admin lets
  them in. Once someone has the link, it can be passed on: change it to stop that.
- **The link shows the group's name and the owner's relay address** to whoever sees it.
- **Every member sees every member's** chosen name, the key it signs with in this group, its relay's
  address and its queue's sender id. From 2.0.0 that is a queue its public groups alone read on, not
  the one in its contact link nor the one its contacts write to, so the link no longer tells who it
  is; the same queue in each of its public groups, so members of two of them can tell it is the same
  member. An Erevos before still says the queue of its contact link. The key is made for this group
  alone: it does not say who they are in their chats, nor which other groups they are in.
- **Members can write to each other's queues.** A member can fill another's queue with what it
  cannot read; the relay takes at most 1000 messages for a queue.
- **Names are chosen, not proven.** Anyone can call themselves anything; the start of each member's
  key shows beside the name, and the owner and the admins are marked by their keys.
- End-to-end encryption keeps the relays out, not the members: whatever is said in a public group
  can be copied by anyone in it.
